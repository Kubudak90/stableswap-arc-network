// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ASSToken} from "./ASSToken.sol";
import {StakingContract} from "./StakingContract.sol";

/**
 * @title FeeDistributor
 * @notice Swap fee'lerini toplayıp dağıtan kontrat
 * @dev Fee dağılımı: %45 staker, %45 buyback (%10 maaş, %90 burn), %10 treasury
 * ReentrancyGuard ve Pausable ile güvenli
 */
contract FeeDistributor is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    ASSToken public immutable assToken;
    
    // StableSwap kontratları
    address[] public swapContracts;
    
    // Fee dağılım oranları (basis points - 10000 = %100)
    uint256 public constant BPS = 10000;          // Basis points tabanı
    uint256 public constant STAKER_SHARE = 4500;  // %45
    uint256 public constant BUYBACK_SHARE = 4500; // %45
    uint256 public constant TREASURY_SHARE = 1000; // %10

    // Buyback içindeki maaş oranı (buyback'in %10'u)
    uint256 public constant SALARY_SHARE_OF_BUYBACK = 1000; // Buyback'in %10'u
    
    // Adresler
    address public stakingContract;
    address public treasury;
    address public salaryAddress; // Buyback'ten maaş alacak adres (deprecated - artık AutoBuyback kullanılıyor)
    address public autoBuyback; // Otomatik buyback kontratı
    
    // Buyback için kullanılacak stablecoin (USDC/USDT vb.)
    IERC20 public buybackToken;
    
    // Toplanan fee'ler (stablecoin cinsinden)
    mapping(address => uint256) public collectedFees; // swapContract => amount
    
    event FeesCollected(address indexed swapContract, address indexed token, uint256 amount);
    event FeesDistributed(
        uint256 stakerAmount,
        uint256 buybackAmount,
        uint256 treasuryAmount,
        uint256 salaryAmount,
        uint256 burnAmount
    );
    event SwapContractAdded(address indexed swapContract);
    event SwapContractRemoved(address indexed swapContract);
    event StakingContractUpdated(address indexed oldContract, address indexed newContract);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event SalaryAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event BuybackTokenUpdated(address indexed oldToken, address indexed newToken);
    event AutoBuybackUpdated(address indexed oldBuyback, address indexed newBuyback);

    constructor(
        address _assToken,
        address _treasury,
        address _salaryAddress,
        address _buybackToken
    ) Ownable(msg.sender) {
        require(_assToken != address(0), "FeeDistributor: assToken zero address");
        require(_treasury != address(0), "FeeDistributor: treasury zero address");
        require(_salaryAddress != address(0), "FeeDistributor: salaryAddress zero address");
        require(_buybackToken != address(0), "FeeDistributor: buybackToken zero address");
        assToken = ASSToken(_assToken);
        treasury = _treasury;
        salaryAddress = _salaryAddress;
        buybackToken = IERC20(_buybackToken);

        require(STAKER_SHARE + BUYBACK_SHARE + TREASURY_SHARE == BPS, "FeeDistributor: Invalid fee shares");
    }

    /**
     * @notice Emergency pause (sadece owner)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause (sadece owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Swap kontratından fee topla (sadece swap kontratları çağırabilir)
     * @dev Token zaten swap kontratı tarafından transfer edilmiş olmalı
     */
    function collectFee(address token, uint256 amount) external whenNotPaused {
        require(isSwapContract(msg.sender), "FeeDistributor: Only swap contracts can collect fees");
        require(amount > 0, "FeeDistributor: Amount must be > 0");
        
        // Token zaten swap kontratı tarafından transfer edildi (swap kontratında safeTransfer çağrısı var)
        // Transfer kontrolü: Balance'ın en az amount kadar olması gerekiyor
        uint256 currentBalance = IERC20(token).balanceOf(address(this));
        
        // Balance kontrolü: Mevcut balance en az amount kadar olmalı
        // (Token zaten transfer edildi, sadece kontrol ediyoruz)
        require(currentBalance >= amount, "FeeDistributor: Insufficient balance received");
        
        collectedFees[msg.sender] += amount;
        
        emit FeesCollected(msg.sender, token, amount);
    }

    /**
     * @notice Toplanan fee'leri dağıt
     * @param token Fee'nin toplandığı token (stablecoin)
     */
    function distributeFees(address token) external whenNotPaused nonReentrant {
        require(token != address(0), "FeeDistributor: token zero address");
        IERC20 feeToken = IERC20(token);
        
        // Gerçek balance'ı kontrol et
        uint256 actualBalance = feeToken.balanceOf(address(this));
        if (actualBalance == 0) {
            // Hiç token yok, dağıtılacak bir şey yok
            return;
        }
        
        // Toplanan fee kayıtlarını topla (gas optimization: cache length)
        uint256 totalCollected = 0;
        uint256 swapContractsLength = swapContracts.length;
        for (uint256 i = 0; i < swapContractsLength; ) {
            uint256 collected = collectedFees[swapContracts[i]];
            if (collected > 0) {
                totalCollected += collected;
                // Mapping'i sıfırla (gerçek balance kullanılacak)
                collectedFees[swapContracts[i]] = 0;
            }
            unchecked { ++i; }
        }
        
        // ÖNEMLİ: Gerçek balance'ı kullan (mapping'deki miktar yanlış olabilir)
        // Eğer mapping'deki toplam, gerçek balance'dan fazlaysa, sadece gerçek balance'ı kullan
        uint256 distributableAmount = actualBalance;
        if (totalCollected > 0 && totalCollected < actualBalance) {
            // Mapping'deki miktar gerçek balance'dan az, mapping'i kullan
            distributableAmount = totalCollected;
        }
        // Eğer totalCollected == 0 ama actualBalance > 0 ise, balance'ı kullan (manuel transfer olabilir)
        // Eğer totalCollected > actualBalance ise, sadece actualBalance'ı kullan
        
        if (distributableAmount == 0) return;
        
        // %45 Staker'lara (staking kontratına gönder)
        uint256 stakerAmount = (distributableAmount * STAKER_SHARE) / BPS;
        if (stakerAmount > 0 && stakingContract != address(0)) {
            // Staking kontratına stablecoin transfer et
            feeToken.safeTransfer(stakingContract, stakerAmount);
            // Transfer sonrası distributeRewards çağır (transfer edilen miktarı gönder)
            // StakingContract içinde balance kontrolü var, bu yüzden transfer edilen miktarı göndermemiz yeterli
            StakingContract(stakingContract).distributeRewards(stakerAmount);
        }
        
        // %45 Buyback
        uint256 buybackAmount = (distributableAmount * BUYBACK_SHARE) / BPS;
        if (buybackAmount > 0) {
            if (autoBuyback != address(0)) {
                // AutoBuyback kontratına gönder (otomatik buyback yapacak)
                feeToken.safeTransfer(autoBuyback, buybackAmount);
                // AutoBuyback kontratı buyback'i kendi içinde yönetecek
            } else {
                // Fallback: Eski mekanizma (AutoBuyback yoksa)
                uint256 salaryAmount = (buybackAmount * SALARY_SHARE_OF_BUYBACK) / BPS;
                uint256 burnAmount = buybackAmount - salaryAmount;
                
                if (salaryAmount > 0 && salaryAddress != address(0)) {
                    feeToken.safeTransfer(salaryAddress, salaryAmount);
                }
                
                if (burnAmount > 0) {
                    feeToken.safeTransfer(treasury, burnAmount);
                }
            }
        }
        
        // %10 Treasury
        uint256 treasuryAmount = (distributableAmount * TREASURY_SHARE) / BPS;
        if (treasuryAmount > 0 && treasury != address(0)) {
            feeToken.safeTransfer(treasury, treasuryAmount);
        }
        
        emit FeesDistributed(
            stakerAmount,
            buybackAmount,
            treasuryAmount,
            buybackAmount > 0 ? (buybackAmount * SALARY_SHARE_OF_BUYBACK) / BPS : 0,
            buybackAmount > 0 ? buybackAmount - ((buybackAmount * SALARY_SHARE_OF_BUYBACK) / BPS) : 0
        );
    }

    /**
     * @notice Swap kontratı ekle (sadece owner)
     */
    function addSwapContract(address swapContract) external onlyOwner {
        require(swapContract != address(0), "FeeDistributor: Invalid address");
        require(!isSwapContract(swapContract), "FeeDistributor: Already added");
        
        swapContracts.push(swapContract);
        emit SwapContractAdded(swapContract);
    }

    /**
     * @notice Swap kontratı kaldır (sadece owner)
     */
    function removeSwapContract(address swapContract) external onlyOwner {
        require(isSwapContract(swapContract), "FeeDistributor: Not found");

        uint256 length = swapContracts.length;
        for (uint256 i = 0; i < length; ) {
            if (swapContracts[i] == swapContract) {
                swapContracts[i] = swapContracts[length - 1];
                swapContracts.pop();
                emit SwapContractRemoved(swapContract);
                break;
            }
            unchecked { ++i; }
        }
    }

    /**
     * @notice Staking kontratını güncelle (sadece owner)
     */
    function setStakingContract(address _stakingContract) external onlyOwner {
        address oldContract = stakingContract;
        stakingContract = _stakingContract;
        emit StakingContractUpdated(oldContract, _stakingContract);
    }

    /**
     * @notice Treasury adresini güncelle (sadece owner)
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "FeeDistributor: Invalid address");
        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }

    /**
     * @notice Maaş adresini güncelle (sadece owner)
     */
    function setSalaryAddress(address _salaryAddress) external onlyOwner {
        require(_salaryAddress != address(0), "FeeDistributor: Invalid address");
        address oldAddress = salaryAddress;
        salaryAddress = _salaryAddress;
        emit SalaryAddressUpdated(oldAddress, _salaryAddress);
    }

    /**
     * @notice Buyback token'ı güncelle (sadece owner)
     */
    function setBuybackToken(address _buybackToken) external onlyOwner {
        require(_buybackToken != address(0), "FeeDistributor: Invalid address");
        address oldToken = address(buybackToken);
        buybackToken = IERC20(_buybackToken);
        emit BuybackTokenUpdated(oldToken, _buybackToken);
    }

    /**
     * @notice AutoBuyback kontratını ayarla (sadece owner)
     */
    function setAutoBuyback(address _autoBuyback) external onlyOwner {
        address oldBuyback = autoBuyback;
        autoBuyback = _autoBuyback;
        emit AutoBuybackUpdated(oldBuyback, _autoBuyback);
    }

    /**
     * @notice Swap kontratı mı kontrol et
     */
    function isSwapContract(address contractAddress) public view returns (bool) {
        uint256 length = swapContracts.length;
        for (uint256 i = 0; i < length; ) {
            if (swapContracts[i] == contractAddress) {
                return true;
            }
            unchecked { ++i; }
        }
        return false;
    }

    /**
     * @notice Tüm swap kontratlarını listele
     */
    function getSwapContracts() external view returns (address[] memory) {
        return swapContracts;
    }
}

