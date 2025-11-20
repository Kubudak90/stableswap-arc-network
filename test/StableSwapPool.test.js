const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StableSwapPool", function () {
    let owner;
    let user;
    let token0;
    let token1;
    let pool;

    beforeEach(async function () {
        [owner, user] = await ethers.getSigners();

        // Deploy mock tokens
        const Token = await ethers.getContractFactory("TestUSDCV2"); // Using TestUSDCV2 as it has mint
        token0 = await Token.deploy();
        token1 = await Token.deploy();
        await token0.waitForDeployment();
        await token1.waitForDeployment();

        // Mint tokens to user
        await token0.mint(user.address, ethers.parseUnits("10000", 18));
        await token1.mint(user.address, ethers.parseUnits("10000", 18));

        // Deploy Pool
        const StableSwapPool = await ethers.getContractFactory("StableSwapPool");
        // A=100, fee=4bps
        pool = await StableSwapPool.deploy(
            await token0.getAddress(),
            await token1.getAddress(),
            18,
            18,
            100,
            4,
            owner.address
        );
        await pool.waitForDeployment();

        // Approve pool
        await token0.connect(user).approve(await pool.getAddress(), ethers.MaxUint256);
        await token1.connect(user).approve(await pool.getAddress(), ethers.MaxUint256);
    });

    it("should add liquidity and swap correctly", async function () {
        // Add liquidity
        const amount = ethers.parseUnits("1000", 18);
        await pool.connect(user).addLiquidity(amount, amount, 0);

        // Check reserves
        const reserves = await pool.getReserves();
        expect(reserves[0]).to.equal(amount);
        expect(reserves[1]).to.equal(amount);

        // Swap
        const swapAmount = ethers.parseUnits("100", 18);
        // Swap token0 -> token1
        // In a balanced pool with A=100, slippage should be very low but not zero.
        // fee is 4bps = 0.04%.
        // Expected output should be slightly less than 100 - 0.04 = 99.96.

        await expect(pool.connect(user).swap(true, swapAmount, 0)).to.not.be.reverted;

        // We just want to see if it works and what the output is.
        // If the math is broken (e.g. b calculation), it might revert or give wild results.
    });
});
