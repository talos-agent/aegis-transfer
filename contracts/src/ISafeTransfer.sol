// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/**
 * @title ISafeTransfer
 * @notice Interface for SafeTransfer contract defining all structs, events, enums, and errors
 * @dev This interface provides a clean separation of concerns and improves code organization
 */
interface ISafeTransfer {
    /// @notice Status of a transfer in the system
    enum TransferStatus {
        PENDING,
        /// Transfer is waiting to be claimed
        CLAIMED,
        /// Transfer has been successfully claimed
        CANCELLED,
        /// Transfer has been cancelled by sender
        EXPIRED,
        /// Transfer has expired and can no longer be claimed
        NOT_FOUND
    }
    /// Transfer ID does not exist

    /// @notice Structure representing a transfer
    /// @dev Contains all necessary information for a transfer lifecycle
    struct Transfer {
        address sender;
        /// Address that initiated the transfer
        address recipient;
        /// Address that can claim the transfer
        address tokenAddress;
        /// Token contract address (0x0 for native ETH)
        uint256 amount;
        /// Amount of tokens being transferred
        uint256 timestamp;
        /// Block timestamp when transfer was created
        uint256 expiryTime;
        /// Block timestamp when transfer expires
        bytes32 claimCode;
        /// Optional claim code hash for additional security
        bool claimed;
        /// Whether the transfer has been claimed
        bool cancelled;
    }
    /// Whether the transfer has been cancelled

    /// @notice Emitted when a new transfer is created
    /// @param transferId Unique identifier for the transfer
    /// @param sender Address that created the transfer
    /// @param recipient Address that can claim the transfer
    /// @param tokenAddress Token being transferred (0x0 for ETH)
    /// @param amount Amount being transferred
    /// @param expiryTime When the transfer expires
    /// @param hasClaimCode Whether a claim code is required
    event TransferCreated(
        uint256 indexed transferId,
        address indexed sender,
        address indexed recipient,
        address tokenAddress,
        uint256 amount,
        uint256 expiryTime,
        bool hasClaimCode
    );

    /// @notice Emitted when a transfer is successfully claimed
    /// @param transferId The transfer that was claimed
    /// @param recipient Address that claimed the transfer
    /// @param tokenAddress Token that was claimed
    /// @param amount Amount that was claimed
    event TransferClaimed(
        uint256 indexed transferId, address indexed recipient, address indexed tokenAddress, uint256 amount
    );

    /// @notice Emitted when a transfer is cancelled
    /// @param transferId The transfer that was cancelled
    /// @param sender Address that cancelled the transfer
    /// @param tokenAddress Token that was returned
    /// @param amount Amount that was returned
    event TransferCancelled(
        uint256 indexed transferId, address indexed sender, address indexed tokenAddress, uint256 amount
    );

    /// @notice Thrown when insufficient balance for operation
    error InsufficientBalance();

    /// @notice Thrown when transfer ID does not exist
    error TransferNotFound();

    /// @notice Thrown when caller is not authorized for operation
    error NotAuthorized();

    /// @notice Thrown when attempting to claim already claimed transfer
    error TransferAlreadyClaimed();

    /// @notice Thrown when attempting to operate on cancelled transfer
    error TransferAlreadyCancelled();

    /// @notice Thrown when attempting to claim expired transfer
    error TransferExpired();

    /// @notice Thrown when provided claim code is invalid
    error InvalidClaimCode();

    /// @notice Thrown when attempting to cancel non-expired transfer
    error TransferNotExpired();
}
