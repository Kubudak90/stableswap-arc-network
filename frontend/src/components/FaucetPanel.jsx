import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'

function FaucetPanel({ contracts, account }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [canClaim, setCanClaim] = useState(false)
  const [timeUntilNextClaim, setTimeUntilNextClaim] = useState(0)
  const [faucetContract, setFaucetContract] = useState(null)

  // Faucet V2 contract address (with USDY support)
  const FAUCET_ADDRESS = "0xd23bC9993699bAFa31fc626619ad73c43E032588"

  // Faucet V2 ABI
  const FAUCET_ABI = [
    "function claimTokens() external",
    "function canClaim(address user) view returns (bool)",
    "function getTimeUntilNextClaim(address user) view returns (uint256)",
    "function lastClaimTime(address user) view returns (uint256)"
  ]

  useEffect(() => {
    if (contracts.token0 && account) {
      // Initialize faucet contract
      const provider = contracts.token0.runner.provider
      const faucet = new ethers.Contract(FAUCET_ADDRESS, FAUCET_ABI, provider)
      setFaucetContract(faucet)
      
      // Check if user can claim
      checkClaimStatus(faucet)
    }
  }, [contracts, account])

  const checkClaimStatus = async (faucet) => {
    try {
      const canClaimNow = await faucet.canClaim(account)
      const timeUntil = await faucet.getTimeUntilNextClaim(account)
      
      setCanClaim(canClaimNow)
      setTimeUntilNextClaim(Number(timeUntil))
    } catch (err) {
      console.error('Error checking claim status:', err)
    }
  }

  const claimTokens = async () => {
    if (!faucetContract || !account) {
      setError('Wallet bağlı değil')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      console.log("Claiming tokens from faucet...")
      
      // Get signer for transaction
      const signer = await contracts.token0.runner.provider.getSigner()
      const faucetWithSigner = faucetContract.connect(signer)
      
      // Claim tokens
      const tx = await faucetWithSigner.claimTokens()
      console.log("Transaction hash:", tx.hash)
      
      // Wait for confirmation
      await tx.wait()
      
      setSuccess(`🎉 Faucet tokens claimed! 1000 tUSDC + 1000 tUSDT + 1000 tUSDY`)
      
      // Refresh claim status
      await checkClaimStatus(faucetContract)
      
    } catch (err) {
      setError('Faucet hatası: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds) => {
    if (seconds === 0) return "Şimdi"
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h2 style={{ marginBottom: '30px', textAlign: 'center', color: '#333' }}>
          🚰 Test Token Faucet
        </h2>

        <div style={{ 
          background: '#f0f9ff', 
          padding: '20px', 
          borderRadius: '10px', 
          marginBottom: '20px',
          border: '1px solid #0ea5e9'
        }}>
          <h3 style={{ color: '#0369a1', marginBottom: '10px' }}>💡 Nasıl Çalışır?</h3>
          <p style={{ color: '#0c4a6e', margin: 0 }}>
            Bu faucet test amaçlıdır. Her kullanıcı 24 saatte bir 1000 tUSDC + 1000 tUSDT + 1000 tUSDY token alabilir.
            Faucet kontratı: <code>{FAUCET_ADDRESS}</code>
          </p>
        </div>

        {!account && (
          <div className="error">
            ⚠️ Wallet bağlamanız gerekiyor!
          </div>
        )}

        {account && faucetContract && (
          <div style={{ 
            background: canClaim ? '#f0fdf4' : '#fef3c7', 
            padding: '15px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: `1px solid ${canClaim ? '#22c55e' : '#f59e0b'}`
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
              {canClaim ? '✅ Token alabilirsiniz!' : '⏳ Bekleme süresi'}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              {canClaim 
                ? '1000 tUSDC + 1000 tUSDT + 1000 tUSDY alabilirsiniz'
                : `Sonraki claim: ${formatTime(timeUntilNextClaim)}`
              }
            </div>
          </div>
        )}

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <div style={{ textAlign: 'center' }}>
          <button 
            className="btn" 
            onClick={claimTokens}
            disabled={loading || !account || !canClaim}
            style={{ 
              background: canClaim 
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
              fontSize: '1.2rem',
              padding: '15px 30px',
              cursor: canClaim ? 'pointer' : 'not-allowed'
            }}
          >
            {loading ? '⏳ Token Alınıyor...' : 
             canClaim ? '🚰 Test Token Al (1000 tUSDC + 1000 tUSDT + 1000 tUSDY)' :
             '⏳ Bekleme süresi aktif'}
          </button>
        </div>

        <div style={{ marginTop: '20px', fontSize: '0.9rem', color: '#666', textAlign: 'center' }}>
          <p>💡 Her 24 saatte bir token alabilirsiniz. Faucet kontratı Arc Testnet'te deploy edildi.</p>
        </div>
      </div>
    </div>
  )
}

export default FaucetPanel
