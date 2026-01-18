import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { CONTRACTS, getExplorerUrl } from '../../config'
import { RainbowButton } from './RainbowButton'

// Icons
const DropletIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
  </svg>
)

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)

const RefreshIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 4v6h-6"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
)

// Token Icon
const TokenIcon = ({ symbol, size = 40 }) => {
  const colors = {
    'tUSDC': '#2775ca',
    'tUSDT': '#26a17b',
    'tUSDY': '#6366f1'
  }
  const icons = {
    'tUSDC': '$',
    'tUSDT': '₮',
    'tUSDY': 'Y'
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: colors[symbol] || '#fc72ff',
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
      {icons[symbol] || symbol?.charAt(0)}
    </div>
  )
}

// Contract addresses
const TOKEN_ADDRESSES = {
  testUSDC: "0x1eccf89268C90C5Ac954ed020Ca498D96F9f9733",
  testUSDT: "0x787804d1f98F4Da65C6de63AaA00906A8C6868F3",
  testUSDY: "0x4D81e87902aA4Cf67D99055D44b6D0341fCc419a"
}

const FAUCET_ADDRESS = "0xdbF8fC63B9cFa254B1b6eD80fa40927271A4dfC0"
const DEVELOPER_ADDRESS = "0x1D58328205429D39cE21a13DcD3FeB73180C9B20"

const FAUCET_ABI = [
  "function claimTokens() external",
  "function canClaim(address user) view returns (bool)",
  "function getTimeUntilNextClaim(address user) view returns (uint256)",
  "function isDeveloper(address user) view returns (bool)"
]

const MINTABLE_TOKEN_ABI = [
  "function mint(address to, uint256 amount) external",
  "function balanceOf(address owner) view returns (uint256)"
]

// Format time
const formatTime = (seconds) => {
  if (seconds <= 0) return 'Ready!'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

// Token Card
const TokenCard = ({ symbol, name, amount }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    background: 'var(--background-secondary)',
    borderRadius: '12px'
  }}>
    <TokenIcon symbol={symbol} size={40} />
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>{symbol}</div>
      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{name}</div>
    </div>
    <div style={{
      fontSize: '1.25rem',
      fontWeight: '600',
      color: 'var(--primary)'
    }}>
      +{amount.toLocaleString()}
    </div>
  </div>
)

function FaucetCard({ contracts, account }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [txHash, setTxHash] = useState('')
  const [canClaim, setCanClaim] = useState(false)
  const [timeUntilNextClaim, setTimeUntilNextClaim] = useState(0)
  const [faucetContract, setFaucetContract] = useState(null)
  const [isDeveloper, setIsDeveloper] = useState(false)
  const [refillLoading, setRefillLoading] = useState(false)
  const [faucetBalances, setFaucetBalances] = useState({ usdc: '0', usdt: '0', usdy: '0' })

  useEffect(() => {
    if (contracts.token0 && account) {
      const provider = contracts.token0.runner?.provider
      if (provider) {
        const faucet = new ethers.Contract(FAUCET_ADDRESS, FAUCET_ABI, provider)
        setFaucetContract(faucet)
        loadData(faucet)
      }
    }
  }, [contracts, account])

  // Countdown timer
  useEffect(() => {
    if (timeUntilNextClaim > 0) {
      const timer = setInterval(() => {
        setTimeUntilNextClaim(prev => {
          if (prev <= 1) {
            setCanClaim(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [timeUntilNextClaim])

  const loadData = async (faucet) => {
    try {
      const [canClaimNow, timeUntil, isDev] = await Promise.all([
        faucet.canClaim(account),
        faucet.getTimeUntilNextClaim(account),
        faucet.isDeveloper(account).catch(() => false)
      ])

      setCanClaim(canClaimNow)
      setTimeUntilNextClaim(Number(timeUntil))
      setIsDeveloper(isDev || account.toLowerCase() === DEVELOPER_ADDRESS.toLowerCase())

      if (isDev || account.toLowerCase() === DEVELOPER_ADDRESS.toLowerCase()) {
        await loadFaucetBalances()
      }
    } catch (err) {
      console.error('Error loading faucet data:', err)
    }
  }

  const loadFaucetBalances = async () => {
    try {
      const provider = contracts.token0.runner?.provider
      if (!provider) return

      const usdcContract = new ethers.Contract(TOKEN_ADDRESSES.testUSDC, MINTABLE_TOKEN_ABI, provider)
      const usdtContract = new ethers.Contract(TOKEN_ADDRESSES.testUSDT, MINTABLE_TOKEN_ABI, provider)
      const usdyContract = new ethers.Contract(TOKEN_ADDRESSES.testUSDY, MINTABLE_TOKEN_ABI, provider)

      const [usdcBal, usdtBal, usdyBal] = await Promise.all([
        usdcContract.balanceOf(FAUCET_ADDRESS),
        usdtContract.balanceOf(FAUCET_ADDRESS),
        usdyContract.balanceOf(FAUCET_ADDRESS)
      ])

      setFaucetBalances({
        usdc: ethers.formatUnits(usdcBal, 6),
        usdt: ethers.formatUnits(usdtBal, 6),
        usdy: ethers.formatUnits(usdyBal, 6)
      })
    } catch (err) {
      console.error('Error loading faucet balances:', err)
    }
  }

  const handleClaim = async () => {
    if (!account || !faucetContract) {
      setError('Please connect wallet')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const signer = await contracts.token0.runner?.provider.getSigner()
      const faucetWithSigner = new ethers.Contract(FAUCET_ADDRESS, FAUCET_ABI, signer)

      const tx = await faucetWithSigner.claimTokens()
      const receipt = await tx.wait()
      setTxHash(receipt.hash)

      setSuccess('Tokens claimed successfully! You received 10,000 of each token.')
      setCanClaim(false)
      setTimeUntilNextClaim(24 * 60 * 60) // 24 hours

      if (isDeveloper) {
        await loadFaucetBalances()
      }
    } catch (err) {
      console.error('Claim error:', err)
      setError(err.reason || err.message || 'Failed to claim tokens')
    } finally {
      setLoading(false)
    }
  }

  const handleRefill = async () => {
    if (!isDeveloper) {
      setError('Only developers can refill the faucet')
      return
    }

    setRefillLoading(true)
    setError('')

    try {
      const signer = await contracts.token0.runner?.provider.getSigner()
      const mintAmount = ethers.parseUnits("5000000", 6) // 5M tokens

      const usdcContract = new ethers.Contract(TOKEN_ADDRESSES.testUSDC, MINTABLE_TOKEN_ABI, signer)
      const usdtContract = new ethers.Contract(TOKEN_ADDRESSES.testUSDT, MINTABLE_TOKEN_ABI, signer)
      const usdyContract = new ethers.Contract(TOKEN_ADDRESSES.testUSDY, MINTABLE_TOKEN_ABI, signer)

      await (await usdcContract.mint(FAUCET_ADDRESS, mintAmount)).wait()
      await (await usdtContract.mint(FAUCET_ADDRESS, mintAmount)).wait()
      await (await usdyContract.mint(FAUCET_ADDRESS, mintAmount)).wait()

      setSuccess('Faucet refilled with 5M of each token!')
      await loadFaucetBalances()
    } catch (err) {
      console.error('Refill error:', err)
      setError(err.reason || err.message || 'Failed to refill faucet')
    } finally {
      setRefillLoading(false)
    }
  }

  return (
    <div className="page-container">
      <div className="swap-card" style={{ maxWidth: '480px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(252, 114, 255, 0.3)'
          }}>
            <DropletIcon />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Testnet Faucet
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Get free test tokens to try out ArcSwap
          </p>
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

        {/* Token Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          <TokenCard symbol="tUSDC" name="Test USDC" amount={10000} />
          <TokenCard symbol="tUSDT" name="Test USDT" amount={10000} />
          <TokenCard symbol="tUSDY" name="Test USDY" amount={10000} />
        </div>

        {/* Claim Status */}
        {account && !canClaim && timeUntilNextClaim > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
            background: 'var(--background-secondary)',
            borderRadius: '12px',
            marginBottom: '16px',
            color: 'var(--text-secondary)'
          }}>
            <ClockIcon />
            <span>Next claim available in: </span>
            <span style={{ color: 'var(--primary)', fontWeight: '600' }}>
              {formatTime(timeUntilNextClaim)}
            </span>
          </div>
        )}

        {/* Claim Button */}
        <RainbowButton
          onClick={handleClaim}
          disabled={loading || !canClaim || !account}
        >
          {loading ? (
            <span className="swap-btn-loading">
              <span className="spinner"></span>
              <span>Claiming...</span>
            </span>
          ) : !account ? (
            <span>Connect Wallet</span>
          ) : canClaim ? (
            <span>Claim Tokens</span>
          ) : (
            <span>Already Claimed</span>
          )}
        </RainbowButton>

        {/* Info */}
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'var(--background-secondary)',
          borderRadius: '12px',
          fontSize: '0.875rem',
          color: 'var(--text-secondary)',
          textAlign: 'center'
        }}>
          You can claim once every 24 hours
        </div>

        {/* Developer Section */}
        {isDeveloper && (
          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: 'rgba(252, 114, 255, 0.1)',
            border: '1px solid rgba(252, 114, 255, 0.2)',
            borderRadius: '12px'
          }}>
            <div style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: 'var(--primary)',
              marginBottom: '12px'
            }}>
              Developer Tools
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              marginBottom: '12px',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)'
            }}>
              <div>tUSDC: {parseFloat(faucetBalances.usdc).toLocaleString()}</div>
              <div>tUSDT: {parseFloat(faucetBalances.usdt).toLocaleString()}</div>
              <div>tUSDY: {parseFloat(faucetBalances.usdy).toLocaleString()}</div>
            </div>
            <button
              onClick={handleRefill}
              disabled={refillLoading}
              style={{
                width: '100%',
                padding: '10px',
                background: 'var(--primary)',
                border: 'none',
                borderRadius: '8px',
                color: 'black',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: refillLoading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <RefreshIcon />
              {refillLoading ? 'Refilling...' : 'Refill Faucet (5M each)'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default FaucetCard
