import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { CONTRACTS, SETTINGS, calculateMinOutput, getExplorerUrl } from '../../config'

// SVG Icons
const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
)

const ArrowDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <polyline points="19 12 12 19 5 12"/>
  </svg>
)

const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

// Token data
const TOKENS = [
  { symbol: 'tUSDC', name: 'Test USDC', color: '#2775ca', decimals: 6 },
  { symbol: 'tUSDT', name: 'Test USDT', color: '#50af95', decimals: 6 },
  { symbol: 'tUSDY', name: 'Test USDY', color: '#6366f1', decimals: 6 },
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

// Token Input Component
const TokenInput = ({
  label,
  value,
  onChange,
  token,
  onTokenClick,
  balance,
  readOnly,
  onMaxClick
}) => {
  return (
    <div className="token-input-container">
      <div className="token-input-label">{label}</div>
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
          readOnly={readOnly}
        />
        <button className="token-selector" onClick={onTokenClick}>
          <TokenIcon symbol={token} />
          <span className="token-symbol">{token}</span>
          <ChevronDownIcon />
        </button>
      </div>
      <div className="token-balance-row">
        <span className="token-usd-value">
          {value && !isNaN(value) ? `$${parseFloat(value).toLocaleString()}` : ''}
        </span>
        <div className="token-balance">
          <span>Balance: {parseFloat(balance || 0).toFixed(2)}</span>
          {!readOnly && parseFloat(balance) > 0 && (
            <button className="max-btn" onClick={onMaxClick}>MAX</button>
          )}
        </div>
      </div>
    </div>
  )
}

// Token Select Modal
const TokenSelectModal = ({ isOpen, onClose, onSelect, tokens, balances, currentToken }) => {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Select a token</h3>
          <button className="modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="token-list">
          {tokens.map((token, idx) => (
            <button
              key={token.symbol}
              className="token-list-item"
              onClick={() => {
                onSelect(idx)
                onClose()
              }}
              disabled={token.symbol === currentToken}
            >
              <TokenIcon symbol={token.symbol} size={36} />
              <div className="token-list-info">
                <div className="token-list-name">{token.name}</div>
                <div className="token-list-symbol">{token.symbol}</div>
              </div>
              <div className="token-list-balance">
                {parseFloat(balances[idx] || 0).toFixed(2)}
              </div>
              {token.symbol === currentToken && (
                <CheckIcon />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Settings Panel
const SettingsPanel = ({ isOpen, slippage, setSlippage, onClose }) => {
  if (!isOpen) return null

  const presets = [0.1, 0.5, 1.0]

  return (
    <div className="slippage-container">
      <div className="slippage-label">Slippage Tolerance</div>
      <div className="slippage-options">
        {presets.map(p => (
          <button
            key={p}
            className={`slippage-option ${slippage === p ? 'active' : ''}`}
            onClick={() => setSlippage(p)}
          >
            {p}%
          </button>
        ))}
        <div className="slippage-custom">
          <input
            type="text"
            value={slippage}
            onChange={(e) => {
              const val = e.target.value
              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                setSlippage(parseFloat(val) || 0)
              }
            }}
          />
          <span>%</span>
        </div>
      </div>
    </div>
  )
}

// Main SwapCard Component
function SwapCard({ contracts, account }) {
  const [amountIn, setAmountIn] = useState('')
  const [amountOut, setAmountOut] = useState('')
  const [tokenInIndex, setTokenInIndex] = useState(0)
  const [tokenOutIndex, setTokenOutIndex] = useState(1)
  const [slippage, setSlippage] = useState(0.5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [txHash, setTxHash] = useState('')
  const [balances, setBalances] = useState(['0', '0', '0'])
  const [showSettings, setShowSettings] = useState(false)
  const [showTokenSelect, setShowTokenSelect] = useState(null) // 'in' or 'out'

  const tokenContracts = [contracts.token0, contracts.token1, contracts.token2]

  // Determine pool type
  const use3Pool = tokenInIndex === 2 || tokenOutIndex === 2

  // Load balances
  useEffect(() => {
    if (contracts.token0 && contracts.token1 && contracts.token2 && account) {
      loadBalances()
    }
  }, [contracts, account])

  const loadBalances = async () => {
    try {
      const bal0 = await contracts.token0.balanceOf(account)
      const bal1 = await contracts.token1.balanceOf(account)
      const bal2 = await contracts.token2.balanceOf(account)
      setBalances([
        ethers.formatUnits(bal0, 6),
        ethers.formatUnits(bal1, 6),
        ethers.formatUnits(bal2, 6)
      ])
    } catch (err) {
      console.error('Error loading balances:', err)
    }
  }

  // Calculate output amount
  useEffect(() => {
    if (amountIn && !isNaN(amountIn) && parseFloat(amountIn) > 0) {
      // Simple 1:1 calculation with 0.04% fee
      const fee = 0.0004
      const output = parseFloat(amountIn) * (1 - fee)
      setAmountOut(output.toFixed(6))
    } else {
      setAmountOut('')
    }
  }, [amountIn, tokenInIndex, tokenOutIndex])

  // Swap direction
  const handleSwapDirection = () => {
    setTokenInIndex(tokenOutIndex)
    setTokenOutIndex(tokenInIndex)
    setAmountIn(amountOut)
    setAmountOut(amountIn)
  }

  // Execute swap
  const handleSwap = async () => {
    if (!amountIn || !account) {
      setError('Please enter an amount')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const amountInWei = ethers.parseUnits(amountIn, 6)
      const swapContract = use3Pool ? contracts.swap3Pool : contracts.swap
      const swapAddress = use3Pool ? CONTRACTS.swap3Pool : CONTRACTS.swap
      const tokenContract = tokenContracts[tokenInIndex]

      // Approve
      const approveTx = await tokenContract.approve(swapAddress, amountInWei)
      await approveTx.wait()

      // Swap
      let swapTx
      if (use3Pool) {
        swapTx = await swapContract.swap(tokenInIndex, tokenOutIndex, amountInWei, 0)
      } else {
        const zeroForOne = tokenInIndex === 0
        swapTx = await swapContract.swap(zeroForOne, amountInWei)
      }

      const receipt = await swapTx.wait()
      setTxHash(receipt.hash)
      setSuccess(`Swapped ${amountIn} ${TOKENS[tokenInIndex].symbol} for ${amountOut} ${TOKENS[tokenOutIndex].symbol}`)
      setAmountIn('')
      setAmountOut('')
      await loadBalances()
    } catch (err) {
      console.error('Swap error:', err)
      setError(err.message || 'Swap failed')
    } finally {
      setLoading(false)
    }
  }

  // Max button handler
  const handleMax = () => {
    setAmountIn(balances[tokenInIndex])
  }

  // Token select handler
  const handleTokenSelect = (type, index) => {
    if (type === 'in') {
      if (index === tokenOutIndex) {
        setTokenOutIndex(tokenInIndex)
      }
      setTokenInIndex(index)
    } else {
      if (index === tokenInIndex) {
        setTokenInIndex(tokenOutIndex)
      }
      setTokenOutIndex(index)
    }
    setAmountIn('')
    setAmountOut('')
  }

  // Button state
  const getButtonState = () => {
    if (!account) return { text: 'Connect Wallet', disabled: true, variant: 'secondary' }
    if (!amountIn) return { text: 'Enter an amount', disabled: true, variant: 'secondary' }
    if (parseFloat(amountIn) > parseFloat(balances[tokenInIndex])) {
      return { text: `Insufficient ${TOKENS[tokenInIndex].symbol}`, disabled: true, variant: 'error' }
    }
    if (loading) return { text: 'Swapping...', disabled: true, variant: 'primary' }
    return { text: 'Swap', disabled: false, variant: 'primary' }
  }

  const buttonState = getButtonState()

  return (
    <div className="swap-card">
      {/* Header */}
      <div className="swap-card-header">
        <h2 className="swap-card-title">Swap</h2>
        <div className="swap-card-settings">
          <button
            className="settings-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            <SettingsIcon />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        slippage={slippage}
        setSlippage={setSlippage}
        onClose={() => setShowSettings(false)}
      />

      {/* Alerts */}
      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">!</span>
          <span className="alert-content">{error}</span>
          <button className="alert-close" onClick={() => setError('')}>&times;</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span className="alert-icon"><CheckIcon /></span>
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

      {/* Token In */}
      <TokenInput
        label="You pay"
        value={amountIn}
        onChange={setAmountIn}
        token={TOKENS[tokenInIndex].symbol}
        onTokenClick={() => setShowTokenSelect('in')}
        balance={balances[tokenInIndex]}
        onMaxClick={handleMax}
      />

      {/* Swap Direction Button */}
      <div className="swap-direction-container">
        <button className="swap-direction-btn" onClick={handleSwapDirection}>
          <ArrowDownIcon />
        </button>
      </div>

      {/* Token Out */}
      <TokenInput
        label="You receive"
        value={amountOut}
        onChange={setAmountOut}
        token={TOKENS[tokenOutIndex].symbol}
        onTokenClick={() => setShowTokenSelect('out')}
        balance={balances[tokenOutIndex]}
        readOnly
      />

      {/* Swap Details */}
      {amountIn && amountOut && (
        <div className="swap-details">
          <div className="swap-detail-row">
            <span className="swap-detail-label">Rate</span>
            <span className="swap-detail-value">
              1 {TOKENS[tokenInIndex].symbol} = 0.9996 {TOKENS[tokenOutIndex].symbol}
            </span>
          </div>
          <div className="swap-detail-row">
            <span className="swap-detail-label">Fee</span>
            <span className="swap-detail-value">0.04%</span>
          </div>
          <div className="swap-detail-row">
            <span className="swap-detail-label">Pool</span>
            <span className="swap-detail-value">{use3Pool ? '3Pool' : '2Pool'}</span>
          </div>
          <div className="swap-detail-row">
            <span className="swap-detail-label">Slippage</span>
            <span className="swap-detail-value">{slippage}%</span>
          </div>
        </div>
      )}

      {/* Swap Button */}
      <button
        className={`swap-btn swap-btn-${buttonState.variant}`}
        onClick={handleSwap}
        disabled={buttonState.disabled}
      >
        {loading ? (
          <span className="swap-btn-loading">
            <span className="spinner"></span>
            Swapping...
          </span>
        ) : buttonState.text}
      </button>

      {/* Token Select Modals */}
      <TokenSelectModal
        isOpen={showTokenSelect === 'in'}
        onClose={() => setShowTokenSelect(null)}
        onSelect={(idx) => handleTokenSelect('in', idx)}
        tokens={TOKENS}
        balances={balances}
        currentToken={TOKENS[tokenInIndex].symbol}
      />
      <TokenSelectModal
        isOpen={showTokenSelect === 'out'}
        onClose={() => setShowTokenSelect(null)}
        onSelect={(idx) => handleTokenSelect('out', idx)}
        tokens={TOKENS}
        balances={balances}
        currentToken={TOKENS[tokenOutIndex].symbol}
      />
    </div>
  )
}

export default SwapCard
