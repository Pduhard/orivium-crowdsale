// contracts/sales/Vesting.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import { AccessControlEnumerable } from "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Orivium vesting contract for crowdsale
 *
 * @notice once purchased on crowdsale, this contrat is responsible to deliver token to purchaser
 * 		token will be available to claim as follow: 10% at vesting start timestamp then 2% each week
 */
contract Vesting is AccessControlEnumerable, ReentrancyGuard {
	using SafeERC20 for IERC20;

	/**
	 * @notice Role VESTING_ROLE allows to vest token for a beneficiary
	 */
	bytes32 public constant VESTING_ROLE = keccak256("VESTING_ROLE");

	/**
	 * @notice Role VESTING_ADMIN_ROLE allows to set ori token address and vesting start timestamp
	 */
	bytes32 public constant VESTING_ADMIN_ROLE =
		keccak256("VESTING_ADMIN_ROLE");

	/**
	 * @notice percentil of token releasable at vesting start timestamp
	 */
	uint256 public constant CLIFFING_PERCENT = 10;

	/**
	 * @notice Vesting duration in seconds
	 */
	uint256 public constant VESTING_DURATION = 60 * 60 * 24 * 7 * (90 / 2);

	/**
	 * @notice vesting start timestamp
	 * 		default to 2024, this will be changed to token release date
	 */
	uint256 public vestingStart = 1704063600;

	/**
	 * @notice orivium token address
	 */
	address public oriTokenAddress = address(0);

	/**
	 * @notice mapping to associate wallet address to vesting acount
	 */
	mapping(address => VestingAccount) private accounts;

	struct VestingAccount {
		/**
		 * @notice amount of token vested
		 */
		uint128 amount;
		/**
		 * @notice amount of token already released
		 */
		uint128 released;
	}

	/**
	 * Event for token released logging
	 * @param beneficiary who receive the token
	 * @param amount amount of tokens received
	 */
	event TokenReleased(address indexed beneficiary, uint amount);

	constructor() {
		_grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
	}

	/**
	 * @notice vest amount of token to a beneficiary
	 */
	function vest(
		address _beneficiary,
		uint256 _tokenAmount
	) public onlyRole(VESTING_ROLE) {
		accounts[_beneficiary].amount += uint128(_tokenAmount);
	}

	/**
	 * @notice get vesting account from beneficiary addres
	 */
	function getAccount(
		address _beneficiary
	) public view returns (VestingAccount memory) {
		return accounts[_beneficiary];
	}

	/**
	 * @notice release token to beneficiary
	 */
	function release(address _beneficiary) public nonReentrant {
		require(
			_beneficiary != address(0),
			"Vesting: beneficiary is zero address"
		);
		IERC20 token = IERC20(oriTokenAddress);
		uint256 releasableAmount = getReleasableAmount(_beneficiary);
		require(releasableAmount > 0, "Vesting: releasble amount is null");
		accounts[_beneficiary].released += uint128(releasableAmount);

		emit TokenReleased(_beneficiary, releasableAmount);

		token.safeTransfer(_beneficiary, releasableAmount);
	}

	/**
	 * @notice get releasable amount of token for a beneficiary
	 */
	function getReleasableAmount(
		address _beneficiary
	) public view returns (uint256) {
		VestingAccount memory account = accounts[_beneficiary];
		return _releasable(account);
	}

	/**
	 * @notice set ori token address
	 */
	function setOriTokenAddress(
		address _oriTokenAddress
	) external onlyRole(VESTING_ADMIN_ROLE) {
		require(
			_oriTokenAddress != address(0),
			"Crowdsale: cannot set ori token address to zero address"
		);
		oriTokenAddress = _oriTokenAddress;
	}

	function setVestingStart(
		uint256 _vestingStart
	) external onlyRole(VESTING_ADMIN_ROLE) {
		vestingStart = _vestingStart;
	}

	/**
	 * @notice Used to cancel tx in case of exceeding total amount of token during crowdsale,
	 * the fund used to purchase ori will be refund manually
	 *
	 * @param _beneficiary - address to refund
	 * @param _amountToDecrease - amount set manually (downgrade by the exceeding amount)
	 */
	function decreaseAmount(
		address _beneficiary,
		uint128 _amountToDecrease
	) external onlyRole(VESTING_ROLE) {
		require(
			accounts[_beneficiary].amount >= _amountToDecrease,
			"Vesting: amount to decrease is greater than account amount"
		);
		accounts[_beneficiary].amount -= _amountToDecrease;
	}

	function _releasable(
		VestingAccount memory _account
	) internal view returns (uint256) {
		if (block.timestamp < vestingStart) return 0;
		uint256 cliffingAmount = _getCliffingAmount(_account.amount);
		uint256 vestingAmount = _getVestingAmount(
			_account.amount - cliffingAmount
		);
		return cliffingAmount + vestingAmount - _account.released;
	}

	function _getCliffingAmount(
		uint256 _tokenAmount
	) internal pure returns (uint256) {
		return (_tokenAmount * CLIFFING_PERCENT) / 100;
	}

	function _getVestingAmount(
		uint256 _tokenAmount
	) internal view returns (uint256) {
		if (block.timestamp >= vestingStart + VESTING_DURATION) {
			return _tokenAmount;
		}
		return
			(_tokenAmount * (block.timestamp - vestingStart)) /
			VESTING_DURATION;
	}
}
