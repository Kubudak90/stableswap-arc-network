import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { SETTINGS, calculateMinOutput, getExplorerUrl } from '../config'

function UnifiedSwapPanel({ contracts, account, provider, signer }) {
  const [amountIn, setAmountIn] = useState('')
  const [amountOut, setAmountOut] = useState('')
  const [minAmountOut, setMinAmountOut] = useState('')
  const [tokenInIndex, setTokenInIndex] = useState(0) // 0: tUSDC, 1: tUSDT, 2: tUSDY
  const [tokenOutIndex, setTokenOutIndex] = useState(1)
  const [slippage, setSlippage] = useState(SETTINGS.defaultSlippage / 100) // Convert from bps to percent
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [txHash, setTxHash] = useState('')
  const [balances, setBalances] = useState({ token0: '0', token1: '0', token2: '0' })
  const [reserves2Pool, setReserves2Pool] = useState({ reserve0: '0', reserve1: '0' })
  const [reserves3Pool, setReserves3Pool] = useState({ reserve0: '0', reserve1: '0', reserve2: '0' })

  const tokenNames = ['tUSDC', 'tUSDT', 'tUSDY']
  const tokenContracts = [contracts.token0, contracts.token1, contracts.token2]

  // Router logic: determine which pool to use
  const getPoolType = () => {
    // If USDY is involved, use 3Pool
    if (tokenInIndex === 2 || tokenOutIndex === 2) {
      return '3Pool'
    }
    // Otherwise, use 2Pool for tUSDC <-> tUSDT
    return '2Pool'
  }

  const poolType = getPoolType()
  const use3Pool = poolType === '3Pool'

  // Load balances and reserves
  useEffect(() => {
    if ((contracts.swap || contracts.swap3Pool) && account) {
      loadData()
    }
  }, [contracts, account, tokenInIndex, tokenOutIndex])

  const loadData = async () => {
    try {
      // Load token balances
      if (contracts.token0 && contracts.token1 && contracts.token2) {
        const balance0 = await contracts.token0.balanceOf(account)
        const balance1 = await contracts.token1.balanceOf(account)
        const balance2 = await contracts.token2.balanceOf(account)
        
        setBalances({
          token0: ethers.formatUnits(balance0, 6),
          token1: ethers.formatUnits(balance1, 6),
          token2: ethers.formatUnits(balance2, 6)
        })
      }

      // Load 2Pool reserves (tUSDC <-> tUSDT)
      if (contracts.swap) {
        try {
          const [reserve0, reserve1] = await contracts.swap.getReserves()
          setReserves2Pool({
            reserve0: ethers.formatUnits(reserve0, 6),
            reserve1: ethers.formatUnits(reserve1, 6)
          })
        } catch (err) {
          console.error('Error loading 2Pool reserves:', err)
        }
      }

      // Load 3Pool reserves
      if (contracts.swap3Pool) {
        try {
          const [reserve0, reserve1, reserve2] = await contracts.swap3Pool.getReserves()
          setReserves3Pool({
            reserve0: ethers.formatUnits(reserve0, 6),
            reserve1: ethers.formatUnits(reserve1, 6),
            reserve2: ethers.formatUnits(reserve2, 6)
          })
        } catch (err) {
          console.error('Error loading 3Pool reserves:', err)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleSwap = async () => {
    if (!amountIn || !account) {
      setError('Wallet bağlı değil veya miktar giriniz')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const amountInWei = ethers.parseUnits(amountIn, 6)
      
      // Recalculate pool type inside function to ensure it's current
      const currentPoolType = getPoolType()
      const use3PoolCurrent = currentPoolType === '3Pool'
      
      console.log("Swap info:", {
        tokenInIndex,
        tokenOutIndex,
        poolType: currentPoolType,
        use3Pool: use3PoolCurrent
      })
      
      // Get correct swap contract addresses dynamically
      let swapAddress
      let swapContract
      
      if (use3PoolCurrent) {
        // 3Pool: Use new fee-aware contract
        if (!contracts.swap3Pool) {
          throw new Error('3Pool kontratı bulunamadı')
        }
        swapAddress = await contracts.swap3Pool.getAddress()
        swapContract = contracts.swap3Pool
      } else {
        // 2Pool: Use new fee-aware contract
        if (!contracts.swap) {
          throw new Error('2Pool kontratı bulunamadı')
        }
        swapAddress = await contracts.swap.getAddress()
        swapContract = contracts.swap
      }
      
      console.log("Using swap contract:", swapAddress, "Pool type:", currentPoolType)
      
      // Check reserves before swap
      if (!use3PoolCurrent && contracts.swap) {
        try {
          const [reserve0, reserve1] = await contracts.swap.getReserves()
          console.log("📊 Current reserves:", {
            reserve0: ethers.formatUnits(reserve0, 6),
            reserve1: ethers.formatUnits(reserve1, 6)
          })
          
          // Check if output is possible
          const zeroForOne = tokenInIndex === 0 && tokenOutIndex === 1
          const requiredReserve = zeroForOne ? reserve1 : reserve0
          const amountOutWei = amountInWei * 9996n / 10000n // 0.04% fee
          
          console.log("💧 Required reserve for output:", ethers.formatUnits(requiredReserve, 6))
          console.log("💧 Expected output amount:", ethers.formatUnits(amountOutWei, 6))
          
          if (requiredReserve < amountOutWei) {
            throw new Error(`Yetersiz likidite! Gereken: ${ethers.formatUnits(amountOutWei, 6)}, Mevcut: ${ethers.formatUnits(requiredReserve, 6)}`)
          }
        } catch (err) {
          console.warn("Reserve check error (continuing):", err)
        }
      }
      
      // Approve token
      const tokenContract = tokenContracts[tokenInIndex]
      if (!tokenContract) {
        throw new Error('Token kontratı bulunamadı')
      }
      
      // Check current allowance
      const currentAllowance = await tokenContract.allowance(account, swapAddress)
      console.log("🔍 Current allowance:", ethers.formatUnits(currentAllowance, 6))
      
      if (currentAllowance < amountInWei) {
        console.log("🔐 Approving token to:", swapAddress)
        const approveTx = await tokenContract.approve(swapAddress, amountInWei)
        await approveTx.wait()
        console.log("✅ Token approved")
      } else {
        console.log("✅ Token already approved")
      }
      
      // Execute swap
      let swapTx
      if (use3PoolCurrent) {
        // 3Pool: swap(uint8 tokenIn, uint8 tokenOut, uint256 amountIn)
        console.log("Calling 3Pool swap:", tokenInIndex, tokenOutIndex, amountInWei.toString())
        swapTx = await swapContract.swap(tokenInIndex, tokenOutIndex, amountInWei)
      } else {
        // 2Pool: swap(bool zeroForOne, uint256 amountIn)
        // zeroForOne = true means token0 -> token1 (tUSDC -> tUSDT)
        // zeroForOne = false means token1 -> token0 (tUSDT -> tUSDC)
        const zeroForOne = tokenInIndex === 0 && tokenOutIndex === 1
        console.log("🔄 Calling 2Pool swap:", {
          zeroForOne,
          amountIn: amountInWei.toString(),
          amountInFormatted: ethers.formatUnits(amountInWei, 6),
          tokenIn: tokenNames[tokenInIndex],
          tokenOut: tokenNames[tokenOutIndex]
        })
        swapTx = await swapContract.swap(zeroForOne, amountInWei)
      }
      
      console.log("⏳ Waiting for swap transaction...")
      const receipt = await swapTx.wait()
      console.log("✅ Swap transaction confirmed")

      setTxHash(receipt.hash)
      setSuccess(`✅ Başarılı! ${amountIn} ${tokenNames[tokenInIndex]} → ${amountOut} ${tokenNames[tokenOutIndex]}`)
      setAmountIn('')
      setAmountOut('')
      setMinAmountOut('')

      // Reload data
      await loadData()
    } catch (err) {
      console.error('Swap error:', err)
      // Better error messages
      let errorMsg = 'Swap işlemi başarısız: '
      if (err.message.includes('user rejected')) {
        errorMsg += 'İşlem iptal edildi'
      } else if (err.message.includes('insufficient')) {
        errorMsg += 'Yetersiz bakiye veya likidite'
      } else if (err.message.includes('slippage')) {
        errorMsg += 'Slippage toleransı aşıldı, toleransı artırın'
      } else {
        errorMsg += err.message
      }
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleAmountInChange = async (value) => {
    setAmountIn(value)

    if (value && !isNaN(value) && parseFloat(value) > 0) {
      try {
        const amountInWei = ethers.parseUnits(value, 6)

        // 1:1 oran, sadece fee çıkar: amountOut = amountIn * (10000 - 4) / 10000
        const amountOutWei = amountInWei * 9996n / 10000n
        const amountOutFormatted = ethers.formatUnits(amountOutWei, 6)
        setAmountOut(amountOutFormatted)

        // Calculate minimum output based on slippage tolerance
        const slippageBps = Math.round(parseFloat(slippage) * 100) // Convert percent to bps
        const minOutWei = calculateMinOutput(amountOutWei, slippageBps)
        setMinAmountOut(ethers.formatUnits(minOutWei, 6))
      } catch (error) {
        console.error('Price calculation error:', error)
        setAmountOut('')
        setMinAmountOut('')
      }
    } else {
      setAmountOut('')
      setMinAmountOut('')
    }
  }

  // Update min amount when slippage changes
  useEffect(() => {
    if (amountOut && parseFloat(amountOut) > 0) {
      try {
        const amountOutWei = ethers.parseUnits(amountOut, 6)
        const slippageBps = Math.round(parseFloat(slippage) * 100)
        const minOutWei = calculateMinOutput(amountOutWei, slippageBps)
        setMinAmountOut(ethers.formatUnits(minOutWei, 6))
      } catch (err) {
        console.error('Min amount calculation error:', err)
      }
    }
  }, [slippage, amountOut])

  // Check if pool has liquidity
  const hasLiquidity = () => {
    if (use3Pool) {
      const r0 = parseFloat(reserves3Pool.reserve0)
      const r1 = parseFloat(reserves3Pool.reserve1)
      const r2 = parseFloat(reserves3Pool.reserve2)
      return r0 > 0 && r1 > 0 && r2 > 0
    } else {
      const r0 = parseFloat(reserves2Pool.reserve0)
      const r1 = parseFloat(reserves2Pool.reserve1)
      return r0 > 0 && r1 > 0
    }
  }

  // Get current reserves for display
  const getCurrentReserves = () => {
    if (use3Pool) {
      return reserves3Pool
    } else {
      return reserves2Pool
    }
  }

  const currentReserves = getCurrentReserves()

  return (
    <div className="container">
      <div className="card">
        <h2 style={{ 
          marginBottom: '32px', 
          textAlign: 'center', 
          color: '#1e293b',
          fontSize: '1.75rem',
          fontWeight: '700',
          letterSpacing: '-0.5px'
        }}>
          🔄 Token Takası
        </h2>

        {!account && (
          <div className="error">
            ⚠️ Wallet bağlamanız gerekiyor! Sağ üstteki "Wallet Bağla" butonuna tıklayın.
          </div>
        )}

        {account && !hasLiquidity() && (
          <div className="error">
            ⚠️ Havuzda likidite yok! Önce Pool sekmesinden likidite ekleyin.
          </div>
        )}

        {/* Pool Info */}
        {account && hasLiquidity() && (
          <div className="pool-info-card">
            <div style={{ fontSize: '0.95rem', color: '#1e40af', marginBottom: '12px', fontWeight: '700' }}>
              📊 Pool Bilgileri ({use3Pool ? '3Pool' : '2Pool'})
            </div>
            <div style={{ fontSize: '0.9rem', color: '#1e3a8a', lineHeight: '1.8' }}>
              {use3Pool ? (
                <>
                  <div>tUSDC Rezervi: <strong style={{ color: '#6366f1' }}>{parseFloat(currentReserves.reserve0).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong></div>
                  <div>tUSDT Rezervi: <strong style={{ color: '#6366f1' }}>{parseFloat(currentReserves.reserve1).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong></div>
                  <div>tUSDY Rezervi: <strong style={{ color: '#6366f1' }}>{parseFloat(currentReserves.reserve2).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong></div>
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #93c5fd' }}>
                    Oran: <strong>1:1:1 (Stabilcoin)</strong>
                  </div>
                </>
              ) : (
                <>
                  <div>tUSDC Rezervi: <strong style={{ color: '#6366f1' }}>{parseFloat(currentReserves.reserve0).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong></div>
                  <div>tUSDT Rezervi: <strong style={{ color: '#6366f1' }}>{parseFloat(currentReserves.reserve1).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong></div>
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #93c5fd' }}>
                    Oran: <strong>1:1 (Stabilcoin)</strong>
                  </div>
                </>
              )}
              <div style={{ marginTop: '6px', fontSize: '0.8rem', opacity: 0.85 }}>
                Ücret: 0.04% (4 bps)
              </div>
            </div>
          </div>
        )}

        {error && <div className="error">{error}</div>}
        {success && (
          <div className="success">
            {success}
            {txHash && (
              <div style={{ marginTop: '8px', fontSize: '0.85rem' }}>
                <a
                  href={getExplorerUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#059669', textDecoration: 'underline' }}
                >
                  İşlemi görüntüle ↗
                </a>
              </div>
            )}
          </div>
        )}

        <div className="form-group">
          <label>Girdi Token</label>
          <select
            value={tokenInIndex}
            onChange={(e) => {
              const newTokenIn = parseInt(e.target.value)
              setTokenInIndex(newTokenIn)
              if (tokenOutIndex === newTokenIn) {
                setTokenOutIndex((newTokenIn + 1) % 3)
              }
              setAmountIn('')
              setAmountOut('')
            }}
          >
            <option value={0}>tUSDC - Bakiye: {balances.token0}</option>
            <option value={1}>tUSDT - Bakiye: {balances.token1}</option>
            <option value={2}>tUSDY - Bakiye: {balances.token2}</option>
          </select>
        </div>

        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <button
            onClick={() => {
              const temp = tokenInIndex
              setTokenInIndex(tokenOutIndex)
              setTokenOutIndex(temp)
              setAmountIn('')
              setAmountOut('')
            }}
            className="swap-arrow-btn"
          >
            ⇄ Değiştir
          </button>
        </div>

        <div className="form-group">
          <label>Çıktı Token</label>
          <select
            value={tokenOutIndex}
            onChange={(e) => {
              const newTokenOut = parseInt(e.target.value)
              setTokenOutIndex(newTokenOut)
              if (tokenInIndex === newTokenOut) {
                setTokenInIndex((newTokenOut + 1) % 3)
              }
              setAmountIn('')
              setAmountOut('')
            }}
          >
            <option value={0}>tUSDC - Bakiye: {balances.token0}</option>
            <option value={1}>tUSDT - Bakiye: {balances.token1}</option>
            <option value={2}>tUSDY - Bakiye: {balances.token2}</option>
          </select>
        </div>

        {/* Router indicator */}
        <div className="router-indicator">
          🎯 <strong>{tokenNames[tokenInIndex]}</strong> → <strong>{tokenNames[tokenOutIndex]}</strong> swap için <strong>{poolType}</strong> kullanılıyor
        </div>

        <div className="form-group">
          <label>Miktar</label>
          <input
            type="number"
            value={amountIn}
            onChange={(e) => handleAmountInChange(e.target.value)}
            placeholder="0.0"
            step="0.000001"
          />
        </div>

        <div className="form-group">
          <label>Çıktı Miktarı (Tahmini)</label>
          <input
            type="number"
            value={amountOut}
            readOnly
            placeholder="0.0"
            style={{ background: '#f9fafb', fontWeight: '600', color: '#64748b' }}
          />
        </div>

        <div className="form-group">
          <label>Slippage Tolerance (%)</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            {[0.1, 0.5, 1.0].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setSlippage(val.toString())}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: parseFloat(slippage) === val ? '2px solid #6366f1' : '1px solid #e2e8f0',
                  background: parseFloat(slippage) === val ? '#eef2ff' : '#fff',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: parseFloat(slippage) === val ? '600' : '400'
                }}
              >
                {val}%
              </button>
            ))}
          </div>
          <input
            type="number"
            value={slippage}
            onChange={(e) => {
              const val = parseFloat(e.target.value)
              if (val >= 0 && val <= SETTINGS.maxSlippage / 100) {
                setSlippage(e.target.value)
              }
            }}
            placeholder="0.5"
            step="0.1"
            min="0.1"
            max={SETTINGS.maxSlippage / 100}
          />
          {parseFloat(slippage) > 5 && (
            <div style={{ color: '#f59e0b', fontSize: '0.8rem', marginTop: '4px' }}>
              ⚠️ Yüksek slippage! Beklenenden farklı fiyatla işlem gerçekleşebilir.
            </div>
          )}
        </div>

        {minAmountOut && parseFloat(minAmountOut) > 0 && (
          <div style={{
            padding: '12px',
            background: '#f0fdf4',
            borderRadius: '8px',
            border: '1px solid #bbf7d0',
            marginBottom: '16px',
            fontSize: '0.9rem'
          }}>
            <div style={{ color: '#166534', fontWeight: '500' }}>
              Minimum Alınacak: {parseFloat(minAmountOut).toFixed(6)} {tokenNames[tokenOutIndex]}
            </div>
            <div style={{ color: '#15803d', fontSize: '0.8rem', marginTop: '4px' }}>
              Slippage dahil ({slippage}%)
            </div>
          </div>
        )}

        <button 
          className="btn" 
          onClick={handleSwap}
          disabled={loading || !amountIn || !amountOut || !hasLiquidity()}
        >
          {loading ? 'İşlem Yapılıyor...' : `Swap Yap (${tokenNames[tokenInIndex]} → ${tokenNames[tokenOutIndex]})`}
        </button>

        <div style={{ 
          marginTop: '24px', 
          fontSize: '0.9rem', 
          color: '#64748b', 
          textAlign: 'center',
          padding: '16px',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <p style={{ margin: 0, fontWeight: '500' }}>💡 Token seçimine göre otomatik olarak en uygun pool seçilir!</p>
        </div>
      </div>
    </div>
  )
}

export default UnifiedSwapPanel
