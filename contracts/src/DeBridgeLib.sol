// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {IERC20} from "forge-std/interfaces/IERC20.sol";

/**
 * @notice Interface for deBridge DlnSource contract
 * @dev Minimal interface for order creation
 */
interface IDlnSource {
    struct OrderCreation {
        address giveTokenAddress;
        /// Token being given (0x0 for native ETH)
        uint256 giveAmount;
        /// Amount of tokens being given
        bytes takeTokenAddress;
        /// Token to receive on destination chain
        uint256 takeAmount;
        /// Amount of tokens to receive
        uint256 takeChainId;
        /// Destination chain ID
        bytes receiverDst;
        /// Receiver address on destination chain
        address givePatchAuthoritySrc;
        /// Address allowed to patch give amount
        bytes orderAuthorityAddressDst;
        /// Address allowed to cancel order
        bytes allowedTakerDst;
        /// Specific taker address (empty for open market)
        bytes externalCall;
        /// External call data (empty for simple transfers)
        bytes allowedCancelBeneficiarySrc;
    }
    /// Cancel beneficiary address

    function createOrder(
        OrderCreation calldata _orderCreation,
        bytes calldata _affiliateFee,
        uint32 _referralCode,
        bytes calldata _permitEnvelope
    ) external payable returns (bytes32 orderId);

    function globalFixedNativeFee() external view returns (uint256);
}

/**
 * @title DeBridgeLib
 * @notice Library for cross-chain token bridging using deBridge DLN protocol
 * @dev Provides simplified interface for bridging tokens between Arbitrum and Mainnet
 */
library DeBridgeLib {
    /// @notice Supported chain IDs for bridging
    uint256 public constant ETHEREUM_CHAIN_ID = 1;
    uint256 public constant ARBITRUM_CHAIN_ID = 42161;

    /// @notice deBridge DlnSource contract addresses
    address public constant ETHEREUM_DLN_SOURCE = 0xeF4fB24aD0916217251F553c0596F8Edc630EB66;
    address public constant ARBITRUM_DLN_SOURCE = 0xeF4fB24aD0916217251F553c0596F8Edc630EB66;

    /// @notice deBridge DlnDestination contract addresses
    address public constant ETHEREUM_DLN_DESTINATION = 0xE7351Fd770A37282b91D153Ee690B63579D6dd7f;
    address public constant ARBITRUM_DLN_DESTINATION = 0xE7351Fd770A37282b91D153Ee690B63579D6dd7f;

    /// @notice Bridge configuration for supported tokens
    struct BridgeConfig {
        address sourceToken;
        /// Token address on source chain
        address destinationToken;
        /// Token address on destination chain
        uint256 minAmount;
        /// Minimum bridging amount
        uint256 maxAmount;
        /// Maximum bridging amount
        uint256 feeRate;
    }
    /// Fee rate in basis points (100 = 1%)

    /// @notice Emitted when a bridge order is created
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

    /// @notice Custom errors for bridge operations
    error UnsupportedChain(uint256 chainId);
    error UnsupportedToken(address token);
    error InsufficientAmount(uint256 provided, uint256 minimum);
    error ExcessiveAmount(uint256 provided, uint256 maximum);
    error InsufficientProtocolFee(uint256 provided, uint256 required);
    error BridgeOperationFailed();

    /**
     * @notice Calculates the recommended take amount for bridging
     * @dev Accounts for protocol fees and gas costs
     * @param giveAmount Amount being given on source chain
     * @param protocolFeeBps Protocol fee in basis points (default: 8 bps)
     * @param gasCostUsd Estimated gas cost in USD (default: $6)
     * @return takeAmount Recommended amount to receive on destination
     */
    function calculateTakeAmount(uint256 giveAmount, uint256 protocolFeeBps, uint256 gasCostUsd)
        internal
        pure
        returns (uint256 takeAmount)
    {
        if (protocolFeeBps == 0) protocolFeeBps = 8; // Default 8 bps
        if (gasCostUsd == 0) gasCostUsd = 6e18; // Default $6 in wei equivalent

        // Calculate amount after protocol fees
        uint256 afterFees = (giveAmount * (10000 - protocolFeeBps)) / 10000;

        // Subtract estimated gas costs (simplified calculation)
        takeAmount = afterFees > gasCostUsd ? afterFees - gasCostUsd : 0;
    }

    /**
     * @notice Creates a bridge order from current chain to destination chain
     * @dev Handles both ETH and ERC20 token bridging - must be called from a contract context
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
    ) external returns (bytes32 orderId) {
        // Validate supported chains
        if (destinationChain != ETHEREUM_CHAIN_ID && destinationChain != ARBITRUM_CHAIN_ID) {
            revert UnsupportedChain(destinationChain);
        }

        // Get current chain ID
        uint256 currentChain = block.chainid;
        if (currentChain != ETHEREUM_CHAIN_ID && currentChain != ARBITRUM_CHAIN_ID) {
            revert UnsupportedChain(currentChain);
        }

        // Get DlnSource contract address for current chain
        address dlnSource = currentChain == ETHEREUM_CHAIN_ID ? ETHEREUM_DLN_SOURCE : ARBITRUM_DLN_SOURCE;

        // Calculate recommended take amount
        uint256 takeAmount = calculateTakeAmount(amount, 8, 6e18);

        // Prepare order creation struct
        IDlnSource.OrderCreation memory orderCreation = IDlnSource.OrderCreation({
            giveTokenAddress: sourceToken,
            giveAmount: amount,
            takeTokenAddress: abi.encodePacked(destinationToken),
            takeAmount: takeAmount,
            takeChainId: destinationChain,
            receiverDst: abi.encodePacked(receiver),
            givePatchAuthoritySrc: msg.sender,
            orderAuthorityAddressDst: abi.encodePacked(msg.sender),
            allowedTakerDst: "",
            externalCall: "",
            allowedCancelBeneficiarySrc: ""
        });

        // Get protocol fee
        uint256 protocolFee = IDlnSource(dlnSource).globalFixedNativeFee();

        // Validate inputs
        if (amount == 0) revert InsufficientAmount(0, 1);
        if (receiver == address(0)) revert UnsupportedToken(receiver);
        if (sourceToken != address(0) && destinationToken == address(0)) revert UnsupportedToken(destinationToken);

        // Handle token transfers and approvals
        if (sourceToken != address(0)) {
            // Verify token contract exists
            uint256 codeSize;
            assembly { codeSize := extcodesize(sourceToken) }
            if (codeSize == 0) revert UnsupportedToken(sourceToken);
            
            // Transfer tokens from sender to this contract
            IERC20(sourceToken).transferFrom(msg.sender, address(this), amount);
            IERC20(sourceToken).approve(dlnSource, amount);
        }

        // Create the bridge order - requires native token for protocol fee
        orderId = IDlnSource(dlnSource).createOrder{value: protocolFee}(
            orderCreation,
            "", // No affiliate fee
            0, // No referral code
            "" // No permit envelope
        );

        emit BridgeOrderCreated(
            orderId, msg.sender, currentChain, destinationChain, sourceToken, destinationToken, amount
        );
    }

    /**
     * @notice Gets the DlnSource contract address for a given chain
     * @param chainId Chain ID to get DlnSource for
     * @return dlnSource Address of DlnSource contract
     */
    function getDlnSourceAddress(uint256 chainId) internal pure returns (address dlnSource) {
        if (chainId == ETHEREUM_CHAIN_ID) {
            return ETHEREUM_DLN_SOURCE;
        } else if (chainId == ARBITRUM_CHAIN_ID) {
            return ARBITRUM_DLN_SOURCE;
        } else {
            revert UnsupportedChain(chainId);
        }
    }

    /**
     * @notice Gets the DlnDestination contract address for a given chain
     * @param chainId Chain ID to get DlnDestination for
     * @return dlnDestination Address of DlnDestination contract
     */
    function getDlnDestinationAddress(uint256 chainId) internal pure returns (address dlnDestination) {
        if (chainId == ETHEREUM_CHAIN_ID) {
            return ETHEREUM_DLN_DESTINATION;
        } else if (chainId == ARBITRUM_CHAIN_ID) {
            return ARBITRUM_DLN_DESTINATION;
        } else {
            revert UnsupportedChain(chainId);
        }
    }
}
