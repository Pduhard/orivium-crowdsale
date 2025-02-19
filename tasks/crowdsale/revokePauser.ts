
import { task } from "hardhat/config"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import "@nomicfoundation/hardhat-toolbox"
import {
    CrowdsaleL1,
} from "../../typechain"

import { getCrowdsale } from "./utils";

task("crowdsale:revoke-pauser", "revoke PAUSER_ROLE role to address")
    .addParam("address", "user address")
    .setAction(async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) => {
        const crowdsale = <CrowdsaleL1>await getCrowdsale(hre);
        await crowdsale.revokeRole(await crowdsale.PAUSER_ROLE(), taskArgs.address);
        console.log(`address ${taskArgs.address} is no more PAUSER_ROLE`);
});