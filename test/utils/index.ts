import hh from 'hardhat'

const getNamedAccounts = async () => {
    const {
        deployer: deployerAdrress,
        crowdsaleBuyer: crowdsaleBuyerAddress,
        crowdsaleFundsCollector: crowdsaleFundsCollectorAddress
    } = await hh.getNamedAccounts();

    if (!deployerAdrress || !crowdsaleBuyerAddress || !crowdsaleFundsCollectorAddress) {
        throw new Error("Missing required named accounts");
    }
    return {
        deployerAdrress,
        crowdsaleBuyerAddress,
        crowdsaleFundsCollectorAddress,
    }
}

export {
    getNamedAccounts,
};

