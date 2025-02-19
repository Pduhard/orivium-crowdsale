import { DeployFunction } from "hardhat-deploy/types";

const deployFunction: DeployFunction = async({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    if (!deployer) return;

    await deploy("Vesting", {
        from: deployer,
        log: true,
    });
};

export default deployFunction;
deployFunction.tags = ['all', 'Vesting', 'token-sales', 'main'];

