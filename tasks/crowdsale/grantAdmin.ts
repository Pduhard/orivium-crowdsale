
import { task } from "hardhat/config"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import "@nomicfoundation/hardhat-toolbox"
import {
    CrowdsaleL1,
} from "../../typechain"

import { getCrowdsale } from "./utils";

task("crowdsale:grant-admin", "grant CROWDSALE_ADMIN_ROLE role to address")
    .addParam("address", "user address")
    .setAction(async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) => {
        const crowdsale = <CrowdsaleL1>await getCrowdsale(hre);
        await crowdsale.grantRole(await crowdsale.CROWDSALE_ADMIN_ROLE(), taskArgs.address);
        console.log(`address ${taskArgs.address} is now CROWDSALE_ADMIN_ROLE`);
});