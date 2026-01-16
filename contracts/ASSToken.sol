// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ASSToken
 * @author StableSwap Arc Network Team
 * @notice Arc Stable Swap (ASS) Token - %100 Community Owned governance token
 * @dev ERC20 token with controlled minting by authorized contracts only.
 *      No initial supply - tokens are minted through fee distribution and liquidity rewards.
 *
 * Key Features:
 * - Controlled minting by FeeDistributor and LiquidityRewards contracts
 * - Burnable for deflationary mechanics
 * - No max supply limit (inflation controlled by governance)
 *
 * Security Considerations:
 * - Only authorized contracts can mint new tokens
 * - Owner can update authorized minters
 * - Inherits OpenZeppelin's battle-tested ERC20 implementation
 */
contract ASSToken is ERC20, ERC20Burnable, Ownable {
    /// @notice Address of the fee distribution contract (authorized to mint)
    address public feeDistributor;

    /// @notice Address of the liquidity rewards contract (authorized to mint)
    address public liquidityRewards;

    /// @notice Address of the staking contract
    address public stakingContract;

    /// @notice Emitted when fee distributor address is updated
    /// @param oldDistributor Previous fee distributor address
    /// @param newDistributor New fee distributor address
    event FeeDistributorUpdated(address indexed oldDistributor, address indexed newDistributor);

    /// @notice Emitted when liquidity rewards address is updated
    /// @param oldRewards Previous liquidity rewards address
    /// @param newRewards New liquidity rewards address
    event LiquidityRewardsUpdated(address indexed oldRewards, address indexed newRewards);

    /// @notice Emitted when staking contract address is updated
    /// @param oldContract Previous staking contract address
    /// @param newContract New staking contract address
    event StakingContractUpdated(address indexed oldContract, address indexed newContract);

    /// @notice Emitted when new tokens are minted
    /// @param to Recipient address
    /// @param amount Amount of tokens minted
    event TokensMinted(address indexed to, uint256 amount);

    /**
     * @notice Initializes the ASS token with no initial supply
     * @dev Token name: "Arc Stable Swap", Symbol: "ASS"
     *      No initial mint - 100% community owned through fee distribution
     */
    constructor() ERC20("Arc Stable Swap", "ASS") Ownable(msg.sender) {
        // İlk mint yok - %100 community owned, sadece fee'lerden mint edilecek
    }

    /**
     * @notice Updates the fee distributor contract address
     * @dev Only owner can call. Fee distributor is authorized to mint tokens.
     * @param _feeDistributor New fee distributor address (cannot be zero)
     */
    function setFeeDistributor(address _feeDistributor) external onlyOwner {
        require(_feeDistributor != address(0), "ASSToken: zero address");
        address oldDistributor = feeDistributor;
        feeDistributor = _feeDistributor;
        emit FeeDistributorUpdated(oldDistributor, _feeDistributor);
    }

    /**
     * @notice Updates the liquidity rewards contract address
     * @dev Only owner can call. Liquidity rewards contract is authorized to mint tokens.
     * @param _liquidityRewards New liquidity rewards address (cannot be zero)
     */
    function setLiquidityRewards(address _liquidityRewards) external onlyOwner {
        require(_liquidityRewards != address(0), "ASSToken: zero address");
        address oldRewards = liquidityRewards;
        liquidityRewards = _liquidityRewards;
        emit LiquidityRewardsUpdated(oldRewards, _liquidityRewards);
    }

    /**
     * @notice Updates the staking contract address
     * @dev Only owner can call. Used for integration with staking system.
     * @param _stakingContract New staking contract address (cannot be zero)
     */
    function setStakingContract(address _stakingContract) external onlyOwner {
        require(_stakingContract != address(0), "ASSToken: zero address");
        address oldContract = stakingContract;
        stakingContract = _stakingContract;
        emit StakingContractUpdated(oldContract, _stakingContract);
    }

    /**
     * @notice Mints new tokens to specified address
     * @dev Only callable by feeDistributor or liquidityRewards contracts.
     *      This is the only way new tokens can be created.
     * @param to Recipient address (cannot be zero)
     * @param amount Amount of tokens to mint (must be > 0)
     */
    function mint(address to, uint256 amount) external {
        require(
            msg.sender == feeDistributor || msg.sender == liquidityRewards,
            "ASSToken: Only authorized contract can mint"
        );
        require(to != address(0), "ASSToken: mint to zero address");
        require(amount > 0, "ASSToken: amount must be > 0");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
}
