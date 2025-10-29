// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestTokenFaucet
 * @notice Faucet for test tokens on Arc Testnet
 */
contract TestTokenFaucet is Ownable {
    IERC20 public immutable testUSDC;
    IERC20 public immutable testUSDT;
    
    uint256 public constant FAUCET_AMOUNT = 1000 * 10**6; // 1000 tokens with 6 decimals
    uint256 public constant COOLDOWN_PERIOD = 24 hours; // 24 hours cooldown
    
    mapping(address => uint256) public lastClaimTime;
    
    event TokensClaimed(address indexed user, uint256 usdcAmount, uint256 usdtAmount);
    
    constructor(address _testUSDC, address _testUSDT) Ownable(msg.sender) {
        testUSDC = IERC20(_testUSDC);
        testUSDT = IERC20(_testUSDT);
    }
    
    function claimTokens() external {
        require(
            block.timestamp >= lastClaimTime[msg.sender] + COOLDOWN_PERIOD,
            "Faucet: Cooldown period not elapsed"
        );
        
        require(
            testUSDC.balanceOf(address(this)) >= FAUCET_AMOUNT,
            "Faucet: Insufficient tUSDC balance"
        );
        
        require(
            testUSDT.balanceOf(address(this)) >= FAUCET_AMOUNT,
            "Faucet: Insufficient tUSDT balance"
        );
        
        lastClaimTime[msg.sender] = block.timestamp;
        
        testUSDC.transfer(msg.sender, FAUCET_AMOUNT);
        testUSDT.transfer(msg.sender, FAUCET_AMOUNT);
        
        emit TokensClaimed(msg.sender, FAUCET_AMOUNT, FAUCET_AMOUNT);
    }
    
    function canClaim(address user) external view returns (bool) {
        return block.timestamp >= lastClaimTime[user] + COOLDOWN_PERIOD;
    }
    
    function getTimeUntilNextClaim(address user) external view returns (uint256) {
        uint256 nextClaimTime = lastClaimTime[user] + COOLDOWN_PERIOD;
        if (block.timestamp >= nextClaimTime) {
            return 0;
        }
        return nextClaimTime - block.timestamp;
    }
    
    // Admin functions
    function refillFaucet() external onlyOwner {
        // Transfer tokens from owner to faucet
        testUSDC.transferFrom(msg.sender, address(this), FAUCET_AMOUNT * 100); // 100 claims worth
        testUSDT.transferFrom(msg.sender, address(this), FAUCET_AMOUNT * 100);
    }
    
    function emergencyWithdraw() external onlyOwner {
        testUSDC.transfer(owner(), testUSDC.balanceOf(address(this)));
        testUSDT.transfer(owner(), testUSDT.balanceOf(address(this)));
    }
}
