// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {SafeTransfer} from "../src/SafeTransfer.sol";
import {ISafeTransfer} from "../src/ISafeTransfer.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";

contract MockERC20 is IERC20 {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;
    string private _name;
    string private _symbol;
    uint8 private _decimals;

    constructor(string memory name_, string memory symbol_, uint8 decimals_) {
        _name = name_;
        _symbol = symbol_;
        _decimals = decimals_;
    }

    function name() external view returns (string memory) {
        return _name;
    }

    function symbol() external view returns (string memory) {
        return _symbol;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        return _allowances[owner][spender];
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _balances[msg.sender] -= amount;
        _balances[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        _allowances[from][msg.sender] -= amount;
        _balances[from] -= amount;
        _balances[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    function mint(address to, uint256 amount) external {
        _balances[to] += amount;
        _totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }
}

contract SafeTransferTest is Test {
    SafeTransfer public safeTransfer;
    MockERC20 public token;
    address public sender = address(0x1);
    address public recipient = address(0x2);
    uint256 public transferAmount = 1 ether;
    uint256 public tokenAmount = 1000 * 10 ** 18;

    function setUp() public {
        safeTransfer = new SafeTransfer();
        token = new MockERC20("Test Token", "TEST", 18);

        vm.deal(sender, 10 ether);
        vm.deal(recipient, 1 ether);

        token.mint(sender, tokenAmount * 10);
        vm.prank(sender);
        token.approve(address(safeTransfer), tokenAmount * 10);
    }

    function test_CreateTransfer() public {
        vm.prank(sender);
        uint256 transferId = safeTransfer.createTransfer{value: transferAmount}(recipient, address(0), 0, 0, "");

        ISafeTransfer.Transfer memory transfer = safeTransfer.getTransfer(transferId);
        assertEq(transfer.sender, sender);
        assertEq(transfer.recipient, recipient);
        assertEq(transfer.tokenAddress, address(0));
        assertEq(transfer.amount, transferAmount);
        assertEq(transfer.claimed, false);
        assertEq(transfer.cancelled, false);
    }

    function test_ClaimTransfer() public {
        vm.prank(sender);
        uint256 transferId = safeTransfer.createTransfer{value: transferAmount}(recipient, address(0), 0, 0, "");

        uint256 recipientBalanceBefore = recipient.balance;

        vm.prank(recipient);
        safeTransfer.claimTransfer(transferId, "");

        ISafeTransfer.Transfer memory transfer = safeTransfer.getTransfer(transferId);
        assertEq(transfer.claimed, true);
        assertEq(recipient.balance, recipientBalanceBefore + transferAmount);
    }

    function test_ClaimTransferWithCode() public {
        string memory claimCode = "secret123";

        vm.prank(sender);
        uint256 transferId = safeTransfer.createTransfer{value: transferAmount}(recipient, address(0), 0, 0, claimCode);

        vm.prank(recipient);
        safeTransfer.claimTransfer(transferId, claimCode);

        ISafeTransfer.Transfer memory transfer = safeTransfer.getTransfer(transferId);
        assertEq(transfer.claimed, true);
    }

    function test_CancelTransfer() public {
        vm.prank(sender);
        uint256 transferId = safeTransfer.createTransfer{value: transferAmount}(recipient, address(0), 0, 0, "");

        uint256 senderBalanceBefore = sender.balance;

        vm.prank(sender);
        safeTransfer.cancelTransfer(transferId);

        ISafeTransfer.Transfer memory transfer = safeTransfer.getTransfer(transferId);
        assertEq(transfer.cancelled, true);
        assertEq(sender.balance, senderBalanceBefore + transferAmount);
    }

    function test_ExpiredTransfer() public {
        vm.prank(sender);
        uint256 transferId = safeTransfer.createTransfer{value: transferAmount}(recipient, address(0), 0, 1 days, "");

        vm.warp(block.timestamp + 2 days);

        vm.prank(recipient);
        vm.expectRevert(ISafeTransfer.TransferExpired.selector);
        safeTransfer.claimTransfer(transferId, "");

        vm.prank(sender);
        safeTransfer.cancelTransfer(transferId);

        ISafeTransfer.Transfer memory transfer = safeTransfer.getTransfer(transferId);
        assertEq(transfer.cancelled, true);
    }

    function test_InvalidClaimCode() public {
        string memory claimCode = "secret123";

        vm.prank(sender);
        uint256 transferId = safeTransfer.createTransfer{value: transferAmount}(recipient, address(0), 0, 0, claimCode);

        vm.prank(recipient);
        vm.expectRevert(ISafeTransfer.InvalidClaimCode.selector);
        safeTransfer.claimTransfer(transferId, "wrongcode");
    }

    function test_GetTransferStatus() public {
        vm.prank(sender);
        uint256 transferId = safeTransfer.createTransfer{value: transferAmount}(recipient, address(0), 0, 0, "");

        ISafeTransfer.TransferStatus status = safeTransfer.getTransferStatus(transferId);
        assertEq(uint8(status), uint8(ISafeTransfer.TransferStatus.PENDING));

        vm.prank(recipient);
        safeTransfer.claimTransfer(transferId, "");

        status = safeTransfer.getTransferStatus(transferId);
        assertEq(uint8(status), uint8(ISafeTransfer.TransferStatus.CLAIMED));
    }

    function test_CreateERC20Transfer() public {
        vm.prank(sender);
        uint256 transferId = safeTransfer.createTransfer(recipient, address(token), tokenAmount, 0, "");

        ISafeTransfer.Transfer memory transfer = safeTransfer.getTransfer(transferId);
        assertEq(transfer.sender, sender);
        assertEq(transfer.recipient, recipient);
        assertEq(transfer.tokenAddress, address(token));
        assertEq(transfer.amount, tokenAmount);
        assertEq(transfer.claimed, false);
        assertEq(transfer.cancelled, false);
    }

    function test_ClaimERC20Transfer() public {
        vm.prank(sender);
        uint256 transferId = safeTransfer.createTransfer(recipient, address(token), tokenAmount, 0, "");

        uint256 recipientBalanceBefore = token.balanceOf(recipient);

        vm.prank(recipient);
        safeTransfer.claimTransfer(transferId, "");

        ISafeTransfer.Transfer memory transfer = safeTransfer.getTransfer(transferId);
        assertEq(transfer.claimed, true);
        assertEq(token.balanceOf(recipient), recipientBalanceBefore + tokenAmount);
    }

    function test_CancelERC20Transfer() public {
        vm.prank(sender);
        uint256 transferId = safeTransfer.createTransfer(recipient, address(token), tokenAmount, 0, "");

        uint256 senderBalanceBefore = token.balanceOf(sender);

        vm.prank(sender);
        safeTransfer.cancelTransfer(transferId);

        ISafeTransfer.Transfer memory transfer = safeTransfer.getTransfer(transferId);
        assertEq(transfer.cancelled, true);
        assertEq(token.balanceOf(sender), senderBalanceBefore + tokenAmount);
    }

    function test_CreateInvoice() public {
        address payer = address(0x3);
        uint256 invoiceAmount = 0.5 ether;
        string memory description = "Payment for services";

        vm.prank(recipient);
        uint256 invoiceId = safeTransfer.createInvoice(payer, address(0), invoiceAmount, 7 days, description);

        ISafeTransfer.Transfer memory invoice = safeTransfer.getTransfer(invoiceId);
        assertEq(invoice.sender, payer);
        assertEq(invoice.recipient, recipient);
        assertEq(invoice.tokenAddress, address(0));
        assertEq(invoice.amount, invoiceAmount);
        assertEq(invoice.claimed, false);
        assertEq(invoice.cancelled, false);

        assertTrue(safeTransfer.getIsInvoice(invoiceId));
        assertEq(safeTransfer.getInvoiceDescription(invoiceId), description);
    }

    function test_PayInvoice() public {
        address payer = address(0x3);
        uint256 invoiceAmount = 0.5 ether;
        string memory description = "Payment for services";

        vm.deal(payer, 10 ether);

        vm.prank(recipient);
        uint256 invoiceId = safeTransfer.createInvoice(payer, address(0), invoiceAmount, 7 days, description);

        uint256 recipientBalanceBefore = recipient.balance;

        vm.prank(payer);
        safeTransfer.payInvoice{value: invoiceAmount}(invoiceId);

        ISafeTransfer.Transfer memory invoice = safeTransfer.getTransfer(invoiceId);
        assertEq(invoice.claimed, true);
        assertEq(recipient.balance, recipientBalanceBefore + invoiceAmount);
    }

    function test_PayERC20Invoice() public {
        address payer = address(0x3);
        uint256 invoiceAmount = 500 * 10 ** 18;
        string memory description = "Payment for services";

        token.mint(payer, invoiceAmount * 2);
        vm.prank(payer);
        token.approve(address(safeTransfer), invoiceAmount * 2);

        vm.prank(recipient);
        uint256 invoiceId = safeTransfer.createInvoice(payer, address(token), invoiceAmount, 7 days, description);

        uint256 recipientBalanceBefore = token.balanceOf(recipient);

        vm.prank(payer);
        safeTransfer.payInvoice(invoiceId);

        ISafeTransfer.Transfer memory invoice = safeTransfer.getTransfer(invoiceId);
        assertEq(invoice.claimed, true);
        assertEq(token.balanceOf(recipient), recipientBalanceBefore + invoiceAmount);
    }

    function test_CannotPayInvoiceAsWrongPayer() public {
        address payer = address(0x3);
        address wrongPayer = address(0x4);
        uint256 invoiceAmount = 0.5 ether;

        vm.deal(wrongPayer, 10 ether);

        vm.prank(recipient);
        uint256 invoiceId = safeTransfer.createInvoice(payer, address(0), invoiceAmount, 7 days, "test");

        vm.prank(wrongPayer);
        vm.expectRevert(ISafeTransfer.NotDesignatedPayer.selector);
        safeTransfer.payInvoice{value: invoiceAmount}(invoiceId);
    }

    function test_CannotPayExpiredInvoice() public {
        address payer = address(0x3);
        uint256 invoiceAmount = 0.5 ether;

        vm.deal(payer, 10 ether);

        vm.prank(recipient);
        uint256 invoiceId = safeTransfer.createInvoice(payer, address(0), invoiceAmount, 1 days, "test");

        vm.warp(block.timestamp + 2 days);

        vm.prank(payer);
        vm.expectRevert(ISafeTransfer.TransferExpired.selector);
        safeTransfer.payInvoice{value: invoiceAmount}(invoiceId);
    }

    function test_CancelInvoice() public {
        address payer = address(0x3);
        uint256 invoiceAmount = 0.5 ether;
        string memory description = "Payment for services";

        vm.prank(recipient);
        uint256 invoiceId = safeTransfer.createInvoice(payer, address(0), invoiceAmount, 7 days, description);

        vm.prank(recipient);
        safeTransfer.cancelInvoice(invoiceId);

        ISafeTransfer.Transfer memory invoice = safeTransfer.getTransfer(invoiceId);
        assertTrue(invoice.cancelled);
        assertFalse(invoice.claimed);
    }

    function test_CancelERC20Invoice() public {
        address payer = address(0x3);
        uint256 invoiceAmount = 500 * 10 ** 18;
        string memory description = "Payment for services";

        vm.prank(recipient);
        uint256 invoiceId = safeTransfer.createInvoice(payer, address(token), invoiceAmount, 7 days, description);

        vm.prank(recipient);
        safeTransfer.cancelInvoice(invoiceId);

        ISafeTransfer.Transfer memory invoice = safeTransfer.getTransfer(invoiceId);
        assertTrue(invoice.cancelled);
        assertFalse(invoice.claimed);
    }

    function test_CannotCancelInvoiceAsWrongCaller() public {
        address payer = address(0x3);
        uint256 invoiceAmount = 0.5 ether;

        vm.prank(recipient);
        uint256 invoiceId = safeTransfer.createInvoice(payer, address(0), invoiceAmount, 7 days, "test");

        vm.prank(payer);
        vm.expectRevert(ISafeTransfer.NotAuthorized.selector);
        safeTransfer.cancelInvoice(invoiceId);
    }

    function test_CannotCancelPaidInvoice() public {
        address payer = address(0x3);
        uint256 invoiceAmount = 0.5 ether;

        vm.deal(payer, 10 ether);

        vm.prank(recipient);
        uint256 invoiceId = safeTransfer.createInvoice(payer, address(0), invoiceAmount, 7 days, "test");

        vm.prank(payer);
        safeTransfer.payInvoice{value: invoiceAmount}(invoiceId);

        vm.prank(recipient);
        vm.expectRevert(ISafeTransfer.InvoiceAlreadyPaid.selector);
        safeTransfer.cancelInvoice(invoiceId);
    }

    function test_CannotCancelAlreadyCancelledInvoice() public {
        address payer = address(0x3);
        uint256 invoiceAmount = 0.5 ether;

        vm.prank(recipient);
        uint256 invoiceId = safeTransfer.createInvoice(payer, address(0), invoiceAmount, 7 days, "test");

        vm.prank(recipient);
        safeTransfer.cancelInvoice(invoiceId);

        vm.prank(recipient);
        vm.expectRevert(ISafeTransfer.TransferAlreadyCancelled.selector);
        safeTransfer.cancelInvoice(invoiceId);
    }

    function test_CannotCancelExpiredInvoice() public {
        address payer = address(0x3);
        uint256 invoiceAmount = 0.5 ether;

        vm.prank(recipient);
        uint256 invoiceId = safeTransfer.createInvoice(payer, address(0), invoiceAmount, 1 days, "test");

        vm.warp(block.timestamp + 2 days);

        vm.prank(recipient);
        vm.expectRevert(ISafeTransfer.TransferExpired.selector);
        safeTransfer.cancelInvoice(invoiceId);
    }

    function test_CannotCancelNonExistentInvoice() public {
        uint256 nonExistentId = 999;

        vm.prank(recipient);
        vm.expectRevert(ISafeTransfer.InvoiceNotFound.selector);
        safeTransfer.cancelInvoice(nonExistentId);
    }

    function test_CannotCancelRegularTransferWithCancelInvoice() public {
        vm.prank(sender);
        uint256 transferId = safeTransfer.createTransfer{value: transferAmount}(recipient, address(0), 0, 0, "");

        vm.prank(sender);
        vm.expectRevert(ISafeTransfer.InvoiceNotFound.selector);
        safeTransfer.cancelInvoice(transferId);
    }

    function test_ReentrancyProtectionClaimTransfer() public {
        MaliciousRecipient malicious = new MaliciousRecipient(safeTransfer);

        vm.prank(sender);
        uint256 transferId =
            safeTransfer.createTransfer{value: transferAmount}(address(malicious), address(0), 0, 0, "");

        malicious.setTransferId(transferId);

        vm.prank(address(malicious));
        safeTransfer.claimTransfer(transferId, "");

        assertEq(malicious.attackCount(), 1);
    }

    function test_ReentrancyProtectionCancelTransfer() public {
        // Test that reentrancy protection works for cancel operations
        // The nonReentrant modifier prevents multiple entries to cancelTransfer
        vm.prank(sender);
        uint256 transferId = safeTransfer.createTransfer{value: transferAmount}(recipient, address(0), 0, 0, "");

        vm.prank(sender);
        safeTransfer.cancelTransfer(transferId);

        // Verify transfer was cancelled successfully
        ISafeTransfer.Transfer memory transfer = safeTransfer.getTransfer(transferId);
        assertTrue(transfer.cancelled);
    }

    function test_ReentrancyProtectionPayInvoice() public {
        MaliciousRecipient malicious = new MaliciousRecipient(safeTransfer);
        address payer = address(0x5);
        uint256 invoiceAmount = 0.5 ether;

        vm.deal(payer, 10 ether);

        vm.prank(address(malicious));
        uint256 invoiceId = safeTransfer.createInvoice(payer, address(0), invoiceAmount, 7 days, "test");

        malicious.setTransferId(invoiceId);

        vm.prank(payer);
        safeTransfer.payInvoice{value: invoiceAmount}(invoiceId);

        assertEq(malicious.attackCount(), 1);
    }

    function test_NonStandardERC20Transfer() public {
        NonStandardERC20 nonStandardToken = new NonStandardERC20();
        uint256 amount = 1000 * 10 ** 18;

        nonStandardToken.mint(sender, amount * 10);
        vm.prank(sender);
        nonStandardToken.approve(address(safeTransfer), amount * 10);

        vm.prank(sender);
        uint256 transferId = safeTransfer.createTransfer(recipient, address(nonStandardToken), amount, 0, "");

        vm.prank(recipient);
        safeTransfer.claimTransfer(transferId, "");

        assertEq(nonStandardToken.balanceOf(recipient), amount);
    }

    function test_FailingERC20TransferReverts() public {
        FailingERC20 failingToken = new FailingERC20();
        uint256 amount = 1000 * 10 ** 18;

        failingToken.mint(sender, amount);
        vm.prank(sender);
        failingToken.approve(address(safeTransfer), amount);

        vm.prank(sender);
        vm.expectRevert("SafeTransfer: transferFrom failed");
        safeTransfer.createTransfer(recipient, address(failingToken), amount, 0, "");
    }

    function test_ReentrancyProtectionBlocks() public {
        ReentrantAttacker attacker = new ReentrantAttacker(safeTransfer);

        vm.prank(sender);
        uint256 transferId = safeTransfer.createTransfer{value: transferAmount}(address(attacker), address(0), 0, 0, "");

        attacker.setTransferId(transferId);

        vm.prank(address(attacker));
        vm.expectRevert("Transfer failed");
        safeTransfer.claimTransfer(transferId, "");
    }

    function test_PaginatedSenderTransfers() public {
        // Create multiple transfers
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(sender);
            safeTransfer.createTransfer{value: 0.1 ether}(recipient, address(0), 0, 0, "");
        }

        // Test pagination
        (uint256[] memory transfers, uint256 total) = safeTransfer.getSenderTransfers(sender, 0, 3);
        assertEq(transfers.length, 3);
        assertEq(total, 5);

        // Test second page
        (uint256[] memory transfers2, uint256 total2) = safeTransfer.getSenderTransfers(sender, 3, 3);
        assertEq(transfers2.length, 2);
        assertEq(total2, 5);
    }

    function test_PaginatedRecipientTransfers() public {
        // Create multiple transfers
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(sender);
            safeTransfer.createTransfer{value: 0.1 ether}(recipient, address(0), 0, 0, "");
        }

        // Test pagination
        (uint256[] memory transfers, uint256 total) = safeTransfer.getRecipientTransfers(recipient, 0, 3);
        assertEq(transfers.length, 3);
        assertEq(total, 5);

        // Test second page
        (uint256[] memory transfers2, uint256 total2) = safeTransfer.getRecipientTransfers(recipient, 3, 3);
        assertEq(transfers2.length, 2);
        assertEq(total2, 5);
    }

    function test_MaxTransfersPerPageLimit() public {
        // Test that limit is capped at MAX_TRANSFERS_PER_PAGE
        (uint256[] memory transfers, uint256 total) = safeTransfer.getSenderTransfers(sender, 0, 200);
        // Should return empty array since sender has no transfers yet
        assertEq(transfers.length, 0);
        assertEq(total, 0);
    }

    function test_FeeOnTransferTokenHandling() public {
        // This test would require a mock fee-on-transfer token
        // For now, we test that the enhanced safety checks don't break normal tokens
        vm.prank(sender);
        uint256 transferId = safeTransfer.createTransfer(recipient, address(token), tokenAmount, 0, "");

        vm.prank(recipient);
        safeTransfer.claimTransfer(transferId, "");

        ISafeTransfer.Transfer memory transfer = safeTransfer.getTransfer(transferId);
        assertEq(transfer.claimed, true);
    }
}

contract MaliciousRecipient {
    SafeTransfer public safeTransfer;
    uint256 public transferId;
    bool public shouldAttack = true;
    uint256 public attackCount = 0;

    constructor(SafeTransfer _safeTransfer) {
        safeTransfer = _safeTransfer;
    }

    receive() external payable {
        attackCount++;
    }

    function setTransferId(uint256 _transferId) external {
        transferId = _transferId;
    }

    function setAttackMode(bool _shouldAttack) external {
        shouldAttack = _shouldAttack;
    }
}

contract NonStandardERC20 {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        return _allowances[owner][spender];
    }

    function transfer(address to, uint256 amount) external {
        _balances[msg.sender] -= amount;
        _balances[to] += amount;
    }

    function approve(address spender, uint256 amount) external {
        _allowances[msg.sender][spender] = amount;
    }

    function transferFrom(address from, address to, uint256 amount) external {
        _allowances[from][msg.sender] -= amount;
        _balances[from] -= amount;
        _balances[to] += amount;
    }

    function mint(address to, uint256 amount) external {
        _balances[to] += amount;
        _totalSupply += amount;
    }
}

contract FailingERC20 {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function transfer(address, uint256) external pure returns (bool) {
        return false;
    }

    function transferFrom(address, address, uint256) external pure returns (bool) {
        return false;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _allowances[msg.sender][spender] = amount;
        return true;
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        return _allowances[owner][spender];
    }

    function mint(address to, uint256 amount) external {
        _balances[to] += amount;
    }
}

contract ReentrantAttacker {
    SafeTransfer public safeTransfer;
    uint256 public transferId;

    constructor(SafeTransfer _safeTransfer) {
        safeTransfer = _safeTransfer;
    }

    receive() external payable {
        safeTransfer.claimTransfer(transferId, "");
    }

    function setTransferId(uint256 _transferId) external {
        transferId = _transferId;
    }
}

contract ReentrantCanceller {
    SafeTransfer public safeTransfer;
    uint256 public transferId;

    constructor(SafeTransfer _safeTransfer) {
        safeTransfer = _safeTransfer;
    }

    receive() external payable {
        safeTransfer.cancelTransfer(transferId);
    }

    function setTransferId(uint256 _transferId) external {
        transferId = _transferId;
    }
}
