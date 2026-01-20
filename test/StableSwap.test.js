const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StableSwap", function () {
    let owner, user, attacker;
    let token0, token1;
    let stableSwap;
    let feeDistributor;

    const INITIAL_MINT = ethers.parseUnits("100000", 18);
    const LIQUIDITY_AMOUNT = ethers.parseUnits("10000", 18);

    beforeEach(async function () {
        [owner, user, attacker] = await ethers.getSigners();

        // Deploy test tokenları
        const Token = await ethers.getContractFactory("TestUSDCV2");
        token0 = await Token.deploy();
        token1 = await Token.deploy();
        await token0.waitForDeployment();
        await token1.waitForDeployment();

        // User'a token mint et
        await token0.mint(user.address, INITIAL_MINT);
        await token1.mint(user.address, INITIAL_MINT);

        // StableSwap deploy et
        const StableSwap = await ethers.getContractFactory("StableSwap");
        stableSwap = await StableSwap.deploy(
            await token0.getAddress(),
            await token1.getAddress()
        );
        await stableSwap.waitForDeployment();

        // User approve yapsın
        await token0.connect(user).approve(await stableSwap.getAddress(), ethers.MaxUint256);
        await token1.connect(user).approve(await stableSwap.getAddress(), ethers.MaxUint256);
    });

    describe("Constructor", function () {
        it("token0 sıfır adres olamaz", async function () {
            const StableSwap = await ethers.getContractFactory("StableSwap");
            await expect(
                StableSwap.deploy(ethers.ZeroAddress, await token1.getAddress())
            ).to.be.revertedWith("StableSwap: token0 zero address");
        });

        it("token1 sıfır adres olamaz", async function () {
            const StableSwap = await ethers.getContractFactory("StableSwap");
            await expect(
                StableSwap.deploy(await token0.getAddress(), ethers.ZeroAddress)
            ).to.be.revertedWith("StableSwap: token1 zero address");
        });

        it("aynı token kullanılamaz", async function () {
            const StableSwap = await ethers.getContractFactory("StableSwap");
            await expect(
                StableSwap.deploy(await token0.getAddress(), await token0.getAddress())
            ).to.be.revertedWith("StableSwap: identical tokens");
        });

        it("doğru token adresleri set edilmeli", async function () {
            expect(await stableSwap.token0()).to.equal(await token0.getAddress());
            expect(await stableSwap.token1()).to.equal(await token1.getAddress());
        });
    });

    describe("Access Control", function () {
        it("sadece owner pause edebilir", async function () {
            await expect(stableSwap.connect(attacker).pause())
                .to.be.revertedWithCustomError(stableSwap, "OwnableUnauthorizedAccount");
        });

        it("sadece owner unpause edebilir", async function () {
            await stableSwap.pause();
            await expect(stableSwap.connect(attacker).unpause())
                .to.be.revertedWithCustomError(stableSwap, "OwnableUnauthorizedAccount");
        });

        it("sadece owner feeDistributor set edebilir", async function () {
            await expect(stableSwap.connect(attacker).setFeeDistributor(user.address))
                .to.be.revertedWithCustomError(stableSwap, "OwnableUnauthorizedAccount");
        });

        it("feeDistributor sıfır adres olamaz", async function () {
            await expect(stableSwap.setFeeDistributor(ethers.ZeroAddress))
                .to.be.revertedWith("StableSwap: zero address");
        });
    });

    describe("Pausable", function () {
        it("pause durumunda addLiquidity çalışmamalı", async function () {
            await stableSwap.pause();
            await expect(
                stableSwap.connect(user).addLiquidity(LIQUIDITY_AMOUNT, LIQUIDITY_AMOUNT)
            ).to.be.revertedWithCustomError(stableSwap, "EnforcedPause");
        });

        it("pause durumunda removeLiquidity çalışmamalı", async function () {
            // Önce likidite ekle
            await stableSwap.connect(user).addLiquidity(LIQUIDITY_AMOUNT, LIQUIDITY_AMOUNT);
            await stableSwap.pause();

            await expect(
                stableSwap.connect(user).removeLiquidity(LIQUIDITY_AMOUNT, LIQUIDITY_AMOUNT)
            ).to.be.revertedWithCustomError(stableSwap, "EnforcedPause");
        });

        it("pause durumunda swap çalışmamalı", async function () {
            await stableSwap.connect(user).addLiquidity(LIQUIDITY_AMOUNT, LIQUIDITY_AMOUNT);
            await stableSwap.pause();

            const swapAmount = ethers.parseUnits("100", 18);
            await expect(
                stableSwap.connect(user).swap(true, swapAmount)
            ).to.be.revertedWithCustomError(stableSwap, "EnforcedPause");
        });

        it("unpause sonrası işlemler çalışmalı", async function () {
            await stableSwap.pause();
            await stableSwap.unpause();

            await expect(
                stableSwap.connect(user).addLiquidity(LIQUIDITY_AMOUNT, LIQUIDITY_AMOUNT)
            ).to.not.be.reverted;
        });
    });

    describe("addLiquidity", function () {
        it("sıfır miktar kabul edilmemeli", async function () {
            await expect(
                stableSwap.connect(user).addLiquidity(0, 0)
            ).to.be.revertedWith("StableSwap: zero amounts");
        });

        it("likidite ekleme başarılı olmalı", async function () {
            await stableSwap.connect(user).addLiquidity(LIQUIDITY_AMOUNT, LIQUIDITY_AMOUNT);

            const reserves = await stableSwap.getReserves();
            expect(reserves[0]).to.equal(LIQUIDITY_AMOUNT);
            expect(reserves[1]).to.equal(LIQUIDITY_AMOUNT);
        });

        it("sadece bir token ile likidite eklenebilmeli", async function () {
            await stableSwap.connect(user).addLiquidity(LIQUIDITY_AMOUNT, 0);

            const reserves = await stableSwap.getReserves();
            expect(reserves[0]).to.equal(LIQUIDITY_AMOUNT);
            expect(reserves[1]).to.equal(0);
        });

        it("AddLiquidity eventi emit edilmeli", async function () {
            await expect(stableSwap.connect(user).addLiquidity(LIQUIDITY_AMOUNT, LIQUIDITY_AMOUNT))
                .to.emit(stableSwap, "AddLiquidity")
                .withArgs(user.address, LIQUIDITY_AMOUNT, LIQUIDITY_AMOUNT);
        });
    });

    describe("removeLiquidity", function () {
        beforeEach(async function () {
            await stableSwap.connect(user).addLiquidity(LIQUIDITY_AMOUNT, LIQUIDITY_AMOUNT);
        });

        it("yetersiz likidite ile çekilemez", async function () {
            const tooMuch = LIQUIDITY_AMOUNT + 1n;
            await expect(
                stableSwap.connect(user).removeLiquidity(tooMuch, 0)
            ).to.be.revertedWith("Insufficient liquidity");
        });

        it("likidite çekme başarılı olmalı", async function () {
            const withdrawAmount = ethers.parseUnits("1000", 18);
            const balanceBefore = await token0.balanceOf(user.address);

            await stableSwap.connect(user).removeLiquidity(withdrawAmount, withdrawAmount);

            const balanceAfter = await token0.balanceOf(user.address);
            expect(balanceAfter - balanceBefore).to.equal(withdrawAmount);
        });

        it("RemoveLiquidity eventi emit edilmeli", async function () {
            const withdrawAmount = ethers.parseUnits("1000", 18);
            await expect(stableSwap.connect(user).removeLiquidity(withdrawAmount, withdrawAmount))
                .to.emit(stableSwap, "RemoveLiquidity")
                .withArgs(user.address, withdrawAmount, withdrawAmount);
        });
    });

    describe("swap", function () {
        beforeEach(async function () {
            await stableSwap.connect(user).addLiquidity(LIQUIDITY_AMOUNT, LIQUIDITY_AMOUNT);
        });

        it("sıfır miktar ile swap yapılamaz", async function () {
            await expect(
                stableSwap.connect(user).swap(true, 0)
            ).to.be.revertedWith("Invalid amount");
        });

        it("yetersiz likidite ile swap yapılamaz", async function () {
            // Fee düşüldükten sonra bile likiditeyi aşacak kadar büyük bir miktar gerekli
            // amountOut = amountIn * 9996 / 10000
            // reserve1 = LIQUIDITY_AMOUNT olduğundan, amountOut > reserve1 olması için
            // amountIn > reserve1 * 10000 / 9996 olmalı
            const tooMuch = (LIQUIDITY_AMOUNT * 10001n) / 9996n;
            await expect(
                stableSwap.connect(user).swap(true, tooMuch)
            ).to.be.revertedWith("Insufficient liquidity");
        });

        it("token0 -> token1 swap başarılı olmalı", async function () {
            const swapAmount = ethers.parseUnits("100", 18);
            const token1Before = await token1.balanceOf(user.address);

            await stableSwap.connect(user).swap(true, swapAmount);

            const token1After = await token1.balanceOf(user.address);
            // Fee: 0.04% = 4 bps
            const expectedOutput = swapAmount * 9996n / 10000n;
            expect(token1After - token1Before).to.equal(expectedOutput);
        });

        it("token1 -> token0 swap başarılı olmalı", async function () {
            const swapAmount = ethers.parseUnits("100", 18);
            const token0Before = await token0.balanceOf(user.address);

            await stableSwap.connect(user).swap(false, swapAmount);

            const token0After = await token0.balanceOf(user.address);
            const expectedOutput = swapAmount * 9996n / 10000n;
            expect(token0After - token0Before).to.equal(expectedOutput);
        });

        it("fee doğru hesaplanmalı", async function () {
            const swapAmount = ethers.parseUnits("10000", 18);
            const expectedFee = swapAmount * 4n / 10000n; // 4 bps
            const expectedOutput = swapAmount - expectedFee;

            const amountOut = await stableSwap.getAmountOut(swapAmount, true);
            expect(amountOut).to.equal(expectedOutput);
        });

        it("Swap eventi emit edilmeli", async function () {
            const swapAmount = ethers.parseUnits("100", 18);
            const expectedOutput = swapAmount * 9996n / 10000n;

            await expect(stableSwap.connect(user).swap(true, swapAmount))
                .to.emit(stableSwap, "Swap")
                .withArgs(user.address, true, swapAmount, expectedOutput);
        });

        it("rezervler doğru güncellenmeli", async function () {
            const swapAmount = ethers.parseUnits("100", 18);
            const [reserve0Before, reserve1Before] = await stableSwap.getReserves();

            await stableSwap.connect(user).swap(true, swapAmount);

            const [reserve0After, reserve1After] = await stableSwap.getReserves();
            const expectedOutput = swapAmount * 9996n / 10000n;

            expect(reserve0After).to.equal(reserve0Before + swapAmount);
            expect(reserve1After).to.equal(reserve1Before - expectedOutput);
        });
    });

    describe("getAmountOut", function () {
        it("sıfır input için sıfır döndürmeli", async function () {
            expect(await stableSwap.getAmountOut(0, true)).to.equal(0);
        });

        it("doğru çıktı miktarı hesaplamalı", async function () {
            const input = ethers.parseUnits("1000", 18);
            const expected = input * 9996n / 10000n;
            expect(await stableSwap.getAmountOut(input, true)).to.equal(expected);
        });
    });

    describe("FeeDistributor Entegrasyonu", function () {
        beforeEach(async function () {
            // ASSToken deploy et (FeeDistributor için gerekli)
            const ASSToken = await ethers.getContractFactory("ASSToken");
            const assToken = await ASSToken.deploy();
            await assToken.waitForDeployment();

            // FeeDistributor deploy et
            const FeeDistributor = await ethers.getContractFactory("FeeDistributor");
            feeDistributor = await FeeDistributor.deploy(
                await assToken.getAddress(),
                owner.address, // treasury
                owner.address, // salaryAddress
                await token0.getAddress() // buybackToken
            );
            await feeDistributor.waitForDeployment();

            // FeeDistributor'a StableSwap'i swap kontratı olarak ekle
            await feeDistributor.addSwapContract(await stableSwap.getAddress());

            // FeeDistributor'ı StableSwap'e set et
            await stableSwap.setFeeDistributor(await feeDistributor.getAddress());

            // Likidite ekle
            await stableSwap.connect(user).addLiquidity(LIQUIDITY_AMOUNT, LIQUIDITY_AMOUNT);
        });

        it("FeeDistributorUpdated eventi emit edilmeli", async function () {
            const newFeeDistributor = user.address;
            await expect(stableSwap.setFeeDistributor(newFeeDistributor))
                .to.emit(stableSwap, "FeeDistributorUpdated")
                .withArgs(await feeDistributor.getAddress(), newFeeDistributor);
        });

        it("swap sırasında fee toplanmalı", async function () {
            const swapAmount = ethers.parseUnits("1000", 18);
            const expectedFee = swapAmount * 4n / 10000n;

            const feeDistributorBalanceBefore = await token0.balanceOf(await feeDistributor.getAddress());

            await stableSwap.connect(user).swap(true, swapAmount);

            const feeDistributorBalanceAfter = await token0.balanceOf(await feeDistributor.getAddress());
            expect(feeDistributorBalanceAfter - feeDistributorBalanceBefore).to.equal(expectedFee);
        });
    });
});
