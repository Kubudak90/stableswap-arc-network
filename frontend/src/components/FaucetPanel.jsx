import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'

// Import contract addresses
const CONTRACTS = {
  testUSDC: "0x1eccf89268C90C5Ac954ed020Ca498D96F9f9733",
  testUSDT: "0x787804d1f98F4Da65C6de63AaA00906A8C6868F3",
  testUSDY: "0x4D81e87902aA4Cf67D99055D44b6D0341fCc419a"
}

function FaucetPanel({ contracts, account }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [canClaim, setCanClaim] = useState(false)
  const [timeUntilNextClaim, setTimeUntilNextClaim] = useState(0)
  const [faucetContract, setFaucetContract] = useState(null)
  const [isDeveloper, setIsDeveloper] = useState(false)
  const [refillLoading, setRefillLoading] = useState(false)
  const [faucetBalances, setFaucetBalances] = useState({ usdc: '0', usdt: '0', usdy: '0' })

  // Faucet V3 contract address (with developer support)
  const FAUCET_ADDRESS = "0xdbF8fC63B9cFa254B1b6eD80fa40927271A4dfC0"
  const DEVELOPER_ADDRESS = "0x1D58328205429D39cE21a13DcD3FeB73180C9B20"

  // Faucet V3 ABI
  const FAUCET_ABI = [
    "function claimTokens() external",
    "function canClaim(address user) view returns (bool)",
    "function getTimeUntilNextClaim(address user) view returns (uint256)",
    "function lastClaimTime(address user) view returns (uint256)",
    "function isDeveloper(address user) view returns (bool)"
  ]

  // Mintable Token ABIs (for refilling)
  const MINTABLE_TOKEN_ABI = [
    "function mint(address to, uint256 amount) external",
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)"
  ]

  useEffect(() => {
    if (contracts.token0 && account) {
      // Initialize faucet contract
      const provider = contracts.token0.runner.provider
      const faucet = new ethers.Contract(FAUCET_ADDRESS, FAUCET_ABI, provider)
      setFaucetContract(faucet)
      
      // Async function to load data
      const loadData = async () => {
        // Check if user can claim and developer status
        await Promise.all([
          checkClaimStatus(faucet),
          checkDeveloperStatus(faucet)
        ])
        
        // Load balances if developer
        if (account.toLowerCase() === DEVELOPER_ADDRESS.toLowerCase()) {
          loadFaucetBalances()
        }
      }
      
      loadData()
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

  const checkDeveloperStatus = async (faucet) => {
    try {
      const isDev = await faucet.isDeveloper(account)
      setIsDeveloper(isDev)
    } catch (err) {
      console.error('Error checking developer status:', err)
      // Fallback to address check
      if (account.toLowerCase() === DEVELOPER_ADDRESS.toLowerCase()) {
        setIsDeveloper(true)
      }
    }
  }

  const loadFaucetBalances = async () => {
    try {
      const provider = contracts.token0.runner.provider
      const usdcContract = new ethers.Contract(CONTRACTS.testUSDC, MINTABLE_TOKEN_ABI, provider)
      const usdtContract = new ethers.Contract(CONTRACTS.testUSDT, MINTABLE_TOKEN_ABI, provider)
      const usdyContract = new ethers.Contract(CONTRACTS.testUSDY, MINTABLE_TOKEN_ABI, provider)

      const usdcBal = await usdcContract.balanceOf(FAUCET_ADDRESS)
      const usdtBal = await usdtContract.balanceOf(FAUCET_ADDRESS)
      const usdyBal = await usdyContract.balanceOf(FAUCET_ADDRESS)

      setFaucetBalances({
        usdc: ethers.formatUnits(usdcBal, 6),
        usdt: ethers.formatUnits(usdtBal, 6),
        usdy: ethers.formatUnits(usdyBal, 6)
      })
    } catch (err) {
      console.error('Error loading faucet balances:', err)
    }
  }

  const refillFaucet = async () => {
    if (!account || account.toLowerCase() !== DEVELOPER_ADDRESS.toLowerCase()) {
      setError('Sadece geliştirici faucet doldurabilir!')
      return
    }

    setRefillLoading(true)
    setError('')
    
    try {
      const signer = await contracts.token0.runner.provider.getSigner()
      const mintAmount = ethers.parseUnits("5000000", 6) // 5M tokens

      const usdcContract = new ethers.Contract(CONTRACTS.testUSDC, MINTABLE_TOKEN_ABI, signer)
      const usdtContract = new ethers.Contract(CONTRACTS.testUSDT, MINTABLE_TOKEN_ABI, signer)
      const usdyContract = new ethers.Contract(CONTRACTS.testUSDY, MINTABLE_TOKEN_ABI, signer)

      console.log("Minting tokens to faucet...")
      
      // Mint directly to faucet
      const tx1 = await usdcContract.mint(FAUCET_ADDRESS, mintAmount)
      await tx1.wait()
      console.log("✅ USDC minted")

      const tx2 = await usdtContract.mint(FAUCET_ADDRESS, mintAmount)
      await tx2.wait()
      console.log("✅ USDT minted")

      const tx3 = await usdyContract.mint(FAUCET_ADDRESS, mintAmount)
      await tx3.wait()
      console.log("✅ USDY minted")

      setSuccess(`🎉 Faucet dolduruldu! 5M tUSDC + 5M tUSDT + 5M tUSDY mint edildi.`)
      
      // Reload balances
      await loadFaucetBalances()
      
    } catch (err) {
      setError('Faucet doldurma hatası: ' + err.message)
    } finally {
      setRefillLoading(false)
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
      
      const claimAmount = isDeveloper ? '100,000' : '1,000'
      setSuccess(`🎉 Faucet tokens claimed! ${claimAmount} tUSDC + ${claimAmount} tUSDT + ${claimAmount} tUSDY`)
      
      // Refresh developer status
      await checkDeveloperStatus(faucetContract)
      
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
            Bu faucet test amaçlıdır. {isDeveloper ? (
              <><strong style={{color: '#059669'}}>👨‍💻 Developer Modu:</strong> Cooldown yok, her çekişte 100,000 token!</>
            ) : (
              <>Her kullanıcı 24 saatte bir 1,000 tUSDC + 1,000 tUSDT + 1,000 tUSDY token alabilir.</>
            )}
            <br />Faucet kontratı: <code>{FAUCET_ADDRESS}</code>
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
                ? (isDeveloper 
                  ? '👨‍💻 Developer: 100,000 tUSDC + 100,000 tUSDT + 100,000 tUSDY alabilirsiniz (Cooldown yok!)'
                  : '1,000 tUSDC + 1,000 tUSDT + 1,000 tUSDY alabilirsiniz')
                : (isDeveloper 
                  ? 'Her zaman token alabilirsiniz!'
                  : `Sonraki claim: ${formatTime(timeUntilNextClaim)}`)
              }
            </div>
          </div>
        )}

        {/* Developer Section */}
        {isDeveloper && (
          <div style={{ 
            background: '#eff6ff', 
            padding: '20px', 
            borderRadius: '10px', 
            marginBottom: '20px',
            border: '2px solid #3b82f6'
          }}>
            <h3 style={{ color: '#1e40af', marginBottom: '15px' }}>👨‍💻 Geliştirici Paneli</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <div style={{ fontSize: '0.9rem', color: '#1e3a8a', marginBottom: '8px' }}>
                <strong>Faucet Bakiyeleri:</strong>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#1e40af' }}>
                <div>tUSDC: <strong>{parseFloat(faucetBalances.usdc).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</strong></div>
                <div>tUSDT: <strong>{parseFloat(faucetBalances.usdt).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</strong></div>
                <div>tUSDY: <strong>{parseFloat(faucetBalances.usdy).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</strong></div>
              </div>
            </div>

            <button 
              onClick={refillFaucet}
              disabled={refillLoading}
              style={{
                width: '100%',
                background: refillLoading 
                  ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                  : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: refillLoading ? 'not-allowed' : 'pointer',
                marginTop: '10px'
              }}
            >
              {refillLoading ? '⏳ Dolduruluyor...' : '💰 Faucet Doldur (5M Her Token)'}
            </button>
          </div>
        )}

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <div style={{ textAlign: 'center' }}>
          <button 
            className="btn" 
            onClick={claimTokens}
            disabled={loading || !account || (!canClaim && !isDeveloper)}
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
             (canClaim || isDeveloper) ? (isDeveloper 
               ? '🚰 Test Token Al (Cooldown Yok)' 
               : '🚰 Test Token Al (1,000 tUSDC + 1,000 tUSDT + 1,000 tUSDY)') :
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
