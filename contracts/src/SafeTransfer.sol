// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {IERC20} from "forge-std/interfaces/IERC20.sol";

contract SafeTransfer {
    struct Transfer {
        address sender;
        address recipient;
        address tokenAddress;
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
        address indexed tokenAddress,
        uint256 amount,
        uint256 expiryTime,
        bool hasClaimCode
    );

    event TransferClaimed(
        uint256 indexed transferId,
        address indexed recipient,
        address indexed tokenAddress,
        uint256 amount
    );

    event TransferCancelled(
        uint256 indexed transferId,
        address indexed sender,
        address indexed tokenAddress,
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
        address _tokenAddress,
        uint256 _amount,
        uint256 _expiryDuration,
        string memory _claimCode
    ) external payable returns (uint256) {
        uint256 transferAmount;
        
        if (_tokenAddress == address(0)) {
            if (msg.value == 0) revert InsufficientBalance();
            transferAmount = msg.value;
        } else {
            if (_amount == 0) revert InsufficientBalance();
            if (msg.value != 0) revert InsufficientBalance();
            transferAmount = _amount;
            
            IERC20(_tokenAddress).transferFrom(msg.sender, address(this), _amount);
        }

        uint256 transferId = nextTransferId++;
        uint256 expiryTime = block.timestamp + (_expiryDuration > 0 ? _expiryDuration : DEFAULT_EXPIRY_DURATION);
        bytes32 claimCodeHash = bytes(_claimCode).length > 0 ? keccak256(abi.encodePacked(_claimCode)) : bytes32(0);

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
        
        if (transfer.tokenAddress == address(0)) {
            (bool success, ) = payable(msg.sender).call{value: transfer.amount}("");
            require(success, "Transfer failed");
        } else {
            IERC20(transfer.tokenAddress).transfer(msg.sender, transfer.amount);
        }

        emit TransferClaimed(_transferId, msg.sender, transfer.tokenAddress, transfer.amount);
    }

    function cancelTransfer(uint256 _transferId) external {
        Transfer storage transfer = transfers[_transferId];
        
        if (transfer.sender == address(0)) revert TransferNotFound();
        if (transfer.sender != msg.sender) revert NotAuthorized();
        if (transfer.claimed) revert TransferAlreadyClaimed();
        if (transfer.cancelled) revert TransferAlreadyCancelled();

        transfer.cancelled = true;

        if (transfer.tokenAddress == address(0)) {
            (bool success, ) = payable(msg.sender).call{value: transfer.amount}("");
            require(success, "Refund failed");
        } else {
            IERC20(transfer.tokenAddress).transfer(msg.sender, transfer.amount);
        }

        emit TransferCancelled(_transferId, msg.sender, transfer.tokenAddress, transfer.amount);
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
