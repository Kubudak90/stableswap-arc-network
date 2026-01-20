import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { CONTRACTS, getExplorerUrl } from '../../config'
import { RainbowButton } from './RainbowButton'

// Icons
const StakeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2v20M2 12l10-10 10 10"/>
  </svg>
)

const UnstakeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22V2M2 12l10 10 10-10"/>
  </svg>
)

const GiftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="8" width="18" height="13" rx="2"/>
    <path d="M12 8v13M3 12h18M8 8c0-2.5 1.5-4 4-4s4 1.5 4 4"/>
  </svg>
)

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

// ABIs
const ASS_TOKEN_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
]

const STAKING_ABI = [
  "function stake(uint256 amount) external",
  "function unstake(uint256 amount) external",
  "function claimRewards() external",
  "function getPendingRewards(address user) external view returns (uint256)",
  "function stakers(address user) external view returns (uint256 stakedAmount, uint256 rewardDebt, uint256 pendingRewards)",
  "function totalStaked() external view returns (uint256)",
  "function rewardToken() external view returns (address)"
]

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
]

// Token Icon
const TokenIcon = ({ symbol, size = 32, color = '#fc72ff' }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.45,
      fontWeight: '700',
      color: 'white',
      flexShrink: 0,
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
    }}
  >
    {symbol?.charAt(0) || 'A'}
  </div>
)

// Stat Card
const StatCard = ({ label, value, subValue, icon }) => (
  <div style={{
    background: 'var(--background-secondary)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </span>
      {icon}
    </div>
    <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-primary)' }}>
      {value}
    </div>
    {subValue && (
      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        {subValue}
      </div>
    )}
  </div>
)

function StakingCard({ provider, signer, account, contracts }) {
  const [assBalance, setAssBalance] = useState('0')
  const [stakedAmount, setStakedAmount] = useState('0')
  const [pendingRewards, setPendingRewards] = useState('0')
  const [totalStaked, setTotalStaked] = useState('0')
  const [stakeAmount, setStakeAmount] = useState('')
  const [unstakeAmount, setUnstakeAmount] = useState('')
  const [activeTab, setActiveTab] = useState('stake')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [txHash, setTxHash] = useState('')
  const [rewardToken, setRewardToken] = useState(null)

  useEffect(() => {
    if (provider && account && contracts.stakingContract) {
      loadData()
      const interval = setInterval(loadData, 10000)
      return () => clearInterval(interval)
    }
  }, [provider, account, contracts])

  const loadData = async () => {
    try {
      if (!contracts.assToken || !contracts.stakingContract || !account) return

      // Get ASS Token balance
      const assToken = contracts.assToken
      const balance = await assToken.balanceOf(account)
      const decimals = await assToken.decimals()
      setAssBalance(ethers.formatUnits(balance, decimals))

      // Get staking info
      const staking = contracts.stakingContract
      const stakerInfo = await staking.stakers(account)
      setStakedAmount(ethers.formatUnits(stakerInfo.stakedAmount, decimals))

      // Get total staked
      const total = await staking.totalStaked()
      setTotalStaked(ethers.formatUnits(total, decimals))

      // Get pending rewards
      const pending = await staking.getPendingRewards(account)
      const rewardTokenAddress = await staking.rewardToken()
      const rewardTokenContract = new ethers.Contract(rewardTokenAddress, ERC20_ABI, provider)
      const rewardDecimals = await rewardTokenContract.decimals()
      const rewardSymbol = await rewardTokenContract.symbol()
      setPendingRewards(ethers.formatUnits(pending, rewardDecimals))
      setRewardToken({ address: rewardTokenAddress, symbol: rewardSymbol, decimals: rewardDecimals })
    } catch (err) {
      console.error('Load data error:', err)
    }
  }

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      setError('Please enter an amount')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const assToken = contracts.assToken
      const staking = contracts.stakingContract
      const stakingAddress = await staking.getAddress()
      const decimals = await assToken.decimals()
      const amountWei = ethers.parseUnits(stakeAmount, decimals)

      // Check allowance
      const allowance = await assToken.allowance(account, stakingAddress)
      if (allowance < amountWei) {
        const approveTx = await assToken.approve(stakingAddress, ethers.MaxUint256)
        await approveTx.wait()
      }

      // Stake
      const stakeTx = await staking.stake(amountWei)
      const receipt = await stakeTx.wait()
      setTxHash(receipt.hash)

      setSuccess(`Staked ${stakeAmount} ASS`)
      setStakeAmount('')
      await loadData()
    } catch (err) {
      console.error('Stake error:', err)
      setError(err.reason || err.message || 'Stake failed')
    } finally {
      setLoading(false)
    }
  }

  const handleUnstake = async () => {
    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) {
      setError('Please enter an amount')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const assToken = contracts.assToken
      const staking = contracts.stakingContract
      const decimals = await assToken.decimals()
      const amountWei = ethers.parseUnits(unstakeAmount, decimals)

      const unstakeTx = await staking.unstake(amountWei)
      const receipt = await unstakeTx.wait()
      setTxHash(receipt.hash)

      setSuccess(`Unstaked ${unstakeAmount} ASS`)
      setUnstakeAmount('')
      await loadData()
    } catch (err) {
      console.error('Unstake error:', err)
      setError(err.reason || err.message || 'Unstake failed')
    } finally {
      setLoading(false)
    }
  }

  const handleClaimRewards = async () => {
    if (parseFloat(pendingRewards) <= 0) {
      setError('No rewards to claim')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const staking = contracts.stakingContract
      const claimTx = await staking.claimRewards()
      const receipt = await claimTx.wait()
      setTxHash(receipt.hash)

      setSuccess(`Claimed ${parseFloat(pendingRewards).toFixed(4)} ${rewardToken?.symbol || 'tokens'}`)
      await loadData()
    } catch (err) {
      console.error('Claim error:', err)
      setError(err.reason || err.message || 'Claim failed')
    } finally {
      setLoading(false)
    }
  }

  const getButtonState = () => {
    if (!account) return { text: 'Connect Wallet', disabled: true }
    if (loading) return { text: 'Processing...', disabled: true }

    if (activeTab === 'stake') {
      if (!stakeAmount || parseFloat(stakeAmount) <= 0) return { text: 'Enter amount', disabled: true }
      if (parseFloat(stakeAmount) > parseFloat(assBalance)) return { text: 'Insufficient ASS', disabled: true }
      return { text: 'Stake ASS', disabled: false }
    } else {
      if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) return { text: 'Enter amount', disabled: true }
      if (parseFloat(unstakeAmount) > parseFloat(stakedAmount)) return { text: 'Insufficient staked', disabled: true }
      return { text: 'Unstake ASS', disabled: false }
    }
  }

  const buttonState = getButtonState()

  return (
    <div className="page-container">
      <div className="swap-card" style={{ maxWidth: '520px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Stake ASS
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Stake your ASS tokens to earn rewards
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <StatCard
            label="Your Balance"
            value={`${parseFloat(assBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} ASS`}
            icon={<TokenIcon symbol="A" size={24} color="#fc72ff" />}
          />
          <StatCard
            label="Your Staked"
            value={`${parseFloat(stakedAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })} ASS`}
            icon={<TokenIcon symbol="A" size={24} color="#4c82fb" />}
          />
          <StatCard
            label="Pending Rewards"
            value={`${parseFloat(pendingRewards).toLocaleString(undefined, { maximumFractionDigits: 4 })}`}
            subValue={rewardToken?.symbol || 'tokens'}
            icon={<GiftIcon />}
          />
          <StatCard
            label="Total Staked"
            value={`${parseFloat(totalStaked).toLocaleString(undefined, { maximumFractionDigits: 0 })} ASS`}
          />
        </div>

        {/* Claim Rewards Button */}
        {parseFloat(pendingRewards) > 0 && (
          <button
            onClick={handleClaimRewards}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #00d395 0%, #00b383 100%)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'wait' : 'pointer',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <GiftIcon />
            Claim {parseFloat(pendingRewards).toFixed(4)} {rewardToken?.symbol || 'Rewards'}
          </button>
        )}

        {/* Tabs */}
        <div className="pool-tabs" style={{ marginBottom: '20px' }}>
          <button
            className={`pool-tab ${activeTab === 'stake' ? 'active' : ''}`}
            onClick={() => setActiveTab('stake')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
          >
            <StakeIcon /> Stake
          </button>
          <button
            className={`pool-tab ${activeTab === 'unstake' ? 'active' : ''}`}
            onClick={() => setActiveTab('unstake')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
          >
            <UnstakeIcon /> Unstake
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="alert alert-error">
            <span className="alert-content">{error}</span>
            <button className="alert-close" onClick={() => setError('')}>×</button>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <CheckIcon />
            <span className="alert-content">
              {success}
              {txHash && (
                <a
                  href={getExplorerUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ marginLeft: 8, color: 'inherit', textDecoration: 'underline' }}
                >
                  View tx ↗
                </a>
              )}
            </span>
            <button className="alert-close" onClick={() => setSuccess('')}>×</button>
          </div>
        )}

        {/* Stake Form */}
        {activeTab === 'stake' && (
          <div className="token-input-container">
            <div className="token-input-label">Amount to Stake</div>
            <div className="token-input-row">
              <input
                type="text"
                className="token-input"
                placeholder="0"
                value={stakeAmount}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setStakeAmount(val)
                  }
                }}
                style={{ fontSize: '1.5rem' }}
              />
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px 6px 6px',
                background: 'var(--background-tertiary)',
                borderRadius: '20px'
              }}>
                <TokenIcon symbol="A" size={28} color="#fc72ff" />
                <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>ASS</span>
              </div>
            </div>
            <div className="token-balance-row">
              <span></span>
              <div className="token-balance">
                <span>Balance: {parseFloat(assBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                {parseFloat(assBalance) > 0 && (
                  <button className="max-btn" onClick={() => setStakeAmount(assBalance)}>MAX</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Unstake Form */}
        {activeTab === 'unstake' && (
          <div className="token-input-container">
            <div className="token-input-label">Amount to Unstake</div>
            <div className="token-input-row">
              <input
                type="text"
                className="token-input"
                placeholder="0"
                value={unstakeAmount}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setUnstakeAmount(val)
                  }
                }}
                style={{ fontSize: '1.5rem' }}
              />
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px 6px 6px',
                background: 'var(--background-tertiary)',
                borderRadius: '20px'
              }}>
                <TokenIcon symbol="A" size={28} color="#4c82fb" />
                <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>ASS</span>
              </div>
            </div>
            <div className="token-balance-row">
              <span></span>
              <div className="token-balance">
                <span>Staked: {parseFloat(stakedAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                {parseFloat(stakedAmount) > 0 && (
                  <button className="max-btn" onClick={() => setUnstakeAmount(stakedAmount)}>MAX</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <RainbowButton
          onClick={activeTab === 'stake' ? handleStake : handleUnstake}
          disabled={buttonState.disabled}
          style={{ marginTop: '16px' }}
        >
          {loading ? (
            <span className="swap-btn-loading">
              <span className="spinner"></span>
              <span>Processing...</span>
            </span>
          ) : <span>{buttonState.text}</span>}
        </RainbowButton>
      </div>
    </div>
  )
}

export default StakingCard
