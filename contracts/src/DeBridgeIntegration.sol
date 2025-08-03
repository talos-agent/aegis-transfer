// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {DeBridgeLib} from "./DeBridgeLib.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";

/**
 * @title DeBridgeIntegration
 * @notice Contract wrapper for DeBridgeLib to enable payable bridge operations
 * @dev This contract provides a payable interface to the DeBridge library functions
 */
contract DeBridgeIntegration {
    using DeBridgeLib for *;

    /// @notice Emitted when a bridge order is created through this contract
    /// @param orderId Unique order identifier from deBridge
    /// @param sender Address that initiated the bridge
    /// @param sourceChain Source chain ID
    /// @param destinationChain Destination chain ID
    /// @param sourceToken Token being bridged from source
    /// @param destinationToken Token being bridged to destination
    /// @param amount Amount being bridged
    event BridgeOrderCreated(
        bytes32 indexed orderId,
        address indexed sender,
        uint256 sourceChain,
        uint256 destinationChain,
        address sourceToken,
        address destinationToken,
        uint256 amount
    );

    /**
     * @notice Creates a bridge order from current chain to destination chain
     * @dev Handles both ETH and ERC20 token bridging with proper fee handling
     * @param sourceToken Token address on source chain (0x0 for ETH)
     * @param destinationToken Token address on destination chain
     * @param amount Amount to bridge
     * @param destinationChain Target chain ID
     * @param receiver Receiver address on destination chain
     * @return orderId Unique identifier for the bridge order
     */
    function createBridgeOrder(
        address sourceToken,
        address destinationToken,
        uint256 amount,
        uint256 destinationChain,
        address receiver
    ) external payable returns (bytes32 orderId) {
        // Call the library function
        orderId = DeBridgeLib.createBridgeOrder(sourceToken, destinationToken, amount, destinationChain, receiver);

        emit BridgeOrderCreated(
            orderId, msg.sender, block.chainid, destinationChain, sourceToken, destinationToken, amount
        );
    }

    /**
     * @notice Gets the current chain's DlnSource contract address
     * @return dlnSource Address of DlnSource contract for current chain
     */
    function getCurrentDlnSource() external view returns (address dlnSource) {
        uint256 chainId = block.chainid;
        if (chainId == DeBridgeLib.ETHEREUM_CHAIN_ID) {
            return DeBridgeLib.ETHEREUM_DLN_SOURCE;
        } else if (chainId == DeBridgeLib.ARBITRUM_CHAIN_ID) {
            return DeBridgeLib.ARBITRUM_DLN_SOURCE;
        } else {
            revert DeBridgeLib.UnsupportedChain(chainId);
        }
    }

    /**
     * @notice Gets the current chain's DlnDestination contract address
     * @return dlnDestination Address of DlnDestination contract for current chain
     */
    function getCurrentDlnDestination() external view returns (address dlnDestination) {
        uint256 chainId = block.chainid;
        if (chainId == DeBridgeLib.ETHEREUM_CHAIN_ID) {
            return DeBridgeLib.ETHEREUM_DLN_DESTINATION;
        } else if (chainId == DeBridgeLib.ARBITRUM_CHAIN_ID) {
            return DeBridgeLib.ARBITRUM_DLN_DESTINATION;
        } else {
            revert DeBridgeLib.UnsupportedChain(chainId);
        }
    }
}
