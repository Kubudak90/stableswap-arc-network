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
      setReserves({
        reserve0: ethers.formatUnits(reserve0, 6),
        reserve1: ethers.formatUnits(reserve1, 6)
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
      
      // Approve token if needed
      const tokenContract = zeroForOne ? contracts.token0 : contracts.token1
      const swapAddress = "0x665A82180fa7a58e2efeF5270cC2c2974087A030"
      const allowance = await tokenContract.allowance(account, swapAddress)
      
      if (allowance < amountInWei) {
        const approveTx = await tokenContract.approve(swapAddress, amountInWei)
        await approveTx.wait()
      }
      
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
    
    if (value && !isNaN(value) && contracts.swap && reserves.reserve0 > 0 && reserves.reserve1 > 0) {
      try {
        // Calculate expected output using Uniswap V2 formula
        const amountInWei = ethers.parseUnits(value, 6)
        const reserveIn = zeroForOne ? ethers.parseUnits(reserves.reserve0, 6) : ethers.parseUnits(reserves.reserve1, 6)
        const reserveOut = zeroForOne ? ethers.parseUnits(reserves.reserve1, 6) : ethers.parseUnits(reserves.reserve0, 6)
        
        // Apply 0.3% fee (997/1000)
        const amountInWithFee = amountInWei * 997n / 1000n
        const numerator = amountInWithFee * reserveOut
        const denominator = reserveIn * 1000n + amountInWithFee
        const amountOutWei = numerator / denominator
        
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

        {account && reserves.reserve0 === '0' && reserves.reserve1 === '0' && (
          <div className="error">
            ⚠️ Havuzda likidite yok! Önce Pool sekmesinden likidite ekleyin.
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
