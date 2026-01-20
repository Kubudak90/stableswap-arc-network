import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'

function Swap3PoolPanel({ contracts, account }) {
  const [amountIn, setAmountIn] = useState('')
  const [amountOut, setAmountOut] = useState('')
  const [tokenIn, setTokenIn] = useState(0) // 0: tUSDC, 1: tUSDT, 2: tUSDY
  const [tokenOut, setTokenOut] = useState(1)
  const [slippage, setSlippage] = useState('0.5')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [balances, setBalances] = useState({ token0: '0', token1: '0', token2: '0' })
  const [reserves, setReserves] = useState({ reserve0: '0', reserve1: '0', reserve2: '0' })

  const tokenNames = ['tUSDC', 'tUSDT', 'tUSDY']
  const tokenContracts = [contracts.token0, contracts.token1, contracts.token2]

  // Load balances and reserves
  useEffect(() => {
    if (contracts.swap3Pool && account) {
      loadData()
    }
  }, [contracts, account])

  const loadData = async () => {
    try {
      // Load token balances
      const balance0 = await contracts.token0.balanceOf(account)
      const balance1 = await contracts.token1.balanceOf(account)
      const balance2 = await contracts.token2.balanceOf(account)
      
      setBalances({
        token0: ethers.formatUnits(balance0, 6),
        token1: ethers.formatUnits(balance1, 6),
        token2: ethers.formatUnits(balance2, 6)
      })

      // Load pool reserves
      const [reserve0, reserve1, reserve2] = await contracts.swap3Pool.getReserves()
      setReserves({
        reserve0: ethers.formatUnits(reserve0, 6),
        reserve1: ethers.formatUnits(reserve1, 6),
        reserve2: ethers.formatUnits(reserve2, 6)
      })
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleSwap = async () => {
    if (!amountIn || !contracts.swap3Pool || !account) {
      setError('Wallet bağlı değil veya miktar giriniz')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const amountInWei = ethers.parseUnits(amountIn, 6)
      
      // Approve token
      const tokenContract = tokenContracts[tokenIn]
      const swapAddress = await contracts.swap3Pool.getAddress()

      console.log("Approving token...")
      const approveTx = await tokenContract.approve(swapAddress, amountInWei)
      await approveTx.wait()
      console.log("Token approved")

      // Calculate minAmountOut with slippage
      const expectedOutWei = amountInWei * 9996n / 10000n // 0.04% fee
      const slippageBps = Math.round(parseFloat(slippage) * 100) // Convert percent to bps
      const minAmountOutWei = expectedOutWei - (expectedOutWei * BigInt(slippageBps) / 10000n)

      // Execute swap with minAmountOut
      const swapTx = await contracts.swap3Pool.swap(tokenIn, tokenOut, amountInWei, minAmountOutWei)
      await swapTx.wait()
      
      setSuccess(`✅ Başarılı! ${amountIn} ${tokenNames[tokenIn]} → ${amountOut} ${tokenNames[tokenOut]}`)
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
    
    const reserve0Num = parseFloat(reserves.reserve0)
    const reserve1Num = parseFloat(reserves.reserve1)
    const reserve2Num = parseFloat(reserves.reserve2)
    
    if (value && !isNaN(value) && contracts.swap3Pool && reserve0Num > 0 && reserve1Num > 0 && reserve2Num > 0) {
      try {
        // Stabilcoin için 1:1:1 oran + 0.04% fee (4 bps)
        const amountInWei = ethers.parseUnits(value, 6)
        
        // 1:1:1 oran, sadece fee çıkar: amountOut = amountIn * (10000 - 4) / 10000
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

  return (
    <div className="container">
      <div className="card">
        <h2 style={{ marginBottom: '30px', textAlign: 'center', color: '#333' }}>
          🔄 3'lü Pool Swap
        </h2>

        {!account && (
          <div className="error">
            ⚠️ Wallet bağlamanız gerekiyor! Sağ üstteki "Wallet Bağla" butonuna tıklayın.
          </div>
        )}

        {account && parseFloat(reserves.reserve0) === 0 && parseFloat(reserves.reserve1) === 0 && parseFloat(reserves.reserve2) === 0 && (
          <div className="error">
            ⚠️ Havuzda likidite yok! Önce Pool sekmesinden likidite ekleyin.
          </div>
        )}

        {/* Pool Info */}
        {account && parseFloat(reserves.reserve0) > 0 && parseFloat(reserves.reserve1) > 0 && parseFloat(reserves.reserve2) > 0 && (
          <div style={{ 
            background: '#f0f9ff', 
            padding: '15px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #0ea5e9'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#0369a1', marginBottom: '8px', fontWeight: 'bold' }}>
              📊 3Pool Bilgileri
            </div>
            <div style={{ fontSize: '0.85rem', color: '#0c4a6e' }}>
              <div>tUSDC Rezervi: <strong>{parseFloat(reserves.reserve0).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong></div>
              <div>tUSDT Rezervi: <strong>{parseFloat(reserves.reserve1).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong></div>
              <div>tUSDY Rezervi: <strong>{parseFloat(reserves.reserve2).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong></div>
              <div style={{ marginTop: '5px' }}>
                Oran: <strong>1:1:1 (Stabilcoin)</strong>
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
          <select
            value={tokenIn}
            onChange={(e) => {
              const newTokenIn = parseInt(e.target.value)
              setTokenIn(newTokenIn)
              if (tokenOut === newTokenIn) {
                setTokenOut((newTokenIn + 1) % 3)
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

        <div className="form-group">
          <label>Çıktı Token</label>
          <select
            value={tokenOut}
            onChange={(e) => {
              const newTokenOut = parseInt(e.target.value)
              setTokenOut(newTokenOut)
              if (tokenIn === newTokenOut) {
                setTokenIn((newTokenOut + 1) % 3)
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
          {loading ? 'İşlem Yapılıyor...' : `Swap Yap (${tokenNames[tokenIn]} → ${tokenNames[tokenOut]})`}
        </button>

        <div style={{ marginTop: '20px', fontSize: '0.9rem', color: '#666', textAlign: 'center' }}>
          <p>💡 3 token'lı stabilcoin havuzu - 1:1:1 oran ile düşük slippage!</p>
        </div>
      </div>
    </div>
  )
}

export default Swap3PoolPanel
