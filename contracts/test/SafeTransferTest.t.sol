// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {SafeTransfer} from "../src/SafeTransfer.sol";

contract SafeTransferTest is Test {
    SafeTransfer public safeTransfer;
    address public sender = address(0x1);
    address public recipient = address(0x2);
    uint256 public transferAmount = 1 ether;

    function setUp() public {
        safeTransfer = new SafeTransfer();
        vm.deal(sender, 10 ether);
        vm.deal(recipient, 1 ether);
    }

    function test_CreateTransfer() public {
        vm.prank(sender);
        uint256 transferId = safeTransfer.createTransfer{value: transferAmount}(
            recipient,
            0,
            ""
        );

        SafeTransfer.Transfer memory transfer = safeTransfer.getTransfer(transferId);
        assertEq(transfer.sender, sender);
        assertEq(transfer.recipient, recipient);
        assertEq(transfer.amount, transferAmount);
        assertEq(transfer.claimed, false);
        assertEq(transfer.cancelled, false);
    }

    function test_ClaimTransfer() public {
        vm.prank(sender);
        uint256 transferId = safeTransfer.createTransfer{value: transferAmount}(
            recipient,
            0,
            ""
        );

        uint256 recipientBalanceBefore = recipient.balance;
        
        vm.prank(recipient);
        safeTransfer.claimTransfer(transferId, "");

        SafeTransfer.Transfer memory transfer = safeTransfer.getTransfer(transferId);
        assertEq(transfer.claimed, true);
        assertEq(recipient.balance, recipientBalanceBefore + transferAmount);
    }

    function test_ClaimTransferWithCode() public {
        string memory claimCode = "secret123";
        
        vm.prank(sender);
        uint256 transferId = safeTransfer.createTransfer{value: transferAmount}(
            recipient,
            0,
            claimCode
        );

        vm.prank(recipient);
        safeTransfer.claimTransfer(transferId, claimCode);

        SafeTransfer.Transfer memory transfer = safeTransfer.getTransfer(transferId);
        assertEq(transfer.claimed, true);
    }

    function test_CancelTransfer() public {
        vm.prank(sender);
        uint256 transferId = safeTransfer.createTransfer{value: transferAmount}(
            recipient,
            0,
            ""
        );

        uint256 senderBalanceBefore = sender.balance;
        
        vm.prank(sender);
        safeTransfer.cancelTransfer(transferId);

        SafeTransfer.Transfer memory transfer = safeTransfer.getTransfer(transferId);
        assertEq(transfer.cancelled, true);
        assertEq(sender.balance, senderBalanceBefore + transferAmount);
    }

    function test_ExpiredTransfer() public {
        vm.prank(sender);
        uint256 transferId = safeTransfer.createTransfer{value: transferAmount}(
            recipient,
            1 days,
            ""
        );

        vm.warp(block.timestamp + 2 days);

        vm.prank(recipient);
        vm.expectRevert(SafeTransfer.TransferExpired.selector);
        safeTransfer.claimTransfer(transferId, "");

        vm.prank(sender);
        safeTransfer.cancelTransfer(transferId);

        SafeTransfer.Transfer memory transfer = safeTransfer.getTransfer(transferId);
        assertEq(transfer.cancelled, true);
    }

    function test_InvalidClaimCode() public {
        string memory claimCode = "secret123";
        
        vm.prank(sender);
        uint256 transferId = safeTransfer.createTransfer{value: transferAmount}(
            recipient,
            0,
            claimCode
        );

        vm.prank(recipient);
        vm.expectRevert(SafeTransfer.InvalidClaimCode.selector);
        safeTransfer.claimTransfer(transferId, "wrongcode");
    }

    function test_GetTransferStatus() public {
        vm.prank(sender);
        uint256 transferId = safeTransfer.createTransfer{value: transferAmount}(
            recipient,
            0,
            ""
        );

        string memory status = safeTransfer.getTransferStatus(transferId);
        assertEq(status, "PENDING");

        vm.prank(recipient);
        safeTransfer.claimTransfer(transferId, "");

        status = safeTransfer.getTransferStatus(transferId);
        assertEq(status, "CLAIMED");
    }
}
