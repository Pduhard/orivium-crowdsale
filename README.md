# Orivium Crowdsale 🚀

**Warning: This project is no longer maintained. Do not interact with the smart contracts or use this code in production. ⚠️**

This project contains smart contracts for managing the Orivium crowdsale and vesting process.

Including Vesting.sol for scheduled token release and CrowdsaleL1.sol and CrowdsaleL2.sol for sales on Ethereum and Arbitrum networks with support for multiple cryptocurrencies. 🤖

## Usage 💡

### Compile Contracts 🛠️

To compile the smart contracts, run:
```sh
pnpm compile
```

### Run Tests ✅

To run the tests, use:
```sh
pnpm test
```

### Deploy Contracts 🚀

To deploy the contracts, execute:
```sh
pnpm deploy
```

### Start Local Node 🌐

To start a local Hardhat node, run:
```sh
pnpm start:local
```

### Generate Typechain Types 📜

To generate Typechain types, use:
```sh
pnpm typechain
```

## Tasks 🔧

Before using tasks, make sure to generate Typechain types:
```sh
pnpm typechain
```

You can use the different tasks defined in the `tasks/` directory from the terminal. For example:
```sh
npx hardhat run crowdsale:buy
```

To get the available tasks run

```sh
npx hardhat --help
```