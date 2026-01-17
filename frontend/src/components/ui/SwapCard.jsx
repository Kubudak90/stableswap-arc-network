import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { CONTRACTS, SETTINGS, getExplorerUrl } from '../../config'
import { RainbowButton } from './RainbowButton'

// SVG Icons
const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
)

const ArrowDownIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <polyline points="19 12 12 19 5 12"/>
  </svg>
)

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

// Token data with proper colors
const TOKENS = [
  { symbol: 'tUSDC', name: 'Test USDC', color: '#2775ca', bgColor: '#2775ca', decimals: 6 },
  { symbol: 'tUSDT', name: 'Test USDT', color: '#26a17b', bgColor: '#26a17b', decimals: 6 },
  { symbol: 'tUSDY', name: 'Test USDY', color: '#6366f1', bgColor: '#6366f1', decimals: 6 },
]

// Token Icon Component - Proper coin style
const TokenIcon = ({ symbol, size = 32 }) => {
  const token = TOKENS.find(t => t.symbol === symbol) || TOKENS[0]

  // Get display letter/symbol
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
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
      }}
    >
      {getDisplayText()}
    </div>
  )
}

// Token Input Component
const TokenInput = ({
  label,
  value,
  onChange,
  tokenIndex,
  onTokenClick,
  balance,
  readOnly,
  onMaxClick,
  loading
}) => {
  const token = TOKENS[tokenIndex]

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
        <button className="token-selector" onClick={onTokenClick} style={{ color: '#ffffff' }}>
          <TokenIcon symbol={token.symbol} size={28} />
          <span style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: '#ffffff',
            marginLeft: '4px'
          }}>
            {token.symbol}
          </span>
          <ChevronDownIcon />
        </button>
      </div>
      <div className="token-balance-row">
        <span className="token-usd-value">
          {value && !isNaN(value) && parseFloat(value) > 0
            ? `≈ $${parseFloat(value).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
            : ''}
        </span>
        <div className="token-balance">
          {loading ? (
            <span style={{ color: 'var(--text-tertiary)' }}>Loading...</span>
          ) : (
            <>
              <span>Balance: {parseFloat(balance || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              {!readOnly && parseFloat(balance) > 0 && (
                <button className="max-btn" onClick={onMaxClick}>MAX</button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Token Select Modal
const TokenSelectModal = ({ isOpen, onClose, onSelect, balances, currentTokenIndex }) => {
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
          {TOKENS.map((token, idx) => (
            <button
              key={token.symbol}
              className="token-list-item"
              onClick={() => {
                onSelect(idx)
                onClose()
              }}
              style={{
                opacity: idx === currentTokenIndex ? 0.5 : 1,
                cursor: idx === currentTokenIndex ? 'not-allowed' : 'pointer'
              }}
              disabled={idx === currentTokenIndex}
            >
              <TokenIcon symbol={token.symbol} size={40} />
              <div className="token-list-info">
                <div className="token-list-name" style={{ fontSize: '1rem', fontWeight: '600', color: 'white' }}>
                  {token.symbol}
                </div>
                <div className="token-list-symbol" style={{ fontSize: '0.875rem', color: '#9b9b9b' }}>
                  {token.name}
                </div>
              </div>
              <div className="token-list-balance" style={{ fontSize: '1rem', color: 'white' }}>
                {parseFloat(balances[idx] || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </div>
              {idx === currentTokenIndex && (
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
const SettingsPanel = ({ isOpen, slippage, setSlippage }) => {
  if (!isOpen) return null

  const presets = [0.1, 0.5, 1.0]

  return (
    <div className="slippage-container" style={{ marginBottom: '16px' }}>
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
  const [loadingBalances, setLoadingBalances] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [txHash, setTxHash] = useState('')
  const [balances, setBalances] = useState(['0', '0', '0'])
  const [showSettings, setShowSettings] = useState(false)
  const [showTokenSelect, setShowTokenSelect] = useState(null) // 'in' or 'out'

  const tokenContracts = [contracts.token0, contracts.token1, contracts.token2]

  // Determine pool type
  const use3Pool = tokenInIndex === 2 || tokenOutIndex === 2

  // Check if contracts are ready
  const contractsReady = contracts.token0 && contracts.token1 && contracts.token2

  // Load balances
  useEffect(() => {
    if (contractsReady && account) {
      loadBalances()
    }
  }, [contracts, account, contractsReady])

  const loadBalances = async () => {
    if (!contractsReady || !account) return

    setLoadingBalances(true)
    try {
      console.log('Loading balances for account:', account)
      const bal0 = await contracts.token0.balanceOf(account)
      const bal1 = await contracts.token1.balanceOf(account)
      const bal2 = await contracts.token2.balanceOf(account)

      const formatted = [
        ethers.formatUnits(bal0, 6),
        ethers.formatUnits(bal1, 6),
        ethers.formatUnits(bal2, 6)
      ]
      console.log('Balances loaded:', formatted)
      setBalances(formatted)
    } catch (err) {
      console.error('Error loading balances:', err)
      setError('Failed to load balances. Check network connection.')
    } finally {
      setLoadingBalances(false)
    }
  }

  // Calculate output amount
  useEffect(() => {
    if (amountIn && !isNaN(amountIn) && parseFloat(amountIn) > 0) {
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
        // 3Pool swap: (uint8 tokenIn, uint8 tokenOut, uint256 amountIn)
        swapTx = await swapContract.swap(tokenInIndex, tokenOutIndex, amountInWei)
      } else {
        // 2Pool swap: (bool zeroForOne, uint256 amountIn)
        const zeroForOne = tokenInIndex === 0
        swapTx = await swapContract.swap(zeroForOne, amountInWei)
      }

      const receipt = await swapTx.wait()
      setTxHash(receipt.hash)
      setSuccess(`Swapped ${amountIn} ${TOKENS[tokenInIndex].symbol} → ${amountOut} ${TOKENS[tokenOutIndex].symbol}`)
      setAmountIn('')
      setAmountOut('')
      await loadBalances()
    } catch (err) {
      console.error('Swap error:', err)
      setError(err.reason || err.message || 'Swap failed')
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
    if (!contractsReady) return { text: 'Loading...', disabled: true, variant: 'secondary' }
    if (loadingBalances) return { text: 'Loading balances...', disabled: true, variant: 'secondary' }
    if (!amountIn || parseFloat(amountIn) === 0) return { text: 'Enter an amount', disabled: true, variant: 'secondary' }
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
            style={{ color: showSettings ? 'var(--primary)' : 'var(--text-secondary)' }}
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
      />

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

      {/* Token In */}
      <TokenInput
        label="You pay"
        value={amountIn}
        onChange={setAmountIn}
        tokenIndex={tokenInIndex}
        onTokenClick={() => setShowTokenSelect('in')}
        balance={balances[tokenInIndex]}
        onMaxClick={handleMax}
        loading={loadingBalances}
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
        tokenIndex={tokenOutIndex}
        onTokenClick={() => setShowTokenSelect('out')}
        balance={balances[tokenOutIndex]}
        readOnly
        loading={loadingBalances}
      />

      {/* Swap Details */}
      {amountIn && amountOut && parseFloat(amountIn) > 0 && (
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
            <span className="swap-detail-label">Route</span>
            <span className="swap-detail-value">{use3Pool ? '3Pool' : '2Pool'}</span>
          </div>
          <div className="swap-detail-row">
            <span className="swap-detail-label">Max Slippage</span>
            <span className="swap-detail-value">{slippage}%</span>
          </div>
        </div>
      )}

      {/* Swap Button */}
      <RainbowButton
        onClick={handleSwap}
        disabled={buttonState.disabled}
        style={{ marginTop: '16px' }}
      >
        {loading ? (
          <span className="swap-btn-loading">
            <span className="spinner"></span>
            <span>Swapping...</span>
          </span>
        ) : <span>{buttonState.text}</span>}
      </RainbowButton>

      {/* Token Select Modals */}
      <TokenSelectModal
        isOpen={showTokenSelect === 'in'}
        onClose={() => setShowTokenSelect(null)}
        onSelect={(idx) => handleTokenSelect('in', idx)}
        balances={balances}
        currentTokenIndex={tokenInIndex}
      />
      <TokenSelectModal
        isOpen={showTokenSelect === 'out'}
        onClose={() => setShowTokenSelect(null)}
        onSelect={(idx) => handleTokenSelect('out', idx)}
        balances={balances}
        currentTokenIndex={tokenOutIndex}
      />
    </div>
  )
}

export default SwapCard
