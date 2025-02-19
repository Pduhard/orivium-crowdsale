import { DeployFunction } from "hardhat-deploy/types";
import {
    networkConfig,
    developmentChains,
} from "../helper-hardhat-config"
import {
    Vesting
} from "@orivium/types"

const computeRate = (price: number) => {
    const wUsd = BigInt(price * (10 ** 8));
    const wOri = 10n ** 18n;
    return wOri / wUsd;
}

const RATE_PRIVATE_SALE = computeRate(0.10);
const RATE_PUBLIC_SALE_1 = computeRate(0.16);
const RATE_PUBLIC_SALE_2 = computeRate(0.32);

const deployFunction: DeployFunction = async({ ethers, getNamedAccounts, deployments, network }) => {
    const { deploy, get } = deployments;
    const { deployer, crowdsaleFundsCollector } = await getNamedAccounts();
    if (!deployer) {
        return;
    }

    const chainId = network.config.chainId;
    if (!chainId) {
        return;
    }
    const chain = networkConfig[chainId];
    if (!chain) {
        return;
    }
    
    let usdtTokenAddress;
    let arbTokenAddress;
    let ethUsdFeedAddress;
    let arbUsdFeedAddress;
    let usdtUsdFeedAddress;

    if (developmentChains.includes(chain.name)) {
        const mockUsdtToken = await get("MockUSDT");
        const mockArbToken = await get("MockARB");
        const MockETHAggregator = await get("MockETHAggregator");
        const MockARBAggregator = await get("MockARBAggregator");
        const MockUSDTAggregator = await get("MockUSDTAggregator");
        usdtTokenAddress = mockUsdtToken.address;
        arbTokenAddress = mockArbToken.address;
        ethUsdFeedAddress = MockETHAggregator.address;
        arbUsdFeedAddress = MockARBAggregator.address;
        usdtUsdFeedAddress = MockUSDTAggregator.address;
    } else {
        usdtTokenAddress = chain.usdtTokenAddress;
        arbTokenAddress = chain.arbTokenAddress;
        ethUsdFeedAddress = chain.ethUsdPriceFeed;
        arbUsdFeedAddress = chain.arbUsdPriceFeed;
        usdtUsdFeedAddress = chain.usdtUsdPriceFeed;
    }
    
    const vestingAddress = (await get("Vesting")).address;
    let crowdsaleResult;

    if (developmentChains.includes(chain.name) || chain.name.includes("arbitrum")) {
        crowdsaleResult = await deploy("CrowdsaleL2", {
            from: deployer,
            args: [
                [
                    RATE_PRIVATE_SALE,
                    RATE_PUBLIC_SALE_1,
                    RATE_PUBLIC_SALE_2,
                ],
                usdtTokenAddress,
                arbTokenAddress,
                crowdsaleFundsCollector,
                vestingAddress,
                ethUsdFeedAddress,
                arbUsdFeedAddress, 
                usdtUsdFeedAddress,
                500000000000n,
                10000000000n
            ],
            log: true,
        });
    } else {
        crowdsaleResult = await deploy("CrowdsaleL1", {
            from: deployer,
            args: [
                [
                    RATE_PRIVATE_SALE,
                    RATE_PUBLIC_SALE_1,
                    RATE_PUBLIC_SALE_2,
                ],
                usdtTokenAddress,
                crowdsaleFundsCollector,
                vestingAddress,
                ethUsdFeedAddress,
                usdtUsdFeedAddress,
                500000000000n,
                10000000000n
            ],
            log: true,
        });

    }
    
    const vesting: Vesting = await ethers.getContract("Vesting");
    const VESTING_ROLE = await vesting.VESTING_ROLE();
    await vesting.grantRole(VESTING_ROLE, crowdsaleResult.address);
};

export default deployFunction;
deployFunction.tags = ['all', 'Crowdsale', 'token-sales', 'main'];

