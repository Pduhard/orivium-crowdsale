import { DeployFunction } from "hardhat-deploy/types"
import {
    networkConfig,
    developmentChains,
} from "../helper-hardhat-config"
import { MockERC20 } from "../typechain";

const MOCK_USDT_INITIAL_SUPPLY = "100000000000000000000000000000000";
const MOCK_ARB_INITIAL_SUPPLY = "1000000000000000000000000000000000";

const deployFunction: DeployFunction = async ({ ethers, getNamedAccounts, deployments, network }) => {
    const { deploy, log } = deployments
    const { deployer, crowdsaleBuyer } = await getNamedAccounts()
    if (!deployer) return;
    
    const chainId: number | undefined = network.config.chainId
    if (!chainId) return;
    const chain = networkConfig[chainId]
    if (!chain) return;

    // If we are on a local development network, we need to deploy mocks!
    if (!developmentChains.includes(chain.name)) return;
    log('Local network detected! Deploying mocks...')

    const MockUSDTAggregator = await deploy('MockV3Aggregator', {
        contract: 'MockV3Aggregator',
        from: deployer,
        log: true,
        args: ["8", "100000000"],
    });
    await deployments.save('MockUSDTAggregator', { abi: MockUSDTAggregator.abi, address: MockUSDTAggregator.address });

    const MockETHAggregator = await deploy('MockV3Aggregator', {
        contract: 'MockV3Aggregator',
        from: deployer,
        log: true,
        args: ["8", "167035214700"],
    });
    await deployments.save('MockETHAggregator', { abi: MockETHAggregator.abi, address: MockETHAggregator.address });

    const MockARBAggregator = await deploy('MockV3Aggregator', {
        contract: 'MockV3Aggregator',
        from: deployer,
        log: true,
        args: ["8", "98149200"],
    });
    await deployments.save('MockARBAggregator', { abi: MockARBAggregator.abi, address: MockARBAggregator.address });

    const MockUsdtToken = await deploy('MockERC20', {
        contract: 'MockERC20',
        from: deployer,
        log: true,
        args: [MOCK_USDT_INITIAL_SUPPLY, 6, "Mock Tether USD", "MUSDT"],
    });
    await deployments.save('MockUSDT', { abi: MockUsdtToken.abi, address: MockUsdtToken.address });

    const MockArbToken = await deploy('MockERC20', {
        contract: 'MockERC20',
        from: deployer,
        log: true,
        args: [MOCK_ARB_INITIAL_SUPPLY, 18, "Mock Arbitrum", "MARB"],
    });
    await deployments.save('MockARB', { abi: MockArbToken.abi, address: MockArbToken.address });

    const usdt: MockERC20 = await ethers.getContract("MockUSDT");
    const arb: MockERC20 = await ethers.getContract("MockARB");
    await arb.mint(crowdsaleBuyer ?? deployer, "10000000000000000000000000");
    await usdt.mint(crowdsaleBuyer ?? deployer, "10000000000000000000000000");

    log('Mocks Deployed!')
    log('----------------------------------------------------')
    log('You are deploying to a local network, you\'ll need a local network running to interact')
    log("Please run 'pnpm hardhat console' to interact with the deployed smart contracts!")
    log('----------------------------------------------------')
}

export default deployFunction
deployFunction.tags = ['all', 'mocks', 'token-sales', 'main']