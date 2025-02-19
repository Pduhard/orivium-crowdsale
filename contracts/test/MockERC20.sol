// contracts/token/test/MockERC20.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Burnable } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract MockERC20 is ERC20, ERC20Burnable {
	uint8 private immutable _decimals;

	constructor(
		uint256 initialSupply,
		uint8 tokenDecimals,
		string memory name,
		string memory symbol
	) ERC20(name, symbol) {
		_decimals = tokenDecimals;
		_mint(_msgSender(), initialSupply);
	}

	function decimals() public view override returns (uint8) {
		return _decimals;
	}

	function mint(address beneficiary, uint amount) public {
		_mint(beneficiary, amount);
	}
}
