import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'

function SwapPanel({ contracts, account }) {
  const [amountIn, setAmountIn] = useState('')
  const [amountOut, setAmountOut] = useState('')
  const [zeroForOne, setZeroForOne] = useState(true)
  const [slippage, setSlippage] = useState('0.5')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [balances, setBalances] = useState({ token0: '0', token1: '0' })
  const [reserves, setReserves] = useState({ reserve0: '0', reserve1: '0' })

  const token0Symbol = 'tUSDC'
  const token1Symbol = 'tUSDT'

  // Load balances and reserves
  useEffect(() => {
    if (contracts.swap && account) {
      loadData()
    }
  }, [contracts, account])

  const loadData = async () => {
    try {
      // Load token balances
      const balance0 = await contracts.token0.balanceOf(account)
      const balance1 = await contracts.token1.balanceOf(account)
      
      setBalances({
        token0: ethers.formatUnits(balance0, 6), // USDC has 6 decimals
        token1: ethers.formatUnits(balance1, 6)
      })

      // Load pool reserves
      const [reserve0, reserve1] = await contracts.swap.getReserves()
      const reserve0Formatted = ethers.formatUnits(reserve0, 6)
      const reserve1Formatted = ethers.formatUnits(reserve1, 6)
      
      console.log('Raw reserves:', { reserve0: reserve0.toString(), reserve1: reserve1.toString() })
      console.log('Formatted reserves:', { reserve0: reserve0Formatted, reserve1: reserve1Formatted })
      
      setReserves({
        reserve0: reserve0Formatted,
        reserve1: reserve1Formatted
      })
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleSwap = async () => {
    if (!amountIn || !contracts.swap || !account) {
      setError('Wallet bağlı değil veya miktar giriniz')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const amountInWei = ethers.parseUnits(amountIn, 6)
      
      // Approve token (skip allowance check for now)
      const tokenContract = zeroForOne ? contracts.token0 : contracts.token1
      const swapAddress = "0xab9743e9715FFb5C5FC11Eb203937edA0C00c105" // StableSwap
      
      console.log("Approving token...")
      const approveTx = await tokenContract.approve(swapAddress, amountInWei)
      await approveTx.wait()
      console.log("Token approved")
      
      // Execute swap
      const swapTx = await contracts.swap.swap(zeroForOne, amountInWei)
      await swapTx.wait()
      
      setSuccess(`✅ Başarılı! ${amountIn} ${zeroForOne ? token0Symbol : token1Symbol} → ${amountOut} ${zeroForOne ? token1Symbol : token0Symbol}`)
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
    
    // Check if reserves are valid numbers
    const reserve0Num = parseFloat(reserves.reserve0)
    const reserve1Num = parseFloat(reserves.reserve1)
    
    if (value && !isNaN(value) && contracts.swap && reserve0Num > 0 && reserve1Num > 0) {
      try {
        // Stabilcoin için 1:1 oran + 0.04% fee (4 bps)
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

  const toggleDirection = () => {
    setZeroForOne(!zeroForOne)
    setAmountIn('')
    setAmountOut('')
  }

  return (
    <div className="container">
      <div className="card">
        <h2 style={{ marginBottom: '30px', textAlign: 'center', color: '#333' }}>
          Token Takası
        </h2>

        {!account && (
          <div className="error">
            ⚠️ Wallet bağlamanız gerekiyor! Sağ üstteki "Wallet Bağla" butonuna tıklayın.
          </div>
        )}

        {account && parseFloat(reserves.reserve0) === 0 && parseFloat(reserves.reserve1) === 0 && (
          <div className="error">
            ⚠️ Havuzda likidite yok! Önce Pool sekmesinden likidite ekleyin.
          </div>
        )}

        {/* Pool Info */}
        {account && parseFloat(reserves.reserve0) > 0 && parseFloat(reserves.reserve1) > 0 && (
          <div style={{ 
            background: '#f0f9ff', 
            padding: '15px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #0ea5e9'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#0369a1', marginBottom: '8px', fontWeight: 'bold' }}>
              📊 Pool Bilgileri
            </div>
            <div style={{ fontSize: '0.85rem', color: '#0c4a6e' }}>
              <div>tUSDC Rezervi: <strong>{parseFloat(reserves.reserve0).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong></div>
              <div>tUSDT Rezervi: <strong>{parseFloat(reserves.reserve1).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong></div>
              <div style={{ marginTop: '5px' }}>
                Oran: <strong>1:1 (Stabilcoin)</strong>
              </div>
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
          <div className="token-selector">
            <div className="token-info">
              <span>{zeroForOne ? token0Symbol : token1Symbol}</span>
              <span className="balance">Bakiye: {zeroForOne ? balances.token0 : balances.token1}</span>
            </div>
            <button 
              onClick={toggleDirection}
              style={{ 
                background: '#667eea', 
                color: 'white', 
                border: 'none', 
                padding: '8px 12px', 
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              ⇄
            </button>
            <div className="token-info">
              <span>{zeroForOne ? token1Symbol : token0Symbol}</span>
              <span className="balance">Bakiye: {zeroForOne ? balances.token1 : balances.token0}</span>
            </div>
          </div>
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
          disabled={loading || !amountIn || !amountOut}
        >
          {loading ? 'İşlem Yapılıyor...' : 'Swap Yap'}
        </button>

        <div style={{ marginTop: '20px', fontSize: '0.9rem', color: '#666', textAlign: 'center' }}>
          <p>💡 Bu bir demo uygulamadır. Gerçek işlemler için kontratlar deploy edilmelidir.</p>
        </div>
      </div>
    </div>
  )
}

export default SwapPanel
