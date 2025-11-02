// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ASSToken
 * @notice ASS (Arc Stable Swap) Token - %100 Community Owned
 * @dev Fee distribution sistemi tarafından mint edilebilir
 */
contract ASSToken is ERC20, ERC20Burnable, Ownable {
    // Fee distribution kontratı (sadece bu mint edebilir)
    address public feeDistributor;
    
    // Liquidity rewards kontratı (pool ödülleri için mint edebilir)
    address public liquidityRewards;
    
    // Staking kontratı
    address public stakingContract;
    
    event FeeDistributorUpdated(address indexed oldDistributor, address indexed newDistributor);
    event LiquidityRewardsUpdated(address indexed oldRewards, address indexed newRewards);
    event StakingContractUpdated(address indexed oldContract, address indexed newContract);
    event TokensMinted(address indexed to, uint256 amount);

    constructor() ERC20("Arc Stable Swap", "ASS") Ownable(msg.sender) {
        // İlk mint yok - %100 community owned, sadece fee'lerden mint edilecek
    }

    /**
     * @notice Fee distribution kontratını ayarla (sadece owner)
     */
    function setFeeDistributor(address _feeDistributor) external onlyOwner {
        address oldDistributor = feeDistributor;
        feeDistributor = _feeDistributor;
        emit FeeDistributorUpdated(oldDistributor, _feeDistributor);
    }

    /**
     * @notice Liquidity rewards kontratını ayarla (sadece owner)
     */
    function setLiquidityRewards(address _liquidityRewards) external onlyOwner {
        address oldRewards = liquidityRewards;
        liquidityRewards = _liquidityRewards;
        emit LiquidityRewardsUpdated(oldRewards, _liquidityRewards);
    }

    /**
     * @notice Staking kontratını ayarla (sadece owner)
     */
    function setStakingContract(address _stakingContract) external onlyOwner {
        address oldContract = stakingContract;
        stakingContract = _stakingContract;
        emit StakingContractUpdated(oldContract, _stakingContract);
    }

    /**
     * @notice Token mint et (sadece fee distributor veya liquidity rewards)
     */
    function mint(address to, uint256 amount) external {
        require(
            msg.sender == feeDistributor || msg.sender == liquidityRewards,
            "ASSToken: Only authorized contract can mint"
        );
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
}

