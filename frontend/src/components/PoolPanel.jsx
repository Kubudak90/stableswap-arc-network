import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'

function PoolPanel({ contracts, account }) {
  const [activeTab, setActiveTab] = useState('add')
  const [amount0, setAmount0] = useState('')
  const [amount1, setAmount1] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [reserves, setReserves] = useState({ reserve0: '0', reserve1: '0' })

  // Load reserves
  useEffect(() => {
    if (contracts.swap && account) {
      loadReserves()
    }
  }, [contracts, account])

  const loadReserves = async () => {
    try {
      const [reserve0, reserve1] = await contracts.swap.getReserves()
      setReserves({
        reserve0: ethers.formatUnits(reserve0, 6),
        reserve1: ethers.formatUnits(reserve1, 6)
      })
    } catch (error) {
      console.error('Error loading reserves:', error)
    }
  }

  const handleAddLiquidity = async () => {
    if (!amount0 || !amount1 || !contracts.swap || !account) {
      setError('Wallet bağlı değil veya miktar giriniz')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const amount0Wei = ethers.parseUnits(amount0, 6)
      const amount1Wei = ethers.parseUnits(amount1, 6)
      
      // Approve tokens (skip allowance check for now)
      const swapAddress = "0xab9743e9715FFb5C5FC11Eb203937edA0C00c105" // StableSwap
      
      console.log("Approving tokens...")
      const approveTx0 = await contracts.token0.approve(swapAddress, amount0Wei)
      await approveTx0.wait()
      console.log("tUSDC approved")
      
      const approveTx1 = await contracts.token1.approve(swapAddress, amount1Wei)
      await approveTx1.wait()
      console.log("tUSDT approved")
      
      // Add liquidity
      const addTx = await contracts.swap.addLiquidity(amount0Wei, amount1Wei)
      await addTx.wait()
      
      setSuccess(`✅ Likidite eklendi! ${amount0} tUSDC + ${amount1} tUSDT`)
      setAmount0('')
      setAmount1('')
      
      // Reload reserves
      await loadReserves()
    } catch (err) {
      setError('Likidite ekleme başarısız: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h2 style={{ marginBottom: '30px', textAlign: 'center', color: '#333' }}>
          Likidite Havuzu
        </h2>

        {/* Pool Info */}
        <div className="pool-info">
          <div className="info-card">
            <h3>tUSDC Rezervi</h3>
            <div className="value">{parseFloat(reserves.reserve0).toFixed(2)}</div>
          </div>
          <div className="info-card">
            <h3>tUSDT Rezervi</h3>
            <div className="value">{parseFloat(reserves.reserve1).toFixed(2)}</div>
          </div>
          <div className="info-card">
            <h3>Ücret Oranı</h3>
            <div className="value">0.04%</div>
          </div>
          <div className="info-card">
            <h3>Swap Oranı</h3>
            <div className="value">1:1</div>
          </div>
        </div>

        {!account && (
          <div className="error">
            ⚠️ Wallet bağlamanız gerekiyor! Sağ üstteki "Wallet Bağla" butonuna tıklayın.
          </div>
        )}

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <div className="form-group">
          <label>tUSDC Miktarı</label>
          <input
            type="number"
            value={amount0}
            onChange={(e) => setAmount0(e.target.value)}
            placeholder="0.0"
            step="0.000001"
            disabled={!account}
          />
        </div>

        <div className="form-group">
          <label>tUSDT Miktarı</label>
          <input
            type="number"
            value={amount1}
            onChange={(e) => setAmount1(e.target.value)}
            placeholder="0.0"
            step="0.000001"
            disabled={!account}
          />
        </div>

        <button 
          className="btn" 
          onClick={handleAddLiquidity}
          disabled={loading || !amount0 || !amount1 || !account}
        >
          {loading ? 'İşlem Yapılıyor...' : 'Likidite Ekle'}
        </button>

        <div style={{ marginTop: '20px', fontSize: '0.9rem', color: '#666', textAlign: 'center' }}>
          <p>💡 Önce likidite ekleyin, sonra swap yapabilirsiniz!</p>
        </div>
      </div>
    </div>
  )
}

export default PoolPanel
