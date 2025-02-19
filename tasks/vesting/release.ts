import { task } from "hardhat/config"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import "@nomicfoundation/hardhat-toolbox"
import {
    Vesting,
    Vesting__factory,
} from "../../typechain"

task("vesting:release", "release ori token from vesting to beneficiary")
    .addParam("beneficiary", "beneficiary address")
    .setAction(async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) => {
        const vestingAddress = (await hre.deployments.get("Vesting")).address;
        const accounts = await hre.ethers.getSigners();
        const signer = accounts[0];

        const vesting: Vesting = Vesting__factory.connect(vestingAddress, signer);
        const releasableAmount = await vesting.getReleasableAmount(taskArgs.beneficiary);
        console.log(`releasing ${releasableAmount} for beneficiary ${taskArgs.beneficiary}...`);
        await vesting.release(taskArgs.beneficiary);
        console.log(`DONE !`);
});