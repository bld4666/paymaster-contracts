// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./BasePaymaster.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./Helpers.sol";

error InsufficientMaxCost();

contract ERC20Paymaster is BasePaymaster {
	IERC20 public erc20Token;

	constructor(IEntryPoint _entryPoint, address _t) BasePaymaster(_entryPoint) {
        erc20Token = IERC20(_t);
    }

    function setToken(address _t) public onlyOwner {
    	erc20Token = IERC20(_t);
    }

    /// implement your gas payment logic here
    function _validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) internal virtual override returns (bytes memory context, uint256 validationData) {
        SafeERC20.safeTransferFrom(erc20Token, userOp.sender, address(this), maxCost);
        context = abi.encode(userOp.sender, maxCost);
        validationData = _packValidationData(
            false,
            0,
            0
        );
    }

    function withdrawToken(
        address payable withdrawAddress,
        uint256 amount
    ) public onlyOwner {
    	SafeERC20.safeTransfer(erc20Token, withdrawAddress, amount);
    }

    function _postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost,
        uint256 actualUserOpFeePerGas
    ) internal virtual override {
    	if (mode == PostOpMode.opSucceeded || mode == PostOpMode.opReverted) {
	    	(address sender, uint256 maxCost) = abi.decode(context, (address, uint256));
            if (maxCost < actualGasCost) revert InsufficientMaxCost();
	        SafeERC20.safeTransfer(erc20Token, sender, maxCost - actualGasCost);
	    }
    }
}
