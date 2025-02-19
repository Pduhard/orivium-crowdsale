
import { task } from "hardhat/config"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import "@nomicfoundation/hardhat-toolbox"
import {
    CrowdsaleL2,
} from "../../typechain"

import { getCrowdsale } from "./utils";

task("crowdsale:amount-for-arb", "ori amount for arb")
    .addParam("arb", "arb amount")
    .setAction(async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) => {
        const crowdsale = <CrowdsaleL2>await getCrowdsale(hre);
        console.log(await crowdsale.getORIAmountForARB(taskArgs.arb));
});