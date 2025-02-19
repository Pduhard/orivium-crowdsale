
import { task } from "hardhat/config"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import "@nomicfoundation/hardhat-toolbox"
import {
    Vesting,
    Vesting__factory,
} from "../../typechain"

task("vesting:set-vesting-start", "set vesting start timestamp")
    .addParam("date", "date of vesting start in the forme 2023-08-23-16-42 (yyyy-mm-dd-hh-mm)")
    .setAction(async (taskArguments: TaskArguments, hre: HardhatRuntimeEnvironment) => {
        const dateString = taskArguments.date;

        const [year, month, day, hour, minute] = dateString.split("-");

        if (undefined === year || undefined === month || undefined === day || undefined === hour || undefined === minute) {
            console.log("wrong date format");
            return;
        }
        const dateObject = new Date(year, month - 1, day, hour, minute);
        
        const timestampInSeconds = Math.floor(dateObject.getTime() / 1000);
        const vestingAddress = (await hre.deployments.get("Vesting")).address;
        const accounts = await hre.ethers.getSigners();
        const signer = accounts[0];

        const vesting: Vesting = Vesting__factory.connect(vestingAddress, signer);
        await vesting.setVestingStart(timestampInSeconds);
        console.log("vesting now start at", taskArguments.date);
});