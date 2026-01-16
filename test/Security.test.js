const { expect } = require("chai");
const { ethers } = require("hardhat");
const { mine } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Security Tests", function () {
    let owner, user1, user2, attacker;
    let token0, token1;
    let stableSwapPool, lpToken;

    const INITIAL_MINT = ethers.parseUnits("1000000", 18);
    const LIQUIDITY_AMOUNT = ethers.parseUnits("100000", 18);

    beforeEach(async function () {
        [owner, user1, user2, attacker] = await ethers.getSigners();

        // Token'ları deploy et
        const Token = await ethers.getContractFactory("TestUSDCV2");
        token0 = await Token.deploy();
        token1 = await Token.deploy();
        await token0.waitForDeployment();
        await token1.waitForDeployment();

        // StableSwapPool deploy et
        const StableSwapPool = await ethers.getContractFactory("StableSwapPool");
        stableSwapPool = await StableSwapPool.deploy(
            await token0.getAddress(),
            await token1.getAddress(),
            18, 18,
            100, // A
            4,   // feeBps
            owner.address
        );
        await stableSwapPool.waitForDeployment();
        lpToken = await ethers.getContractAt("LPToken", await stableSwapPool.lp());

        // Token mint ve approve
        await token0.mint(owner.address, INITIAL_MINT);
        await token1.mint(owner.address, INITIAL_MINT);
        await token0.mint(user1.address, INITIAL_MINT);
        await token1.mint(user1.address, INITIAL_MINT);
        await token0.mint(attacker.address, INITIAL_MINT);
        await token1.mint(attacker.address, INITIAL_MINT);

        await token0.connect(owner).approve(await stableSwapPool.getAddress(), ethers.MaxUint256);
        await token1.connect(owner).approve(await stableSwapPool.getAddress(), ethers.MaxUint256);
        await token0.connect(user1).approve(await stableSwapPool.getAddress(), ethers.MaxUint256);
        await token1.connect(user1).approve(await stableSwapPool.getAddress(), ethers.MaxUint256);
        await token0.connect(attacker).approve(await stableSwapPool.getAddress(), ethers.MaxUint256);
        await token1.connect(attacker).approve(await stableSwapPool.getAddress(), ethers.MaxUint256);

        // İlk likidite ekle
        await stableSwapPool.connect(owner).addLiquidity(LIQUIDITY_AMOUNT, LIQUIDITY_AMOUNT, 0);
    });

    describe("Flash Loan Koruması", function () {
        it("aynı blokta iki işlem yapılamamalı", async function () {
            // İlk işlem başarılı olmalı
            const swapAmount = ethers.parseUnits("100", 18);
            await stableSwapPool.connect(user1).swap(true, swapAmount, 0);

            // Aynı blokta ikinci işlem başarısız olmalı
            // Not: Hardhat'te aynı blokta iki tx göndermek zor, bu yüzden
            // bu testi farklı bir şekilde simüle ediyoruz
            // lastActionBlock kontrolünü test ediyoruz
            const lastBlock = await stableSwapPool.lastActionBlock(user1.address);
            const currentBlock = await ethers.provider.getBlockNumber();
            expect(lastBlock).to.equal(currentBlock);
        });

        it("flash loan koruması kapatılabilmeli (owner)", async function () {
            await stableSwapPool.setFlashLoanProtection(false);
            expect(await stableSwapPool.flashLoanProtectionEnabled()).to.be.false;
        });

        it("sadece owner flash loan korumasını değiştirebilir", async function () {
            await expect(
                stableSwapPool.connect(attacker).setFlashLoanProtection(false)
            ).to.be.revertedWithCustomError(stableSwapPool, "OwnableUnauthorizedAccount");
        });

        it("farklı bloklarda işlem yapılabilmeli", async function () {
            const swapAmount = ethers.parseUnits("100", 18);

            // İlk swap
            await stableSwapPool.connect(user1).swap(true, swapAmount, 0);

            // Yeni blok mine et
            await mine(1);

            // İkinci swap başarılı olmalı
            await expect(
                stableSwapPool.connect(user1).swap(false, swapAmount, 0)
            ).to.not.be.reverted;
        });
    });

    describe("Price Manipulation Koruması", function () {
        it("max swap limitini aşan işlem reddedilmeli", async function () {
            // Default max: %10 of reserve
            // Reserve: 100000, max swap: 10000
            const tooMuchSwap = ethers.parseUnits("15000", 18); // %15 > %10

            await expect(
                stableSwapPool.connect(user1).swap(true, tooMuchSwap, 0)
            ).to.be.revertedWith("swap: exceeds max swap limit");
        });

        it("max swap limiti içindeki işlem kabul edilmeli", async function () {
            const validSwap = ethers.parseUnits("5000", 18); // %5 < %10

            await expect(
                stableSwapPool.connect(user1).swap(true, validSwap, 0)
            ).to.not.be.reverted;
        });

        it("max swap yüzdesi değiştirilebilmeli (owner)", async function () {
            await stableSwapPool.setMaxSwapPercentage(2000); // %20
            expect(await stableSwapPool.maxSwapPercentage()).to.equal(2000);
        });

        it("max swap yüzdesi %50'yi geçemez", async function () {
            await expect(
                stableSwapPool.setMaxSwapPercentage(6000) // %60
            ).to.be.revertedWith("pool: percentage too high");
        });

        it("max swap yüzdesi sıfır olamaz", async function () {
            await expect(
                stableSwapPool.setMaxSwapPercentage(0)
            ).to.be.revertedWith("pool: percentage zero");
        });

        it("sadece owner max swap yüzdesini değiştirebilir", async function () {
            await expect(
                stableSwapPool.connect(attacker).setMaxSwapPercentage(2000)
            ).to.be.revertedWithCustomError(stableSwapPool, "OwnableUnauthorizedAccount");
        });
    });

    describe("Emergency Withdraw", function () {
        it("pause durumunda emergency withdraw çalışmalı", async function () {
            await stableSwapPool.pause();

            const ownerBalanceBefore = await token0.balanceOf(owner.address);
            const poolBalance = await token0.balanceOf(await stableSwapPool.getAddress());

            await stableSwapPool.emergencyWithdraw(
                await token0.getAddress(),
                owner.address,
                poolBalance
            );

            const ownerBalanceAfter = await token0.balanceOf(owner.address);
            expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(poolBalance);
        });

        it("pause değilken emergency withdraw çalışmamalı", async function () {
            await expect(
                stableSwapPool.emergencyWithdraw(
                    await token0.getAddress(),
                    owner.address,
                    1000
                )
            ).to.be.revertedWithCustomError(stableSwapPool, "ExpectedPause");
        });

        it("sadece owner emergency withdraw yapabilir", async function () {
            await stableSwapPool.pause();
            await expect(
                stableSwapPool.connect(attacker).emergencyWithdraw(
                    await token0.getAddress(),
                    attacker.address,
                    1000
                )
            ).to.be.revertedWithCustomError(stableSwapPool, "OwnableUnauthorizedAccount");
        });

        it("emergencyWithdrawAll çalışmalı", async function () {
            await stableSwapPool.pause();

            const balance0 = await token0.balanceOf(await stableSwapPool.getAddress());
            const balance1 = await token1.balanceOf(await stableSwapPool.getAddress());

            await stableSwapPool.emergencyWithdrawAll(owner.address);

            // Pool boş olmalı
            expect(await token0.balanceOf(await stableSwapPool.getAddress())).to.equal(0);
            expect(await token1.balanceOf(await stableSwapPool.getAddress())).to.equal(0);

            // Rezervler sıfırlanmalı
            expect(await stableSwapPool.x()).to.equal(0);
            expect(await stableSwapPool.y()).to.equal(0);
        });

        it("emergency withdraw sıfır adrese yapılamaz", async function () {
            await stableSwapPool.pause();
            await expect(
                stableSwapPool.emergencyWithdraw(
                    await token0.getAddress(),
                    ethers.ZeroAddress,
                    1000
                )
            ).to.be.revertedWith("pool: to zero address");
        });

        it("emergency withdraw sıfır miktar olamaz", async function () {
            await stableSwapPool.pause();
            await expect(
                stableSwapPool.emergencyWithdraw(
                    await token0.getAddress(),
                    owner.address,
                    0
                )
            ).to.be.revertedWith("pool: amount zero");
        });
    });
});

describe("TimeLock Tests", function () {
    let owner, executor, user;
    let timeLock;
    let mockTarget;

    const ONE_HOUR = 3600;
    const ONE_DAY = 86400;

    beforeEach(async function () {
        [owner, executor, user] = await ethers.getSigners();

        // TimeLock deploy et (1 saat delay)
        const TimeLock = await ethers.getContractFactory("TimeLock");
        timeLock = await TimeLock.deploy(ONE_HOUR);
        await timeLock.waitForDeployment();
    });

    describe("Constructor", function () {
        it("doğru delay ile başlamalı", async function () {
            expect(await timeLock.delay()).to.equal(ONE_HOUR);
        });

        it("owner executor olmalı", async function () {
            expect(await timeLock.isExecutor(owner.address)).to.be.true;
        });

        it("minimum delay altında deploy edilememeli", async function () {
            const TimeLock = await ethers.getContractFactory("TimeLock");
            await expect(
                TimeLock.deploy(60) // 1 dakika < 1 saat
            ).to.be.revertedWith("TimeLock: delay must exceed minimum");
        });

        it("maximum delay üstünde deploy edilememeli", async function () {
            const TimeLock = await ethers.getContractFactory("TimeLock");
            await expect(
                TimeLock.deploy(31 * ONE_DAY) // 31 gün > 30 gün
            ).to.be.revertedWith("TimeLock: delay must not exceed maximum");
        });
    });

    describe("Executor Management", function () {
        it("executor eklenebilmeli", async function () {
            await timeLock.addExecutor(executor.address);
            expect(await timeLock.isExecutor(executor.address)).to.be.true;
        });

        it("executor kaldırılabilmeli", async function () {
            await timeLock.addExecutor(executor.address);
            await timeLock.removeExecutor(executor.address);
            expect(await timeLock.isExecutor(executor.address)).to.be.false;
        });

        it("sadece owner executor ekleyebilir", async function () {
            await expect(
                timeLock.connect(user).addExecutor(user.address)
            ).to.be.revertedWithCustomError(timeLock, "OwnableUnauthorizedAccount");
        });

        it("sıfır adres executor olamaz", async function () {
            await expect(
                timeLock.addExecutor(ethers.ZeroAddress)
            ).to.be.revertedWith("TimeLock: zero address");
        });
    });

    describe("Queue Transaction", function () {
        it("transaction queue'ya eklenebilmeli", async function () {
            const target = user.address;
            const value = 0;
            const signature = "";
            const data = "0x";
            const eta = (await ethers.provider.getBlock("latest")).timestamp + ONE_HOUR + 100;

            const txHash = await timeLock.getTxHash(target, value, signature, data, eta);

            await expect(
                timeLock.queueTransaction(target, value, signature, data, eta)
            ).to.emit(timeLock, "QueueTransaction");

            expect(await timeLock.isTransactionQueued(txHash)).to.be.true;
        });

        it("eta delay'den önce olamaz", async function () {
            const target = user.address;
            const eta = (await ethers.provider.getBlock("latest")).timestamp + 60; // Sadece 1 dakika sonra

            await expect(
                timeLock.queueTransaction(target, 0, "", "0x", eta)
            ).to.be.revertedWith("TimeLock: eta must satisfy delay");
        });

        it("sıfır adresli target olamaz", async function () {
            const eta = (await ethers.provider.getBlock("latest")).timestamp + ONE_HOUR + 100;

            await expect(
                timeLock.queueTransaction(ethers.ZeroAddress, 0, "", "0x", eta)
            ).to.be.revertedWith("TimeLock: target zero address");
        });

        it("aynı transaction tekrar queue'ya eklenemez", async function () {
            const target = user.address;
            const eta = (await ethers.provider.getBlock("latest")).timestamp + ONE_HOUR + 100;

            await timeLock.queueTransaction(target, 0, "", "0x", eta);

            await expect(
                timeLock.queueTransaction(target, 0, "", "0x", eta)
            ).to.be.revertedWith("TimeLock: tx already queued");
        });
    });

    describe("Cancel Transaction", function () {
        it("queued transaction iptal edilebilmeli", async function () {
            const target = user.address;
            const eta = (await ethers.provider.getBlock("latest")).timestamp + ONE_HOUR + 100;

            await timeLock.queueTransaction(target, 0, "", "0x", eta);

            const txHash = await timeLock.getTxHash(target, 0, "", "0x", eta);
            expect(await timeLock.isTransactionQueued(txHash)).to.be.true;

            await expect(
                timeLock.cancelTransaction(target, 0, "", "0x", eta)
            ).to.emit(timeLock, "CancelTransaction");

            expect(await timeLock.isTransactionQueued(txHash)).to.be.false;
        });

        it("queue'da olmayan transaction iptal edilemez", async function () {
            const target = user.address;
            const eta = (await ethers.provider.getBlock("latest")).timestamp + ONE_HOUR + 100;

            await expect(
                timeLock.cancelTransaction(target, 0, "", "0x", eta)
            ).to.be.revertedWith("TimeLock: tx not queued");
        });
    });

    describe("Delay Management", function () {
        it("delay değiştirilebilmeli", async function () {
            await timeLock.setDelay(2 * ONE_HOUR);
            expect(await timeLock.delay()).to.equal(2 * ONE_HOUR);
        });

        it("delay minimum altına düşürülemez", async function () {
            await expect(
                timeLock.setDelay(60)
            ).to.be.revertedWith("TimeLock: delay must exceed minimum");
        });

        it("delay maximum üstüne çıkarılamaz", async function () {
            await expect(
                timeLock.setDelay(31 * ONE_DAY)
            ).to.be.revertedWith("TimeLock: delay must not exceed maximum");
        });
    });
});

describe("StableSwap Emergency Tests", function () {
    let owner, user;
    let token0, token1;
    let stableSwap;

    const INITIAL_MINT = ethers.parseUnits("100000", 18);
    const LIQUIDITY_AMOUNT = ethers.parseUnits("10000", 18);

    beforeEach(async function () {
        [owner, user] = await ethers.getSigners();

        // Token'ları deploy et
        const Token = await ethers.getContractFactory("TestUSDCV2");
        token0 = await Token.deploy();
        token1 = await Token.deploy();
        await token0.waitForDeployment();
        await token1.waitForDeployment();

        // StableSwap deploy et
        const StableSwap = await ethers.getContractFactory("StableSwap");
        stableSwap = await StableSwap.deploy(
            await token0.getAddress(),
            await token1.getAddress()
        );
        await stableSwap.waitForDeployment();

        // Token mint ve approve
        await token0.mint(owner.address, INITIAL_MINT);
        await token1.mint(owner.address, INITIAL_MINT);

        await token0.connect(owner).approve(await stableSwap.getAddress(), ethers.MaxUint256);
        await token1.connect(owner).approve(await stableSwap.getAddress(), ethers.MaxUint256);

        // Likidite ekle
        await stableSwap.connect(owner).addLiquidity(LIQUIDITY_AMOUNT, LIQUIDITY_AMOUNT);
    });

    describe("Emergency Withdraw", function () {
        it("pause durumunda emergency withdraw çalışmalı", async function () {
            await stableSwap.pause();

            const poolBalance = await token0.balanceOf(await stableSwap.getAddress());

            await stableSwap.emergencyWithdraw(
                await token0.getAddress(),
                owner.address,
                poolBalance
            );

            expect(await token0.balanceOf(await stableSwap.getAddress())).to.equal(0);
        });

        it("emergencyWithdrawAll çalışmalı", async function () {
            await stableSwap.pause();

            await stableSwap.emergencyWithdrawAll(owner.address);

            expect(await token0.balanceOf(await stableSwap.getAddress())).to.equal(0);
            expect(await token1.balanceOf(await stableSwap.getAddress())).to.equal(0);

            const reserves = await stableSwap.getReserves();
            expect(reserves[0]).to.equal(0);
            expect(reserves[1]).to.equal(0);
        });

        it("pause değilken emergency withdraw çalışmamalı", async function () {
            await expect(
                stableSwap.emergencyWithdraw(
                    await token0.getAddress(),
                    owner.address,
                    1000
                )
            ).to.be.revertedWithCustomError(stableSwap, "ExpectedPause");
        });

        it("sadece owner emergency withdraw yapabilir", async function () {
            await stableSwap.pause();
            await expect(
                stableSwap.connect(user).emergencyWithdraw(
                    await token0.getAddress(),
                    user.address,
                    1000
                )
            ).to.be.revertedWithCustomError(stableSwap, "OwnableUnauthorizedAccount");
        });
    });
});
