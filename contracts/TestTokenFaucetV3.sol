// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestTokenFaucetV3
 * @notice Faucet for test tokens on Arc Testnet - includes USDY and developer exception
 */
contract TestTokenFaucetV3 is Ownable {
    IERC20 public immutable testUSDC;
    IERC20 public immutable testUSDT;
    IERC20 public immutable testUSDY;
    
    uint256 public constant FAUCET_AMOUNT = 1000 * 10**6; // 1000 tokens with 6 decimals
    uint256 public constant COOLDOWN_PERIOD = 24 hours; // 24 hours cooldown
    uint256 public constant DEVELOPER_AMOUNT = 100000 * 10**6; // 100K tokens for developers
    
    mapping(address => uint256) public lastClaimTime;
    mapping(address => bool) public isDeveloper; // Developer exception mapping
    
    event TokensClaimed(address indexed user, uint256 usdcAmount, uint256 usdtAmount, uint256 usdyAmount);
    event DeveloperAdded(address indexed developer);
    event DeveloperRemoved(address indexed developer);
    
    constructor(address _testUSDC, address _testUSDT, address _testUSDY) Ownable(msg.sender) {
        testUSDC = IERC20(_testUSDC);
        testUSDT = IERC20(_testUSDT);
        testUSDY = IERC20(_testUSDY);
    }
    
    /**
     * @notice Claim tokens - developers get larger amounts without cooldown
     */
    function claimTokens() external {
        uint256 amount;
        bool isDev = isDeveloper[msg.sender];
        
        if (isDev) {
            // Developers: no cooldown, larger amount
            amount = DEVELOPER_AMOUNT;
        } else {
            // Regular users: cooldown check
            require(
                block.timestamp >= lastClaimTime[msg.sender] + COOLDOWN_PERIOD,
                "Faucet: Cooldown period not elapsed"
            );
            amount = FAUCET_AMOUNT;
        }
        
        require(
            testUSDC.balanceOf(address(this)) >= amount,
            "Faucet: Insufficient tUSDC balance"
        );
        
        require(
            testUSDT.balanceOf(address(this)) >= amount,
            "Faucet: Insufficient tUSDT balance"
        );
        
        require(
            testUSDY.balanceOf(address(this)) >= amount,
            "Faucet: Insufficient tUSDY balance"
        );
        
        lastClaimTime[msg.sender] = block.timestamp;
        
        testUSDC.transfer(msg.sender, amount);
        testUSDT.transfer(msg.sender, amount);
        testUSDY.transfer(msg.sender, amount);
        
        emit TokensClaimed(msg.sender, amount, amount, amount);
    }
    
    function canClaim(address user) external view returns (bool) {
        if (isDeveloper[user]) {
            return true; // Developers can always claim
        }
        return block.timestamp >= lastClaimTime[user] + COOLDOWN_PERIOD;
    }
    
    function getTimeUntilNextClaim(address user) external view returns (uint256) {
        if (isDeveloper[user]) {
            return 0; // Developers have no cooldown
        }
        uint256 nextClaimTime = lastClaimTime[user] + COOLDOWN_PERIOD;
        if (block.timestamp >= nextClaimTime) {
            return 0;
        }
        return nextClaimTime - block.timestamp;
    }
    
    /**
     * @notice Add a developer (no cooldown, larger amounts)
     */
    function addDeveloper(address developer) external onlyOwner {
        isDeveloper[developer] = true;
        emit DeveloperAdded(developer);
    }
    
    /**
     * @notice Remove a developer
     */
    function removeDeveloper(address developer) external onlyOwner {
        isDeveloper[developer] = false;
        emit DeveloperRemoved(developer);
    }
    
    // Admin functions
    function refillFaucet() external onlyOwner {
        // Transfer tokens from owner to faucet
        uint256 amount = FAUCET_AMOUNT * 100; // 100 claims worth
        testUSDC.transferFrom(msg.sender, address(this), amount);
        testUSDT.transferFrom(msg.sender, address(this), amount);
        testUSDY.transferFrom(msg.sender, address(this), amount);
    }
    
    function emergencyWithdraw() external onlyOwner {
        testUSDC.transfer(owner(), testUSDC.balanceOf(address(this)));
        testUSDT.transfer(owner(), testUSDT.balanceOf(address(this)));
        testUSDY.transfer(owner(), testUSDY.balanceOf(address(this)));
    }
}
