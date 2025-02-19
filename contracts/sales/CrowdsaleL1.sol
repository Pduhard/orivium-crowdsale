// contracts/sales/Crowdsale.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Context } from "@openzeppelin/contracts/utils/Context.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import { AccessControlEnumerable } from "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import { Pausable } from "@openzeppelin/contracts/security/Pausable.sol";

import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import { Vesting } from "./Vesting.sol";

/**
 * @title Orivium Token Crowdsale
 */
contract CrowdsaleL1 is
	Context,
	ReentrancyGuard,
	AccessControlEnumerable,
	Pausable
{
	using SafeERC20 for ERC20;

	/**
	 * @notice Role PAUSER_ROLE allows to pause and unpause crowdsale
	 */
	bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

	/**
	 * @notice Role CROWDSALE_ADMIN_ROLE allows to step into next phase
	 */
	bytes32 public constant CROWDSALE_ADMIN_ROLE =
		keccak256("CROWDSALE_ADMIN_ROLE");

	AggregatorV3Interface internal immutable ethPriceFeed;
	AggregatorV3Interface internal immutable usdtPriceFeed;

	/**
	 * @notice usdt token address
	 */
	ERC20 public immutable usdt;

	/**
	 * @notice funds collector wallet address
	 */
	address payable public immutable fundsCollector;

	/**
	 * @notice maximum buyable amount by wallet by phase
	 */
	uint256 public immutable maxBuyableAmount;

	/**
	 * @notice minimum buyable amount by wallet by phase
	 */
	uint256 public immutable minBuyableAmount;

	/**
	 * @notice phase structure contains:
	 * 		- rate used to compute ori price
	 * 		- bought amount by wallet
	 */
	struct Phase {
		/**
		 * @notice rate used to compute ori price
		 */
		uint rate;
		/**
		 * @notice bought amount by wallet
		 */
		mapping(address => uint) boughtAmounts;
	}

	/**
	 * @notice array containing information about crowdsale phases
	 */
	Phase[3] public phases;

	/**
	 * @notice Index of the current phase
	 */
	uint public phaseIndex;

	/**
	 * @notice orivium token vesting contract address
	 */
	Vesting public immutable vesting;

	/**
	 * Event for token purchase logging
	 * @param purchaser who paid for the tokens
	 * @param value weis paid for purchase
	 * @param amount amount of tokens purchased
	 * @param currency currency used to process purchase
	 * @param sponsorKey sponsor key (grant advantages on orivium nfts)
	 */
	event TokenPurchased(
		address indexed purchaser,
		uint value,
		uint amount,
		string currency,
		string sponsorKey
	);

	constructor(
		uint[3] memory _phaseRates,
		address _usdt,
		address payable _fundsCollector,
		address _vesting,
		address _ethPriceFeed,
		address _usdtPriceFeed,
		uint _maxBuyableAmount,
		uint _minBuyableAmount
	) Pausable() {
		require(
			_fundsCollector != address(0),
			"Crowdsale: funds collector is the zero address"
		);
		require(
			_usdt != address(0),
			"Crowdsale: usdt token is the zero address"
		);
		require(
			_vesting != address(0),
			"Crowdsale: vesting is the zero address"
		);
		require(
			_ethPriceFeed != address(0),
			"Crowdsale: eth price feed is the zero address"
		);
		require(
			_usdtPriceFeed != address(0),
			"Crowdsale: usdt price feed is the zero address"
		);
		require(
			_maxBuyableAmount > _minBuyableAmount,
			"Crowdsale: max buyable amount is lower than min buyable amount"
		);

		_grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
		for (uint i = 0; i < _phaseRates.length; i++) {
			phases[i].rate = _phaseRates[i];
		}
		phaseIndex = 0;
		fundsCollector = _fundsCollector;
		usdt = ERC20(_usdt);
		vesting = Vesting(_vesting);
		ethPriceFeed = AggregatorV3Interface(_ethPriceFeed);
		usdtPriceFeed = AggregatorV3Interface(_usdtPriceFeed);
		maxBuyableAmount = _maxBuyableAmount;
		minBuyableAmount = _minBuyableAmount;
	}

	/**
	 * @dev fallback function. Consider calling
	 * 		buyTokens directly when purchasing tokens from a contract.
	 */
	receive() external payable {
		buyTokens();
	}

	fallback() external payable {
		buyTokens();
	}

	function buyTokens() public payable {
		return buyTokens("0000000000");
	}

	/**
	 * @notice buy orivium token with ETH
	 *
	 * @notice This function has a non-reentrancy guard, so it shouldn't be called by
	 * 		another `nonReentrant` function.
	 */
	function buyTokens(
		string memory sponsorKey
	) public payable nonReentrant whenNotPaused {
		uint weiAmount = msg.value;
		address beneficiary = _msgSender();

		require(weiAmount != 0, "Crowdsale: weiAmount is 0");
		require(
			bytes(sponsorKey).length == 10,
			"Crowdsale: bad sponsorKey format, it should contain 10 characters"
		);

		uint tokenAmount = getORIAmountForETH(weiAmount);
		require(
			tokenAmount >= getMinimumBuyableAmount(),
			"Crowdsale: subceed minimum amount of token buyable for this phase"
		);

		uint buyableAmount = getBuyableAmount(beneficiary);
		require(
			buyableAmount >= tokenAmount,
			"Crowdsale: exceed maximum amount of token buyable for this phase"
		);
		_currentPhase().boughtAmounts[beneficiary] += tokenAmount;

		emit TokenPurchased(
			_msgSender(),
			weiAmount,
			tokenAmount,
			"ETH",
			sponsorKey
		);

		_vestToken(beneficiary, tokenAmount);

		fundsCollector.transfer(weiAmount);
	}

	function buyTokensWithUSDT(uint weiAmount) public payable {
		return buyTokensWithUSDT(weiAmount, "0000000000");
	}

	/**
	 * @notice buy orivium token with USDT
	 *
	 * @notice This function has a non-reentrancy guard, so it shouldn't be called by
	 * 		another `nonReentrant` function.
	 */
	function buyTokensWithUSDT(
		uint weiAmount,
		string memory sponsorKey
	) public payable nonReentrant whenNotPaused {
		address beneficiary = _msgSender();

		require(weiAmount != 0, "Crowdsale: weiAmount is 0");
		require(
			bytes(sponsorKey).length == 10,
			"Crowdsale: bad sponsorKey format, it should contain 10 characters"
		);

		uint tokenAmount = getORIAmountForUSDT(weiAmount);
		require(
			tokenAmount >= getMinimumBuyableAmount(),
			"Crowdsale: subceed minimum amount of token buyable for this phase"
		);

		uint buyableAmount = getBuyableAmount(beneficiary);
		require(
			buyableAmount >= tokenAmount,
			"Crowdsale: exceed maximum amount of token buyable for this phase"
		);
		_currentPhase().boughtAmounts[beneficiary] += tokenAmount;

		emit TokenPurchased(
			_msgSender(),
			weiAmount,
			tokenAmount,
			"USDT",
			sponsorKey
		);

		_vestToken(beneficiary, tokenAmount);

		usdt.safeTransferFrom(_msgSender(), fundsCollector, weiAmount);
	}

	/**
	 * @notice get remaining buyable amount for given addres on current phase
	 */
	function getBuyableAmount(address beneficiary) public view returns (uint) {
		Phase storage phase = _currentPhase();
		return
			getORIAmountForUSD(maxBuyableAmount) -
			phase.boughtAmounts[beneficiary];
	}

	/**
	 * @notice get minimal amount to buy
	 */
	function getMinimumBuyableAmount() public view returns (uint) {
		return getORIAmountForUSD(minBuyableAmount);
	}

	/**
	 * @notice get ETH price for given wei amount in ORI
	 */
	function getETHPriceFor(uint weiAmount) public view returns (uint) {
		uint weiUsdByEth = _getLatestETHPriceFeed();
		uint usdPrice = getUSDPriceFor(weiAmount);
		return (usdPrice * (10 ** 18)) / weiUsdByEth;
	}

	/**
	 * @notice get ORI amount for given ETH wei amount
	 */
	function getORIAmountForETH(uint weiAmount) public view returns (uint) {
		uint weiUsdByEth = _getLatestETHPriceFeed();
		uint usdPrice = (weiAmount * weiUsdByEth) / (10 ** 18);
		return getORIAmountForUSD(usdPrice);
	}

	/**
	 * @notice get ETH price for given wei amount in USDT
	 */
	function getUSDTPriceFor(uint weiAmount) public view returns (uint) {
		uint weiUsdByUsdt = _getLatestUSDTPriceFeed();
		uint usdPrice = getUSDPriceFor(weiAmount);
		return (usdPrice * (10 ** usdt.decimals())) / weiUsdByUsdt;
	}

	/**
	 * @notice get ORI amount for given USDT wei amount
	 */
	function getORIAmountForUSDT(uint weiAmount) public view returns (uint) {
		uint weiUsdByUsdt = _getLatestUSDTPriceFeed();
		uint usdPrice = (weiAmount * weiUsdByUsdt) / (10 ** usdt.decimals());
		return getORIAmountForUSD(usdPrice);
	}

	/**
	 * @notice get ETH price for given wei amount in USD
	 */
	function getUSDPriceFor(uint weiAmount) public view returns (uint) {
		return weiAmount / rate();
	}

	/**
	 * @notice get ORI amount for given USD wei amount
	 */
	function getORIAmountForUSD(uint weiAmount) public view returns (uint) {
		return weiAmount * rate();
	}

	/**
	 * @notice step into next phase
	 */
	function updateRate() external onlyRole(CROWDSALE_ADMIN_ROLE) {
		require(phaseIndex < 2, "Crowdsale: cannot exceed phase 3");
		phaseIndex = phaseIndex + 1;
	}

	/**
	 * @notice pause crowdsale
	 */
	function pause() external onlyRole(PAUSER_ROLE) {
		_pause();
	}

	/**
	 * @notice unpause crowdsale
	 */
	function unpause() external onlyRole(PAUSER_ROLE) {
		_unpause();
	}

	/**
	 * @notice get current USD/ORI conversion rate
	 */
	function rate() public view returns (uint) {
		return _currentPhase().rate;
	}

	function _vestToken(address beneficiary, uint tokenAmount) internal {
		vesting.vest(beneficiary, tokenAmount);
	}

	function _currentPhase() internal view returns (Phase storage) {
		return phases[phaseIndex];
	}

	function _getLatestETHPriceFeed() internal view returns (uint) {
		return _getLatestPriceFeed(ethPriceFeed);
	}

	function _getLatestUSDTPriceFeed() internal view returns (uint) {
		return _getLatestPriceFeed(usdtPriceFeed);
	}

	function _getLatestPriceFeed(
		AggregatorV3Interface priceFeed
	) internal view returns (uint) {
		(, int answer, , , ) = priceFeed.latestRoundData();
		return uint(answer);
	}
}
