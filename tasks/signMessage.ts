
import { task } from "hardhat/config"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import "@nomicfoundation/hardhat-toolbox"

task("sign-message", "sign given message")
    .addParam("message", "message to sign")
    .setAction(async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) => {
        const { ethers } = hre;
        const accounts = await ethers.getSigners();
        const signer = accounts[0];
        if (!signer) {
            throw new Error("missing signer");
        }
        const address = await signer.getAddress();
        const signature = await signer.signMessage(taskArgs.message);

        console.log(`address: ${address}`);
        console.log(`message: ${taskArgs.message}`);
        console.log(`signature: ${signature}`);
});