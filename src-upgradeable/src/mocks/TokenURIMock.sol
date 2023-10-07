// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { ITokenURI } from "../interfaces/ITokenURI.sol";

contract TokenURIMock is ITokenURI {
    function tokenURI(uint256 tokenId) external pure override returns (string memory) {
        return "https://example.com";
    }
}
