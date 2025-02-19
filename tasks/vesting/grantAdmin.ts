
import { task } from "hardhat/config"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import "@nomicfoundation/hardhat-toolbox"
import {
    Vesting,
    Vesting__factory,
} from "../../typechain"

task("vesting:grant-admin", "grant VESTING_ADMIN_ROLE role to address")
    .addParam("address", "user address")
    .setAction(async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) => {
        const vestingAddress = (await hre.deployments.get("Vesting")).address;
        const accounts = await hre.ethers.getSigners();
        const signer = accounts[0];

        const vesting: Vesting = Vesting__factory.connect(vestingAddress, signer);
        await vesting.grantRole(await vesting.VESTING_ADMIN_ROLE(), taskArgs.address);
        console.log(`address ${taskArgs.address} is now VESTING_ADMIN_ROLE`);
});