const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FeeDistributor", function () {
    let owner, treasury, salary, user, swapContract;
    let assToken, buybackToken;
    let feeDistributor;

    const INITIAL_MINT = ethers.parseUnits("100000", 18);
    const FEE_AMOUNT = ethers.parseUnits("1000", 18);

    beforeEach(async function () {
        [owner, treasury, salary, user, swapContract] = await ethers.getSigners();

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
            treasury.address,
            salary.address,
            await buybackToken.getAddress()
        );
        await feeDistributor.waitForDeployment();
    });

    describe("Constructor", function () {
        it("assToken sıfır adres olamaz", async function () {
            const FeeDistributor = await ethers.getContractFactory("FeeDistributor");
            await expect(
                FeeDistributor.deploy(
                    ethers.ZeroAddress,
                    treasury.address,
                    salary.address,
                    await buybackToken.getAddress()
                )
            ).to.be.revertedWith("FeeDistributor: assToken zero address");
        });

        it("treasury sıfır adres olamaz", async function () {
            const FeeDistributor = await ethers.getContractFactory("FeeDistributor");
            await expect(
                FeeDistributor.deploy(
                    await assToken.getAddress(),
                    ethers.ZeroAddress,
                    salary.address,
                    await buybackToken.getAddress()
                )
            ).to.be.revertedWith("FeeDistributor: treasury zero address");
        });

        it("salaryAddress sıfır adres olamaz", async function () {
            const FeeDistributor = await ethers.getContractFactory("FeeDistributor");
            await expect(
                FeeDistributor.deploy(
                    await assToken.getAddress(),
                    treasury.address,
                    ethers.ZeroAddress,
                    await buybackToken.getAddress()
                )
            ).to.be.revertedWith("FeeDistributor: salaryAddress zero address");
        });

        it("buybackToken sıfır adres olamaz", async function () {
            const FeeDistributor = await ethers.getContractFactory("FeeDistributor");
            await expect(
                FeeDistributor.deploy(
                    await assToken.getAddress(),
                    treasury.address,
                    salary.address,
                    ethers.ZeroAddress
                )
            ).to.be.revertedWith("FeeDistributor: buybackToken zero address");
        });

        it("fee payları doğru set edilmeli", async function () {
            expect(await feeDistributor.STAKER_SHARE()).to.equal(4500);
            expect(await feeDistributor.BUYBACK_SHARE()).to.equal(4500);
            expect(await feeDistributor.TREASURY_SHARE()).to.equal(1000);
        });
    });

    describe("Access Control", function () {
        it("sadece owner pause edebilir", async function () {
            await expect(feeDistributor.connect(user).pause())
                .to.be.revertedWithCustomError(feeDistributor, "OwnableUnauthorizedAccount");
        });

        it("sadece owner unpause edebilir", async function () {
            await feeDistributor.pause();
            await expect(feeDistributor.connect(user).unpause())
                .to.be.revertedWithCustomError(feeDistributor, "OwnableUnauthorizedAccount");
        });

        it("sadece owner swap kontratı ekleyebilir", async function () {
            await expect(feeDistributor.connect(user).addSwapContract(swapContract.address))
                .to.be.revertedWithCustomError(feeDistributor, "OwnableUnauthorizedAccount");
        });

        it("sadece owner swap kontratı kaldırabilir", async function () {
            await feeDistributor.addSwapContract(swapContract.address);
            await expect(feeDistributor.connect(user).removeSwapContract(swapContract.address))
                .to.be.revertedWithCustomError(feeDistributor, "OwnableUnauthorizedAccount");
        });

        it("sadece owner staking kontratı set edebilir", async function () {
            await expect(feeDistributor.connect(user).setStakingContract(user.address))
                .to.be.revertedWithCustomError(feeDistributor, "OwnableUnauthorizedAccount");
        });

        it("sadece owner treasury set edebilir", async function () {
            await expect(feeDistributor.connect(user).setTreasury(user.address))
                .to.be.revertedWithCustomError(feeDistributor, "OwnableUnauthorizedAccount");
        });

        it("sadece owner salary adresi set edebilir", async function () {
            await expect(feeDistributor.connect(user).setSalaryAddress(user.address))
                .to.be.revertedWithCustomError(feeDistributor, "OwnableUnauthorizedAccount");
        });

        it("sadece owner buyback token set edebilir", async function () {
            await expect(feeDistributor.connect(user).setBuybackToken(user.address))
                .to.be.revertedWithCustomError(feeDistributor, "OwnableUnauthorizedAccount");
        });

        it("sadece owner autoBuyback set edebilir", async function () {
            await expect(feeDistributor.connect(user).setAutoBuyback(user.address))
                .to.be.revertedWithCustomError(feeDistributor, "OwnableUnauthorizedAccount");
        });
    });

    describe("Pausable", function () {
        beforeEach(async function () {
            await feeDistributor.addSwapContract(swapContract.address);
        });

        it("pause durumunda collectFee çalışmamalı", async function () {
            await feeDistributor.pause();
            await expect(
                feeDistributor.connect(swapContract).collectFee(await buybackToken.getAddress(), FEE_AMOUNT)
            ).to.be.revertedWithCustomError(feeDistributor, "EnforcedPause");
        });

        it("pause durumunda distributeFees çalışmamalı", async function () {
            await feeDistributor.pause();
            await expect(
                feeDistributor.distributeFees(await buybackToken.getAddress())
            ).to.be.revertedWithCustomError(feeDistributor, "EnforcedPause");
        });
    });

    describe("Swap Contract Management", function () {
        it("swap kontratı eklenebilmeli", async function () {
            await expect(feeDistributor.addSwapContract(swapContract.address))
                .to.emit(feeDistributor, "SwapContractAdded")
                .withArgs(swapContract.address);

            expect(await feeDistributor.isSwapContract(swapContract.address)).to.be.true;
        });

        it("sıfır adres eklenemez", async function () {
            await expect(feeDistributor.addSwapContract(ethers.ZeroAddress))
                .to.be.revertedWith("FeeDistributor: Invalid address");
        });

        it("aynı kontrat tekrar eklenemez", async function () {
            await feeDistributor.addSwapContract(swapContract.address);
            await expect(feeDistributor.addSwapContract(swapContract.address))
                .to.be.revertedWith("FeeDistributor: Already added");
        });

        it("swap kontratı kaldırılabilmeli", async function () {
            await feeDistributor.addSwapContract(swapContract.address);
            await expect(feeDistributor.removeSwapContract(swapContract.address))
                .to.emit(feeDistributor, "SwapContractRemoved")
                .withArgs(swapContract.address);

            expect(await feeDistributor.isSwapContract(swapContract.address)).to.be.false;
        });

        it("olmayan kontrat kaldırılamaz", async function () {
            await expect(feeDistributor.removeSwapContract(swapContract.address))
                .to.be.revertedWith("FeeDistributor: Not found");
        });

        it("getSwapContracts doğru liste döndürmeli", async function () {
            await feeDistributor.addSwapContract(swapContract.address);
            await feeDistributor.addSwapContract(user.address);

            const contracts = await feeDistributor.getSwapContracts();
            expect(contracts.length).to.equal(2);
            expect(contracts).to.include(swapContract.address);
            expect(contracts).to.include(user.address);
        });
    });

    describe("CollectFee", function () {
        beforeEach(async function () {
            await feeDistributor.addSwapContract(swapContract.address);
        });

        it("sadece swap kontratları fee toplayabilir", async function () {
            await expect(
                feeDistributor.connect(user).collectFee(await buybackToken.getAddress(), FEE_AMOUNT)
            ).to.be.revertedWith("FeeDistributor: Only swap contracts can collect fees");
        });

        it("sıfır miktar toplanamaz", async function () {
            await expect(
                feeDistributor.connect(swapContract).collectFee(await buybackToken.getAddress(), 0)
            ).to.be.revertedWith("FeeDistributor: Amount must be > 0");
        });

        it("yeterli balance olmadan fee toplanamaz", async function () {
            await expect(
                feeDistributor.connect(swapContract).collectFee(await buybackToken.getAddress(), FEE_AMOUNT)
            ).to.be.revertedWith("FeeDistributor: Insufficient balance received");
        });

        it("fee toplama başarılı olmalı", async function () {
            // Token'ı feeDistributor'a gönder (swap kontratı bunu yapar)
            await buybackToken.mint(await feeDistributor.getAddress(), FEE_AMOUNT);

            await expect(feeDistributor.connect(swapContract).collectFee(await buybackToken.getAddress(), FEE_AMOUNT))
                .to.emit(feeDistributor, "FeesCollected")
                .withArgs(swapContract.address, await buybackToken.getAddress(), FEE_AMOUNT);

            expect(await feeDistributor.collectedFees(swapContract.address)).to.equal(FEE_AMOUNT);
        });
    });

    describe("DistributeFees", function () {
        beforeEach(async function () {
            await feeDistributor.addSwapContract(swapContract.address);
        });

        it("sıfır adresli token ile dağıtılamaz", async function () {
            await expect(feeDistributor.distributeFees(ethers.ZeroAddress))
                .to.be.revertedWith("FeeDistributor: token zero address");
        });

        it("boş balance ile dağıtım yapılmamalı (silent return)", async function () {
            // Balance 0, hiçbir şey olmaz
            await expect(feeDistributor.distributeFees(await buybackToken.getAddress()))
                .to.not.be.reverted;
        });

        it("fee dağıtımı başarılı olmalı (AutoBuyback yok)", async function () {
            // Token'ı feeDistributor'a gönder
            await buybackToken.mint(await feeDistributor.getAddress(), FEE_AMOUNT);
            await feeDistributor.connect(swapContract).collectFee(await buybackToken.getAddress(), FEE_AMOUNT);

            const treasuryBalanceBefore = await buybackToken.balanceOf(treasury.address);
            const salaryBalanceBefore = await buybackToken.balanceOf(salary.address);

            await feeDistributor.distributeFees(await buybackToken.getAddress());

            const treasuryBalanceAfter = await buybackToken.balanceOf(treasury.address);
            const salaryBalanceAfter = await buybackToken.balanceOf(salary.address);

            // Treasury: %10 + buyback'in %90'ı (AutoBuyback yoksa treasury'ye gider)
            // %45 buyback -> %10 salary, %90 treasury'ye (burn yerine)
            const expectedTreasury = (FEE_AMOUNT * 1000n) / 10000n + // %10 treasury
                                    ((FEE_AMOUNT * 4500n) / 10000n * 9000n) / 10000n; // buyback'in %90'ı
            const expectedSalary = ((FEE_AMOUNT * 4500n) / 10000n * 1000n) / 10000n; // buyback'in %10'u

            expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(expectedTreasury);
            expect(salaryBalanceAfter - salaryBalanceBefore).to.equal(expectedSalary);
        });
    });

    describe("Setter Functions", function () {
        it("setStakingContract çalışmalı", async function () {
            await expect(feeDistributor.setStakingContract(user.address))
                .to.emit(feeDistributor, "StakingContractUpdated")
                .withArgs(ethers.ZeroAddress, user.address);

            expect(await feeDistributor.stakingContract()).to.equal(user.address);
        });

        it("setTreasury çalışmalı", async function () {
            await expect(feeDistributor.setTreasury(user.address))
                .to.emit(feeDistributor, "TreasuryUpdated")
                .withArgs(treasury.address, user.address);

            expect(await feeDistributor.treasury()).to.equal(user.address);
        });

        it("setTreasury sıfır adres kabul etmemeli", async function () {
            await expect(feeDistributor.setTreasury(ethers.ZeroAddress))
                .to.be.revertedWith("FeeDistributor: Invalid address");
        });

        it("setSalaryAddress çalışmalı", async function () {
            await expect(feeDistributor.setSalaryAddress(user.address))
                .to.emit(feeDistributor, "SalaryAddressUpdated")
                .withArgs(salary.address, user.address);

            expect(await feeDistributor.salaryAddress()).to.equal(user.address);
        });

        it("setSalaryAddress sıfır adres kabul etmemeli", async function () {
            await expect(feeDistributor.setSalaryAddress(ethers.ZeroAddress))
                .to.be.revertedWith("FeeDistributor: Invalid address");
        });

        it("setBuybackToken çalışmalı", async function () {
            const newToken = user.address;
            await expect(feeDistributor.setBuybackToken(newToken))
                .to.emit(feeDistributor, "BuybackTokenUpdated")
                .withArgs(await buybackToken.getAddress(), newToken);

            expect(await feeDistributor.buybackToken()).to.equal(newToken);
        });

        it("setBuybackToken sıfır adres kabul etmemeli", async function () {
            await expect(feeDistributor.setBuybackToken(ethers.ZeroAddress))
                .to.be.revertedWith("FeeDistributor: Invalid address");
        });

        it("setAutoBuyback çalışmalı", async function () {
            await expect(feeDistributor.setAutoBuyback(user.address))
                .to.emit(feeDistributor, "AutoBuybackUpdated")
                .withArgs(ethers.ZeroAddress, user.address);

            expect(await feeDistributor.autoBuyback()).to.equal(user.address);
        });
    });
});
