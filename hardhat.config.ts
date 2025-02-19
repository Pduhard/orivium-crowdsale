import type { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-ethers";
import "@nomiclabs/hardhat-solhint"
import "@nomicfoundation/hardhat-toolbox"
import "@nomicfoundation/hardhat-ledger";
import '@typechain/hardhat';

import { EthGasReporterConfig } from "hardhat-gas-reporter/dist/src/types";
import "hardhat-gas-reporter"
import "hardhat-deploy"
import 'hardhat-deploy-ethers';

import "./tasks/crowdsale"
import "./tasks/vesting"
import "./tasks/contract-addresses"
import "./tasks"

import dotenv from "dotenv"
dotenv.config()

const FORKING_BLOCK_NUMBER = parseInt(process.env["FORKING_BLOCK_NUMBER"] ?? "0")

const ETHERSCAN_API_KEY = process.env["ETHERSCAN_API_KEY"] ?? "Your etherscan API key"
const REPORT_GAS = process.env["REPORT_GAS"]?.toLocaleLowerCase() === "true"

const gasReporter: EthGasReporterConfig = {
    enabled: REPORT_GAS,
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
    token: "ETH",
};

if (process.env["COINMARKETCAP_API_KEY"]) {
    gasReporter.coinmarketcap = process.env["COINMARKETCAP_API_KEY"];
}

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 100000,
            },
        },
    },
    networks: {
        hardhat: {
            hardfork: "merge",
            forking: {
                url: "https://ethereum.publicnode.com",
                blockNumber: FORKING_BLOCK_NUMBER,
                enabled: false, // set this to true to enable forking
            },
            chainId: 31337,
        },
        localhost: {
            chainId: 31337,
        },
        goerli: {
            url: "https://ethereum-goerli.publicnode.com",
            chainId: 5,
        },
        arbitrumGoerli: {
            url: "https://goerli-rollup.arbitrum.io/rpc",
            chainId: 421613,
        },
        mainnet: {
            url: "https://ethereum.publicnode.com",
            chainId: 1,
        },
        arbitrum: {
            url: "https://arbitrum-one.publicnode.com",
            chainId: 42161,
        },
    },
    defaultNetwork: "hardhat",
    etherscan: {
        // pnpm hardhat verify --network <NETWORK> <CONTRACT_ADDRESS> <CONSTRUCTOR_PARAMETERS>
        apiKey: {
            // npx hardhat verify --list-networks
            mainnet: ETHERSCAN_API_KEY,
        },
    },
    gasReporter,
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./build/cache",
        artifacts: "./build/artifacts",
    },
    mocha: {
        timeout: 300000, // 300 seconds max for running tests
    },
    typechain: {
      outDir: './typechain/src',
      target: 'ethers-v6',
      alwaysGenerateOverloads: false, // should overloads with full signatures like deposit(uint256) be generated always, even if there are no overloads?
      externalArtifacts: ['externalArtifacts/*.json'], // optional array of glob patterns with external artifacts to process (for example external libs from node_modules)
      dontOverrideCompile: false // defaults to false
    },
    namedAccounts: {
        deployer: {
            default: 0, // here this will by default take the first account as deployer
            1: 0, // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured, the account 0 on one network can be different than on another
        },
        crowdsaleFundsCollector: {
            default: 1,
        },
        crowdsaleBuyer: {
            default: 2,
        },
    },
};

export default config;
