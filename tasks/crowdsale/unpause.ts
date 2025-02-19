
import { task } from "hardhat/config"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import "@nomicfoundation/hardhat-toolbox"
import {
    CrowdsaleL1,
} from "../../typechain"

import { getCrowdsale } from "./utils";

task("crowdsale:unpause", "unpause crowdsale")
    .setAction(async (_: TaskArguments, hre: HardhatRuntimeEnvironment) => {
        const crowdsale = <CrowdsaleL1>await getCrowdsale(hre);
        await crowdsale.unpause();
        console.log("crowdsale unpaused succefully")
});