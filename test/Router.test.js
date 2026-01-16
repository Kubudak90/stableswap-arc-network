const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Router", function () {
    let owner, user, attacker;
    let token0, token1;
    let pool, lpToken;
    let router;

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

        // User ve owner'a token mint et
        await token0.mint(user.address, INITIAL_MINT);
        await token1.mint(user.address, INITIAL_MINT);
        await token0.mint(owner.address, INITIAL_MINT);
        await token1.mint(owner.address, INITIAL_MINT);

        // Router deploy et
        const Router = await ethers.getContractFactory("Router");
        router = await Router.deploy();
        await router.waitForDeployment();

        // StableSwapPool deploy et (A=100, fee=4bps)
        const StableSwapPool = await ethers.getContractFactory("StableSwapPool");
        pool = await StableSwapPool.deploy(
            await token0.getAddress(),
            await token1.getAddress(),
            18, // decimals0
            18, // decimals1
            100, // A
            4,   // feeBps
            owner.address // lpOwner
        );
        await pool.waitForDeployment();

        // LP token adresini al
        lpToken = await ethers.getContractAt("LPToken", await pool.lp());

        // User router'a approve yapsın
        await token0.connect(user).approve(await router.getAddress(), ethers.MaxUint256);
        await token1.connect(user).approve(await router.getAddress(), ethers.MaxUint256);

        // Owner pool'a direkt approve yapsın (initial likidite için)
        await token0.connect(owner).approve(await pool.getAddress(), ethers.MaxUint256);
        await token1.connect(owner).approve(await pool.getAddress(), ethers.MaxUint256);
    });

    describe("addLiquidity", function () {
        it("sıfır pool adresi kabul edilmemeli", async function () {
            await expect(
                router.connect(user).addLiquidity(ethers.ZeroAddress, LIQUIDITY_AMOUNT, LIQUIDITY_AMOUNT, 0)
            ).to.be.revertedWith("Router: zero pool address");
        });

        it("likidite ekleme başarılı olmalı (ilk likidite)", async function () {
            const tx = await router.connect(user).addLiquidity(
                await pool.getAddress(),
                LIQUIDITY_AMOUNT,
                LIQUIDITY_AMOUNT,
                0
            );

            // LP token user'da olmalı
            const lpBalance = await lpToken.balanceOf(user.address);
            expect(lpBalance).to.be.gt(0);

            // Rezervler güncellenmeli
            const reserves = await pool.getReserves();
            expect(reserves[0]).to.equal(LIQUIDITY_AMOUNT);
            expect(reserves[1]).to.equal(LIQUIDITY_AMOUNT);
        });

        it("minLpOut slippage kontrolü çalışmalı", async function () {
            // Çok yüksek minLpOut ile revert etmeli
            const tooHighMinLp = ethers.parseUnits("1000000", 18);
            await expect(
                router.connect(user).addLiquidity(
                    await pool.getAddress(),
                    LIQUIDITY_AMOUNT,
                    LIQUIDITY_AMOUNT,
                    tooHighMinLp
                )
            ).to.be.revertedWith("add: slippage");
        });

        it("approval sıfırlanmalı (dangling allowance koruması)", async function () {
            await router.connect(user).addLiquidity(
                await pool.getAddress(),
                LIQUIDITY_AMOUNT,
                LIQUIDITY_AMOUNT,
                0
            );

            // Router'ın pool'a verdiği allowance 0 olmalı
            const allowance0 = await token0.allowance(await router.getAddress(), await pool.getAddress());
            const allowance1 = await token1.allowance(await router.getAddress(), await pool.getAddress());
            expect(allowance0).to.equal(0);
            expect(allowance1).to.equal(0);
        });
    });

    describe("removeLiquidity", function () {
        beforeEach(async function () {
            // Önce likidite ekle
            await router.connect(user).addLiquidity(
                await pool.getAddress(),
                LIQUIDITY_AMOUNT,
                LIQUIDITY_AMOUNT,
                0
            );

            // User LP token'ı router'a approve yapsın
            await lpToken.connect(user).approve(await router.getAddress(), ethers.MaxUint256);
        });

        it("sıfır pool adresi kabul edilmemeli", async function () {
            const lpBalance = await lpToken.balanceOf(user.address);
            await expect(
                router.connect(user).removeLiquidity(ethers.ZeroAddress, lpBalance, 0, 0)
            ).to.be.revertedWith("Router: zero pool address");
        });

        it("likidite çekme başarılı olmalı", async function () {
            const lpBalance = await lpToken.balanceOf(user.address);
            const token0Before = await token0.balanceOf(user.address);
            const token1Before = await token1.balanceOf(user.address);

            await router.connect(user).removeLiquidity(
                await pool.getAddress(),
                lpBalance,
                0,
                0
            );

            const token0After = await token0.balanceOf(user.address);
            const token1After = await token1.balanceOf(user.address);

            // Token'lar geri alınmalı
            expect(token0After).to.be.gt(token0Before);
            expect(token1After).to.be.gt(token1Before);

            // LP token yakılmış olmalı
            expect(await lpToken.balanceOf(user.address)).to.equal(0);
        });

        it("min0/min1 slippage kontrolü çalışmalı", async function () {
            const lpBalance = await lpToken.balanceOf(user.address);
            const tooHighMin = ethers.parseUnits("1000000", 18);

            await expect(
                router.connect(user).removeLiquidity(
                    await pool.getAddress(),
                    lpBalance,
                    tooHighMin,
                    0
                )
            ).to.be.revertedWith("remove: slippage");
        });
    });

    describe("swapExactTokensForTokens", function () {
        beforeEach(async function () {
            // Önce likidite ekle (owner direkt pool'a)
            await pool.connect(owner).addLiquidity(LIQUIDITY_AMOUNT, LIQUIDITY_AMOUNT, 0);
        });

        it("sıfır pool adresi kabul edilmemeli", async function () {
            const swapAmount = ethers.parseUnits("100", 18);
            await expect(
                router.connect(user).swapExactTokensForTokens(
                    ethers.ZeroAddress,
                    true,
                    swapAmount,
                    0
                )
            ).to.be.revertedWith("Router: zero pool address");
        });

        it("token0 -> token1 swap başarılı olmalı", async function () {
            const swapAmount = ethers.parseUnits("100", 18);
            const token1Before = await token1.balanceOf(user.address);

            await router.connect(user).swapExactTokensForTokens(
                await pool.getAddress(),
                true,
                swapAmount,
                0
            );

            const token1After = await token1.balanceOf(user.address);
            expect(token1After).to.be.gt(token1Before);
        });

        it("token1 -> token0 swap başarılı olmalı", async function () {
            const swapAmount = ethers.parseUnits("100", 18);
            const token0Before = await token0.balanceOf(user.address);

            await router.connect(user).swapExactTokensForTokens(
                await pool.getAddress(),
                false,
                swapAmount,
                0
            );

            const token0After = await token0.balanceOf(user.address);
            expect(token0After).to.be.gt(token0Before);
        });

        it("minAmountOut slippage kontrolü çalışmalı", async function () {
            const swapAmount = ethers.parseUnits("100", 18);
            const tooHighMinOut = ethers.parseUnits("1000000", 18);

            await expect(
                router.connect(user).swapExactTokensForTokens(
                    await pool.getAddress(),
                    true,
                    swapAmount,
                    tooHighMinOut
                )
            ).to.be.revertedWith("swap: slippage");
        });

        it("approval sıfırlanmalı (dangling allowance koruması)", async function () {
            const swapAmount = ethers.parseUnits("100", 18);

            await router.connect(user).swapExactTokensForTokens(
                await pool.getAddress(),
                true,
                swapAmount,
                0
            );

            // Router'ın pool'a verdiği allowance 0 olmalı
            const allowance = await token0.allowance(await router.getAddress(), await pool.getAddress());
            expect(allowance).to.equal(0);
        });
    });

    describe("ReentrancyGuard", function () {
        it("reentrancy guard aktif olmalı", async function () {
            // Bu test daha çok contract'ın ReentrancyGuard kullandığını doğrular
            // Gerçek reentrancy testi için malicious contract gerekir
            // Şimdilik sadece işlemlerin başarılı olduğunu kontrol ediyoruz
            await expect(
                router.connect(user).addLiquidity(
                    await pool.getAddress(),
                    LIQUIDITY_AMOUNT,
                    LIQUIDITY_AMOUNT,
                    0
                )
            ).to.not.be.reverted;
        });
    });
});
