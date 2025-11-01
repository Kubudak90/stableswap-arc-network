import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'

function UnifiedSwapPanel({ contracts, account }) {
  const [amountIn, setAmountIn] = useState('')
  const [amountOut, setAmountOut] = useState('')
  const [tokenInIndex, setTokenInIndex] = useState(0) // 0: tUSDC, 1: tUSDT, 2: tUSDY
  const [tokenOutIndex, setTokenOutIndex] = useState(1)
  const [slippage, setSlippage] = useState('0.5')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
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
      const swapAddress = use3Pool 
        ? "0x34a0d6A10f26A31Ca2f7F71d4eA4B76F1Cbc2806" // StableSwap3Pool (new)
        : "0xC8B54F9085FCA8F45cc461002A8bd381D1240a47" // StableSwap (new)
      
      // Approve token
      const tokenContract = tokenContracts[tokenInIndex]
      console.log("Approving token...")
      const approveTx = await tokenContract.approve(swapAddress, amountInWei)
      await approveTx.wait()
      console.log("Token approved")
      
      // Execute swap
      let swapTx
      if (use3Pool) {
        swapTx = await contracts.swap3Pool.swap(tokenInIndex, tokenOutIndex, amountInWei)
      } else {
        // For 2Pool: token0 (tUSDC) = index 0, token1 (tUSDT) = index 1
        const zeroForOne = tokenInIndex === 0 && tokenOutIndex === 1
        swapTx = await contracts.swap.swap(zeroForOne, amountInWei)
      }
      
      await swapTx.wait()
      
      setSuccess(`✅ Başarılı! ${amountIn} ${tokenNames[tokenInIndex]} → ${amountOut} ${tokenNames[tokenOutIndex]}`)
      setAmountIn('')
      setAmountOut('')
      
      // Reload data
      await loadData()
    } catch (err) {
      setError('Swap işlemi başarısız: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAmountInChange = async (value) => {
    setAmountIn(value)
    
    if (value && !isNaN(value)) {
      try {
        const amountInWei = ethers.parseUnits(value, 6)
        
        // 1:1 oran, sadece fee çıkar: amountOut = amountIn * (10000 - 4) / 10000
        const amountOutWei = amountInWei * 9996n / 10000n
        const amountOutFormatted = ethers.formatUnits(amountOutWei, 6)
        setAmountOut(amountOutFormatted)
      } catch (error) {
        console.error('Price calculation error:', error)
        setAmountOut('')
      }
    } else {
      setAmountOut('')
    }
  }

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
        <h2 style={{ marginBottom: '30px', textAlign: 'center', color: '#333' }}>
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
          <div style={{ 
            background: '#f0f9ff', 
            padding: '15px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #0ea5e9'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#0369a1', marginBottom: '8px', fontWeight: 'bold' }}>
              📊 Pool Bilgileri ({use3Pool ? '3Pool' : '2Pool'})
            </div>
            <div style={{ fontSize: '0.85rem', color: '#0c4a6e' }}>
              {use3Pool ? (
                <>
                  <div>tUSDC Rezervi: <strong>{parseFloat(currentReserves.reserve0).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong></div>
                  <div>tUSDT Rezervi: <strong>{parseFloat(currentReserves.reserve1).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong></div>
                  <div>tUSDY Rezervi: <strong>{parseFloat(currentReserves.reserve2).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong></div>
                  <div style={{ marginTop: '5px' }}>
                    Oran: <strong>1:1:1 (Stabilcoin)</strong>
                  </div>
                </>
              ) : (
                <>
                  <div>tUSDC Rezervi: <strong>{parseFloat(currentReserves.reserve0).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong></div>
                  <div>tUSDT Rezervi: <strong>{parseFloat(currentReserves.reserve1).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong></div>
                  <div style={{ marginTop: '5px' }}>
                    Oran: <strong>1:1 (Stabilcoin)</strong>
                  </div>
                </>
              )}
              <div style={{ marginTop: '3px', fontSize: '0.75rem', opacity: 0.8 }}>
                Ücret: 0.04% (4 bps)
              </div>
            </div>
          </div>
        )}

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

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
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
          >
            <option value={0}>tUSDC - Bakiye: {balances.token0}</option>
            <option value={1}>tUSDT - Bakiye: {balances.token1}</option>
            <option value={2}>tUSDY - Bakiye: {balances.token2}</option>
          </select>
        </div>

        <div style={{ textAlign: 'center', margin: '15px 0' }}>
          <button
            onClick={() => {
              const temp = tokenInIndex
              setTokenInIndex(tokenOutIndex)
              setTokenOutIndex(temp)
              setAmountIn('')
              setAmountOut('')
            }}
            style={{
              background: '#667eea',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}
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
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
          >
            <option value={0}>tUSDC - Bakiye: {balances.token0}</option>
            <option value={1}>tUSDT - Bakiye: {balances.token1}</option>
            <option value={2}>tUSDY - Bakiye: {balances.token2}</option>
          </select>
        </div>

        {/* Router indicator */}
        <div style={{
          background: '#e0f2fe',
          padding: '10px',
          borderRadius: '6px',
          marginBottom: '15px',
          fontSize: '0.85rem',
          color: '#0369a1',
          textAlign: 'center'
        }}>
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
            style={{ background: '#f8f9fa' }}
          />
        </div>

        <div className="form-group">
          <label>Slippage Tolerance (%)</label>
          <input
            type="number"
            value={slippage}
            onChange={(e) => setSlippage(e.target.value)}
            placeholder="0.5"
            step="0.1"
            min="0.1"
            max="50"
          />
        </div>

        <button 
          className="btn" 
          onClick={handleSwap}
          disabled={loading || !amountIn || !amountOut || !hasLiquidity()}
        >
          {loading ? 'İşlem Yapılıyor...' : `Swap Yap (${tokenNames[tokenInIndex]} → ${tokenNames[tokenOutIndex]})`}
        </button>

        <div style={{ marginTop: '20px', fontSize: '0.9rem', color: '#666', textAlign: 'center' }}>
          <p>💡 Token seçimine göre otomatik olarak en uygun pool seçilir!</p>
        </div>
      </div>
    </div>
  )
}

export default UnifiedSwapPanel
