import { assert, expect } from 'chai'
import { Signer, ContractFactory, BigNumberish } from 'ethers'
import { deployments, ethers } from 'hardhat'
import {
    CrowdsaleL2,
    Vesting,
    MockERC20,
    MockV3Aggregator,
} from "@orivium/types"
import { ContractTransactionResponse } from 'ethers';
import { getNamedAccounts } from "../utils";

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

describe('ORI Crowdsale', async () => {
    let crowdsale: CrowdsaleL2;
    let crowdsaleAddress: string;
    let vesting: Vesting;
    let deployer: Signer;
    let crowdsaleBuyer: Signer;
    let deployerAdrress: string;
    let crowdsaleFundsCollectorAddress: string;
    let crowdsaleBuyerAddress: string;

    const workingWithToken = ({
        tokenName,
        tokenDecimals,
        balanceOf,
        getPriceFor,
        getORIAmountFor,
        buyTokens,
        aggregatorContractName,
        testValue,
    }: {
        tokenName: string,
        tokenDecimals: bigint,
        balanceOf: (wallet: string) => Promise<bigint>,
        getPriceFor: (weiAmount: BigNumberish) => Promise<bigint>,
        getORIAmountFor: (weiAmount: BigNumberish) => Promise<bigint>,
        buyTokens: (weiAmount: BigNumberish, sponsorKey?: string) => Promise<ContractTransactionResponse>,
        aggregatorContractName: string,
        testValue: bigint,
    }) => {

        describe(`${tokenName} price consumption`, async () => {
            it(`${tokenName} Price for 1 ORI should match ${tokenName} price for 0.10 USD`, async () => {
                const wOri = ethers.parseEther("1");
                const wei = await getPriceFor(wOri);

                const aggregator: MockV3Aggregator = await ethers.getContract(aggregatorContractName);
                const latestRoundData = await aggregator.latestRoundData();
                const wUSDT10Cents = 10000000n;
                const expectedEthPrice = wUSDT10Cents * (10n ** tokenDecimals) / latestRoundData.answer;
                assert.equal(wei, expectedEthPrice);
            });

            it(`ORI amount delivered for 1 ${tokenName} should match USD amount for 1 ${tokenName} / 10`, async () => {
                const wEth = ethers.parseUnits("1", tokenDecimals);
                const wei = await getORIAmountFor(wEth);
                const aggregator: MockV3Aggregator = await ethers.getContract(aggregatorContractName);
                const latestRoundData = await aggregator.latestRoundData();
                const expectedOriAmount = await crowdsale.getORIAmountForUSD(latestRoundData.answer);
                assert.equal(wei, expectedOriAmount);
            });
        });
        describe(`buyTokens with ${tokenName}`, async () => {
            let expectedTokenAmount: bigint;

            beforeEach(async () => {
                expectedTokenAmount = await getORIAmountFor(testValue);
            });
            it('should accept payments', async () => {
                await expect(buyTokens(testValue))
                    .to.emit(crowdsale, 'TokenPurchased');
            });

            it('reverts on zero-valued payments', async () => {
                await expect(buyTokens(0))
                    .to.be.revertedWith('Crowdsale: weiAmount is 0');
            });

            it('reverts when paused', async () => {
                await crowdsale.grantRole(await crowdsale.PAUSER_ROLE(), deployerAdrress);
                await crowdsale.pause(),
                await expect(buyTokens(testValue))
                    .to.be.revertedWith('Pausable: paused');
            });

            describe("sponsor key format", async () => {
                it('reject key under 10 character', async () => {
                    await expect(buyTokens(testValue, "012345678"))
                        .to.be.revertedWith("Crowdsale: bad sponsorKey format, it should contain 10 characters");
                });

                it('reject key over 10 character', async () => {
                    await expect(buyTokens(testValue, "01234567890"))
                        .to.be.revertedWith("Crowdsale: bad sponsorKey format, it should contain 10 characters");
                });


                it('accept 10 character key', async () => {
                    await expect(buyTokens(testValue, "0123456789"))
                        .to.emit(crowdsale, 'TokenPurchased').withArgs(
                            crowdsaleBuyerAddress,
                            testValue,
                            expectedTokenAmount,
                            tokenName,
                            "0123456789",
                        );
                });

            });

            describe('high-level purchase', async () => {
                it('should log purchase', async () => {
                    await expect(buyTokens(testValue))
                        .to.emit(crowdsale, 'TokenPurchased').withArgs(
                            crowdsaleBuyerAddress,
                            testValue,
                            expectedTokenAmount,
                            tokenName,
                            "0000000000",
                        );
                });
        
                it('should assign tokens to sender vesting account', async () => {
                    await buyTokens(testValue);
                    const vestingAccount = await vesting.getAccount(crowdsaleBuyerAddress);
                    const totalVestingAmount = vestingAccount.amount;
                    expect(totalVestingAmount).to.equal(expectedTokenAmount);
                });
        
                it('should forward funds to wallet', async () => {
                    const initialBalance = await balanceOf(crowdsaleFundsCollectorAddress);
                    await buyTokens(testValue);
                    const diff = (await balanceOf(crowdsaleFundsCollectorAddress)) - initialBalance;
                    expect(diff).to.equal(testValue);
                });
            });
    
            describe('low-level purchase', async () => {
                it('should log purchase', async () => {
                    await expect(buyTokens(testValue))
                        .to.emit(crowdsale, 'TokenPurchased').withArgs(
                            crowdsaleBuyerAddress,
                            testValue,
                            expectedTokenAmount,
                            tokenName,
                            "0000000000",
                        );
                });
        
                it('multiple buy', async () => {
                    await buyTokens(testValue / 2n);
                    await buyTokens(testValue / 2n);
                    const vestingAccount = await vesting.getAccount(crowdsaleBuyerAddress);
                    const totalVestingAmount = vestingAccount.amount;
                    expect(totalVestingAmount).to.equal(expectedTokenAmount);
                });
        
                it('should forward funds to wallet', async () => {
                    const initialBalance = await balanceOf(crowdsaleFundsCollectorAddress);
                    await buyTokens(testValue);
                    const diff = (await balanceOf(crowdsaleFundsCollectorAddress)) - initialBalance;
                    expect(diff).to.equal(testValue);
                });
            });

            describe('maximum amount', async () => {
                it('buy maximum', async () => {
                    const maximumBuyableAmount = await crowdsale.getBuyableAmount(crowdsaleBuyerAddress);
                    const maximumETHAmount = await getPriceFor(maximumBuyableAmount);
                    const maximumBuyableAmountFromEth = await getORIAmountFor(maximumETHAmount);
                    await expect(buyTokens(maximumETHAmount))
                        .to.emit(crowdsale, 'TokenPurchased').withArgs(
                            crowdsaleBuyerAddress,
                            maximumETHAmount,
                            maximumBuyableAmountFromEth,
                            tokenName,
                            "0000000000",
                        );
                });
                it('single buy', async () => {
                    const maximumBuyableAmount = await crowdsale.getBuyableAmount(crowdsaleBuyerAddress);
                    const oneORIExceedingAmount = maximumBuyableAmount + (10n ** 18n);
                    const exceedingAmount = await getPriceFor(oneORIExceedingAmount);
                    await expect(buyTokens(exceedingAmount))
                        .to.be.revertedWith("Crowdsale: exceed maximum amount of token buyable for this phase");
                });

                it('multiple buy', async () => {
                    const maximumBuyableAmount = await crowdsale.getBuyableAmount(crowdsaleBuyerAddress);
                    const oneORIExceedingAmount = maximumBuyableAmount + (10n ** 18n);
                    const exceedingAmount = await getPriceFor(oneORIExceedingAmount);
                    await buyTokens(exceedingAmount / 2n);
                    await expect(buyTokens(exceedingAmount - exceedingAmount / 2n))
                        .to.be.revertedWith("Crowdsale: exceed maximum amount of token buyable for this phase");
                });
            });

            describe('minimum amount', async () => {
                it('buy minimum', async () => {
                    const minimumBuyableAmount = await crowdsale.getMinimumBuyableAmount();
                    const minimumETHAmount = await getPriceFor(minimumBuyableAmount + 10n ** 18n);
                    const minimumBuyableAmountFromEth = await getORIAmountFor(minimumETHAmount);
                    await expect(buyTokens(minimumETHAmount))
                        .to.emit(crowdsale, 'TokenPurchased').withArgs(
                            crowdsaleBuyerAddress,
                            minimumETHAmount,
                            minimumBuyableAmountFromEth,
                            tokenName,
                            "0000000000",
                        );
                });
                it('single buy', async () => {
                    const minimumBuyableAmount = await crowdsale.getMinimumBuyableAmount();
                    const oneORISubceedingAmount = minimumBuyableAmount - (10n ** 18n);
                    const subceedingAmount = await getPriceFor(oneORISubceedingAmount);
                    await expect(buyTokens(subceedingAmount))
                        .to.be.revertedWith("Crowdsale: subceed minimum amount of token buyable for this phase");
                });

                it('multiple buy', async () => {
                    const minimumBuyableAmount = await crowdsale.getMinimumBuyableAmount();
                    const minimumETHAmount = await getPriceFor(minimumBuyableAmount + 10n ** 18n);
                    const minimumBuyableAmountFromEth = await getORIAmountFor(minimumETHAmount);
                    await expect(buyTokens(minimumETHAmount))
                        .to.emit(crowdsale, 'TokenPurchased').withArgs(
                            crowdsaleBuyerAddress,
                            minimumETHAmount,
                            minimumBuyableAmountFromEth,
                            tokenName,
                            "0000000000",
                        );

                    const oneORISubceedingAmount = minimumBuyableAmount - (10n ** 18n);
                    const subceedingAmount = await getPriceFor(oneORISubceedingAmount);
                    await expect(buyTokens(subceedingAmount))
                        .to.be.revertedWith("Crowdsale: subceed minimum amount of token buyable for this phase");
                });
            });
        });
    }
    beforeEach(async () => {
        await deployments.fixture(['token-sales']);
        ({
            deployerAdrress, crowdsaleBuyerAddress, crowdsaleFundsCollectorAddress
        } = await getNamedAccounts());
        crowdsale = await ethers.getContract('CrowdsaleL2');
        crowdsaleAddress = (await deployments.get("CrowdsaleL2")).address;
        vesting = await ethers.getContract('Vesting');
        deployer = await ethers.getSigner(deployerAdrress);
        crowdsaleBuyer = await ethers.getSigner(crowdsaleBuyerAddress);
    });
    
    describe('deployment', async () => {
        let crowdsaleFactory: ContractFactory;
        let contractArguments: [[bigint, bigint, bigint], string, string, string, string, string, string, string ,bigint, bigint];

        beforeEach(async () => {
            crowdsaleFactory = await ethers.getContractFactory('CrowdsaleL2');
            contractArguments = [
                [100n, 100n, 100n],
                (await deployments.get("MockUSDT")).address,
                (await deployments.get("MockARB")).address,
                crowdsaleFundsCollectorAddress,
                (await deployments.get("Vesting")).address,
                (await deployments.get("MockETHAggregator")).address,
                (await deployments.get("MockARBAggregator")).address,
                (await deployments.get("MockUSDTAggregator")).address,
                500000000000n,
                10000000000n
            ];
            
        });
        describe('contract injection', async () => {
            it("requires non-null usdt contract address", async () => {
                contractArguments[1] = ZERO_ADDRESS;
                await expect(crowdsaleFactory.deploy(...contractArguments))
                    .to.be.revertedWith('Crowdsale: usdt token is the zero address');
            });
            it("requires non-null arb contract address", async () => {
                contractArguments[2] = ZERO_ADDRESS;
                await expect(crowdsaleFactory.deploy(...contractArguments))
                    .to.be.revertedWith('Crowdsale: arb token is the zero address');
            });
            it("requires non-null vesting contract address", async () => {
                contractArguments[4] = ZERO_ADDRESS;
                await expect(crowdsaleFactory.deploy(...contractArguments))
                    .to.be.revertedWith('Crowdsale: vesting is the zero address');
            });
            it("requires non-null eth price feed contract address", async () => {
                contractArguments[5] = ZERO_ADDRESS;
                await expect(crowdsaleFactory.deploy(...contractArguments))
                    .to.be.revertedWith('Crowdsale: eth price feed is the zero address');
            });
            it("requires non-null arb price feed contract address", async () => {
                contractArguments[6] = ZERO_ADDRESS;
                await expect(crowdsaleFactory.deploy(...contractArguments))
                    .to.be.revertedWith('Crowdsale: arb price feed is the zero address');
            });
            it("requires non-null usdt price feed contract address", async () => {
                contractArguments[7] = ZERO_ADDRESS;
                await expect(crowdsaleFactory.deploy(...contractArguments))
                    .to.be.revertedWith('Crowdsale: usdt price feed is the zero address');
            });
        });

        it('requires non-null funds collector address', async () => {
            contractArguments[3] = ZERO_ADDRESS;
            await expect(crowdsaleFactory.deploy(...contractArguments))
                .to.be.revertedWith('Crowdsale: funds collector is the zero address');
        });

        it('requires maximum amount to be strictly greater than minimum amount', async () => {
            contractArguments[8] = contractArguments[9];
            await expect(crowdsaleFactory.deploy(...contractArguments))
                .to.be.revertedWith("Crowdsale: max buyable amount is lower than min buyable amount");
        });
    });
    describe('USD prices by phases', async () => {
        beforeEach(async () => {
            await crowdsale.grantRole(await crowdsale.CROWDSALE_ADMIN_ROLE(), deployerAdrress);
        });
        const shouldCost = (amount: string) => {
            it(`USD Price for 1 ORI should be ${amount}`, async () => {
                const expectedWUsd = ethers.parseUnits(amount, 8).toString();
                const wOri = ethers.parseEther("1");
                const wUsd = (await crowdsale.getUSDPriceFor(wOri)).toString();
                assert.equal(expectedWUsd, wUsd);
            });
            it(`ORI Amount delivered for ${amount} USD should be 1`, async () => {
                const wUsd = ethers.parseUnits(amount, 8).toString();
                const wOri = await crowdsale.getORIAmountForUSD(wUsd);
                assert.equal(wOri.toString(), ethers.parseEther("1").toString());
            });
        }
        describe('private sale', async () => {
            shouldCost("0.10");
        });
        describe('public sale 1', async () => {
            beforeEach(async () => { await crowdsale.updateRate(); })
            shouldCost("0.16");
        });
        describe('public sale 2', async () => {
            beforeEach(async () => { await crowdsale.updateRate(); await crowdsale.updateRate(); })
            shouldCost("0.32");
        });
        it("cannot exceed pkase 3", async () => {
            await crowdsale.updateRate(); // 1 ==> 2
            await crowdsale.updateRate(); // 2 ==> 3
            await expect(crowdsale.updateRate()).to.be.revertedWith("Crowdsale: cannot exceed phase 3");
        });
    });
    describe('ERC20 prices and buy', async () => {
        describe('ETH', async () => {
            const DEFAULT_ETH_VALUE = ethers.parseEther("1");
            it('fallback buy tokens', async () => {
                const nonExistentFuncSignature = 'nonExistentFunc()';
                const fakeDemoContract = new ethers.Contract(
                    crowdsaleAddress,
                    [
                        ...crowdsale.interface.fragments,
                        `function ${nonExistentFuncSignature} payable`,
                    ],
                    deployer,
                );
                const provider = deployer.provider;
                if (!provider) return;
                /* eslint-disable-next-line  @typescript-eslint/no-non-null-assertion */
                await expect(fakeDemoContract[nonExistentFuncSignature]!({
                    value: DEFAULT_ETH_VALUE,
                })).to.emit(fakeDemoContract, 'TokenPurchased');
            });
            describe("bare payments", async () => {
                it('accept payments', async () => {
                    await expect(deployer.sendTransaction({from: deployerAdrress, to: crowdsaleAddress, value: DEFAULT_ETH_VALUE}))
                        .to.emit(crowdsale, 'TokenPurchased');
                });
        
                it('reverts on zero-valued payments', async () => {
                    await expect(deployer.sendTransaction({from: deployerAdrress, to: crowdsaleAddress, value: 0 }))
                        .to.be.revertedWith('Crowdsale: weiAmount is 0');
                });
            });
            
            workingWithToken({
                tokenName: 'ETH',
                tokenDecimals: 18n,
                balanceOf:  (wallet: string) => ethers.provider.getBalance(wallet),
                getPriceFor: (weiAmount: BigNumberish) => crowdsale.getETHPriceFor(weiAmount),
                getORIAmountFor: (weiAmount: BigNumberish) => crowdsale.getORIAmountForETH(weiAmount),
                buyTokens: (weiAmount: BigNumberish, sponsorKey?: string) => {
                    if (!sponsorKey) return crowdsale.connect(crowdsaleBuyer)["buyTokens()"]({ value: weiAmount });
                    return crowdsale.connect(crowdsaleBuyer)["buyTokens(string)"](sponsorKey, { value: weiAmount });
                },
                aggregatorContractName: "MockETHAggregator",
                testValue: DEFAULT_ETH_VALUE,
            });
        });

        describe('USDT', async () => {
            let usdt: MockERC20;

            beforeEach(async () => {
                usdt = await ethers.getContract('MockUSDT');
            });
            workingWithToken({
                tokenName: 'USDT',
                tokenDecimals: 6n,
                balanceOf: (wallet: string) => usdt.balanceOf(wallet),
                getPriceFor: (weiAmount: BigNumberish) => crowdsale.getUSDTPriceFor(weiAmount),
                getORIAmountFor: (weiAmount: BigNumberish) => crowdsale.getORIAmountForUSDT(weiAmount),
                buyTokens: async (weiAmount: BigNumberish, sponsorKey?: string) => {
                    await usdt.connect(crowdsaleBuyer).approve(crowdsaleAddress, weiAmount);
                    if (!sponsorKey) return crowdsale.connect(crowdsaleBuyer)["buyTokensWithUSDT(uint256)"](weiAmount);
                    return crowdsale.connect(crowdsaleBuyer)["buyTokensWithUSDT(uint256,string)"](weiAmount, sponsorKey);
                },
                aggregatorContractName: "MockUSDTAggregator",
                testValue: ethers.parseUnits("1000", 6),
            });
        });

        describe('ARB', async () => {
            let arb: MockERC20;

            beforeEach(async () => {
                arb = await ethers.getContract('MockARB');
            });
            workingWithToken({
                tokenName: 'ARB',
                tokenDecimals: 18n,
                balanceOf: (wallet: string) => arb.balanceOf(wallet),
                getPriceFor: (weiAmount: BigNumberish) => crowdsale.getARBPriceFor(weiAmount),
                getORIAmountFor: (weiAmount: BigNumberish) => crowdsale.getORIAmountForARB(weiAmount),
                buyTokens: async (weiAmount: BigNumberish, sponsorKey?: string) => {
                    await arb.connect(crowdsaleBuyer).approve(crowdsaleAddress, weiAmount);
                    if (!sponsorKey) return await crowdsale.connect(crowdsaleBuyer)["buyTokensWithARB(uint256)"](weiAmount);
                    return await crowdsale.connect(crowdsaleBuyer)["buyTokensWithARB(uint256,string)"](weiAmount, sponsorKey);
                },
                aggregatorContractName: "MockARBAggregator",
                testValue: ethers.parseUnits("1000", 18),
            });
        });
    });

    describe("access control", async () => {
        describe("pause method", async () => {
            it("reverts without PAUSER_ROLE", async () => {
                const PAUSER_ROLE = await crowdsale.PAUSER_ROLE();
                await expect(crowdsale.pause())
                    .to.be.revertedWith(`AccessControl: account ${deployerAdrress.toLowerCase()} is missing role ${PAUSER_ROLE}`)
            });
            it("succes with PAUSER_ROLE", async () => {
                await crowdsale.grantRole(await crowdsale.PAUSER_ROLE(), deployerAdrress);
                await crowdsale.pause();
            });
        });

        describe("unpause method", async () => {
            beforeEach(async () => {
                await crowdsale.grantRole(await crowdsale.PAUSER_ROLE(), deployerAdrress);
                await crowdsale.pause();
                await crowdsale.revokeRole(await crowdsale.PAUSER_ROLE(), deployerAdrress);
            });

            it("reverts without PAUSER_ROLE", async () => {
                const PAUSER_ROLE = await crowdsale.PAUSER_ROLE();
                await expect(crowdsale.unpause())
                    .to.be.revertedWith(`AccessControl: account ${deployerAdrress.toLowerCase()} is missing role ${PAUSER_ROLE}`)
            });
            it("succes with PAUSER_ROLE", async () => {
                await crowdsale.grantRole(await crowdsale.PAUSER_ROLE(), deployerAdrress);
                await crowdsale.unpause();
            });
        });
        describe("updateRate method", async () => {
            it("reverts without CROWDSALE_ADMIN_ROLE", async () => {
                const CROWDSALE_ADMIN_ROLE = await crowdsale.CROWDSALE_ADMIN_ROLE();
                await expect(crowdsale.updateRate())
                    .to.be.revertedWith(`AccessControl: account ${deployerAdrress.toLowerCase()} is missing role ${CROWDSALE_ADMIN_ROLE}`)
            });
            it("succes with CROWDSALE_ADMIN_ROLE", async () => {
                await crowdsale.grantRole(await crowdsale.CROWDSALE_ADMIN_ROLE(), deployerAdrress);
                await crowdsale.updateRate();
            });
        });
    });
});
