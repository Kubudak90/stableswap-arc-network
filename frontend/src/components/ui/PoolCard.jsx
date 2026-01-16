import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { CONTRACTS, getExplorerUrl } from '../../config'

// SVG Icons
const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const MinusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

// Token data
const TOKENS = [
  { symbol: 'tUSDC', name: 'Test USDC', color: '#2775ca', decimals: 6 },
  { symbol: 'tUSDT', name: 'Test USDT', color: '#50af95', decimals: 6 },
  { symbol: 'tUSDY', name: 'Test USDY', color: '#6366f1', decimals: 6 },
]

// Pool configurations
const POOLS = [
  { id: '2pool', name: 'USDC-USDT Pool', tokens: [0, 1], use3Pool: false },
  { id: '3pool', name: '3Pool (All Stables)', tokens: [0, 1, 2], use3Pool: true },
]

// Token Icon Component
const TokenIcon = ({ symbol, size = 28 }) => {
  const token = TOKENS.find(t => t.symbol === symbol)
  const color = token?.color || '#fc72ff'

  return (
    <div
      className="token-icon"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: size * 0.35
      }}
    >
      {symbol?.charAt(0)}
    </div>
  )
}

// Token Input for Pool
const PoolTokenInput = ({ token, value, onChange, balance, onMaxClick, disabled }) => {
  return (
    <div className="token-input-container" style={{ marginBottom: 'var(--spacing-md)' }}>
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
        <div className="token-selector" style={{ cursor: 'default' }}>
          <TokenIcon symbol={token.symbol} />
          <span className="token-symbol">{token.symbol}</span>
        </div>
      </div>
      <div className="token-balance-row">
        <span className="token-usd-value">
          {value && !isNaN(value) ? `$${parseFloat(value).toLocaleString()}` : ''}
        </span>
        <div className="token-balance">
          <span>Balance: {parseFloat(balance || 0).toFixed(2)}</span>
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
    <div style={{ position: 'relative', marginBottom: 'var(--spacing-xl)' }}>
      <button
        className="token-selector"
        style={{
          width: '100%',
          padding: 'var(--spacing-md) var(--spacing-lg)',
          justifyContent: 'space-between',
          borderRadius: 'var(--radius-md)',
          background: 'var(--background-secondary)'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <div style={{ display: 'flex', marginRight: 'var(--spacing-sm)' }}>
            {selectedPool.tokens.map((tokenIdx, i) => (
              <TokenIcon
                key={tokenIdx}
                symbol={TOKENS[tokenIdx].symbol}
                size={24}
                style={{ marginLeft: i > 0 ? -8 : 0 }}
              />
            ))}
          </div>
          <span className="token-symbol">{selectedPool.name}</span>
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
            marginTop: 'var(--spacing-sm)',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            zIndex: 10,
            overflow: 'hidden'
          }}
        >
          {POOLS.map((pool) => (
            <button
              key={pool.id}
              className="token-list-item"
              onClick={() => {
                onSelect(pool)
                setIsOpen(false)
              }}
            >
              <div style={{ display: 'flex', marginRight: 'var(--spacing-sm)' }}>
                {pool.tokens.map((tokenIdx, i) => (
                  <TokenIcon
                    key={tokenIdx}
                    symbol={TOKENS[tokenIdx].symbol}
                    size={24}
                    style={{ marginLeft: i > 0 ? -8 : 0 }}
                  />
                ))}
              </div>
              <span style={{ flex: 1 }}>{pool.name}</span>
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
  const [activeTab, setActiveTab] = useState('add') // 'add' or 'remove'
  const [selectedPool, setSelectedPool] = useState(POOLS[0])
  const [amounts, setAmounts] = useState({})
  const [lpAmount, setLpAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [txHash, setTxHash] = useState('')
  const [balances, setBalances] = useState(['0', '0', '0'])
  const [reserves, setReserves] = useState({})
  const [lpBalance, setLpBalance] = useState('0')

  const tokenContracts = [contracts.token0, contracts.token1, contracts.token2]

  // Load data
  useEffect(() => {
    if (contracts.token0 && account) {
      loadData()
    }
  }, [contracts, account, selectedPool])

  const loadData = async () => {
    try {
      // Load token balances
      const bal0 = await contracts.token0.balanceOf(account)
      const bal1 = await contracts.token1.balanceOf(account)
      const bal2 = await contracts.token2.balanceOf(account)
      setBalances([
        ethers.formatUnits(bal0, 6),
        ethers.formatUnits(bal1, 6),
        ethers.formatUnits(bal2, 6)
      ])

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
    } catch (err) {
      console.error('Error loading data:', err)
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
      setError(err.message || 'Failed to add liquidity')
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
      setError(err.message || 'Failed to remove liquidity')
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

      // Check balances
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
        >
          <PlusIcon /> Add
        </button>
        <button
          className={`pool-tab ${activeTab === 'remove' ? 'active' : ''}`}
          onClick={() => setActiveTab('remove')}
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
            <div className="pool-stat-label">{TOKENS[tokenIdx].symbol} Reserve</div>
            <div className="pool-stat-value">
              {parseFloat(reserves[tokenIdx] || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
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
            {parseFloat(lpBalance).toFixed(4)}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-error">
          <span className="alert-content">{error}</span>
          <button className="alert-close" onClick={() => setError('')}>&times;</button>
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
                View tx
              </a>
            )}
          </span>
          <button className="alert-close" onClick={() => setSuccess('')}>&times;</button>
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
              <span>Balance: {parseFloat(lpBalance).toFixed(4)}</span>
              {parseFloat(lpBalance) > 0 && (
                <button className="max-btn" onClick={() => setLpAmount(lpBalance)}>MAX</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        className={`swap-btn swap-btn-primary`}
        onClick={activeTab === 'add' ? handleAddLiquidity : handleRemoveLiquidity}
        disabled={buttonState.disabled}
      >
        {loading ? (
          <span className="swap-btn-loading">
            <span className="spinner"></span>
            {buttonState.text}
          </span>
        ) : buttonState.text}
      </button>
    </div>
  )
}

export default PoolCard
