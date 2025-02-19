
import { task } from "hardhat/config"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import "@nomicfoundation/hardhat-toolbox"
import {
    CrowdsaleL1,
} from "../../typechain"

import { getCrowdsale } from "./utils";

task("crowdsale:buy", "buy ori token with given amount of eth")
    .addParam("amount", "amount of eth")
    .setAction(async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) => {
        const crowdsale = <CrowdsaleL1>await getCrowdsale(hre);
        const weiAmount = hre.ethers.parseEther(taskArgs.amount);
        await crowdsale["buyTokens()"]({ value: weiAmount });
        console.log(`buying ${taskArgs.amount} eth (${weiAmount} wei)`);
});