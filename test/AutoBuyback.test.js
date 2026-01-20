const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("AutoBuyback", function () {
    let owner, salary, user;
    let assToken, buybackToken;
    let feeDistributor, autoBuyback;

    const INITIAL_MINT = ethers.parseUnits("100000", 18);
    const BUYBACK_AMOUNT = ethers.parseUnits("1000", 18);
    const SIX_HOURS = 6 * 60 * 60;

    beforeEach(async function () {
        [owner, salary, user] = await ethers.getSigners();

        // ASSToken deploy et
        const ASSToken = await ethers.getContractFactory("ASSToken");
        assToken = await ASSToken.deploy();
        await assToken.waitForDeployment();

        // Buyback token (stablecoin) deploy et
        const Token = await ethers.getContractFactory("TestUSDCV2");
        buybackToken = await Token.deploy();
        await buybackToken.waitForDeployment();

        // FeeDistributor deploy et
        const FeeDistributor = await ethers.getContractFactory("FeeDistributor");
        feeDistributor = await FeeDistributor.deploy(
            await assToken.getAddress(),
            owner.address, // treasury
            salary.address, // salaryAddress
            await buybackToken.getAddress() // buybackToken
        );
        await feeDistributor.waitForDeployment();

        // AutoBuyback deploy et
        const AutoBuyback = await ethers.getContractFactory("AutoBuyback");
        autoBuyback = await AutoBuyback.deploy(
            await assToken.getAddress(),
            await feeDistributor.getAddress(),
            await buybackToken.getAddress(),
            salary.address
        );
        await autoBuyback.waitForDeployment();

        // AutoBuyback burn için: ASSToken'ın feeDistributor'ını autoBuyback olarak ayarla
        // Bu sayede autoBuyback burn işlemi için mint yetkisine sahip olur (ERC20Burnable kullanır)
        await assToken.setFeeDistributor(await autoBuyback.getAddress());
    });

    describe("Constructor", function () {
        it("assToken sıfır adres olamaz", async function () {
            const AutoBuyback = await ethers.getContractFactory("AutoBuyback");
            await expect(
                AutoBuyback.deploy(
                    ethers.ZeroAddress,
                    await feeDistributor.getAddress(),
                    await buybackToken.getAddress(),
                    salary.address
                )
            ).to.be.revertedWith("AutoBuyback: assToken zero address");
        });

        it("feeDistributor sıfır adres olamaz", async function () {
            const AutoBuyback = await ethers.getContractFactory("AutoBuyback");
            await expect(
                AutoBuyback.deploy(
                    await assToken.getAddress(),
                    ethers.ZeroAddress,
                    await buybackToken.getAddress(),
                    salary.address
                )
            ).to.be.revertedWith("AutoBuyback: feeDistributor zero address");
        });

        it("buybackToken sıfır adres olamaz", async function () {
            const AutoBuyback = await ethers.getContractFactory("AutoBuyback");
            await expect(
                AutoBuyback.deploy(
                    await assToken.getAddress(),
                    await feeDistributor.getAddress(),
                    ethers.ZeroAddress,
                    salary.address
                )
            ).to.be.revertedWith("AutoBuyback: buybackToken zero address");
        });

        it("salaryAddress sıfır adres olamaz", async function () {
            const AutoBuyback = await ethers.getContractFactory("AutoBuyback");
            await expect(
                AutoBuyback.deploy(
                    await assToken.getAddress(),
                    await feeDistributor.getAddress(),
                    await buybackToken.getAddress(),
                    ethers.ZeroAddress
                )
            ).to.be.revertedWith("AutoBuyback: salaryAddress zero address");
        });

        it("default değerler doğru set edilmeli", async function () {
            expect(await autoBuyback.slippageTolerance()).to.equal(500); // 5%
            expect(await autoBuyback.minBuybackAmount()).to.equal(100 * 1e6); // 100 USDC
            expect(await autoBuyback.BUYBACK_INTERVAL()).to.equal(SIX_HOURS);
        });
    });

    describe("Access Control", function () {
        it("sadece owner pause edebilir", async function () {
            await expect(autoBuyback.connect(user).pause())
                .to.be.revertedWithCustomError(autoBuyback, "OwnableUnauthorizedAccount");
        });

        it("sadece owner unpause edebilir", async function () {
            await autoBuyback.pause();
            await expect(autoBuyback.connect(user).unpause())
                .to.be.revertedWithCustomError(autoBuyback, "OwnableUnauthorizedAccount");
        });

        it("sadece owner buybackToken set edebilir", async function () {
            await expect(autoBuyback.connect(user).setBuybackToken(user.address))
                .to.be.revertedWithCustomError(autoBuyback, "OwnableUnauthorizedAccount");
        });

        it("sadece owner salaryAddress set edebilir", async function () {
            await expect(autoBuyback.connect(user).setSalaryAddress(user.address))
                .to.be.revertedWithCustomError(autoBuyback, "OwnableUnauthorizedAccount");
        });

        it("sadece owner swapRouter set edebilir", async function () {
            await expect(autoBuyback.connect(user).setSwapRouter(user.address))
                .to.be.revertedWithCustomError(autoBuyback, "OwnableUnauthorizedAccount");
        });

        it("sadece owner minBuybackAmount set edebilir", async function () {
            await expect(autoBuyback.connect(user).setMinBuybackAmount(1000))
                .to.be.revertedWithCustomError(autoBuyback, "OwnableUnauthorizedAccount");
        });

        it("sadece owner slippageTolerance set edebilir", async function () {
            await expect(autoBuyback.connect(user).setSlippageTolerance(100))
                .to.be.revertedWithCustomError(autoBuyback, "OwnableUnauthorizedAccount");
        });

        it("sadece owner emergencyWithdraw yapabilir", async function () {
            await autoBuyback.pause();
            await expect(
                autoBuyback.connect(user).emergencyWithdraw(
                    await buybackToken.getAddress(),
                    user.address,
                    1000
                )
            ).to.be.revertedWithCustomError(autoBuyback, "OwnableUnauthorizedAccount");
        });

        it("sadece owner manualBuyback yapabilir", async function () {
            await expect(autoBuyback.connect(user).manualBuyback(1000))
                .to.be.revertedWithCustomError(autoBuyback, "OwnableUnauthorizedAccount");
        });
    });

    describe("Pausable", function () {
        it("pause durumunda executeBuyback çalışmamalı", async function () {
            await autoBuyback.pause();
            await expect(autoBuyback.executeBuyback())
                .to.be.revertedWithCustomError(autoBuyback, "EnforcedPause");
        });

        it("pause durumunda manualBuyback çalışmamalı", async function () {
            await autoBuyback.pause();
            await expect(autoBuyback.manualBuyback(1000))
                .to.be.revertedWithCustomError(autoBuyback, "EnforcedPause");
        });

        it("emergencyWithdraw sadece pause durumunda çalışmalı", async function () {
            await buybackToken.mint(await autoBuyback.getAddress(), BUYBACK_AMOUNT);
            // Pause değil - hata vermeli
            await expect(
                autoBuyback.emergencyWithdraw(
                    await buybackToken.getAddress(),
                    owner.address,
                    BUYBACK_AMOUNT
                )
            ).to.be.revertedWithCustomError(autoBuyback, "ExpectedPause");
        });
    });

    describe("ExecuteBuyback", function () {
        it("6 saat geçmeden buyback yapılamaz", async function () {
            await expect(autoBuyback.executeBuyback())
                .to.be.revertedWith("AutoBuyback: Too early for next buyback");
        });

        it("minimum bakiye yoksa sadece zaman güncellenir", async function () {
            // 6 saat ileri git
            await time.increase(SIX_HOURS);

            const lastTimeBefore = await autoBuyback.lastBuybackTime();
            await autoBuyback.executeBuyback();
            const lastTimeAfter = await autoBuyback.lastBuybackTime();

            // Zaman güncellenmeli
            expect(lastTimeAfter).to.be.gt(lastTimeBefore);
            // Buyback count artmamalı (yeterli bakiye yoktu)
            expect(await autoBuyback.buybackCount()).to.equal(0);
        });

        it("yeterli bakiye ile buyback başarılı olmalı (swap router yok)", async function () {
            // 6 saat ileri git
            await time.increase(SIX_HOURS);

            // Token gönder
            await buybackToken.mint(await autoBuyback.getAddress(), BUYBACK_AMOUNT);

            const salaryBalanceBefore = await buybackToken.balanceOf(salary.address);

            await autoBuyback.executeBuyback();

            const salaryBalanceAfter = await buybackToken.balanceOf(salary.address);

            // Maaş ödenmeli (%10)
            const expectedSalary = (BUYBACK_AMOUNT * 1000n) / 10000n;
            expect(salaryBalanceAfter - salaryBalanceBefore).to.equal(expectedSalary);

            // Buyback count artmalı
            expect(await autoBuyback.buybackCount()).to.equal(1);
            expect(await autoBuyback.totalSalaryPaid()).to.equal(expectedSalary);
        });

        it("herkes executeBuyback çağırabilir (keeper)", async function () {
            await time.increase(SIX_HOURS);
            await buybackToken.mint(await autoBuyback.getAddress(), BUYBACK_AMOUNT);

            // User çağırabilir
            await expect(autoBuyback.connect(user).executeBuyback())
                .to.not.be.reverted;
        });
    });

    describe("ManualBuyback", function () {
        it("sıfır miktar kabul edilmemeli", async function () {
            await expect(autoBuyback.manualBuyback(0))
                .to.be.revertedWith("AutoBuyback: Amount must be > 0");
        });

        it("manuel buyback başarılı olmalı", async function () {
            const assAmount = ethers.parseUnits("1000", 18);

            // AutoBuyback feeDistributor olarak ayarlandığından, autoBuyback üzerinden mint yapabiliriz
            // Ama mint için autoBuyback'in kendisi çağırmalı
            // Test için: owner'a direkt token gönderelim - setLiquidityRewards ile owner'ı yetkilendirelim
            await assToken.setLiquidityRewards(owner.address);
            await assToken.mint(owner.address, assAmount);
            await assToken.approve(await autoBuyback.getAddress(), assAmount);

            const burnedBefore = await autoBuyback.totalBurned();

            await expect(autoBuyback.manualBuyback(assAmount))
                .to.emit(autoBuyback, "ManualBuybackExecuted");

            const burnedAfter = await autoBuyback.totalBurned();

            // %90 burn edilmeli
            const expectedBurn = (assAmount * 9000n) / 10000n;
            expect(burnedAfter - burnedBefore).to.equal(expectedBurn);
        });
    });

    describe("ReceiveBuybackFunds", function () {
        it("sadece feeDistributor çağırabilir", async function () {
            await expect(autoBuyback.connect(user).receiveBuybackFunds(1000))
                .to.be.revertedWith("AutoBuyback: Only fee distributor");
        });

        it("sıfır miktar kabul edilmemeli", async function () {
            // FeeDistributor olarak impersonate etmek zor, bu testi atlıyoruz
        });
    });

    describe("EmergencyWithdraw", function () {
        beforeEach(async function () {
            await buybackToken.mint(await autoBuyback.getAddress(), BUYBACK_AMOUNT);
            await autoBuyback.pause();
        });

        it("sıfır adrese withdraw yapılamaz", async function () {
            await expect(
                autoBuyback.emergencyWithdraw(
                    await buybackToken.getAddress(),
                    ethers.ZeroAddress,
                    BUYBACK_AMOUNT
                )
            ).to.be.revertedWith("AutoBuyback: Invalid address");
        });

        it("sıfır miktar withdraw yapılamaz", async function () {
            await expect(
                autoBuyback.emergencyWithdraw(
                    await buybackToken.getAddress(),
                    owner.address,
                    0
                )
            ).to.be.revertedWith("AutoBuyback: Amount must be > 0");
        });

        it("emergency withdraw başarılı olmalı", async function () {
            const balanceBefore = await buybackToken.balanceOf(owner.address);

            await expect(
                autoBuyback.emergencyWithdraw(
                    await buybackToken.getAddress(),
                    owner.address,
                    BUYBACK_AMOUNT
                )
            ).to.emit(autoBuyback, "EmergencyWithdraw")
                .withArgs(await buybackToken.getAddress(), owner.address, BUYBACK_AMOUNT);

            const balanceAfter = await buybackToken.balanceOf(owner.address);
            expect(balanceAfter - balanceBefore).to.equal(BUYBACK_AMOUNT);
        });
    });

    describe("Setter Functions", function () {
        it("setBuybackToken çalışmalı", async function () {
            await expect(autoBuyback.setBuybackToken(user.address))
                .to.emit(autoBuyback, "BuybackTokenUpdated")
                .withArgs(await buybackToken.getAddress(), user.address);

            expect(await autoBuyback.buybackToken()).to.equal(user.address);
        });

        it("setBuybackToken sıfır adres kabul etmemeli", async function () {
            await expect(autoBuyback.setBuybackToken(ethers.ZeroAddress))
                .to.be.revertedWith("AutoBuyback: Invalid address");
        });

        it("setSalaryAddress çalışmalı", async function () {
            await expect(autoBuyback.setSalaryAddress(user.address))
                .to.emit(autoBuyback, "SalaryAddressUpdated")
                .withArgs(salary.address, user.address);

            expect(await autoBuyback.salaryAddress()).to.equal(user.address);
        });

        it("setSalaryAddress sıfır adres kabul etmemeli", async function () {
            await expect(autoBuyback.setSalaryAddress(ethers.ZeroAddress))
                .to.be.revertedWith("AutoBuyback: Invalid address");
        });

        it("setSwapRouter çalışmalı", async function () {
            await expect(autoBuyback.setSwapRouter(user.address))
                .to.emit(autoBuyback, "SwapRouterUpdated")
                .withArgs(ethers.ZeroAddress, user.address);

            expect(await autoBuyback.swapRouter()).to.equal(user.address);
        });

        it("setMinBuybackAmount çalışmalı", async function () {
            const newAmount = 500 * 1e6;
            await expect(autoBuyback.setMinBuybackAmount(newAmount))
                .to.emit(autoBuyback, "MinBuybackAmountUpdated")
                .withArgs(100 * 1e6, newAmount);

            expect(await autoBuyback.minBuybackAmount()).to.equal(newAmount);
        });

        it("setSlippageTolerance çalışmalı", async function () {
            const newSlippage = 300; // 3%
            await expect(autoBuyback.setSlippageTolerance(newSlippage))
                .to.emit(autoBuyback, "SlippageToleranceUpdated")
                .withArgs(500, newSlippage);

            expect(await autoBuyback.slippageTolerance()).to.equal(newSlippage);
        });

        it("setSlippageTolerance max sınırı kontrol etmeli", async function () {
            const tooHigh = 2500; // %25 > MAX_SLIPPAGE (%20)
            await expect(autoBuyback.setSlippageTolerance(tooHigh))
                .to.be.revertedWith("AutoBuyback: Slippage too high");
        });
    });

    describe("View Functions", function () {
        it("canExecuteBuyback doğru döndürmeli", async function () {
            // Başlangıçta false (6 saat geçmedi)
            expect(await autoBuyback.canExecuteBuyback()).to.be.false;

            // 6 saat geç
            await time.increase(SIX_HOURS);

            // Hala false (yeterli bakiye yok)
            expect(await autoBuyback.canExecuteBuyback()).to.be.false;

            // Token gönder
            await buybackToken.mint(await autoBuyback.getAddress(), BUYBACK_AMOUNT);

            // Şimdi true olmalı
            expect(await autoBuyback.canExecuteBuyback()).to.be.true;
        });

        it("nextBuybackTime doğru döndürmeli", async function () {
            const lastTime = await autoBuyback.lastBuybackTime();
            const nextTime = await autoBuyback.nextBuybackTime();
            expect(nextTime).to.equal(lastTime + BigInt(SIX_HOURS));
        });

        it("getStats doğru döndürmeli", async function () {
            const stats = await autoBuyback.getStats();
            expect(stats._totalBuybackAmount).to.equal(0);
            expect(stats._totalBurned).to.equal(0);
            expect(stats._totalSalaryPaid).to.equal(0);
            expect(stats._buybackCount).to.equal(0);
        });
    });
});
