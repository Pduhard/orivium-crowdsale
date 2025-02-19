import { HardhatRuntimeEnvironment } from "hardhat/types"

import "@nomicfoundation/hardhat-toolbox"
import {
    CrowdsaleL1__factory,
    CrowdsaleL2__factory,
} from "../../typechain"

import {
    networkConfig,
    developmentChains,
} from "../../helper-hardhat-config"

export const getCrowdsale = async (hre: HardhatRuntimeEnvironment) => {    
    const accounts = await hre.ethers.getSigners();
    const signer = accounts[0];

    const chainId = hre.network.config.chainId;
    if (!chainId) {
        console.log("failed no chainId");
        return;
    }
    const chain = networkConfig[chainId];
    if (!chain) {
        console.log("failed no chain");
        return;
    }

    if (developmentChains.includes(chain.name) || chain.name.includes("arbitrum")) {
        const crowdsaleAddress = (await hre.deployments.get("CrowdsaleL2")).address;
        return CrowdsaleL2__factory.connect(crowdsaleAddress, signer);
    } else {
        const crowdsaleAddress = (await hre.deployments.get("CrowdsaleL1")).address;
        return CrowdsaleL1__factory.connect(crowdsaleAddress, signer);
    }
};
