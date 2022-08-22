// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import { TestHelper } from "test/foundry/utils/TestHelper.sol";

import { SeaDrop } from "seadrop/SeaDrop.sol";

import { ERC721SeaDrop } from "seadrop/ERC721SeaDrop.sol";

import { IERC721SeaDrop } from "seadrop/interfaces/IERC721SeaDrop.sol";

import { PublicDrop } from "seadrop/lib/SeaDropStructs.sol";

contract ERC721DropTest is TestHelper {
    SeaDrop seadrop;
    ERC721SeaDrop test;

    function setUp() public {
        // Deploy SeaDrop.
        seadrop = new SeaDrop();

        // Deploy test ERC721SeaDrop.
        address[] memory allowedSeaDrop = new address[](1);
        allowedSeaDrop[0] = address(seadrop);
        test = new ERC721SeaDrop("", "", address(this), allowedSeaDrop);

        // Set maxSupply to 1000.
        test.setMaxSupply(1000);

        // Set creator payout address.
        test.updateCreatorPayoutAddress(address(seadrop), creator);

        // Create public drop object.
        PublicDrop memory publicDrop = PublicDrop(
            0.1 ether, // mint price
            uint64(block.timestamp), // start time
            10, // max mints per wallet
            100, // fee (1%)
            false // if false, allow any fee recipient
        );

        // Impersonate test erc721 contract.
        vm.prank(address(test));

        // Set the public drop for the erc721 contract.
        seadrop.updatePublicDrop(publicDrop);
    }

    function testMintPublic(FuzzInputs memory args) public validateArgs(args) {
        PublicDrop memory publicDrop = seadrop.getPublicDrop(address(test));

        uint256 mintValue = args.numMints * publicDrop.mintPrice;

        hoax(args.minter, 100 ether);

        uint256 preMinterBalance = args.minter.balance;
        uint256 preFeeRecipientBalance = args.feeRecipient.balance;
        uint256 preCreatorBalance = creator.balance;

        seadrop.mintPublic{ value: mintValue }(
            address(test),
            args.feeRecipient,
            args.minter,
            args.numMints
        );

        // Check minter token balance increased.
        assertEq(test.balanceOf(args.minter), args.numMints);

        // Check minter ether balance decreased.
        assertEq(preMinterBalance - mintValue, args.minter.balance);

        // Check fee recipient ether balance increased.
        uint256 feeAmount = (mintValue * 100) / 10_000;
        assertEq(preFeeRecipientBalance + feeAmount, args.feeRecipient.balance);

        // Check creator ether balance increased.
        uint256 payoutAmount = mintValue - feeAmount;
        assertEq(preCreatorBalance + payoutAmount, creator.balance);
    }

    function testMintPublic_incorrectPayment(FuzzInputs memory args)
        public
        validateArgs(args)
    {
        PublicDrop memory publicDrop = seadrop.getPublicDrop(address(test));
        uint256 mintValue = args.numMints * publicDrop.mintPrice;

        vm.expectRevert(
            abi.encodeWithSelector(IncorrectPayment.selector, 1, mintValue)
        );

        hoax(args.minter, 100 ether);

        seadrop.mintPublic{ value: 1 wei }(
            address(test),
            args.feeRecipient,
            args.minter,
            args.numMints
        );
    }

    function testMintPublic_freeMint(FuzzInputs memory args)
        public
        validateArgs(args)
    {
        // Create public drop object with free mint.
        PublicDrop memory publicDrop = PublicDrop(
            0 ether, // mint price (free)
            uint64(block.timestamp), // start time
            10, // max mints per wallet
            100, // fee (1%)
            false // if false, allow any fee recipient
        );

        vm.prank(address(test));
        // Set the public drop for the erc721 contract.
        seadrop.updatePublicDrop(publicDrop);

        vm.prank(args.minter);

        seadrop.mintPublic(
            address(test),
            args.feeRecipient,
            args.minter,
            args.numMints
        );

        // Check minter token balance increased.
        assertEq(test.balanceOf(args.minter), args.numMints);
    }

    function testMintPublic_differentPayerThanMinter(FuzzInputs memory args)
        public
        validateArgs(args)
    {
        PublicDrop memory publicDrop = seadrop.getPublicDrop(address(test));

        address payer = makeAddr("payer");

        hoax(payer, 100 ether);

        uint256 mintValue = args.numMints * publicDrop.mintPrice;

        uint256 prePayerBalance = payer.balance;
        uint256 preFeeRecipientBalance = args.feeRecipient.balance;
        uint256 preCreatorBalance = creator.balance;

        seadrop.mintPublic{ value: mintValue }(
            address(test),
            args.feeRecipient,
            args.minter,
            args.numMints
        );

        // Check minter token balance increased.
        assertEq(test.balanceOf(args.minter), args.numMints);

        // Check payer ether balance decreased.
        assertEq(prePayerBalance - mintValue, payer.balance);

        // Check fee recipient ether balance increased.
        uint256 feeAmount = (mintValue * 100) / 10_000;
        assertEq(preFeeRecipientBalance + feeAmount, args.feeRecipient.balance);

        // Check creator ether balance increased.
        uint256 payoutAmount = mintValue - feeAmount;
        assertEq(preCreatorBalance + payoutAmount, creator.balance);
    }

    function testMintSeaDrop_revertNonSeaDrop(FuzzInputs memory args)
        public
        validateArgs(args)
    {
        PublicDrop memory publicDrop = seadrop.getPublicDrop(address(test));

        uint256 mintValue = args.numMints * publicDrop.mintPrice;

        vm.deal(args.minter, 100 ether);
        vm.expectRevert(IERC721SeaDrop.OnlySeaDrop.selector);

        test.mintSeaDrop{ value: mintValue }(args.minter, args.numMints);
    }
}
