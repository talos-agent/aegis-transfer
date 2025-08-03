// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract SafeTransfer {
    struct Transfer {
        address sender;
        address recipient;
        uint256 amount;
        uint256 timestamp;
        uint256 expiryTime;
        bytes32 claimCode;
        bool claimed;
        bool cancelled;
    }

    mapping(uint256 => Transfer) public transfers;
    mapping(address => uint256[]) public senderTransfers;
    mapping(address => uint256[]) public recipientTransfers;
    
    uint256 public nextTransferId;
    uint256 public constant DEFAULT_EXPIRY_DURATION = 7 days;

    event TransferCreated(
        uint256 indexed transferId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint256 expiryTime,
        bool hasClaimCode
    );

    event TransferClaimed(
        uint256 indexed transferId,
        address indexed recipient,
        uint256 amount
    );

    event TransferCancelled(
        uint256 indexed transferId,
        address indexed sender,
        uint256 amount
    );

    error InsufficientBalance();
    error TransferNotFound();
    error NotAuthorized();
    error TransferAlreadyClaimed();
    error TransferAlreadyCancelled();
    error TransferExpired();
    error InvalidClaimCode();
    error TransferNotExpired();

    function createTransfer(
        address _recipient,
        uint256 _expiryDuration,
        string memory _claimCode
    ) external payable returns (uint256) {
        if (msg.value == 0) revert InsufficientBalance();

        uint256 transferId = nextTransferId++;
        uint256 expiryTime = block.timestamp + (_expiryDuration > 0 ? _expiryDuration : DEFAULT_EXPIRY_DURATION);
        bytes32 claimCodeHash = bytes(_claimCode).length > 0 ? keccak256(abi.encodePacked(_claimCode)) : bytes32(0);

        transfers[transferId] = Transfer({
            sender: msg.sender,
            recipient: _recipient,
            amount: msg.value,
            timestamp: block.timestamp,
            expiryTime: expiryTime,
            claimCode: claimCodeHash,
            claimed: false,
            cancelled: false
        });

        senderTransfers[msg.sender].push(transferId);
        recipientTransfers[_recipient].push(transferId);

        emit TransferCreated(
            transferId,
            msg.sender,
            _recipient,
            msg.value,
            expiryTime,
            claimCodeHash != bytes32(0)
        );

        return transferId;
    }

    function claimTransfer(uint256 _transferId, string memory _claimCode) external {
        Transfer storage transfer = transfers[_transferId];
        
        if (transfer.sender == address(0)) revert TransferNotFound();
        if (transfer.recipient != msg.sender) revert NotAuthorized();
        if (transfer.claimed) revert TransferAlreadyClaimed();
        if (transfer.cancelled) revert TransferAlreadyCancelled();
        if (block.timestamp > transfer.expiryTime) revert TransferExpired();

        if (transfer.claimCode != bytes32(0)) {
            if (keccak256(abi.encodePacked(_claimCode)) != transfer.claimCode) {
                revert InvalidClaimCode();
            }
        }

        transfer.claimed = true;
        
        (bool success, ) = payable(msg.sender).call{value: transfer.amount}("");
        require(success, "Transfer failed");

        emit TransferClaimed(_transferId, msg.sender, transfer.amount);
    }

    function cancelTransfer(uint256 _transferId) external {
        Transfer storage transfer = transfers[_transferId];
        
        if (transfer.sender == address(0)) revert TransferNotFound();
        if (transfer.sender != msg.sender) revert NotAuthorized();
        if (transfer.claimed) revert TransferAlreadyClaimed();
        if (transfer.cancelled) revert TransferAlreadyCancelled();

        if (block.timestamp <= transfer.expiryTime) {
            transfer.cancelled = true;
        } else {
            transfer.cancelled = true;
        }

        (bool success, ) = payable(msg.sender).call{value: transfer.amount}("");
        require(success, "Refund failed");

        emit TransferCancelled(_transferId, msg.sender, transfer.amount);
    }

    function getTransfer(uint256 _transferId) external view returns (Transfer memory) {
        return transfers[_transferId];
    }

    function getSenderTransfers(address _sender) external view returns (uint256[] memory) {
        return senderTransfers[_sender];
    }

    function getRecipientTransfers(address _recipient) external view returns (uint256[] memory) {
        return recipientTransfers[_recipient];
    }

    function isTransferExpired(uint256 _transferId) external view returns (bool) {
        Transfer memory transfer = transfers[_transferId];
        return block.timestamp > transfer.expiryTime;
    }

    function getTransferStatus(uint256 _transferId) external view returns (string memory) {
        Transfer memory transfer = transfers[_transferId];
        
        if (transfer.sender == address(0)) return "NOT_FOUND";
        if (transfer.claimed) return "CLAIMED";
        if (transfer.cancelled) return "CANCELLED";
        if (block.timestamp > transfer.expiryTime) return "EXPIRED";
        return "PENDING";
    }
}
