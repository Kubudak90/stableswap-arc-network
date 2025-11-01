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
  
  // Remove liquidity amounts (2Pool)
  const [removeAmount0_2, setRemoveAmount0_2] = useState('')
  const [removeAmount1_2, setRemoveAmount1_2] = useState('')
  
  // Remove liquidity amounts (3Pool)
  const [removeAmount0, setRemoveAmount0] = useState('')
  const [removeAmount1, setRemoveAmount1] = useState('')
  const [removeAmount2, setRemoveAmount2] = useState('')

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

  const handleRemoveLiquidity = async () => {
    if (poolType === '2pool') {
      // 2Pool
      if (!removeAmount0_2 || !removeAmount1_2 || !contracts.swap || !account) {
        setError('Tüm miktarları giriniz')
        return
      }

      setLoading(true)
      setError('')
      
      try {
        const amount0Wei = ethers.parseUnits(removeAmount0_2, 6)
        const amount1Wei = ethers.parseUnits(removeAmount1_2, 6)
        
        console.log("Removing liquidity from 2Pool...")
        
        // Remove liquidity
        const removeLiquidityTx = await contracts.swap.removeLiquidity(amount0Wei, amount1Wei)
        await removeLiquidityTx.wait()
        
        setSuccess(`✅ Likidite çıkarıldı! ${removeAmount0_2} tUSDC + ${removeAmount1_2} tUSDT`)
        setRemoveAmount0_2('')
        setRemoveAmount1_2('')
        
        await loadReserves()
      } catch (err) {
        setError('Likidite çıkarma başarısız: ' + err.message)
      } finally {
        setLoading(false)
      }
    } else {
      // 3Pool
      if (!removeAmount0 || !removeAmount1 || !removeAmount2 || !contracts.swap3Pool || !account) {
        setError('Tüm miktarları giriniz')
        return
      }

      setLoading(true)
      setError('')
      
      try {
        const amount0Wei = ethers.parseUnits(removeAmount0, 6)
        const amount1Wei = ethers.parseUnits(removeAmount1, 6)
        const amount2Wei = ethers.parseUnits(removeAmount2, 6)
        
        console.log("Removing liquidity from 3Pool...")
        
        // Remove liquidity
        const removeLiquidityTx = await contracts.swap3Pool.removeLiquidity(amount0Wei, amount1Wei, amount2Wei)
        await removeLiquidityTx.wait()
        
        setSuccess(`✅ Likidite çıkarıldı! ${removeAmount0} tUSDC + ${removeAmount1} tUSDT + ${removeAmount2} tUSDY`)
        setRemoveAmount0('')
        setRemoveAmount1('')
        setRemoveAmount2('')
        
        await loadReserves()
      } catch (err) {
        setError('Likidite çıkarma başarısız: ' + err.message)
      } finally {
        setLoading(false)
      }
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
        
        // Get swap contract address dynamically
        const swapAddress = await contracts.swap.getAddress()
        
        console.log("Approving tokens to:", swapAddress)
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
        
        // Get swap3Pool contract address dynamically
        const swapAddress = await contracts.swap3Pool.getAddress()
        
        console.log("Approving tokens to:", swapAddress)
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
        <h2 style={{ 
          marginBottom: '32px', 
          textAlign: 'center', 
          color: '#1e293b',
          fontSize: '1.75rem',
          fontWeight: '700',
          letterSpacing: '-0.5px'
        }}>
          💧 Likidite Havuzu Yönetimi
        </h2>

        {!account && (
          <div className="error">
            ⚠️ Wallet bağlamanız gerekiyor! Sağ üstteki "Wallet Bağla" butonuna tıklayın.
          </div>
        )}

        {/* Pool Type Selection */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#475569', fontSize: '0.95rem' }}>
            Havuz Seçin:
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
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
                padding: '20px',
                borderRadius: '16px',
                border: poolType === '2pool' ? '2px solid #6366f1' : '2px solid #e2e8f0',
                background: poolType === '2pool' 
                  ? 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)' 
                  : '#ffffff',
                cursor: 'pointer',
                fontWeight: poolType === '2pool' ? '700' : '500',
                color: poolType === '2pool' ? '#4338ca' : '#64748b',
                transition: 'all 0.3s ease',
                boxShadow: poolType === '2pool' ? '0 4px 12px rgba(99, 102, 241, 0.15)' : '0 2px 4px rgba(0, 0, 0, 0.05)'
              }}
              onMouseEnter={(e) => {
                if (poolType !== '2pool') {
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
                  e.target.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={(e) => {
                if (poolType !== '2pool') {
                  e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)'
                  e.target.style.transform = 'translateY(0)'
                }
              }}
            >
              <div style={{ fontSize: '1.1rem', marginBottom: '6px' }}>2-Token Pool</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
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
                padding: '20px',
                borderRadius: '16px',
                border: poolType === '3pool' ? '2px solid #6366f1' : '2px solid #e2e8f0',
                background: poolType === '3pool' 
                  ? 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)' 
                  : '#ffffff',
                cursor: 'pointer',
                fontWeight: poolType === '3pool' ? '700' : '500',
                color: poolType === '3pool' ? '#4338ca' : '#64748b',
                transition: 'all 0.3s ease',
                boxShadow: poolType === '3pool' ? '0 4px 12px rgba(99, 102, 241, 0.15)' : '0 2px 4px rgba(0, 0, 0, 0.05)'
              }}
              onMouseEnter={(e) => {
                if (poolType !== '3pool') {
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
                  e.target.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={(e) => {
                if (poolType !== '3pool') {
                  e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)'
                  e.target.style.transform = 'translateY(0)'
                }
              }}
            >
              <div style={{ fontSize: '1.1rem', marginBottom: '6px' }}>3-Token Pool</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                tUSDC / tUSDT / tUSDY
              </div>
            </button>
          </div>
        </div>

        {/* Pool Info */}
        {account && (
          <div className="pool-info-card">
            <div style={{ fontSize: '0.95rem', color: '#1e40af', marginBottom: '12px', fontWeight: '700' }}>
              📊 {poolType === '2pool' ? '2Pool' : '3Pool'} Bilgileri
            </div>
            <div style={{ fontSize: '0.9rem', color: '#1e3a8a', lineHeight: '1.8' }}>
              {poolType === '2pool' ? (
                <>
                  <div>tUSDC Rezervi: <strong style={{ color: '#6366f1' }}>{parseFloat(currentReserves.reserve0).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong></div>
                  <div>tUSDT Rezervi: <strong style={{ color: '#6366f1' }}>{parseFloat(currentReserves.reserve1).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong></div>
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #93c5fd' }}>
                    Oran: <strong>1:1 (Stabilcoin)</strong>
                  </div>
                </>
              ) : (
                <>
                  <div>tUSDC Rezervi: <strong style={{ color: '#6366f1' }}>{parseFloat(currentReserves.reserve0).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong></div>
                  <div>tUSDT Rezervi: <strong style={{ color: '#6366f1' }}>{parseFloat(currentReserves.reserve1).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong></div>
                  <div>tUSDY Rezervi: <strong style={{ color: '#6366f1' }}>{parseFloat(currentReserves.reserve2).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong></div>
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #93c5fd' }}>
                    Oran: <strong>1:1:1 (Stabilcoin)</strong>
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
        {success && <div className="success">{success}</div>}

        {/* Tab Selection */}
        <div style={{ marginBottom: '24px', display: 'flex', gap: '12px' }}>
          <button
            onClick={() => {
              setActiveTab('add')
              setRemoveAmount0_2('')
              setRemoveAmount1_2('')
              setRemoveAmount0('')
              setRemoveAmount1('')
              setRemoveAmount2('')
            }}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '12px',
              border: activeTab === 'add' ? '2px solid #6366f1' : '2px solid #e2e8f0',
              background: activeTab === 'add' 
                ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' 
                : '#ffffff',
              color: activeTab === 'add' ? '#fff' : '#64748b',
              cursor: 'pointer',
              fontWeight: activeTab === 'add' ? '700' : '500',
              fontSize: '1rem',
              transition: 'all 0.3s ease',
              boxShadow: activeTab === 'add' ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
            }}
          >
            ➕ Likidite Ekle
          </button>
          <button
            onClick={() => {
              setActiveTab('remove')
              setAmount0('')
              setAmount1('')
              setAmount0_3('')
              setAmount1_3('')
              setAmount2_3('')
            }}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '12px',
              border: activeTab === 'remove' ? '2px solid #6366f1' : '2px solid #e2e8f0',
              background: activeTab === 'remove'
                ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' 
                : '#ffffff',
              color: activeTab === 'remove' ? '#fff' : '#64748b',
              cursor: 'pointer',
              fontWeight: activeTab === 'remove' ? '700' : '500',
              fontSize: '1rem',
              transition: 'all 0.3s ease',
              boxShadow: activeTab === 'remove' ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
            }}
          >
            ➖ Likidite Çıkar
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

        {/* Remove Liquidity Form */}
        {activeTab === 'remove' && (
          <>
            {poolType === '2pool' ? (
              <>
                <div className="form-group">
                  <label>Çıkarılacak tUSDC Miktarı</label>
                  <input
                    type="number"
                    value={removeAmount0_2}
                    onChange={(e) => setRemoveAmount0_2(e.target.value)}
                    placeholder="0.0"
                    step="0.000001"
                  />
                </div>

                <div className="form-group">
                  <label>Çıkarılacak tUSDT Miktarı</label>
                  <input
                    type="number"
                    value={removeAmount1_2}
                    onChange={(e) => setRemoveAmount1_2(e.target.value)}
                    placeholder="0.0"
                    step="0.000001"
                  />
                </div>

                <div style={{ 
                  marginBottom: '20px', 
                  padding: '16px', 
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  borderRadius: '12px',
                  border: '1px solid #fbbf24',
                  fontSize: '0.9rem',
                  color: '#92400e'
                }}>
                  ⚠️ <strong>Uyarı:</strong> Çıkardığınız miktarlar havuzda mevcut rezervlerle uyumlu olmalıdır. 
                  Mevcut rezervlerden fazla çıkarmaya çalışırsanız işlem başarısız olur.
                </div>

                <button 
                  className="btn" 
                  onClick={handleRemoveLiquidity}
                  disabled={loading || !removeAmount0_2 || !removeAmount1_2}
                  style={{
                    background: loading || !removeAmount0_2 || !removeAmount1_2
                      ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                      : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  }}
                >
                  {loading ? 'İşlem Yapılıyor...' : 'Likidite Çıkar'}
                </button>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label>Çıkarılacak tUSDC Miktarı</label>
                  <input
                    type="number"
                    value={removeAmount0}
                    onChange={(e) => setRemoveAmount0(e.target.value)}
                    placeholder="0.0"
                    step="0.000001"
                  />
                </div>

                <div className="form-group">
                  <label>Çıkarılacak tUSDT Miktarı</label>
                  <input
                    type="number"
                    value={removeAmount1}
                    onChange={(e) => setRemoveAmount1(e.target.value)}
                    placeholder="0.0"
                    step="0.000001"
                  />
                </div>

                <div className="form-group">
                  <label>Çıkarılacak tUSDY Miktarı</label>
                  <input
                    type="number"
                    value={removeAmount2}
                    onChange={(e) => setRemoveAmount2(e.target.value)}
                    placeholder="0.0"
                    step="0.000001"
                  />
                </div>

                <div style={{ 
                  marginBottom: '20px', 
                  padding: '16px', 
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  borderRadius: '12px',
                  border: '1px solid #fbbf24',
                  fontSize: '0.9rem',
                  color: '#92400e'
                }}>
                  ⚠️ <strong>Uyarı:</strong> Çıkardığınız miktarlar havuzda mevcut rezervlerle uyumlu olmalıdır. 
                  Mevcut rezervlerden fazla çıkarmaya çalışırsanız işlem başarısız olur.
                </div>

                <button 
                  className="btn" 
                  onClick={handleRemoveLiquidity}
                  disabled={loading || !removeAmount0 || !removeAmount1 || !removeAmount2}
                  style={{
                    background: loading || !removeAmount0 || !removeAmount1 || !removeAmount2
                      ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                      : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  }}
                >
                  {loading ? 'İşlem Yapılıyor...' : 'Likidite Çıkar'}
                </button>
              </>
            )}
          </>
        )}

        <div style={{ marginTop: '20px', fontSize: '0.9rem', color: '#666', textAlign: 'center' }}>
          <p>💡 Likidite sağlayarak ücret geliri kazanabilirsiniz!</p>
        </div>
      </div>
    </div>
  )
}

export default UnifiedPoolPanel
