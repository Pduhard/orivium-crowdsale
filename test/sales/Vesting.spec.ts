import  { time } from "@nomicfoundation/hardhat-network-helpers";
import  { expect } from 'chai';
import { deployments, ethers } from 'hardhat'
import {
    Vesting,
    MockERC20,
} from "@orivium/types"
import { getNamedAccounts } from "../utils";
import { Block } from "ethers";

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

describe('Vesting', async () => {
    let token: MockERC20;
    let vesting: Vesting;
    let vestingAddress: string;
    let deployerAdrress: string;
    let crowdsaleBuyerAddress: string;
    let setTimestamp: (timestamp: bigint) => Promise<void>;

    beforeEach(async () => {
        await deployments.fixture(['token-sales', 'MockERC20']);
        ({
            deployerAdrress, crowdsaleBuyerAddress
        } = await getNamedAccounts());
        token = await ethers.getContract('MockERC20');
        vesting = await ethers.getContract('Vesting');
        vestingAddress = (await deployments.get('Vesting')).address;

        setTimestamp = async (timestamp: bigint) => {
            await time.setNextBlockTimestamp(timestamp);
            await token.approve(crowdsaleBuyerAddress, 23n);
        }

    });

    describe("access control", async () => {
        describe("vest method", async () => {
            it("reverts without VESTING_ROLE", async () => {
                const VESTING_ROLE = await vesting.VESTING_ROLE();
                await expect(vesting.vest(crowdsaleBuyerAddress, 1))
                    .to.be.revertedWith(`AccessControl: account ${deployerAdrress.toLowerCase()} is missing role ${VESTING_ROLE}`)
            });
            it("succes with VESTING_ROLE", async () => {
                await vesting.grantRole(await vesting.VESTING_ROLE(), deployerAdrress);
                await vesting.vest(crowdsaleBuyerAddress, 3);
            });
        });

        describe("setOriTokenAddress method", async () => {
            it("reverts without VESTING_ADMIN_ROLE", async () => {
                const VESTING_ADMIN_ROLE = await vesting.VESTING_ADMIN_ROLE();
                await expect(vesting.setOriTokenAddress(token.getAddress()))
                    .to.be.revertedWith(`AccessControl: account ${deployerAdrress.toLowerCase()} is missing role ${VESTING_ADMIN_ROLE}`)
            });
            it("succes with VESTING_ADMIN_ROLE", async () => {
                await vesting.grantRole(await vesting.VESTING_ADMIN_ROLE(), deployerAdrress);
                await vesting.setOriTokenAddress(token.getAddress());
            });
        });

        describe("setVestingStart method", async () => {
            it("reverts without VESTING_ADMIN_ROLE", async () => {
                const VESTING_ADMIN_ROLE = await vesting.VESTING_ADMIN_ROLE();
                await expect(vesting.setVestingStart(Math.floor(Date.now() / 1000)))
                    .to.be.revertedWith(`AccessControl: account ${deployerAdrress.toLowerCase()} is missing role ${VESTING_ADMIN_ROLE}`)
            });
            it("succes with VESTING_ADMIN_ROLE", async () => {
                await vesting.grantRole(await vesting.VESTING_ADMIN_ROLE(), deployerAdrress);
                await vesting.setVestingStart(Math.floor(Date.now() / 1000));
            });
        });

        describe("decreaseAmount method", async () => {
            it("reverts without VESTING_ROLE", async () => {
                const VESTING_ROLE = await vesting.VESTING_ROLE();
                await expect(vesting.decreaseAmount(deployerAdrress, 0))
                    .to.be.revertedWith(`AccessControl: account ${deployerAdrress.toLowerCase()} is missing role ${VESTING_ROLE}`)
            });
            it("succes with VESTING_ROLE", async () => {
                await vesting.grantRole(await vesting.VESTING_ROLE(), deployerAdrress);
                await vesting.decreaseAmount(deployerAdrress, 0);
            });
        });
    });
    describe("once deployed", async () => {
        beforeEach(async () => {
            await vesting.grantRole(await vesting.VESTING_ROLE(), deployerAdrress);
            await vesting.grantRole(await vesting.VESTING_ADMIN_ROLE(), deployerAdrress);
        });
        describe("accounts", async () => {
            describe("with no amount vested", async () => {
                it("should be empty", async () => {
                    const account = await vesting.getAccount(deployerAdrress);
                    expect(account.amount).to.equal(0);
                    expect(account.released).to.equal(0);
                });
                it("should have 0 releasable amount", async () => {
                    const releasableAmount = await vesting.getReleasableAmount(deployerAdrress);
                    expect(releasableAmount).to.equal(0);
                });
            });
            describe("with vested amount", async () => {
                let vestedAmount: bigint;
                let now: Block;
    
                beforeEach(async () => {
                    const blockNum = await ethers.provider.getBlockNumber();
                    now = <Block>await ethers.provider.getBlock(blockNum);
                    vestedAmount = 10000n;
                    await token.transfer(vestingAddress, vestedAmount);
                    await vesting.vest(crowdsaleBuyerAddress, vestedAmount);
                    await vesting.setVestingStart(Math.floor(Date.now() / 1000));
                });
                it("should have account data set properly", async () => {
                    const account = await vesting.getAccount(crowdsaleBuyerAddress);
                    expect(account.amount).to.equal(vestedAmount);
                    expect(account.released).to.equal(0);
                });
                describe("should have releasable amount according to block time", async () => {
                    it("before vestingStart", async () => {
                        await vesting.grantRole(await vesting.VESTING_ADMIN_ROLE(), deployerAdrress);
                        await vesting.setVestingStart(Math.floor(Date.now() / 1000) + 100000);
                        const releasableAmount = await vesting.getReleasableAmount(crowdsaleBuyerAddress);
                        expect(releasableAmount).to.equal(0);
                    });
                    
                    it("at vestingStart", async () => {
                        const releasableAmount = await vesting.getReleasableAmount(crowdsaleBuyerAddress);
                        expect(releasableAmount).to.equal(1000);
                    });

                    it("at vestingStart + half vestingDuration", async () => {
                        const halfVestingDuration = await vesting.VESTING_DURATION() / 2n;
                        await setTimestamp(BigInt(now.timestamp) + halfVestingDuration)
                        const releasableAmount = await vesting.getReleasableAmount(crowdsaleBuyerAddress);
                        expect(releasableAmount).to.equal(5500);
                    });

                    it("at vestingStart + vestingDuration", async () => {
                        await setTimestamp(BigInt(now.timestamp) + await vesting.VESTING_DURATION());
                        const releasableAmount = await vesting.getReleasableAmount(crowdsaleBuyerAddress);
                        expect(releasableAmount).to.equal(vestedAmount);
                    });
                });
            });
        });

        describe("release", async () => {
            describe("without ori token set", async () => {
                it("should initialize oriTokenAddress to zero address", async () => {
                    expect(await vesting.oriTokenAddress()).to.equal(ethers.ZeroAddress);
                });
                it("should revert when setting oriTokenAddress to zero address", async () => {
                    await expect(vesting.setOriTokenAddress(ethers.ZeroAddress)).to.be.revertedWith(
                        "Crowdsale: cannot set ori token address to zero address"
                    )
                });
                it("should revert", async () => {
                    await expect(vesting.release(crowdsaleBuyerAddress)).to.be.revertedWith(
                        'Vesting: releasble amount is null'
                    );
                });
            });
            describe("with ori token set", async () => {
                beforeEach(async () => {
                    const tokenAddress = await token.getAddress();
                    await vesting.setOriTokenAddress(tokenAddress);
                    await vesting.setVestingStart(Math.floor(Date.now() / 1000));
                });
                describe("without vested amount", async () => {
                    it("should not release token", async () => {
                        await expect(vesting.release(crowdsaleBuyerAddress)).to.be.revertedWith(
                            'Vesting: releasble amount is null'
                        );
                    });
                });
                describe("with vested amount", async () => {
                    beforeEach(async () => {
                        const blockNum = await ethers.provider.getBlockNumber();
                        const now = await ethers.provider.getBlock(blockNum);
                        if (!now) return;
                        const vestedAmount = 10000n;

                        await token.transfer(vestingAddress, vestedAmount);
                        await vesting.vest(crowdsaleBuyerAddress, vestedAmount);
    
                        // need to fake tx to trigger netxBlockTimestamp
                        // may find a cleaner workaround but its fine
                        const halfVestingDuration = await vesting.VESTING_DURATION() / 2n;
                        await time.setNextBlockTimestamp(BigInt(now.timestamp) + halfVestingDuration);
                        await token.approve(crowdsaleBuyerAddress, 23n);
                    });

                    it("should release token according to block time",  async () => {
                        const initialBalance = await token.balanceOf(crowdsaleBuyerAddress);
                        await vesting.release(crowdsaleBuyerAddress);
                        expect((await token.balanceOf(crowdsaleBuyerAddress)) - initialBalance).to.equal(5500);
                        expect(await token.balanceOf(vestingAddress)).to.equal(4500);
                    });

                    it("should not release token twice in a row",  async () => {
                        const initialBalance = await token.balanceOf(crowdsaleBuyerAddress);
                        await vesting.release(crowdsaleBuyerAddress);
                        expect((await token.balanceOf(crowdsaleBuyerAddress)) - initialBalance).to.equal(5500);
                        expect(await token.balanceOf(vestingAddress)).to.equal(4500);
                        await expect(vesting.release(crowdsaleBuyerAddress)).to.be.revertedWith(
                            'Vesting: releasble amount is null'
                        );
                    });

                    it("should not release token if amount is null in given account",  async () => {
                        await expect(vesting.release(deployerAdrress)).to.be.revertedWith(
                            'Vesting: releasble amount is null'
                        );
                    });
                    it("should not release token to zero address",  async () => {
                        await expect(vesting.release(ZERO_ADDRESS)).to.be.revertedWith(
                            'Vesting: beneficiary is zero address'
                        );
                    });
                });
            });
        });

        describe("decreaseAmount", async () => {
            beforeEach(async () => {
                await vesting.grantRole(await vesting.VESTING_ROLE(), deployerAdrress);
                await vesting.grantRole(await vesting.VESTING_ADMIN_ROLE(), deployerAdrress);
            });

            it("should decrease given amount", async () => {
                await vesting.vest(crowdsaleBuyerAddress, 10000);
                expect((await vesting.getAccount(crowdsaleBuyerAddress)).amount).to.equal(10000);
                await vesting.decreaseAmount(crowdsaleBuyerAddress, 23);
                expect((await vesting.getAccount(crowdsaleBuyerAddress)).amount).to.equal(9977);
            });
        })
    });
});