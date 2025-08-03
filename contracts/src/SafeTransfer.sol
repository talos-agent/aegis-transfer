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
    /// @notice Mapping from transfer ID to transfer details
    mapping(uint256 => Transfer) public transfers;
    
    /// @notice Mapping from sender address to array of transfer IDs they created
    mapping(address => uint256[]) public senderTransfers;
    
    /// @notice Mapping from recipient address to array of transfer IDs they can claim
    mapping(address => uint256[]) public recipientTransfers;
    
    /// @notice Counter for generating unique transfer IDs
    uint256 public nextTransferId;
    
    /// @notice Default expiry duration when none is specified (7 days)
    uint256 public constant DEFAULT_EXPIRY_DURATION = 7 days;

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
            
            IERC20(_tokenAddress).transferFrom(msg.sender, address(this), _amount);
        }

        // Generate unique transfer ID and calculate expiry time
        uint256 transferId = nextTransferId++;
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
            transferId,
            msg.sender,
            _recipient,
            _tokenAddress,
            transferAmount,
            expiryTime,
            claimCodeHash != bytes32(0)
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
    function claimTransfer(uint256 _transferId, string memory _claimCode) external {
        Transfer storage transfer = transfers[_transferId];
        
        // Validate transfer exists and caller is authorized
        if (transfer.sender == address(0)) revert TransferNotFound();
        if (transfer.recipient != msg.sender) revert NotAuthorized();
        if (transfer.claimed) revert TransferAlreadyClaimed();
        if (transfer.cancelled) revert TransferAlreadyCancelled();
        if (transfer.expiryTime != type(uint256).max && block.timestamp > transfer.expiryTime) revert TransferExpired();

        // Validate claim code if required
        if (transfer.claimCode != bytes32(0)) {
            if (keccak256(abi.encodePacked(_claimCode)) != transfer.claimCode) {
                revert InvalidClaimCode();
            }
        }

        // Mark transfer as claimed
        transfer.claimed = true;
        
        // Execute the transfer
        if (transfer.tokenAddress == address(0)) {
            // Transfer native ETH
            (bool success, ) = payable(msg.sender).call{value: transfer.amount}("");
            require(success, "Transfer failed");
        } else {
            // Transfer ERC20 tokens
            IERC20(transfer.tokenAddress).transfer(msg.sender, transfer.amount);
        }

        emit TransferClaimed(_transferId, msg.sender, transfer.tokenAddress, transfer.amount);
    }

    /**
     * @notice Cancels a transfer and returns funds to the sender
     * @dev Only the original sender can cancel their transfer
     * @param _transferId Unique identifier of the transfer to cancel
     * @custom:security Only the sender can cancel their own transfers
     */
    function cancelTransfer(uint256 _transferId) external {
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
            (bool success, ) = payable(msg.sender).call{value: transfer.amount}("");
            require(success, "Refund failed");
        } else {
            // Refund ERC20 tokens
            IERC20(transfer.tokenAddress).transfer(msg.sender, transfer.amount);
        }

        emit TransferCancelled(_transferId, msg.sender, transfer.tokenAddress, transfer.amount);
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
     * @notice Gets all transfer IDs created by a specific sender
     * @param _sender Address of the sender
     * @return transferIds Array of transfer IDs created by the sender
     */
    function getSenderTransfers(address _sender) external view returns (uint256[] memory) {
        return senderTransfers[_sender];
    }

    /**
     * @notice Gets all transfer IDs that can be claimed by a specific recipient
     * @param _recipient Address of the recipient
     * @return transferIds Array of transfer IDs for the recipient
     */
    function getRecipientTransfers(address _recipient) external view returns (uint256[] memory) {
        return recipientTransfers[_recipient];
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
        if (transfer.expiryTime != type(uint256).max && block.timestamp > transfer.expiryTime) return TransferStatus.EXPIRED;
        return TransferStatus.PENDING;
    }
}
