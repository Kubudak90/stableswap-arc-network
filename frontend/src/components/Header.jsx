import React from 'react'
import { Link } from 'react-router-dom'

function Header({ account, connectWallet, disconnectWallet, contracts, currentChainId }) {
  const formatAddress = (addr) => {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const getNetworkStatus = () => {
    if (!account) return null
    
    try {
      const chainId = currentChainId || window.ethereum?.chainId
      if (chainId === '0x4cef52') { // 5050194 in decimal
        return { name: 'Arc Testnet', color: '#22c55e' }
      } else if (chainId) {
        return { name: 'Wrong Network', color: '#ef4444' }
      } else {
        return { name: 'Unknown Network', color: '#f59e0b' }
      }
    } catch {
      return null
    }
  }

  const networkStatus = getNetworkStatus()

  const addArcNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x4cef52', // 5050194 in decimal
          chainName: 'Arc Testnet',
          rpcUrls: ['https://rpc.testnet.arc.network'],
          nativeCurrency: {
            name: 'USDC',
            symbol: 'USDC',
            decimals: 18
          },
          blockExplorerUrls: ['https://testnet.arcscan.app']
        }]
      })
      console.log('Arc Testnet added successfully')
    } catch (error) {
      console.error('Could not add Arc Testnet:', error)
      alert('Arc Testnet eklenemedi: ' + error.message)
    }
  }

  const switchToArcNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x4cef52' }] // 5050194 in decimal
      })
      console.log('Switched to Arc Testnet')
    } catch (error) {
      if (error.code === 4902) {
        // Chain not added, add it first
        await addArcNetwork()
      } else {
        console.error('Could not switch to Arc Testnet:', error)
        alert('Arc Testnet\'e geçiş yapılamadı: ' + error.message)
      }
    }
  }

  return (
    <header className="header">
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
          <h1 style={{ margin: 0 }}>🔄 StableSwap AMM</h1>
          <a 
            href="https://faucet.circle.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              color: 'white', 
              textDecoration: 'none',
              fontSize: '0.9rem',
              opacity: 0.9,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'all 0.2s',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
            title="Arc Network USDC Faucet - Circle"
            onMouseEnter={(e) => {
              e.target.style.opacity = '1'
              e.target.style.background = 'rgba(255,255,255,0.1)'
            }}
            onMouseLeave={(e) => {
              e.target.style.opacity = '0.9'
              e.target.style.background = 'transparent'
            }}
          >
            🚰 USDC Faucet
          </a>
        </div>
        <p>Arc Network üzerinde stabilcoin takası</p>
        
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <nav>
            <Link to="/" style={{ marginRight: '15px', color: 'white', textDecoration: 'none' }}>
              🔄 Swap
            </Link>
            <Link to="/pool" style={{ marginRight: '15px', color: 'white', textDecoration: 'none' }}>
              💧 Pool
            </Link>
            <Link to="/faucet" style={{ color: 'white', textDecoration: 'none' }}>
              🚰 Faucet
            </Link>
          </nav>
          
          <div>
            {account ? (
              <div style={{ color: 'white', fontSize: '0.9rem' }}>
                <div>🔗 {formatAddress(account)}</div>
                {networkStatus && (
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: networkStatus.color,
                    fontWeight: 'bold',
                    marginTop: '2px'
                  }}>
                    🌐 {networkStatus.name}
                  </div>
                )}
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                  {contracts.swap ? '✅ Kontratlar Bağlı' : '⏳ Bağlanıyor...'}
                </div>
                
                {/* Network Buttons */}
                <div style={{ marginTop: '8px', display: 'flex', gap: '5px' }}>
                  {networkStatus && networkStatus.name !== 'Arc Testnet' && (
                    <button 
                      onClick={switchToArcNetwork}
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}
                    >
                      🌐 Arc'e Geç
                    </button>
                  )}
                  
                  <button 
                    onClick={addArcNetwork}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}
                  >
                    ➕ Arc Ekle
                  </button>
                </div>
                
                <button 
                  onClick={disconnectWallet}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.2)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    marginTop: '5px'
                  }}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div>
                <button 
                  onClick={connectWallet}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    marginBottom: '8px'
                  }}
                >
                  🔗 Wallet Bağla
                </button>
                
                {/* Network buttons for non-connected users */}
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button 
                    onClick={addArcNetwork}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 'bold'
                    }}
                  >
                    ➕ Arc Network Ekle
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
