// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ASSToken} from "./ASSToken.sol";

/**
 * @title LiquidityRewards
 * @notice Pool'larda likidite sağlayanlara ASS token ödül dağıtan kontrat
 * @dev Emission schedule ile zamanlı token dağıtımı yapar
 */
contract LiquidityRewards is Ownable {
    using SafeERC20 for IERC20;

    ASSToken public immutable assToken;
    
    // Pool bilgileri
    struct PoolInfo {
        address poolContract; // StableSwap veya StableSwap3Pool adresi
        uint256 allocPoint; // Bu pool için ayrılan ödül payı
        uint256 lastRewardTime; // Son ödül zamanı
        uint256 accRewardPerShare; // Token başına birikmiş ödül
        bool isActive; // Pool aktif mi?
    }
    
    // Kullanıcı bilgileri
    struct UserInfo {
        uint256 amount; // Kullanıcının pool'a eklediği likidite miktarı
        uint256 rewardDebt; // Kullanıcının ödenmesi gereken ödül borcu
        uint256 pendingRewards; // Bekleyen ödüller
    }
    
    // Pool'lar
    PoolInfo[] public poolInfo;
    mapping(uint256 => mapping(address => UserInfo)) public userInfo; // poolId => user => UserInfo
    
    // Emission schedule - Pool Rewards (%100 community owned token'in dağıtım planı)
    // Toplam 1 milyar ASS token
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 1e18; // 1 milyar ASS
    uint256 public constant YEAR_1_SHARE = 200_000_000 * 1e18; // %20 - İlk yıl (200M ASS)
    uint256 public constant YEAR_2_SHARE = 150_000_000 * 1e18; // %15 - İkinci yıl (150M ASS)
    uint256 public constant YEAR_3_SHARE = 100_000_000 * 1e18; // %10 - Üçüncü yıl (100M ASS)
    uint256 public constant YEAR_4_SHARE = 75_000_000 * 1e18; // %7.5 - Dördüncü yıl (75M ASS)
    uint256 public constant YEAR_5_SHARE = 50_000_000 * 1e18; // %5 - Beşinci yıl (50M ASS)
    // Kalan %42.5 (425M ASS) fee'lerden mint edilecek (sonsuz süre)
    
    uint256 public constant YEAR_DURATION = 365 days;
    uint256 public startTime;
    uint256 public currentEpoch = 0; // 0: yıl 1, 1: yıl 2, vs.
    
    // Toplam allocation points
    uint256 public totalAllocPoint = 0;
    
    // Reward per second (her epoch için farklı)
    uint256 public rewardPerSecond;
    
    event PoolAdded(uint256 indexed poolId, address indexed poolContract, uint256 allocPoint);
    event PoolUpdated(uint256 indexed poolId, uint256 allocPoint);
    event Deposit(address indexed user, uint256 indexed poolId, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed poolId, uint256 amount);
    event RewardClaimed(address indexed user, uint256 indexed poolId, uint256 amount);
    event EpochUpdated(uint256 oldEpoch, uint256 newEpoch);
    event RewardPerSecondUpdated(uint256 oldRate, uint256 newRate);

    constructor(address _assToken) Ownable(msg.sender) {
        assToken = ASSToken(_assToken);
        startTime = block.timestamp;
        // İlk epoch için reward per second'u manuel ayarla
        rewardPerSecond = YEAR_1_SHARE / YEAR_DURATION;
        currentEpoch = 0;
    }

    /**
     * @notice Pool ekle (sadece owner)
     */
    function addPool(address poolContract, uint256 allocPoint) external onlyOwner {
        require(poolContract != address(0), "Invalid pool");
        require(allocPoint > 0, "Invalid allocPoint");
        
        poolInfo.push(PoolInfo({
            poolContract: poolContract,
            allocPoint: allocPoint,
            lastRewardTime: block.timestamp > startTime ? block.timestamp : startTime,
            accRewardPerShare: 0,
            isActive: true
        }));
        
        totalAllocPoint += allocPoint;
        
        emit PoolAdded(poolInfo.length - 1, poolContract, allocPoint);
    }

    /**
     * @notice Pool allocation point güncelle (sadece owner)
     */
    function setPool(uint256 poolId, uint256 allocPoint) external onlyOwner {
        require(poolId < poolInfo.length, "Invalid pool");
        
        totalAllocPoint = totalAllocPoint - poolInfo[poolId].allocPoint + allocPoint;
        poolInfo[poolId].allocPoint = allocPoint;
        
        emit PoolUpdated(poolId, allocPoint);
    }

    /**
     * @notice Likidite sağlayan kullanıcı kaydı
     * @dev Kullanıcı pool'a likidite eklediğinde bu fonksiyon çağrılmalı
     * @dev Emission schedule'a göre eşit oranda (likidite miktarına göre proportiyonel) dağıtım yapılır
     * @param poolId Pool ID
     * @param amount Eklenen likidite miktarı (reserve0 + reserve1 veya reserve0+reserve1+reserve2)
     */
    function deposit(uint256 poolId, uint256 amount) external {
        require(poolId < poolInfo.length, "Invalid pool");
        PoolInfo storage pool = poolInfo[poolId];
        require(pool.isActive, "Pool inactive");
        require(amount > 0, "Amount must be > 0");
        
        // Önce pool'u güncelle (ödül birikimini başlat)
        updatePool(poolId);
        
        UserInfo storage user = userInfo[poolId][msg.sender];
        
        // Mevcut likiditesi varsa bekleyen ödülleri hesapla ve biriktir
        if (user.amount > 0) {
            // Bekleyen ödülleri hesapla (likidite miktarına göre proportiyonel)
            uint256 pending = (user.amount * pool.accRewardPerShare) / 1e18 - user.rewardDebt;
            if (pending > 0) {
                user.pendingRewards += pending;
            }
        }
        
        // Yeni likiditeyi ekle
        user.amount += amount;
        // Reward debt'i güncelle (eşit oranda dağıtım için)
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / 1e18;
        
        emit Deposit(msg.sender, poolId, amount);
    }
    

    /**
     * @notice Likidite çıkar
     * @param poolId Pool ID
     * @param amount Çıkarılan likidite miktarı
     */
    function withdraw(uint256 poolId, uint256 amount) external {
        require(poolId < poolInfo.length, "Invalid pool");
        PoolInfo storage pool = poolInfo[poolId];
        
        // Önce pool'u güncelle (ödül birikimini güncelle)
        updatePool(poolId);
        
        UserInfo storage user = userInfo[poolId][msg.sender];
        require(user.amount >= amount, "Insufficient amount");
        
        // Bekleyen ödülleri hesapla
        uint256 pending = (user.amount * pool.accRewardPerShare) / 1e18 - user.rewardDebt;
        if (pending > 0) {
            user.pendingRewards += pending;
        }
        
        // Likiditeyi çıkar
        user.amount -= amount;
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / 1e18;
        
        emit Withdraw(msg.sender, poolId, amount);
    }
    

    /**
     * @notice Ödülleri claim et
     */
    function claimRewards(uint256 poolId) external {
        require(poolId < poolInfo.length, "Invalid pool");
        
        updatePool(poolId);
        
        PoolInfo storage pool = poolInfo[poolId];
        UserInfo storage user = userInfo[poolId][msg.sender];
        
        // Bekleyen ödülleri hesapla
        uint256 pending = (user.amount * pool.accRewardPerShare) / 1e18 - user.rewardDebt;
        if (pending > 0) {
            user.pendingRewards += pending;
        }
        
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / 1e18;
        
        uint256 rewards = user.pendingRewards;
        if (rewards > 0) {
            user.pendingRewards = 0;
            assToken.mint(msg.sender, rewards);
            emit RewardClaimed(msg.sender, poolId, rewards);
        }
    }

    /**
     * @notice Pool'u güncelle (ödül hesaplaması)
     */
    function updatePool(uint256 poolId) public {
        require(poolId < poolInfo.length, "Invalid pool");
        
        PoolInfo storage pool = poolInfo[poolId];
        if (!pool.isActive) return;
        
        // Epoch güncelle
        updateEpoch();
        
        if (block.timestamp <= pool.lastRewardTime) return;
        
        // Pool'un toplam likiditesini al (bu kısım pool kontratından alınmalı)
        // Şimdilik basit bir mekanizma kullanıyoruz
        uint256 lpSupply = getPoolLiquidity(poolId);
        if (lpSupply == 0) {
            pool.lastRewardTime = block.timestamp;
            return;
        }
        
        // Geçen süre
        uint256 timeElapsed = block.timestamp - pool.lastRewardTime;
        
        // Bu pool için reward (emission schedule'a göre)
        // Allocation point'e göre pool'lara pay dağıtımı
        uint256 poolReward = (timeElapsed * rewardPerSecond * pool.allocPoint) / totalAllocPoint;
        
        // Token başına ödül hesapla (likidite miktarına göre eşit oranda dağıtım)
        // Ne kadar likidite, o kadar ödül (proportiyonel)
        pool.accRewardPerShare += (poolReward * 1e18) / lpSupply;
        pool.lastRewardTime = block.timestamp;
    }

    /**
     * @notice Epoch'u güncelle (yıl bazlı)
     */
    function updateEpoch() internal {
        if (block.timestamp < startTime) return;
        
        uint256 timeElapsed = block.timestamp - startTime;
        uint256 newEpoch = timeElapsed / YEAR_DURATION;
        
        // Epoch değiştiyse veya ilk çağrıdaysa (rewardPerSecond 0 ise) güncelle
        if ((newEpoch != currentEpoch && newEpoch < 5) || rewardPerSecond == 0) {
            uint256 oldEpoch = currentEpoch;
            if (newEpoch != currentEpoch) {
                currentEpoch = newEpoch;
            }
            
            // Yeni epoch için reward per second hesapla
            uint256 epochReward;
            if (newEpoch == 0) {
                epochReward = YEAR_1_SHARE;
            } else if (newEpoch == 1) {
                epochReward = YEAR_2_SHARE;
            } else if (newEpoch == 2) {
                epochReward = YEAR_3_SHARE;
            } else if (newEpoch == 3) {
                epochReward = YEAR_4_SHARE;
            } else if (newEpoch == 4) {
                epochReward = YEAR_5_SHARE;
            } else {
                epochReward = 0; // 5 yıl sonra pool reward bitiyor, sadece fee'lerden mint
            }
            
            uint256 oldRewardPerSecond = rewardPerSecond;
            rewardPerSecond = epochReward / YEAR_DURATION;
            
            if (oldEpoch != newEpoch) {
                emit EpochUpdated(oldEpoch, newEpoch);
            }
            if (oldRewardPerSecond != rewardPerSecond) {
                emit RewardPerSecondUpdated(oldRewardPerSecond, rewardPerSecond);
            }
        }
    }

    /**
     * @notice Pool'un likiditesini al
     * @dev Pool kontratından rezerv bilgisini alır (reserve0 + reserve1 veya reserve0+reserve1+reserve2)
     */
    function getPoolLiquidity(uint256 poolId) internal view returns (uint256) {
        require(poolId < poolInfo.length, "Invalid pool");
        PoolInfo memory pool = poolInfo[poolId];
        
        // StableSwap (2Pool) için
        try this.getPoolLiquidity2Pool(pool.poolContract) returns (uint256 liquidity) {
            return liquidity;
        } catch {
            // StableSwap3Pool için
            try this.getPoolLiquidity3Pool(pool.poolContract) returns (uint256 liquidity) {
                return liquidity;
            } catch {
                return 0;
            }
        }
    }
    
    /**
     * @notice 2Pool'dan likidite al (external view helper)
     */
    function getPoolLiquidity2Pool(address poolContract) external view returns (uint256) {
        (bool success, bytes memory data) = poolContract.staticcall(
            abi.encodeWithSignature("getReserves()")
        );
        if (!success || data.length < 64) return 0;
        
        (uint256 reserve0, uint256 reserve1) = abi.decode(data, (uint256, uint256));
        // Likiditeyi reserve0 + reserve1 olarak hesapla (normalize edilmiş)
        return reserve0 + reserve1;
    }
    
    /**
     * @notice 3Pool'dan likidite al (external view helper)
     */
    function getPoolLiquidity3Pool(address poolContract) external view returns (uint256) {
        (bool success, bytes memory data) = poolContract.staticcall(
            abi.encodeWithSignature("getReserves()")
        );
        if (!success || data.length < 96) return 0;
        
        (uint256 reserve0, uint256 reserve1, uint256 reserve2) = abi.decode(data, (uint256, uint256, uint256));
        // Likiditeyi reserve0 + reserve1 + reserve2 olarak hesapla
        return reserve0 + reserve1 + reserve2;
    }

    /**
     * @notice Kullanıcının bekleyen ödülünü görüntüle (view fonksiyon)
     * @dev Hem mevcut pendingRewards hem de yeni biriken ödülleri hesaplar
     */
    function pendingRewards(uint256 poolId, address user) external view returns (uint256) {
        require(poolId < poolInfo.length, "Invalid pool");
        
        PoolInfo memory pool = poolInfo[poolId];
        if (!pool.isActive) return 0;
        
        UserInfo memory userInfo_ = userInfo[poolId][user];
        
        // Pool'u simüle et (state değiştirmeden)
        uint256 accRewardPerShare = pool.accRewardPerShare;
        uint256 lpSupply = getPoolLiquidity(poolId);
        
        if (lpSupply > 0 && block.timestamp > pool.lastRewardTime) {
            // Epoch'u kontrol et
            uint256 timeElapsed = block.timestamp - pool.lastRewardTime;
            
            // Reward per second'u hesapla (epoch'a göre)
            uint256 currentRewardPerSecond = 0;
            uint256 timeSinceStart = block.timestamp - startTime;
            uint256 currentEpoch_ = timeSinceStart / YEAR_DURATION;
            
            if (currentEpoch_ == 0) {
                currentRewardPerSecond = YEAR_1_SHARE / YEAR_DURATION;
            } else if (currentEpoch_ == 1) {
                currentRewardPerSecond = YEAR_2_SHARE / YEAR_DURATION;
            } else if (currentEpoch_ == 2) {
                currentRewardPerSecond = YEAR_3_SHARE / YEAR_DURATION;
            } else if (currentEpoch_ == 3) {
                currentRewardPerSecond = YEAR_4_SHARE / YEAR_DURATION;
            } else if (currentEpoch_ == 4) {
                currentRewardPerSecond = YEAR_5_SHARE / YEAR_DURATION;
            }
            
            if (currentRewardPerSecond > 0 && totalAllocPoint > 0) {
                // Bu pool için reward hesapla
                uint256 poolReward = (timeElapsed * currentRewardPerSecond * pool.allocPoint) / totalAllocPoint;
                
                // Token başına ödül artışı
                uint256 rewardPerShareIncrease = (poolReward * 1e18) / lpSupply;
                accRewardPerShare += rewardPerShareIncrease;
            }
        }
        
        // Kullanıcının yeni biriken ödülünü hesapla
        uint256 newPending = 0;
        if (userInfo_.amount > 0) {
            newPending = (userInfo_.amount * accRewardPerShare) / 1e18 - userInfo_.rewardDebt;
        }
        
        // Toplam pending = mevcut pendingRewards + yeni biriken ödül
        return userInfo_.pendingRewards + newPending;
    }

    /**
     * @notice Tüm pool'ları listele
     */
    function getPoolCount() external view returns (uint256) {
        return poolInfo.length;
    }

    /**
     * @notice Pool bilgisini görüntüle
     */
    function getPoolInfo(uint256 poolId) external view returns (
        address poolContract,
        uint256 allocPoint,
        uint256 lastRewardTime,
        uint256 accRewardPerShare,
        bool isActive
    ) {
        require(poolId < poolInfo.length, "Invalid pool");
        PoolInfo memory pool = poolInfo[poolId];
        return (
            pool.poolContract,
            pool.allocPoint,
            pool.lastRewardTime,
            pool.accRewardPerShare,
            pool.isActive
        );
    }
}

