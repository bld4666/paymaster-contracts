// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {PackedUserOperation} from "@openzeppelin/contracts/interfaces/draft-IERC4337.sol";
import {SignerECDSA} from "@openzeppelin/contracts/utils/cryptography/signers/SignerECDSA.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PaymasterERC20} from "@openzeppelin/community-contracts/account/paymaster/PaymasterERC20.sol";

contract Paymaster is PaymasterERC20, Ownable {
    IERC20 private immutable erc20Token;

    constructor(address initialOwner, address _token) Ownable(initialOwner) {
        erc20Token = IERC20(_token);
    }

    function _authorizeWithdraw() internal virtual override onlyOwner {}

    function liveness() public view virtual returns (uint256) {
        return 15 minutes; // Tolerate stale data
    }

    function _fetchDetails(
        PackedUserOperation calldata userOp,
        bytes32 /* userOpHash */
    ) internal view virtual override returns (uint256 validationData, IERC20 token, uint256 tokenPrice) {
        (uint256 validationData_, uint256 price) = (0,1);
        return (
            validationData_,
            erc20Token,
            price
        );
    }
}