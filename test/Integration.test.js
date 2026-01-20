const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Integration Tests", function () {
    let owner, treasury, salary, user1, user2;
    let token0, token1, assToken;
    let stableSwap, feeDistributor, stakingContract, autoBuyback;
    let stableSwapPool, lpToken, router;

    const INITIAL_MINT = ethers.parseUnits("1000000", 18);
    const LIQUIDITY_AMOUNT = ethers.parseUnits("100000", 18);
    const SWAP_AMOUNT = ethers.parseUnits("10000", 18);
    const STAKE_AMOUNT = ethers.parseUnits("5000", 18);

    beforeEach(async function () {
        [owner, treasury, salary, user1, user2] = await ethers.getSigners();

        // ========== TOKEN'LARI DEPLOY ET ==========
        const Token = await ethers.getContractFactory("TestUSDCV2");
        token0 = await Token.deploy();
        token1 = await Token.deploy();
        await token0.waitForDeployment();
        await token1.waitForDeployment();

        const ASSToken = await ethers.getContractFactory("ASSToken");
        assToken = await ASSToken.deploy();
        await assToken.waitForDeployment();

        // ========== STABLESWAP DEPLOY ET ==========
        const StableSwap = await ethers.getContractFactory("StableSwap");
        stableSwap = await StableSwap.deploy(
            await token0.getAddress(),
            await token1.getAddress()
        );
        await stableSwap.waitForDeployment();

        // ========== STABLESWAPPOOL DEPLOY ET ==========
        const StableSwapPool = await ethers.getContractFactory("StableSwapPool");
        stableSwapPool = await StableSwapPool.deploy(
            await token0.getAddress(),
            await token1.getAddress(),
            18, 18, // decimals
            100,    // A
            4,      // feeBps
            owner.address
        );
        await stableSwapPool.waitForDeployment();
        lpToken = await ethers.getContractAt("LPToken", await stableSwapPool.lp());

        // ========== ROUTER DEPLOY ET ==========
        const Router = await ethers.getContractFactory("Router");
        router = await Router.deploy();
        await router.waitForDeployment();

        // ========== FEEDISTRIBUTOR DEPLOY ET ==========
        const FeeDistributor = await ethers.getContractFactory("FeeDistributor");
        feeDistributor = await FeeDistributor.deploy(
            await assToken.getAddress(),
            treasury.address,
            salary.address,
            await token0.getAddress() // buybackToken
        );
        await feeDistributor.waitForDeployment();

        // ========== STAKINGCONTRACT DEPLOY ET ==========
        const StakingContract = await ethers.getContractFactory("StakingContract");
        stakingContract = await StakingContract.deploy(
            await assToken.getAddress(),
            await feeDistributor.getAddress(),
            await token0.getAddress() // rewardToken
        );
        await stakingContract.waitForDeployment();

        // ========== AUTOBUYBACK DEPLOY ET ==========
        const AutoBuyback = await ethers.getContractFactory("AutoBuyback");
        autoBuyback = await AutoBuyback.deploy(
            await assToken.getAddress(),
            await feeDistributor.getAddress(),
            await token0.getAddress(), // buybackToken
            salary.address
        );
        await autoBuyback.waitForDeployment();

        // ========== BAĞLANTILARI KUR ==========
        // StableSwap -> FeeDistributor
        await stableSwap.setFeeDistributor(await feeDistributor.getAddress());

        // FeeDistributor ayarları
        await feeDistributor.setStakingContract(await stakingContract.getAddress());
        await feeDistributor.setAutoBuyback(await autoBuyback.getAddress());
        await feeDistributor.addSwapContract(await stableSwap.getAddress());

        // ASSToken ayarları - autoBuyback burn için feeDistributor olarak ayarla
        // ve test için liquidityRewards'ı owner olarak ayarla (ASS mint için)
        await assToken.setFeeDistributor(await autoBuyback.getAddress());
        await assToken.setLiquidityRewards(owner.address);

        // ========== TOKEN'LARI MINT ET ==========
        await token0.mint(user1.address, INITIAL_MINT);
        await token1.mint(user1.address, INITIAL_MINT);
        await token0.mint(user2.address, INITIAL_MINT);
        await token1.mint(user2.address, INITIAL_MINT);
        // ASS token mint (owner liquidityRewards olarak ayarlandı)
        await assToken.mint(user1.address, INITIAL_MINT);
        await assToken.mint(user2.address, INITIAL_MINT);

        // ========== APPROVE'LAR ==========
        await token0.connect(user1).approve(await stableSwap.getAddress(), ethers.MaxUint256);
        await token1.connect(user1).approve(await stableSwap.getAddress(), ethers.MaxUint256);
        await token0.connect(user2).approve(await stableSwap.getAddress(), ethers.MaxUint256);
        await token1.connect(user2).approve(await stableSwap.getAddress(), ethers.MaxUint256);

        await token0.connect(user1).approve(await router.getAddress(), ethers.MaxUint256);
        await token1.connect(user1).approve(await router.getAddress(), ethers.MaxUint256);
        await token0.connect(user1).approve(await stableSwapPool.getAddress(), ethers.MaxUint256);
        await token1.connect(user1).approve(await stableSwapPool.getAddress(), ethers.MaxUint256);

        await assToken.connect(user1).approve(await stakingContract.getAddress(), ethers.MaxUint256);
        await assToken.connect(user2).approve(await stakingContract.getAddress(), ethers.MaxUint256);
    });

    describe("Tam Swap Akışı", function () {
        beforeEach(async function () {
            // Likidite ekle
            await stableSwap.connect(user1).addLiquidity(LIQUIDITY_AMOUNT, LIQUIDITY_AMOUNT);
        });

        it("swap -> fee toplama -> dağıtım akışı çalışmalı", async function () {
            // 1. Swap yap
            const feeDistributorBalanceBefore = await token0.balanceOf(await feeDistributor.getAddress());

            await stableSwap.connect(user2).swap(true, SWAP_AMOUNT);

            const feeDistributorBalanceAfter = await token0.balanceOf(await feeDistributor.getAddress());

            // Fee toplanmalı (4 bps)
            const expectedFee = (SWAP_AMOUNT * 4n) / 10000n;
            expect(feeDistributorBalanceAfter - feeDistributorBalanceBefore).to.equal(expectedFee);

            // 2. Fee'leri dağıt
            const treasuryBefore = await token0.balanceOf(treasury.address);
            const autoBuybackBefore = await token0.balanceOf(await autoBuyback.getAddress());
            const stakingBefore = await token0.balanceOf(await stakingContract.getAddress());

            await feeDistributor.distributeFees(await token0.getAddress());

            const treasuryAfter = await token0.balanceOf(treasury.address);
            const autoBuybackAfter = await token0.balanceOf(await autoBuyback.getAddress());
            const stakingAfter = await token0.balanceOf(await stakingContract.getAddress());

            // Dağıtım kontrolü
            // %45 staking, %45 autoBuyback, %10 treasury
            const stakingExpected = (expectedFee * 4500n) / 10000n;
            const buybackExpected = (expectedFee * 4500n) / 10000n;
            const treasuryExpected = (expectedFee * 1000n) / 10000n;

            expect(stakingAfter - stakingBefore).to.equal(stakingExpected);
            expect(autoBuybackAfter - autoBuybackBefore).to.equal(buybackExpected);
            expect(treasuryAfter - treasuryBefore).to.equal(treasuryExpected);
        });
    });

    describe("Staking Akışı", function () {
        it("stake -> reward al akışı çalışmalı", async function () {
            // 1. User1 stake etsin
            await stakingContract.connect(user1).stake(STAKE_AMOUNT);

            expect(await stakingContract.totalStaked()).to.equal(STAKE_AMOUNT);

            // 2. Reward token gönder (simüle)
            const rewardAmount = ethers.parseUnits("100", 18);
            await token0.mint(await stakingContract.getAddress(), rewardAmount);

            // 3. FeeDistributor üzerinden reward dağıt
            // Bu normalde feeDistributor.distributeFees ile olur ama test için simüle ediyoruz
            // StakingContract.distributeRewards sadece feeDistributor çağırabilir

            // 4. Staker bilgilerini kontrol et
            const info = await stakingContract.getStakerInfo(user1.address);
            expect(info.stakedAmount).to.equal(STAKE_AMOUNT);
        });

        it("birden fazla kullanıcı stake edebilmeli", async function () {
            await stakingContract.connect(user1).stake(STAKE_AMOUNT);
            await stakingContract.connect(user2).stake(STAKE_AMOUNT * 2n);

            expect(await stakingContract.totalStaked()).to.equal(STAKE_AMOUNT * 3n);

            const info1 = await stakingContract.getStakerInfo(user1.address);
            const info2 = await stakingContract.getStakerInfo(user2.address);

            expect(info1.stakedAmount).to.equal(STAKE_AMOUNT);
            expect(info2.stakedAmount).to.equal(STAKE_AMOUNT * 2n);
        });
    });

    describe("Router ile Likidite Akışı", function () {
        it("router ile likidite ekle/çek akışı çalışmalı", async function () {
            // 1. Likidite ekle
            await router.connect(user1).addLiquidity(
                await stableSwapPool.getAddress(),
                LIQUIDITY_AMOUNT,
                LIQUIDITY_AMOUNT,
                0
            );

            const lpBalance = await lpToken.balanceOf(user1.address);
            expect(lpBalance).to.be.gt(0);

            // 2. Rezervleri kontrol et
            const reserves = await stableSwapPool.getReserves();
            expect(reserves[0]).to.equal(LIQUIDITY_AMOUNT);
            expect(reserves[1]).to.equal(LIQUIDITY_AMOUNT);

            // 3. Likiditeyi çek
            await lpToken.connect(user1).approve(await router.getAddress(), lpBalance);
            await router.connect(user1).removeLiquidity(
                await stableSwapPool.getAddress(),
                lpBalance,
                0,
                0
            );

            // LP token yakılmış olmalı
            expect(await lpToken.balanceOf(user1.address)).to.equal(0);
        });
    });

    describe("StableSwapPool Swap Akışı", function () {
        beforeEach(async function () {
            // Direkt pool'a likidite ekle
            await stableSwapPool.connect(user1).addLiquidity(LIQUIDITY_AMOUNT, LIQUIDITY_AMOUNT, 0);
        });

        it("pool üzerinden swap çalışmalı", async function () {
            const swapAmount = ethers.parseUnits("1000", 18);
            const token1Before = await token1.balanceOf(user1.address);

            await stableSwapPool.connect(user1).swap(true, swapAmount, 0);

            const token1After = await token1.balanceOf(user1.address);

            // Çıktı alınmalı (fee düşülmüş)
            expect(token1After).to.be.gt(token1Before);
        });

        it("router üzerinden swap çalışmalı", async function () {
            // User için approve
            await token0.connect(user1).approve(await router.getAddress(), ethers.MaxUint256);

            const swapAmount = ethers.parseUnits("1000", 18);
            const token1Before = await token1.balanceOf(user1.address);

            await router.connect(user1).swapExactTokensForTokens(
                await stableSwapPool.getAddress(),
                true,
                swapAmount,
                0
            );

            const token1After = await token1.balanceOf(user1.address);
            expect(token1After).to.be.gt(token1Before);
        });
    });

    describe("AutoBuyback Akışı", function () {
        it("buyback akışı çalışmalı (swap router yok)", async function () {
            const buybackAmount = ethers.parseUnits("1000", 18);

            // AutoBuyback'e token gönder
            await token0.mint(await autoBuyback.getAddress(), buybackAmount);

            // 6 saat ileri git
            await time.increase(6 * 60 * 60);

            // Buyback'i çalıştır
            const salaryBefore = await token0.balanceOf(salary.address);

            await autoBuyback.executeBuyback();

            const salaryAfter = await token0.balanceOf(salary.address);

            // Maaş ödenmeli (%10)
            const expectedSalary = (buybackAmount * 1000n) / 10000n;
            expect(salaryAfter - salaryBefore).to.equal(expectedSalary);

            // İstatistikler güncellenmeli
            expect(await autoBuyback.buybackCount()).to.equal(1);
            expect(await autoBuyback.totalSalaryPaid()).to.equal(expectedSalary);
        });
    });

    describe("Pause Entegrasyonu", function () {
        beforeEach(async function () {
            await stableSwap.connect(user1).addLiquidity(LIQUIDITY_AMOUNT, LIQUIDITY_AMOUNT);
        });

        it("StableSwap pause edildiğinde swap yapılamamalı", async function () {
            await stableSwap.pause();

            await expect(
                stableSwap.connect(user2).swap(true, SWAP_AMOUNT)
            ).to.be.revertedWithCustomError(stableSwap, "EnforcedPause");
        });

        it("StakingContract pause edildiğinde stake yapılamamalı", async function () {
            await stakingContract.pause();

            await expect(
                stakingContract.connect(user1).stake(STAKE_AMOUNT)
            ).to.be.revertedWithCustomError(stakingContract, "EnforcedPause");
        });

        it("FeeDistributor pause edildiğinde fee toplanamaz", async function () {
            await feeDistributor.pause();

            // Swap yap (fee collect'i tetikler)
            // Ancak feeDistributor pause olduğu için collectFee çağrısı fail olacak
            await expect(
                stableSwap.connect(user2).swap(true, SWAP_AMOUNT)
            ).to.be.revertedWithCustomError(feeDistributor, "EnforcedPause");
        });
    });

    describe("Tam Döngü Testi", function () {
        it("swap -> fee -> distribute -> stake -> reward tam döngü", async function () {
            // 1. SETUP: Likidite ekle
            await stableSwap.connect(user1).addLiquidity(LIQUIDITY_AMOUNT, LIQUIDITY_AMOUNT);

            // 2. User1 ASS token stake etsin
            await stakingContract.connect(user1).stake(STAKE_AMOUNT);

            // 3. User2 swap yapsın (fee oluşur)
            await stableSwap.connect(user2).swap(true, SWAP_AMOUNT);

            // 4. Fee dağıtımını yap
            await feeDistributor.distributeFees(await token0.getAddress());

            // 5. Staking contract'ta reward birikmiş mi kontrol et
            const stakingBalance = await token0.balanceOf(await stakingContract.getAddress());
            expect(stakingBalance).to.be.gt(0);

            // 6. Toplam istatistikleri kontrol et
            const totalStaked = await stakingContract.totalStaked();
            expect(totalStaked).to.equal(STAKE_AMOUNT);
        });
    });
});
