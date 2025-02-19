import { task } from "hardhat/config"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"

task("accounts", "Prints the list of accounts").setAction(
    async (_: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<void> => {
        const accounts: SignerWithAddress[] = await hre.ethers.getSigners()

        for (const account of accounts) {
            console.log(account.address)
        }
    }
)