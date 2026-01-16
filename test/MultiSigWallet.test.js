const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiSigWallet", function () {
    let owner1, owner2, owner3, nonOwner;
    let multiSig;
    let testToken;

    const REQUIRED_CONFIRMATIONS = 2;

    beforeEach(async function () {
        [owner1, owner2, owner3, nonOwner] = await ethers.getSigners();

        // MultiSigWallet deploy et (3 owner, 2 onay gerekli)
        const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
        multiSig = await MultiSigWallet.deploy(
            [owner1.address, owner2.address, owner3.address],
            REQUIRED_CONFIRMATIONS
        );
        await multiSig.waitForDeployment();

        // Test token deploy et
        const Token = await ethers.getContractFactory("TestUSDCV2");
        testToken = await Token.deploy();
        await testToken.waitForDeployment();

        // MultiSig'e ETH gönder
        await owner1.sendTransaction({
            to: await multiSig.getAddress(),
            value: ethers.parseEther("10")
        });
    });

    describe("Constructor", function () {
        it("owner'lar doğru set edilmeli", async function () {
            expect(await multiSig.isOwner(owner1.address)).to.be.true;
            expect(await multiSig.isOwner(owner2.address)).to.be.true;
            expect(await multiSig.isOwner(owner3.address)).to.be.true;
            expect(await multiSig.isOwner(nonOwner.address)).to.be.false;
        });

        it("gerekli onay sayısı doğru set edilmeli", async function () {
            expect(await multiSig.numConfirmationsRequired()).to.equal(REQUIRED_CONFIRMATIONS);
        });

        it("owner listesi doğru döndürülmeli", async function () {
            const owners = await multiSig.getOwners();
            expect(owners.length).to.equal(3);
            expect(owners).to.include(owner1.address);
            expect(owners).to.include(owner2.address);
            expect(owners).to.include(owner3.address);
        });

        it("boş owner listesi ile deploy edilememeli", async function () {
            const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
            await expect(
                MultiSigWallet.deploy([], 1)
            ).to.be.revertedWith("MultiSig: owners required");
        });

        it("geçersiz onay sayısı ile deploy edilememeli", async function () {
            const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
            await expect(
                MultiSigWallet.deploy([owner1.address, owner2.address], 0)
            ).to.be.revertedWith("MultiSig: invalid number of required confirmations");

            await expect(
                MultiSigWallet.deploy([owner1.address, owner2.address], 3)
            ).to.be.revertedWith("MultiSig: invalid number of required confirmations");
        });

        it("aynı owner tekrar eklenemez", async function () {
            const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
            await expect(
                MultiSigWallet.deploy([owner1.address, owner1.address], 1)
            ).to.be.revertedWith("MultiSig: owner not unique");
        });

        it("sıfır adres owner olamaz", async function () {
            const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
            await expect(
                MultiSigWallet.deploy([ethers.ZeroAddress], 1)
            ).to.be.revertedWith("MultiSig: invalid owner");
        });
    });

    describe("Submit Transaction", function () {
        it("owner işlem önerebilmeli", async function () {
            const tx = await multiSig.submitTransaction(
                nonOwner.address,
                ethers.parseEther("1"),
                "0x"
            );

            await expect(tx)
                .to.emit(multiSig, "SubmitTransaction")
                .withArgs(owner1.address, 0, nonOwner.address, ethers.parseEther("1"), "0x");

            expect(await multiSig.getTransactionCount()).to.equal(1);
        });

        it("owner olmayan işlem öneremez", async function () {
            await expect(
                multiSig.connect(nonOwner).submitTransaction(
                    owner1.address,
                    ethers.parseEther("1"),
                    "0x"
                )
            ).to.be.revertedWith("MultiSig: not owner");
        });

        it("sıfır adrese işlem önerilemez", async function () {
            await expect(
                multiSig.submitTransaction(ethers.ZeroAddress, 0, "0x")
            ).to.be.revertedWith("MultiSig: invalid target");
        });

        it("öneren otomatik olarak onaylamalı", async function () {
            await multiSig.submitTransaction(nonOwner.address, 0, "0x");

            const tx = await multiSig.getTransaction(0);
            expect(tx.numConfirmations).to.equal(1);
            expect(await multiSig.hasConfirmed(0, owner1.address)).to.be.true;
        });
    });

    describe("Confirm Transaction", function () {
        beforeEach(async function () {
            await multiSig.submitTransaction(nonOwner.address, ethers.parseEther("1"), "0x");
        });

        it("owner işlemi onaylayabilmeli", async function () {
            await expect(multiSig.connect(owner2).confirmTransaction(0))
                .to.emit(multiSig, "ConfirmTransaction")
                .withArgs(owner2.address, 0);

            const tx = await multiSig.getTransaction(0);
            expect(tx.numConfirmations).to.equal(2);
        });

        it("aynı owner iki kez onaylayamaz", async function () {
            await expect(
                multiSig.connect(owner1).confirmTransaction(0)
            ).to.be.revertedWith("MultiSig: tx already confirmed");
        });

        it("owner olmayan onaylayamaz", async function () {
            await expect(
                multiSig.connect(nonOwner).confirmTransaction(0)
            ).to.be.revertedWith("MultiSig: not owner");
        });

        it("olmayan işlem onaylanamaz", async function () {
            await expect(
                multiSig.confirmTransaction(99)
            ).to.be.revertedWith("MultiSig: tx does not exist");
        });
    });

    describe("Execute Transaction", function () {
        beforeEach(async function () {
            await multiSig.submitTransaction(nonOwner.address, ethers.parseEther("1"), "0x");
        });

        it("yeterli onay ile işlem çalıştırılabilmeli", async function () {
            await multiSig.connect(owner2).confirmTransaction(0);

            const balanceBefore = await ethers.provider.getBalance(nonOwner.address);

            await expect(multiSig.executeTransaction(0))
                .to.emit(multiSig, "ExecuteTransaction")
                .withArgs(owner1.address, 0);

            const balanceAfter = await ethers.provider.getBalance(nonOwner.address);
            expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("1"));

            const tx = await multiSig.getTransaction(0);
            expect(tx.executed).to.be.true;
        });

        it("yetersiz onay ile çalıştırılamaz", async function () {
            // Sadece 1 onay var, 2 gerekli
            await expect(
                multiSig.executeTransaction(0)
            ).to.be.revertedWith("MultiSig: cannot execute tx - not enough confirmations");
        });

        it("zaten çalıştırılmış işlem tekrar çalıştırılamaz", async function () {
            await multiSig.connect(owner2).confirmTransaction(0);
            await multiSig.executeTransaction(0);

            await expect(
                multiSig.executeTransaction(0)
            ).to.be.revertedWith("MultiSig: tx already executed");
        });

        it("owner olmayan çalıştıramaz", async function () {
            await multiSig.connect(owner2).confirmTransaction(0);

            await expect(
                multiSig.connect(nonOwner).executeTransaction(0)
            ).to.be.revertedWith("MultiSig: not owner");
        });
    });

    describe("Revoke Confirmation", function () {
        beforeEach(async function () {
            await multiSig.submitTransaction(nonOwner.address, ethers.parseEther("1"), "0x");
            await multiSig.connect(owner2).confirmTransaction(0);
        });

        it("onay geri çekilebilmeli", async function () {
            await expect(multiSig.connect(owner2).revokeConfirmation(0))
                .to.emit(multiSig, "RevokeConfirmation")
                .withArgs(owner2.address, 0);

            const tx = await multiSig.getTransaction(0);
            expect(tx.numConfirmations).to.equal(1);
            expect(await multiSig.hasConfirmed(0, owner2.address)).to.be.false;
        });

        it("onaylanmamış işlemden onay geri çekilemez", async function () {
            await expect(
                multiSig.connect(owner3).revokeConfirmation(0)
            ).to.be.revertedWith("MultiSig: tx not confirmed");
        });

        it("çalıştırılmış işlemden onay geri çekilemez", async function () {
            await multiSig.executeTransaction(0);

            await expect(
                multiSig.connect(owner2).revokeConfirmation(0)
            ).to.be.revertedWith("MultiSig: tx already executed");
        });
    });

    describe("Owner Management", function () {
        it("multi-sig ile yeni owner eklenebilmeli", async function () {
            // addOwner çağrısı için data oluştur
            const addOwnerData = multiSig.interface.encodeFunctionData("addOwner", [nonOwner.address]);

            // İşlem öner
            await multiSig.submitTransaction(await multiSig.getAddress(), 0, addOwnerData);

            // İkinci onay
            await multiSig.connect(owner2).confirmTransaction(0);

            // Çalıştır
            await multiSig.executeTransaction(0);

            expect(await multiSig.isOwner(nonOwner.address)).to.be.true;
        });

        it("multi-sig ile owner kaldırılabilmeli", async function () {
            // removeOwner çağrısı için data oluştur
            const removeOwnerData = multiSig.interface.encodeFunctionData("removeOwner", [owner3.address]);

            await multiSig.submitTransaction(await multiSig.getAddress(), 0, removeOwnerData);
            await multiSig.connect(owner2).confirmTransaction(0);
            await multiSig.executeTransaction(0);

            expect(await multiSig.isOwner(owner3.address)).to.be.false;
        });

        it("multi-sig ile gerekli onay sayısı değiştirilebilmeli", async function () {
            const changeRequirementData = multiSig.interface.encodeFunctionData("changeRequirement", [3]);

            await multiSig.submitTransaction(await multiSig.getAddress(), 0, changeRequirementData);
            await multiSig.connect(owner2).confirmTransaction(0);
            await multiSig.executeTransaction(0);

            expect(await multiSig.numConfirmationsRequired()).to.equal(3);
        });

        it("direkt çağrı ile owner eklenemez", async function () {
            await expect(
                multiSig.addOwner(nonOwner.address)
            ).to.be.revertedWith("MultiSig: only via multisig");
        });

        it("direkt çağrı ile owner kaldırılamaz", async function () {
            await expect(
                multiSig.removeOwner(owner3.address)
            ).to.be.revertedWith("MultiSig: only via multisig");
        });
    });

    describe("View Functions", function () {
        beforeEach(async function () {
            await multiSig.submitTransaction(nonOwner.address, ethers.parseEther("1"), "0x");
            await multiSig.submitTransaction(owner2.address, ethers.parseEther("2"), "0x");
        });

        it("getTransactionCount doğru döndürmeli", async function () {
            expect(await multiSig.getTransactionCount()).to.equal(2);
        });

        it("getTransaction doğru bilgi döndürmeli", async function () {
            const tx = await multiSig.getTransaction(0);
            expect(tx.to).to.equal(nonOwner.address);
            expect(tx.value).to.equal(ethers.parseEther("1"));
            expect(tx.executed).to.be.false;
            expect(tx.numConfirmations).to.equal(1);
        });

        it("getPendingTransactionCount doğru döndürmeli", async function () {
            expect(await multiSig.getPendingTransactionCount()).to.equal(2);

            // Birini çalıştır
            await multiSig.connect(owner2).confirmTransaction(0);
            await multiSig.executeTransaction(0);

            expect(await multiSig.getPendingTransactionCount()).to.equal(1);
        });

        it("canExecute doğru döndürmeli", async function () {
            // Yetersiz onay
            expect(await multiSig.canExecute(0)).to.be.false;

            // Yeterli onay
            await multiSig.connect(owner2).confirmTransaction(0);
            expect(await multiSig.canExecute(0)).to.be.true;

            // Çalıştırıldıktan sonra
            await multiSig.executeTransaction(0);
            expect(await multiSig.canExecute(0)).to.be.false;
        });
    });

    describe("Receive ETH", function () {
        it("ETH alabilmeli", async function () {
            const amount = ethers.parseEther("5");

            await expect(
                owner1.sendTransaction({
                    to: await multiSig.getAddress(),
                    value: amount
                })
            ).to.emit(multiSig, "Deposit");
        });
    });

    describe("Contract Call", function () {
        beforeEach(async function () {
            // Token'ları multiSig'e gönder
            await testToken.mint(await multiSig.getAddress(), ethers.parseUnits("10000", 18));
        });

        it("multi-sig ile kontrat fonksiyonu çağrılabilmeli", async function () {
            // Token transfer için data oluştur
            const transferData = testToken.interface.encodeFunctionData("transfer", [
                nonOwner.address,
                ethers.parseUnits("1000", 18)
            ]);

            await multiSig.submitTransaction(await testToken.getAddress(), 0, transferData);
            await multiSig.connect(owner2).confirmTransaction(0);
            await multiSig.executeTransaction(0);

            expect(await testToken.balanceOf(nonOwner.address)).to.equal(ethers.parseUnits("1000", 18));
        });
    });
});
