// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {FeeDistributor} from "./FeeDistributor.sol";

/**
 * @title StakingContract
 * @notice ASS token stake etme ve reward alma kontratı
 * @dev Fee distributor'dan gelen stablecoin'leri ASS token'a çevirerek stake edenlere dağıtır
 * ReentrancyGuard ve Pausable ile güvenli
 */
contract StakingContract is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    /// @notice Precision for reward calculations
    uint256 public constant PRECISION = 1e18;

    IERC20 public immutable assToken;
    FeeDistributor public immutable feeDistributor;
    
    // Staking bilgileri
    struct StakerInfo {
        uint256 stakedAmount;
        uint256 rewardDebt; // Accrued but not yet claimed
        uint256 pendingRewards;
    }
    
    mapping(address => StakerInfo) public stakers;
    
    // Toplam stake edilmiş ASS miktarı
    uint256 public totalStaked;
    
    // Reward per token (her token başına ödül)
    uint256 public rewardPerTokenStored;
    uint256 public lastUpdateTime;
    
    // Stablecoin reward token (USDC/USDT)
    IERC20 public rewardToken;
    
    // Toplam stablecoin reward (to be distributed)
    uint256 public totalRewardsCollected;
    
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
    event RewardTokenUpdated(address indexed oldToken, address indexed newToken);

    constructor(
        address _assToken,
        address _feeDistributor,
        address _rewardToken
    ) Ownable(msg.sender) {
        require(_assToken != address(0), "StakingContract: assToken zero address");
        require(_feeDistributor != address(0), "StakingContract: feeDistributor zero address");
        require(_rewardToken != address(0), "StakingContract: rewardToken zero address");
        assToken = IERC20(_assToken);
        feeDistributor = FeeDistributor(payable(_feeDistributor));
        rewardToken = IERC20(_rewardToken);
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
     * @notice ASS token stake et
     */
    function stake(uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "StakingContract: Amount must be > 0");

        updateRewards(msg.sender);

        assToken.safeTransferFrom(msg.sender, address(this), amount);

        StakerInfo storage staker = stakers[msg.sender];
        staker.stakedAmount += amount;
        totalStaked += amount;

        emit Staked(msg.sender, amount);
    }

    /**
     * @notice Stake'ten çıkar
     */
    function unstake(uint256 amount) external whenNotPaused nonReentrant {
        StakerInfo storage staker = stakers[msg.sender];
        require(staker.stakedAmount >= amount, "StakingContract: Insufficient staked");

        updateRewards(msg.sender);

        staker.stakedAmount -= amount;
        totalStaked -= amount;

        assToken.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    /**
     * @notice Pending reward'ları claim et
     * @dev Tam ödeme yapılabiliyorsa transfer eder, yoksa revert eder (silent failure yok)
     */
    function claimRewards() external whenNotPaused nonReentrant {
        updateRewards(msg.sender);

        StakerInfo storage staker = stakers[msg.sender];
        uint256 pending = staker.pendingRewards;

        require(pending > 0, "StakingContract: No rewards to claim");

        // Kontratın balance'ını kontrol et
        uint256 contractBalance = rewardToken.balanceOf(address(this));

        // KRİTİK: Yetersiz balance durumunda revert et, kısmi ödeme yapma
        // Bu kullanıcının beklentisini korur ve silent failure'ı önler
        require(contractBalance >= pending, "StakingContract: Insufficient reward balance, try again later");

        // Tam ödeme yap
        staker.pendingRewards = 0;
        rewardToken.safeTransfer(msg.sender, pending);
        emit RewardClaimed(msg.sender, pending);
    }

    /**
     * @notice Fee distributor'dan gelen reward'ları al ve dağıt
     * @dev Fee distributor önce transfer edip sonra bu fonksiyonu çağırır
     */
    function distributeRewards(uint256 amount) external {
        require(msg.sender == address(feeDistributor), "StakingContract: Only fee distributor");
        require(amount > 0, "StakingContract: Amount must be > 0");
        
        // Token'lar zaten FeeDistributor tarafından transfer edildi
        // Gerçek balance'ı kontrol et ve kullan (transfer edilen miktardan fazla olabilir)
        uint256 currentBalance = rewardToken.balanceOf(address(this));
        require(currentBalance > 0, "StakingContract: No tokens received");
        
        // Gerçek balance'ı kullan (güvenlik için - transfer edilen amount'tan fazla olabilir)
        uint256 actualAmount = currentBalance < amount ? currentBalance : amount;
        
        totalRewardsCollected += actualAmount;
        
        // Reward'ları stake edenlere dağıt
        if (totalStaked > 0) {
            uint256 rewardPerToken = (actualAmount * PRECISION) / totalStaked;
            rewardPerTokenStored += rewardPerToken;
        }
    }

    /**
     * @notice Kullanıcının reward'larını güncelle
     */
    function updateRewards(address user) internal {
        if (totalStaked == 0) return;
        
        StakerInfo storage staker = stakers[user];
        if (staker.stakedAmount == 0) return;
        
        uint256 earned = (staker.stakedAmount * rewardPerTokenStored) / PRECISION;
        
        // Underflow kontrolü - eğer earned < rewardDebt ise newRewards = 0
        uint256 newRewards = 0;
        if (earned > staker.rewardDebt) {
            newRewards = earned - staker.rewardDebt;
            if (newRewards > 0) {
                staker.pendingRewards += newRewards;
            }
        }
        
        // rewardDebt'ı güncelle (her zaman güncelle, underflow durumunda bile)
        staker.rewardDebt = earned;
    }

    /**
     * @notice Kullanıcının pending reward'ını görüntüle
     */
    function getPendingRewards(address user) external view returns (uint256) {
        StakerInfo storage staker = stakers[user];
        if (staker.stakedAmount == 0 || totalStaked == 0) {
            return staker.pendingRewards;
        }
        
        // Bu basitleştirilmiş bir versiyon, gerçek implementasyonda
        // son distribütör çağrısından beri geçen süreyi de hesaba katmak gerekir
        return staker.pendingRewards;
    }

    /**
     * @notice Reward token'ı güncelle (sadece owner)
     */
    function setRewardToken(address _rewardToken) external onlyOwner {
        require(_rewardToken != address(0), "StakingContract: Invalid address");
        address oldToken = address(rewardToken);
        rewardToken = IERC20(_rewardToken);
        emit RewardTokenUpdated(oldToken, _rewardToken);
    }

    /**
     * @notice Kullanıcının stake bilgilerini görüntüle
     */
    function getStakerInfo(address user) external view returns (
        uint256 stakedAmount,
        uint256 pendingRewards,
        uint256 totalStakedInContract
    ) {
        StakerInfo memory staker = stakers[user];
        return (
            staker.stakedAmount,
            staker.pendingRewards,
            totalStaked
        );
    }
}

