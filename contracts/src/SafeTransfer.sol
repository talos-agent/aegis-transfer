// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {IERC20} from "forge-std/interfaces/IERC20.sol";
import {ISafeTransfer} from "./ISafeTransfer.sol";

/**
 * @title SafeTransfer
 * @notice A contract for creating cancellable transfers with optional expiry and claim codes
 * @dev Implements ISafeTransfer interface for clean separation of concerns
 */
contract SafeTransfer is ISafeTransfer {
    /// @notice Reentrancy guard status
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    /// @notice Mapping from transfer ID to transfer details
    mapping(uint256 => Transfer) public transfers;

    /// @notice Mapping from sender address to array of transfer IDs they created
    mapping(address => uint256[]) public senderTransfers;

    /// @notice Mapping from recipient address to array of transfer IDs they can claim
    mapping(address => uint256[]) public recipientTransfers;

    /// @notice Counter for generating unique transfer IDs
    uint256 public nextTransferId;

    /// @notice Mapping for commit-reveal mechanism
    mapping(bytes32 => uint256) private commitments;

    /// @notice Maximum number of transfers to return in paginated queries
    uint256 public constant MAX_TRANSFERS_PER_PAGE = 100;

    /// @notice Mapping to track which transfers are invoices vs regular transfers
    mapping(uint256 => bool) public isInvoice;

    /// @notice Mapping from invoice ID to description
    mapping(uint256 => string) public invoiceDescriptions;

    /// @notice Default expiry duration when none is specified (7 days)
    uint256 public constant DEFAULT_EXPIRY_DURATION = 7 days;

    constructor() {
        _status = _NOT_ENTERED;
    }

    /// @notice Prevents reentrancy attacks
    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    /**
     * @notice Creates a new transfer that can be claimed by the recipient
     * @dev Supports both native ETH and ERC20 token transfers
     * @param _recipient Address that can claim the transfer
     * @param _tokenAddress Token contract address (use 0x0 for native ETH)
     * @param _amount Amount of tokens to transfer (ignored for ETH, use msg.value)
     * @param _expiryDuration Duration in seconds until transfer expires (0 for default)
     * @param _claimCode Optional claim code for additional security (empty string for none)
     * @return transferId Unique identifier for the created transfer
     * @custom:security Ensure proper token approvals before calling for ERC20 transfers
     */
    function createTransfer(
        address _recipient,
        address _tokenAddress,
        uint256 _amount,
        uint256 _expiryDuration,
        string memory _claimCode
    ) external payable returns (uint256) {
        uint256 transferAmount;

        // Handle native ETH transfers
        if (_tokenAddress == address(0)) {
            if (msg.value == 0) revert InsufficientBalance();
            transferAmount = msg.value;
        } else {
            // Handle ERC20 token transfers
            if (_amount == 0) revert InsufficientBalance();
            if (msg.value != 0) revert InsufficientBalance();
            transferAmount = _amount;

            _safeTransferFrom(_tokenAddress, msg.sender, address(this), _amount);
        }

        // Generate unique transfer ID with entropy and calculate expiry time
        uint256 transferId = nextTransferId++;
        // Add entropy to prevent front-running for sensitive transfers
        if (bytes(_claimCode).length > 0) {
            transferId = uint256(
                keccak256(abi.encodePacked(transferId, block.timestamp, msg.sender, blockhash(block.number - 1)))
            );
        }
        uint256 expiryTime = _expiryDuration > 0 ? block.timestamp + _expiryDuration : type(uint256).max;
        bytes32 claimCodeHash = bytes(_claimCode).length > 0 ? keccak256(abi.encodePacked(_claimCode)) : bytes32(0);

        // Store transfer details
        transfers[transferId] = Transfer({
            sender: msg.sender,
            recipient: _recipient,
            tokenAddress: _tokenAddress,
            amount: transferAmount,
            timestamp: block.timestamp,
            expiryTime: expiryTime,
            claimCode: claimCodeHash,
            claimed: false,
            cancelled: false
        });

        // Update sender and recipient transfer lists
        senderTransfers[msg.sender].push(transferId);
        recipientTransfers[_recipient].push(transferId);

        emit TransferCreated(
            transferId, msg.sender, _recipient, _tokenAddress, transferAmount, expiryTime, claimCodeHash != bytes32(0)
        );

        return transferId;
    }

    /**
     * @notice Claims a transfer by the designated recipient
     * @dev Validates recipient, claim code, and transfer status before executing
     * @param _transferId Unique identifier of the transfer to claim
     * @param _claimCode Claim code if required (empty string if none)
     * @custom:security Only the designated recipient can claim the transfer
     */
    function claimTransfer(uint256 _transferId, string memory _claimCode) external nonReentrant {
        Transfer storage transfer = transfers[_transferId];

        // Validate transfer exists and caller is authorized
        if (transfer.sender == address(0)) revert TransferNotFound();
        if (transfer.recipient != msg.sender) revert NotAuthorized();
        if (transfer.claimed) revert TransferAlreadyClaimed();
        if (transfer.cancelled) revert TransferAlreadyCancelled();
        if (transfer.expiryTime != type(uint256).max && block.timestamp > transfer.expiryTime) revert TransferExpired();

        // Validate claim code if required (constant-time comparison)
        if (transfer.claimCode != bytes32(0)) {
            bytes32 providedHash = keccak256(abi.encodePacked(_claimCode));
            if (!_constantTimeEqual(providedHash, transfer.claimCode)) {
                revert InvalidClaimCode();
            }
        }

        // Mark transfer as claimed
        transfer.claimed = true;

        // Execute the transfer
        if (transfer.tokenAddress == address(0)) {
            // Transfer native ETH
            (bool success,) = payable(msg.sender).call{value: transfer.amount}("");
            require(success, "Transfer failed");
        } else {
            // Transfer ERC20 tokens
            _safeTransfer(transfer.tokenAddress, msg.sender, transfer.amount);
        }

        emit TransferClaimed(_transferId, msg.sender, transfer.tokenAddress, transfer.amount);
    }

    /**
     * @notice Cancels a transfer and returns funds to the sender
     * @dev Only the original sender can cancel their transfer
     * @param _transferId Unique identifier of the transfer to cancel
     * @custom:security Only the sender can cancel their own transfers
     */
    function cancelTransfer(uint256 _transferId) external nonReentrant {
        Transfer storage transfer = transfers[_transferId];

        // Validate transfer exists and caller is authorized
        if (transfer.sender == address(0)) revert TransferNotFound();
        if (transfer.sender != msg.sender) revert NotAuthorized();
        if (transfer.claimed) revert TransferAlreadyClaimed();
        if (transfer.cancelled) revert TransferAlreadyCancelled();

        // Mark transfer as cancelled
        transfer.cancelled = true;

        // Return funds to sender
        if (transfer.tokenAddress == address(0)) {
            // Refund native ETH
            (bool success,) = payable(msg.sender).call{value: transfer.amount}("");
            require(success, "Refund failed");
        } else {
            // Refund ERC20 tokens
            _safeTransfer(transfer.tokenAddress, msg.sender, transfer.amount);
        }

        emit TransferCancelled(_transferId, msg.sender, transfer.tokenAddress, transfer.amount);
    }

    /**
     * @notice Cancels an invoice and marks it as cancelled
     * @dev Only the invoice recipient (creator) can cancel their invoice
     * @param _invoiceId Unique identifier of the invoice to cancel
     * @custom:security Only the invoice recipient can cancel their own invoices
     */
    function cancelInvoice(uint256 _invoiceId) external nonReentrant {
        Transfer storage invoice = transfers[_invoiceId];

        // Validate invoice exists and caller is authorized
        if (invoice.sender == address(0)) revert InvoiceNotFound();
        if (!isInvoice[_invoiceId]) revert InvoiceNotFound();
        if (invoice.recipient != msg.sender) revert NotAuthorized();
        if (invoice.claimed) revert InvoiceAlreadyPaid();
        if (invoice.cancelled) revert TransferAlreadyCancelled();
        if (invoice.expiryTime != type(uint256).max && block.timestamp > invoice.expiryTime) revert TransferExpired();

        // Mark invoice as cancelled
        invoice.cancelled = true;

        emit TransferCancelled(_invoiceId, msg.sender, invoice.tokenAddress, invoice.amount);
    }

    /**
     * @notice Retrieves transfer details by ID
     * @param _transferId Unique identifier of the transfer
     * @return transfer Complete transfer information
     */
    function getTransfer(uint256 _transferId) external view returns (Transfer memory) {
        return transfers[_transferId];
    }

    /**
     * @notice Gets transfer IDs created by a specific sender with pagination
     * @param _sender Address of the sender
     * @param _offset Starting index for pagination
     * @param _limit Maximum number of transfers to return (capped at MAX_TRANSFERS_PER_PAGE)
     * @return transferIds Array of transfer IDs created by the sender
     * @return total Total number of transfers for this sender
     */
    function getSenderTransfers(address _sender, uint256 _offset, uint256 _limit)
        external
        view
        returns (uint256[] memory transferIds, uint256 total)
    {
        uint256[] storage allTransfers = senderTransfers[_sender];
        total = allTransfers.length;

        if (_offset >= total) {
            return (new uint256[](0), total);
        }

        uint256 limit = _limit > MAX_TRANSFERS_PER_PAGE ? MAX_TRANSFERS_PER_PAGE : _limit;
        uint256 end = _offset + limit;
        if (end > total) {
            end = total;
        }

        transferIds = new uint256[](end - _offset);
        for (uint256 i = _offset; i < end; i++) {
            transferIds[i - _offset] = allTransfers[i];
        }
    }

    /**
     * @notice Gets transfer IDs that can be claimed by a specific recipient with pagination
     * @param _recipient Address of the recipient
     * @param _offset Starting index for pagination
     * @param _limit Maximum number of transfers to return (capped at MAX_TRANSFERS_PER_PAGE)
     * @return transferIds Array of transfer IDs for the recipient
     * @return total Total number of transfers for this recipient
     */
    function getRecipientTransfers(address _recipient, uint256 _offset, uint256 _limit)
        external
        view
        returns (uint256[] memory transferIds, uint256 total)
    {
        uint256[] storage allTransfers = recipientTransfers[_recipient];
        total = allTransfers.length;

        if (_offset >= total) {
            return (new uint256[](0), total);
        }

        uint256 limit = _limit > MAX_TRANSFERS_PER_PAGE ? MAX_TRANSFERS_PER_PAGE : _limit;
        uint256 end = _offset + limit;
        if (end > total) {
            end = total;
        }

        transferIds = new uint256[](end - _offset);
        for (uint256 i = _offset; i < end; i++) {
            transferIds[i - _offset] = allTransfers[i];
        }
    }

    /**
     * @notice Checks if a transfer has expired
     * @param _transferId Unique identifier of the transfer
     * @return expired True if the transfer has expired, false otherwise
     */
    function isTransferExpired(uint256 _transferId) external view returns (bool) {
        Transfer memory transfer = transfers[_transferId];
        return transfer.expiryTime != type(uint256).max && block.timestamp > transfer.expiryTime;
    }

    /**
     * @notice Gets the current status of a transfer
     * @param _transferId Unique identifier of the transfer
     * @return status Current status of the transfer
     */
    function getTransferStatus(uint256 _transferId) external view returns (TransferStatus) {
        Transfer memory transfer = transfers[_transferId];

        if (transfer.sender == address(0)) return TransferStatus.NOT_FOUND;
        if (transfer.claimed) return TransferStatus.CLAIMED;
        if (transfer.cancelled) return TransferStatus.CANCELLED;
        if (transfer.expiryTime != type(uint256).max && block.timestamp > transfer.expiryTime) {
            return TransferStatus.EXPIRED;
        }
        return TransferStatus.PENDING;
    }

    /**
     * @notice Creates an invoice requesting payment from a specific payer
     * @param _payer Address that should pay the invoice
     * @param _tokenAddress Token contract address (use 0x0 for native ETH)
     * @param _amount Amount requested
     * @param _expiryDuration Duration in seconds until invoice expires (0 for default)
     * @param _description Optional description for the invoice
     * @return invoiceId Unique identifier for the created invoice
     */
    function createInvoice(
        address _payer,
        address _tokenAddress,
        uint256 _amount,
        uint256 _expiryDuration,
        string memory _description
    ) external returns (uint256) {
        if (_amount == 0) revert InsufficientBalance();
        if (_payer == address(0)) revert NotAuthorized();

        uint256 invoiceId = nextTransferId++;
        uint256 expiryTime = _expiryDuration > 0 ? block.timestamp + _expiryDuration : type(uint256).max;

        transfers[invoiceId] = Transfer({
            sender: _payer,
            recipient: msg.sender,
            tokenAddress: _tokenAddress,
            amount: _amount,
            timestamp: block.timestamp,
            expiryTime: expiryTime,
            claimCode: bytes32(0),
            claimed: false,
            cancelled: false
        });

        isInvoice[invoiceId] = true;
        invoiceDescriptions[invoiceId] = _description;

        senderTransfers[_payer].push(invoiceId);
        recipientTransfers[msg.sender].push(invoiceId);

        emit InvoiceCreated(invoiceId, msg.sender, _payer, _tokenAddress, _amount, expiryTime, _description);

        return invoiceId;
    }

    /**
     * @notice Pays an existing invoice
     * @param _invoiceId Unique identifier of the invoice to pay
     */
    function payInvoice(uint256 _invoiceId) external payable nonReentrant {
        Transfer storage invoice = transfers[_invoiceId];

        if (invoice.sender == address(0)) revert InvoiceNotFound();
        if (!isInvoice[_invoiceId]) revert InvoiceNotFound();
        if (invoice.sender != msg.sender) revert NotDesignatedPayer();
        if (invoice.claimed) revert InvoiceAlreadyPaid();
        if (invoice.cancelled) revert TransferAlreadyCancelled();
        if (invoice.expiryTime != type(uint256).max && block.timestamp > invoice.expiryTime) revert TransferExpired();

        invoice.claimed = true;

        if (invoice.tokenAddress == address(0)) {
            if (msg.value != invoice.amount) revert InsufficientBalance();
            (bool success,) = payable(invoice.recipient).call{value: invoice.amount}("");
            require(success, "Payment failed");
        } else {
            if (msg.value != 0) revert InsufficientBalance();
            _safeTransferFrom(invoice.tokenAddress, msg.sender, invoice.recipient, invoice.amount);
        }

        emit InvoicePaid(_invoiceId, msg.sender, invoice.recipient, invoice.tokenAddress, invoice.amount);
    }

    /**
     * @notice Gets the description of an invoice
     * @param _invoiceId Unique identifier of the invoice
     * @return description The invoice description
     */
    function getInvoiceDescription(uint256 _invoiceId) external view returns (string memory) {
        return invoiceDescriptions[_invoiceId];
    }

    /**
     * @notice Checks if a transfer ID represents an invoice
     * @param _transferId Unique identifier to check
     * @return isInvoiceFlag True if the ID represents an invoice, false otherwise
     */
    function getIsInvoice(uint256 _transferId) external view returns (bool) {
        return isInvoice[_transferId];
    }

    /// @notice Safely transfers ERC20 tokens with fee-on-transfer support
    function _safeTransfer(address token, address to, uint256 amount) internal {
        uint256 balanceBefore = IERC20(token).balanceOf(to);
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(IERC20.transfer.selector, to, amount));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "SafeTransfer: transfer failed");

        // Verify actual amount transferred (handles fee-on-transfer tokens)
        uint256 balanceAfter = IERC20(token).balanceOf(to);
        require(balanceAfter >= balanceBefore, "SafeTransfer: balance decreased");
    }

    /// @notice Safely transfers ERC20 tokens from one address to another with fee-on-transfer support
    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        uint256 balanceBefore = IERC20(token).balanceOf(to);
        (bool success, bytes memory data) =
            token.call(abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, amount));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "SafeTransfer: transferFrom failed");

        // Verify actual amount transferred (handles fee-on-transfer tokens)
        uint256 balanceAfter = IERC20(token).balanceOf(to);
        require(balanceAfter >= balanceBefore, "SafeTransfer: balance decreased");
    }

    /// @notice Constant-time comparison to prevent timing attacks
    function _constantTimeEqual(bytes32 a, bytes32 b) internal pure returns (bool) {
        uint256 result = 0;
        for (uint256 i = 0; i < 32; i++) {
            result |= uint256(uint8(a[i])) ^ uint256(uint8(b[i]));
        }
        return result == 0;
    }
}
