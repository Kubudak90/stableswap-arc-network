import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { CONTRACTS, ABIS, getExplorerUrl } from '../../config'
import { RainbowButton } from './RainbowButton'

// SVG Icons
const GiftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="8" width="18" height="13" rx="2"/>
    <path d="M12 8v13M3 12h18M8 8c0-2.5 1.5-4 4-4s4 1.5 4 4"/>
  </svg>
)

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const MinusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

// Token data
const TOKENS = [
  { symbol: 'tUSDC', name: 'Test USDC', color: '#2775ca', bgColor: '#2775ca', decimals: 6 },
  { symbol: 'tUSDT', name: 'Test USDT', color: '#26a17b', bgColor: '#26a17b', decimals: 6 },
  { symbol: 'tUSDY', name: 'Test USDY', color: '#6366f1', bgColor: '#6366f1', decimals: 6 },
]

// Pool configurations
const POOLS = [
  { id: '2pool', name: 'USDC-USDT', tokens: [0, 1], use3Pool: false },
  { id: '3pool', name: '3Pool', tokens: [0, 1, 2], use3Pool: true },
]

// Token Icon Component
const TokenIcon = ({ symbol, size = 32 }) => {
  const token = TOKENS.find(t => t.symbol === symbol) || TOKENS[0]

  const getDisplayText = () => {
    if (symbol === 'tUSDC') return '$'
    if (symbol === 'tUSDT') return '₮'
    if (symbol === 'tUSDY') return 'Y'
    return symbol?.charAt(0) || '?'
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: token.bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.5,
        fontWeight: '700',
        color: 'white',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        border: '2px solid rgba(255,255,255,0.1)'
      }}
    >
      {getDisplayText()}
    </div>
  )
}

// Stacked Token Icons for Pool display
const StackedTokenIcons = ({ tokenIndices, size = 28 }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {tokenIndices.map((idx, i) => (
        <div
          key={idx}
          style={{
            marginLeft: i > 0 ? -10 : 0,
            zIndex: tokenIndices.length - i
          }}
        >
          <TokenIcon symbol={TOKENS[idx].symbol} size={size} />
        </div>
      ))}
    </div>
  )
}

// Token Input for Pool
const PoolTokenInput = ({ token, value, onChange, balance, onMaxClick, disabled }) => {
  return (
    <div className="token-input-container" style={{ marginBottom: '12px' }}>
      <div className="token-input-row">
        <input
          type="text"
          className="token-input"
          placeholder="0"
          value={value}
          onChange={(e) => {
            const val = e.target.value
            if (val === '' || /^\d*\.?\d*$/.test(val)) {
              onChange(val)
            }
          }}
          disabled={disabled}
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
          <TokenIcon symbol={token.symbol} size={28} />
          <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            {token.symbol}
          </span>
        </div>
      </div>
      <div className="token-balance-row">
        <span className="token-usd-value">
          {value && !isNaN(value) && parseFloat(value) > 0
            ? `≈ $${parseFloat(value).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
            : ''}
        </span>
        <div className="token-balance">
          <span>Balance: {parseFloat(balance || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
          {!disabled && parseFloat(balance) > 0 && (
            <button className="max-btn" onClick={onMaxClick}>MAX</button>
          )}
        </div>
      </div>
    </div>
  )
}

// Pool Select Dropdown
const PoolSelect = ({ selectedPool, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div style={{ position: 'relative', marginBottom: '20px' }}>
      <button
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'var(--background-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <StackedTokenIcons tokenIndices={selectedPool.tokens} size={28} />
          <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            {selectedPool.name}
          </span>
        </div>
        <ChevronDownIcon />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '8px',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            zIndex: 10,
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
          }}
        >
          {POOLS.map((pool) => (
            <button
              key={pool.id}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: selectedPool.id === pool.id ? 'var(--background-hover)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onClick={() => {
                onSelect(pool)
                setIsOpen(false)
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--background-hover)'}
              onMouseLeave={(e) => e.target.style.background = selectedPool.id === pool.id ? 'var(--background-hover)' : 'transparent'}
            >
              <StackedTokenIcons tokenIndices={pool.tokens} size={28} />
              <span style={{ flex: 1, textAlign: 'left', fontSize: '1rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                {pool.name}
              </span>
              {selectedPool.id === pool.id && <CheckIcon />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Main PoolCard Component
function PoolCard({ contracts, account }) {
  const [activeTab, setActiveTab] = useState('add')
  const [selectedPool, setSelectedPool] = useState(POOLS[0])
  const [amounts, setAmounts] = useState({})
  const [lpAmount, setLpAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [claimLoading, setClaimLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [txHash, setTxHash] = useState('')
  const [balances, setBalances] = useState(['0', '0', '0'])
  const [reserves, setReserves] = useState({})
  const [lpBalance, setLpBalance] = useState('0')
  const [pendingRewards, setPendingRewards] = useState('0')

  const tokenContracts = [contracts.token0, contracts.token1, contracts.token2]

  // Check if contracts are ready
  const contractsReady = contracts.token0 && contracts.token1 && contracts.token2

  // Load data
  useEffect(() => {
    if (contractsReady && account) {
      loadData()
    }
  }, [contracts, account, selectedPool, contractsReady])

  const loadData = async () => {
    if (!contractsReady || !account) return

    try {
      console.log('PoolCard: Loading data for account:', account)
      // Load token balances
      const bal0 = await contracts.token0.balanceOf(account)
      const bal1 = await contracts.token1.balanceOf(account)
      const bal2 = await contracts.token2.balanceOf(account)
      const formatted = [
        ethers.formatUnits(bal0, 6),
        ethers.formatUnits(bal1, 6),
        ethers.formatUnits(bal2, 6)
      ]
      console.log('PoolCard: Balances loaded:', formatted)
      setBalances(formatted)

      // Load reserves
      const swapContract = selectedPool.use3Pool ? contracts.swap3Pool : contracts.swap
      if (swapContract) {
        if (selectedPool.use3Pool) {
          const [r0, r1, r2] = await swapContract.getReserves()
          setReserves({
            0: ethers.formatUnits(r0, 6),
            1: ethers.formatUnits(r1, 6),
            2: ethers.formatUnits(r2, 6)
          })
        } else {
          const [r0, r1] = await swapContract.getReserves()
          setReserves({
            0: ethers.formatUnits(r0, 6),
            1: ethers.formatUnits(r1, 6)
          })
        }

        // Try to get LP balance
        try {
          const lpBal = await swapContract.balanceOf(account)
          setLpBalance(ethers.formatUnits(lpBal, 18))
        } catch (e) {
          console.log('LP balance not available')
        }
      }

      // Load pending rewards from LiquidityRewards contract
      try {
        const provider = contracts.token0.runner?.provider
        if (provider) {
          const liquidityRewardsContract = new ethers.Contract(
            CONTRACTS.liquidityRewards,
            ABIS.liquidityRewards,
            provider
          )
          const poolId = selectedPool.use3Pool ? 1 : 0 // 0 for 2pool, 1 for 3pool
          const pending = await liquidityRewardsContract.pendingRewards(poolId, account)
          setPendingRewards(ethers.formatUnits(pending, 18)) // ASS token has 18 decimals
        }
      } catch (e) {
        console.log('Pending rewards not available:', e.message)
        setPendingRewards('0')
      }
    } catch (err) {
      console.error('Error loading data:', err)
    }
  }

  // Claim rewards
  const handleClaimRewards = async () => {
    if (!account || parseFloat(pendingRewards) <= 0) {
      setError('No rewards to claim')
      return
    }

    setClaimLoading(true)
    setError('')
    setSuccess('')

    try {
      const signer = await contracts.token0.runner?.provider.getSigner()
      const liquidityRewardsContract = new ethers.Contract(
        CONTRACTS.liquidityRewards,
        ABIS.liquidityRewards,
        signer
      )
      const poolId = selectedPool.use3Pool ? 1 : 0

      const tx = await liquidityRewardsContract.claimRewards(poolId)
      const receipt = await tx.wait()

      setTxHash(receipt.hash)
      setSuccess(`Claimed ${parseFloat(pendingRewards).toFixed(4)} ASS rewards!`)
      await loadData()
    } catch (err) {
      console.error('Claim rewards error:', err)
      setError(err.reason || err.message || 'Failed to claim rewards')
    } finally {
      setClaimLoading(false)
    }
  }

  // Handle amount change
  const handleAmountChange = (tokenIdx, value) => {
    setAmounts(prev => ({ ...prev, [tokenIdx]: value }))
  }

  // Add liquidity
  const handleAddLiquidity = async () => {
    if (!account) {
      setError('Please connect wallet')
      return
    }

    const hasAmount = selectedPool.tokens.some(idx => amounts[idx] && parseFloat(amounts[idx]) > 0)
    if (!hasAmount) {
      setError('Please enter amounts')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const swapContract = selectedPool.use3Pool ? contracts.swap3Pool : contracts.swap
      const swapAddress = selectedPool.use3Pool ? CONTRACTS.swap3Pool : CONTRACTS.swap

      // Approve all tokens
      for (const tokenIdx of selectedPool.tokens) {
        const amount = amounts[tokenIdx]
        if (amount && parseFloat(amount) > 0) {
          const amountWei = ethers.parseUnits(amount, 6)
          const approveTx = await tokenContracts[tokenIdx].approve(swapAddress, amountWei)
          await approveTx.wait()
        }
      }

      // Add liquidity
      let tx
      if (selectedPool.use3Pool) {
        const amt0 = amounts[0] ? ethers.parseUnits(amounts[0], 6) : 0n
        const amt1 = amounts[1] ? ethers.parseUnits(amounts[1], 6) : 0n
        const amt2 = amounts[2] ? ethers.parseUnits(amounts[2], 6) : 0n
        tx = await swapContract.addLiquidity(amt0, amt1, amt2, 0)
      } else {
        const amt0 = amounts[0] ? ethers.parseUnits(amounts[0], 6) : 0n
        const amt1 = amounts[1] ? ethers.parseUnits(amounts[1], 6) : 0n
        tx = await swapContract.addLiquidity(amt0, amt1)
      }

      const receipt = await tx.wait()
      setTxHash(receipt.hash)
      setSuccess('Liquidity added successfully!')
      setAmounts({})
      await loadData()
    } catch (err) {
      console.error('Add liquidity error:', err)
      setError(err.reason || err.message || 'Failed to add liquidity')
    } finally {
      setLoading(false)
    }
  }

  // Remove liquidity
  const handleRemoveLiquidity = async () => {
    if (!account || !lpAmount || parseFloat(lpAmount) <= 0) {
      setError('Please enter LP amount')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const swapContract = selectedPool.use3Pool ? contracts.swap3Pool : contracts.swap
      const lpAmountWei = ethers.parseUnits(lpAmount, 18)

      const tx = await swapContract.removeLiquidity(lpAmountWei, 0, 0)
      const receipt = await tx.wait()

      setTxHash(receipt.hash)
      setSuccess('Liquidity removed successfully!')
      setLpAmount('')
      await loadData()
    } catch (err) {
      console.error('Remove liquidity error:', err)
      setError(err.reason || err.message || 'Failed to remove liquidity')
    } finally {
      setLoading(false)
    }
  }

  // Button state
  const getButtonState = () => {
    if (!account) return { text: 'Connect Wallet', disabled: true }
    if (loading) return { text: activeTab === 'add' ? 'Adding...' : 'Removing...', disabled: true }

    if (activeTab === 'add') {
      const hasAmount = selectedPool.tokens.some(idx => amounts[idx] && parseFloat(amounts[idx]) > 0)
      if (!hasAmount) return { text: 'Enter amounts', disabled: true }

      for (const idx of selectedPool.tokens) {
        if (amounts[idx] && parseFloat(amounts[idx]) > parseFloat(balances[idx])) {
          return { text: `Insufficient ${TOKENS[idx].symbol}`, disabled: true }
        }
      }

      return { text: 'Add Liquidity', disabled: false }
    } else {
      if (!lpAmount || parseFloat(lpAmount) <= 0) return { text: 'Enter LP amount', disabled: true }
      if (parseFloat(lpAmount) > parseFloat(lpBalance)) return { text: 'Insufficient LP', disabled: true }
      return { text: 'Remove Liquidity', disabled: false }
    }
  }

  const buttonState = getButtonState()

  return (
    <div className="pool-card">
      {/* Tabs */}
      <div className="pool-tabs">
        <button
          className={`pool-tab ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
        >
          <PlusIcon /> Add
        </button>
        <button
          className={`pool-tab ${activeTab === 'remove' ? 'active' : ''}`}
          onClick={() => setActiveTab('remove')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
        >
          <MinusIcon /> Remove
        </button>
      </div>

      {/* Pool Select */}
      <PoolSelect selectedPool={selectedPool} onSelect={setSelectedPool} />

      {/* Pool Stats */}
      <div className="pool-stats">
        {selectedPool.tokens.map(tokenIdx => (
          <div key={tokenIdx} className="pool-stat-card">
            <div className="pool-stat-label">{TOKENS[tokenIdx].symbol}</div>
            <div className="pool-stat-value">
              {parseFloat(reserves[tokenIdx] || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
        ))}
        <div className="pool-stat-card">
          <div className="pool-stat-label">Fee</div>
          <div className="pool-stat-value">0.04%</div>
        </div>
        <div className="pool-stat-card">
          <div className="pool-stat-label">Your LP</div>
          <div className="pool-stat-value">
            {parseFloat(lpBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })}
          </div>
        </div>
        <div className="pool-stat-card">
          <div className="pool-stat-label">Rewards</div>
          <div className="pool-stat-value" style={{ color: parseFloat(pendingRewards) > 0 ? '#fc72ff' : 'inherit' }}>
            {parseFloat(pendingRewards).toLocaleString(undefined, { maximumFractionDigits: 4 })} ASS
          </div>
        </div>
      </div>

      {/* Claim Rewards Section */}
      {account && (
        <button
          onClick={handleClaimRewards}
          disabled={claimLoading || parseFloat(pendingRewards) <= 0}
          style={{
            width: '100%',
            padding: '14px',
            background: parseFloat(pendingRewards) > 0
              ? 'linear-gradient(135deg, #fc72ff 0%, #c13cff 100%)'
              : 'var(--background-tertiary)',
            border: parseFloat(pendingRewards) > 0 ? 'none' : '1px solid var(--border)',
            borderRadius: '12px',
            color: parseFloat(pendingRewards) > 0 ? 'white' : 'var(--text-secondary)',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: (claimLoading || parseFloat(pendingRewards) <= 0) ? 'not-allowed' : 'pointer',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            boxShadow: parseFloat(pendingRewards) > 0 ? '0 4px 16px rgba(252, 114, 255, 0.3)' : 'none',
            opacity: parseFloat(pendingRewards) > 0 ? 1 : 0.6
          }}
        >
          <GiftIcon />
          {claimLoading ? 'Claiming...' : parseFloat(pendingRewards) > 0
            ? `Claim ${parseFloat(pendingRewards).toFixed(4)} ASS`
            : 'No Rewards Yet'}
        </button>
      )}

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

      {/* Add Liquidity Form */}
      {activeTab === 'add' && (
        <div>
          {selectedPool.tokens.map(tokenIdx => (
            <PoolTokenInput
              key={tokenIdx}
              token={TOKENS[tokenIdx]}
              value={amounts[tokenIdx] || ''}
              onChange={(val) => handleAmountChange(tokenIdx, val)}
              balance={balances[tokenIdx]}
              onMaxClick={() => handleAmountChange(tokenIdx, balances[tokenIdx])}
            />
          ))}
        </div>
      )}

      {/* Remove Liquidity Form */}
      {activeTab === 'remove' && (
        <div className="token-input-container">
          <div className="token-input-label">LP Token Amount</div>
          <div className="token-input-row">
            <input
              type="text"
              className="token-input"
              placeholder="0"
              value={lpAmount}
              onChange={(e) => {
                const val = e.target.value
                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                  setLpAmount(val)
                }
              }}
              style={{ fontSize: '1.5rem' }}
            />
          </div>
          <div className="token-balance-row">
            <span></span>
            <div className="token-balance">
              <span>Balance: {parseFloat(lpBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
              {parseFloat(lpBalance) > 0 && (
                <button className="max-btn" onClick={() => setLpAmount(lpBalance)}>MAX</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <RainbowButton
        onClick={activeTab === 'add' ? handleAddLiquidity : handleRemoveLiquidity}
        disabled={buttonState.disabled}
        style={{ marginTop: '16px' }}
      >
        {loading ? (
          <span className="swap-btn-loading">
            <span className="spinner"></span>
            <span>{buttonState.text}</span>
          </span>
        ) : <span>{buttonState.text}</span>}
      </RainbowButton>
    </div>
  )
}

export default PoolCard
