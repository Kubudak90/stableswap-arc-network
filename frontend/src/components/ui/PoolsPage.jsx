import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ethers } from 'ethers'
import { CONTRACTS, ABIS } from '../../config'

// Icons
const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
)

const TrendingUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
)

const DropletIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
  </svg>
)

const CoinsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="8" cy="8" r="6"/>
    <path d="M18.09 10.37A6 6 0 1 1 10.34 18"/>
    <path d="M7 6h1v4"/>
    <path d="m16.71 13.88.7.71-2.82 2.82"/>
  </svg>
)

// Token data
const TOKENS = [
  { symbol: 'tUSDC', name: 'Test USDC', color: '#2775ca', decimals: 6 },
  { symbol: 'tUSDT', name: 'Test USDT', color: '#26a17b', decimals: 6 },
  { symbol: 'tUSDY', name: 'Test USDY', color: '#6366f1', decimals: 6 },
]

// Token Icon
const TokenIcon = ({ symbol, size = 32 }) => {
  const token = TOKENS.find(t => t.symbol === symbol) || TOKENS[0]
  const icons = { 'tUSDC': '$', 'tUSDT': '₮', 'tUSDY': 'Y' }

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: token.color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.5,
      fontWeight: '700',
      color: 'white',
      flexShrink: 0,
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
    }}>
      {icons[symbol] || symbol?.charAt(0)}
    </div>
  )
}

// Stacked Token Icons
const StackedTokenIcons = ({ tokens, size = 32 }) => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    {tokens.map((symbol, i) => (
      <div key={symbol} style={{ marginLeft: i > 0 ? -10 : 0, zIndex: tokens.length - i }}>
        <TokenIcon symbol={symbol} size={size} />
      </div>
    ))}
  </div>
)

// Pool Card Component
const PoolListCard = ({ pool, onClick }) => {
  const hasUserPosition = parseFloat(pool.userLpBalance) > 0

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-hover)'
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <StackedTokenIcons tokens={pool.tokens} size={36} />
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
              {pool.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {pool.tokens.join(' / ')}
            </div>
          </div>
        </div>
        {hasUserPosition && (
          <div style={{
            background: 'rgba(0, 211, 149, 0.1)',
            color: '#00d395',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: '600'
          }}>
            Your Position
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px'
      }}>
        {/* TVL */}
        <div style={{
          background: 'var(--background-secondary)',
          borderRadius: '12px',
          padding: '12px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.7rem',
            color: 'var(--text-secondary)',
            marginBottom: '4px',
            textTransform: 'uppercase'
          }}>
            <DropletIcon />
            TVL
          </div>
          <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            ${pool.tvl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>

        {/* APR */}
        <div style={{
          background: 'var(--background-secondary)',
          borderRadius: '12px',
          padding: '12px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.7rem',
            color: 'var(--text-secondary)',
            marginBottom: '4px',
            textTransform: 'uppercase'
          }}>
            <TrendingUpIcon />
            APR
          </div>
          <div style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: pool.apr > 0 ? '#00d395' : 'var(--text-primary)'
          }}>
            {pool.apr.toFixed(2)}%
          </div>
        </div>

        {/* Your LP */}
        <div style={{
          background: 'var(--background-secondary)',
          borderRadius: '12px',
          padding: '12px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.7rem',
            color: 'var(--text-secondary)',
            marginBottom: '4px',
            textTransform: 'uppercase'
          }}>
            <CoinsIcon />
            Your LP
          </div>
          <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            {parseFloat(pool.userLpBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Reserves */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px',
        background: 'var(--background-secondary)',
        borderRadius: '12px'
      }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Reserves:</span>
        <div style={{ display: 'flex', gap: '12px' }}>
          {pool.reserves.map((reserve, idx) => (
            <span key={idx} style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '500' }}>
              {parseFloat(reserve).toLocaleString(undefined, { maximumFractionDigits: 0 })} {pool.tokens[idx]}
            </span>
          ))}
        </div>
      </div>

      {/* Action */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '8px',
        color: 'var(--primary)',
        fontSize: '0.9rem',
        fontWeight: '500'
      }}>
        Manage Pool <ArrowRightIcon />
      </div>
    </div>
  )
}

// Main Pools Page
function PoolsPage({ contracts, account }) {
  const [pools, setPools] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalTvl, setTotalTvl] = useState(0)

  useEffect(() => {
    loadPoolsData()
  }, [contracts, account])

  const loadPoolsData = async () => {
    setLoading(true)

    try {
      const poolsData = []

      // Check if we have contracts (provider available)
      const hasContracts = contracts.swap && contracts.swap3Pool

      if (hasContracts) {
        // 2Pool Data
        try {
          const swap2Pool = contracts.swap
          const [reserve0, reserve1] = await swap2Pool.getReserves()
          const r0 = ethers.formatUnits(reserve0, 6)
          const r1 = ethers.formatUnits(reserve1, 6)
          const tvl2Pool = parseFloat(r0) + parseFloat(r1)

          let userLp2Pool = '0'
          if (account) {
            try {
              const lpBal = await swap2Pool.balanceOf(account)
              userLp2Pool = ethers.formatUnits(lpBal, 18)
            } catch (e) {
              console.log('Could not get 2pool LP balance')
            }
          }

          // Calculate APR from LiquidityRewards if available
          let apr2Pool = 0
          if (contracts.liquidityRewards) {
            try {
              const poolInfo = await contracts.liquidityRewards.poolInfo(0)
              // APR calculation based on rewards - simplified
              // In production, you'd calculate based on reward rate and TVL
              apr2Pool = poolInfo.allocPoint > 0 ? 12.5 : 0 // Base APR estimate
            } catch (e) {
              console.log('Could not get 2pool APR')
            }
          }

          poolsData.push({
            id: '2pool',
            name: 'USDC-USDT Pool',
            tokens: ['tUSDC', 'tUSDT'],
            reserves: [r0, r1],
            tvl: tvl2Pool,
            apr: apr2Pool,
            userLpBalance: userLp2Pool,
            fee: 0.04
          })
        } catch (e) {
          console.error('Error loading 2pool:', e)
        }

        // 3Pool Data
        try {
          const swap3Pool = contracts.swap3Pool
          const [reserve0, reserve1, reserve2] = await swap3Pool.getReserves()
          const r0 = ethers.formatUnits(reserve0, 6)
          const r1 = ethers.formatUnits(reserve1, 6)
          const r2 = ethers.formatUnits(reserve2, 6)
          const tvl3Pool = parseFloat(r0) + parseFloat(r1) + parseFloat(r2)

          let userLp3Pool = '0'
          if (account) {
            try {
              const lpBal = await swap3Pool.balanceOf(account)
              userLp3Pool = ethers.formatUnits(lpBal, 18)
            } catch (e) {
              console.log('Could not get 3pool LP balance')
            }
          }

          // Calculate APR
          let apr3Pool = 0
          if (contracts.liquidityRewards) {
            try {
              const poolInfo = await contracts.liquidityRewards.poolInfo(1)
              apr3Pool = poolInfo.allocPoint > 0 ? 18.75 : 0 // Base APR estimate
            } catch (e) {
              console.log('Could not get 3pool APR')
            }
          }

          poolsData.push({
            id: '3pool',
            name: '3Pool (USDC-USDT-USDY)',
            tokens: ['tUSDC', 'tUSDT', 'tUSDY'],
            reserves: [r0, r1, r2],
            tvl: tvl3Pool,
            apr: apr3Pool,
            userLpBalance: userLp3Pool,
            fee: 0.04
          })
        } catch (e) {
          console.error('Error loading 3pool:', e)
        }
      } else {
        // No contracts - show empty pools with 0 values
        poolsData.push({
          id: '2pool',
          name: 'USDC-USDT Pool',
          tokens: ['tUSDC', 'tUSDT'],
          reserves: ['0', '0'],
          tvl: 0,
          apr: 0,
          userLpBalance: '0',
          fee: 0.04
        })
        poolsData.push({
          id: '3pool',
          name: '3Pool (USDC-USDT-USDY)',
          tokens: ['tUSDC', 'tUSDT', 'tUSDY'],
          reserves: ['0', '0', '0'],
          tvl: 0,
          apr: 0,
          userLpBalance: '0',
          fee: 0.04
        })
      }

      setPools(poolsData)
      setTotalTvl(poolsData.reduce((sum, p) => sum + p.tvl, 0))
    } catch (err) {
      console.error('Error loading pools data:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container">
      <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto', padding: '0 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Liquidity Pools
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
            Provide liquidity to earn trading fees and ASS rewards
          </p>
        </div>

        {/* Total Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Total TVL
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              ${totalTvl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Active Pools
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              {pools.length}
            </div>
          </div>
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Trading Fee
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              0.04%
            </div>
          </div>
        </div>

        {/* Pools List */}
        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px',
            color: 'var(--text-secondary)'
          }}>
            <span className="spinner" style={{ marginRight: '12px' }}></span>
            Loading pools...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {pools.map(pool => (
              <Link
                key={pool.id}
                to="/pool"
                style={{ textDecoration: 'none' }}
              >
                <PoolListCard pool={pool} />
              </Link>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'var(--background-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          lineHeight: '1.5'
        }}>
          <strong style={{ color: 'var(--text-primary)' }}>How it works:</strong>
          <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
            <li>Provide liquidity to earn 0.04% on every trade</li>
            <li>Earn additional ASS token rewards</li>
            <li>StableSwap algorithm ensures low slippage for stablecoin swaps</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default PoolsPage
