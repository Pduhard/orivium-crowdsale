
import { task } from "hardhat/config"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import "@nomicfoundation/hardhat-toolbox"
import {
    CrowdsaleL1,
    CrowdsaleL2,
} from "../../typechain"

import { getCrowdsale } from "./utils";

task("crowdsale:addresses", "Update Crowdsale Phase")
    .setAction(async (_: TaskArguments, hre: HardhatRuntimeEnvironment) => {
        const crowdsale = <CrowdsaleL1>await getCrowdsale(hre);
        console.log(`crowdsale: ${await crowdsale.getAddress()}`);
        console.log(`vesting: ${await crowdsale.vesting()}`);
        console.log(`usdt: ${await crowdsale.usdt()}`);
        if (hre.network.config.chainId === 42161) {
            console.log(`arb: ${await (<CrowdsaleL2>crowdsale).arb()}`);
        }
});