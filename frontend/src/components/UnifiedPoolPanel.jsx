import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'

function UnifiedPoolPanel({ contracts, account }) {
  const [poolType, setPoolType] = useState('2pool') // '2pool' or '3pool'
  const [activeTab, setActiveTab] = useState('add') // 'add' or 'remove'
  
  // 2Pool state
  const [amount0, setAmount0] = useState('')
  const [amount1, setAmount1] = useState('')
  
  // 3Pool state
  const [amount0_3, setAmount0_3] = useState('')
  const [amount1_3, setAmount1_3] = useState('')
  const [amount2_3, setAmount2_3] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [reserves2Pool, setReserves2Pool] = useState({ reserve0: '0', reserve1: '0' })
  const [reserves3Pool, setReserves3Pool] = useState({ reserve0: '0', reserve1: '0', reserve2: '0' })

  // Load reserves
  useEffect(() => {
    if (account) {
      loadReserves()
    }
  }, [contracts, account, poolType])

  const loadReserves = async () => {
    try {
      if (contracts.swap) {
        const [reserve0, reserve1] = await contracts.swap.getReserves()
        setReserves2Pool({
          reserve0: ethers.formatUnits(reserve0, 6),
          reserve1: ethers.formatUnits(reserve1, 6)
        })
      }
      
      if (contracts.swap3Pool) {
        const [reserve0, reserve1, reserve2] = await contracts.swap3Pool.getReserves()
        setReserves3Pool({
          reserve0: ethers.formatUnits(reserve0, 6),
          reserve1: ethers.formatUnits(reserve1, 6),
          reserve2: ethers.formatUnits(reserve2, 6)
        })
      }
    } catch (error) {
      console.error('Error loading reserves:', error)
    }
  }

  const handleAddLiquidity = async () => {
    if (poolType === '2pool') {
      if (!amount0 || !amount1 || !contracts.swap || !account) {
        setError('Wallet bağlı değil veya miktar giriniz')
        return
      }

      setLoading(true)
      setError('')
      
      try {
        const amount0Wei = ethers.parseUnits(amount0, 6)
        const amount1Wei = ethers.parseUnits(amount1, 6)
        
        const swapAddress = "0xC8B54F9085FCA8F45cc461002A8bd381D1240a47" // StableSwap (new)
        
        console.log("Approving tokens...")
        const approveTx0 = await contracts.token0.approve(swapAddress, amount0Wei)
        await approveTx0.wait()
        
        const approveTx1 = await contracts.token1.approve(swapAddress, amount1Wei)
        await approveTx1.wait()
        console.log("Tokens approved")
        
        // Add liquidity
        const addLiquidityTx = await contracts.swap.addLiquidity(amount0Wei, amount1Wei)
        await addLiquidityTx.wait()
        
        setSuccess(`✅ Likidite eklendi! ${amount0} tUSDC + ${amount1} tUSDT`)
        setAmount0('')
        setAmount1('')
        
        await loadReserves()
      } catch (err) {
        setError('Likidite ekleme başarısız: ' + err.message)
      } finally {
        setLoading(false)
      }
    } else {
      // 3Pool
      if (!amount0_3 || !amount1_3 || !amount2_3 || !contracts.swap3Pool || !account) {
        setError('Tüm miktarları giriniz')
        return
      }

      setLoading(true)
      setError('')
      
      try {
        const amount0Wei = ethers.parseUnits(amount0_3, 6)
        const amount1Wei = ethers.parseUnits(amount1_3, 6)
        const amount2Wei = ethers.parseUnits(amount2_3, 6)
        
        const swapAddress = "0x34a0d6A10f26A31Ca2f7F71d4eA4B76F1Cbc2806" // StableSwap3Pool (new)
        
        console.log("Approving tokens...")
        const approveTx0 = await contracts.token0.approve(swapAddress, amount0Wei)
        await approveTx0.wait()
        
        const approveTx1 = await contracts.token1.approve(swapAddress, amount1Wei)
        await approveTx1.wait()
        
        const approveTx2 = await contracts.token2.approve(swapAddress, amount2Wei)
        await approveTx2.wait()
        console.log("Tokens approved")
        
        // Add liquidity
        const addLiquidityTx = await contracts.swap3Pool.addLiquidity(amount0Wei, amount1Wei, amount2Wei)
        await addLiquidityTx.wait()
        
        setSuccess(`✅ Likidite eklendi! ${amount0_3} tUSDC + ${amount1_3} tUSDT + ${amount2_3} tUSDY`)
        setAmount0_3('')
        setAmount1_3('')
        setAmount2_3('')
        
        await loadReserves()
      } catch (err) {
        setError('Likidite ekleme başarısız: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
  }

  const currentReserves = poolType === '2pool' ? reserves2Pool : reserves3Pool

  return (
    <div className="container">
      <div className="card">
        <h2 style={{ marginBottom: '30px', textAlign: 'center', color: '#333' }}>
          💧 Likidite Havuzu Yönetimi
        </h2>

        {!account && (
          <div className="error">
            ⚠️ Wallet bağlamanız gerekiyor! Sağ üstteki "Wallet Bağla" butonuna tıklayın.
          </div>
        )}

        {/* Pool Type Selection */}
        <div style={{ marginBottom: '30px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
            Havuz Seçin:
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                setPoolType('2pool')
                setAmount0('')
                setAmount1('')
                setAmount0_3('')
                setAmount1_3('')
                setAmount2_3('')
              }}
              style={{
                flex: 1,
                padding: '15px',
                borderRadius: '8px',
                border: poolType === '2pool' ? '2px solid #667eea' : '2px solid #ddd',
                background: poolType === '2pool' ? '#f0f4ff' : '#fff',
                cursor: 'pointer',
                fontWeight: poolType === '2pool' ? 'bold' : 'normal'
              }}
            >
              2-Token Pool
              <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '5px' }}>
                tUSDC / tUSDT
              </div>
            </button>
            <button
              onClick={() => {
                setPoolType('3pool')
                setAmount0('')
                setAmount1('')
                setAmount0_3('')
                setAmount1_3('')
                setAmount2_3('')
              }}
              style={{
                flex: 1,
                padding: '15px',
                borderRadius: '8px',
                border: poolType === '3pool' ? '2px solid #667eea' : '2px solid #ddd',
                background: poolType === '3pool' ? '#f0f4ff' : '#fff',
                cursor: 'pointer',
                fontWeight: poolType === '3pool' ? 'bold' : 'normal'
              }}
            >
              3-Token Pool
              <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '5px' }}>
                tUSDC / tUSDT / tUSDY
              </div>
            </button>
          </div>
        </div>

        {/* Pool Info */}
        {account && (
          <div style={{ 
            background: '#f0f9ff', 
            padding: '15px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #0ea5e9'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#0369a1', marginBottom: '8px', fontWeight: 'bold' }}>
              📊 {poolType === '2pool' ? '2Pool' : '3Pool'} Bilgileri
            </div>
            <div style={{ fontSize: '0.85rem', color: '#0c4a6e' }}>
              {poolType === '2pool' ? (
                <>
                  <div>tUSDC Rezervi: <strong>{parseFloat(currentReserves.reserve0).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong></div>
                  <div>tUSDT Rezervi: <strong>{parseFloat(currentReserves.reserve1).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong></div>
                  <div style={{ marginTop: '5px' }}>
                    Oran: <strong>1:1 (Stabilcoin)</strong>
                  </div>
                </>
              ) : (
                <>
                  <div>tUSDC Rezervi: <strong>{parseFloat(currentReserves.reserve0).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong></div>
                  <div>tUSDT Rezervi: <strong>{parseFloat(currentReserves.reserve1).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong></div>
                  <div>tUSDY Rezervi: <strong>{parseFloat(currentReserves.reserve2).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong></div>
                  <div style={{ marginTop: '5px' }}>
                    Oran: <strong>1:1:1 (Stabilcoin)</strong>
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

        {/* Tab Selection */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setActiveTab('add')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: activeTab === 'add' ? '2px solid #667eea' : '1px solid #ddd',
              background: activeTab === 'add' ? '#667eea' : '#fff',
              color: activeTab === 'add' ? '#fff' : '#333',
              cursor: 'pointer',
              fontWeight: activeTab === 'add' ? 'bold' : 'normal'
            }}
          >
            ➕ Likidite Ekle
          </button>
          <button
            onClick={() => setActiveTab('remove')}
            disabled={true}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              background: '#f5f5f5',
              color: '#999',
              cursor: 'not-allowed',
              opacity: 0.5
            }}
          >
            ➖ Likidite Çıkar (Yakında)
          </button>
        </div>

        {/* Add Liquidity Form */}
        {activeTab === 'add' && (
          <>
            {poolType === '2pool' ? (
              <>
                <div className="form-group">
                  <label>tUSDC Miktarı</label>
                  <input
                    type="number"
                    value={amount0}
                    onChange={(e) => setAmount0(e.target.value)}
                    placeholder="0.0"
                    step="0.000001"
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
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label>tUSDC Miktarı</label>
                  <input
                    type="number"
                    value={amount0_3}
                    onChange={(e) => setAmount0_3(e.target.value)}
                    placeholder="0.0"
                    step="0.000001"
                  />
                </div>

                <div className="form-group">
                  <label>tUSDT Miktarı</label>
                  <input
                    type="number"
                    value={amount1_3}
                    onChange={(e) => setAmount1_3(e.target.value)}
                    placeholder="0.0"
                    step="0.000001"
                  />
                </div>

                <div className="form-group">
                  <label>tUSDY Miktarı</label>
                  <input
                    type="number"
                    value={amount2_3}
                    onChange={(e) => setAmount2_3(e.target.value)}
                    placeholder="0.0"
                    step="0.000001"
                  />
                </div>
              </>
            )}

            <button 
              className="btn" 
              onClick={handleAddLiquidity}
              disabled={loading || (poolType === '2pool' ? (!amount0 || !amount1) : (!amount0_3 || !amount1_3 || !amount2_3))}
            >
              {loading ? 'İşlem Yapılıyor...' : 'Likidite Ekle'}
            </button>
          </>
        )}

        {activeTab === 'remove' && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            <p>Likidite çıkarma özelliği yakında eklenecek.</p>
          </div>
        )}

        <div style={{ marginTop: '20px', fontSize: '0.9rem', color: '#666', textAlign: 'center' }}>
          <p>💡 Likidite sağlayarak ücret geliri kazanabilirsiniz!</p>
        </div>
      </div>
    </div>
  )
}

export default UnifiedPoolPanel
