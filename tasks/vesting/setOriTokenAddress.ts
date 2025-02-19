
import { task } from "hardhat/config"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import "@nomicfoundation/hardhat-toolbox"
import {
    Vesting,
    Vesting__factory,
} from "../../typechain"

task("vesting:set-ori-token", "set ori token address")
    .addParam("ori", "ori token contract address")
    .setAction(async (taskArguments: TaskArguments, hre: HardhatRuntimeEnvironment) => {
        const vestingAddress = (await hre.deployments.get("Vesting")).address;
        const accounts = await hre.ethers.getSigners();
        const signer = accounts[0];

        const vesting: Vesting = Vesting__factory.connect(vestingAddress, signer);
        await vesting.setOriTokenAddress(taskArguments.ori);
        console.log("Ori token address set into vesting contract", taskArguments.ori);
});