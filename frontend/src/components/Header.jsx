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
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img 
              src="/arc-logo.svg" 
              alt="ARC STABLE SWAP" 
              style={{ 
                height: '50px', 
                width: 'auto',
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))'
              }} 
            />
          </div>
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
              gap: '6px',
              padding: '6px 10px',
              borderRadius: '8px',
              transition: 'all 0.3s ease',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(39, 117, 202, 0.1)'
            }}
            title="Arc Network USDC Faucet - Circle"
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1'
              e.currentTarget.style.background = 'rgba(39, 117, 202, 0.2)'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(39, 117, 202, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.9'
              e.currentTarget.style.background = 'rgba(39, 117, 202, 0.1)'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <img 
              src="/circle-usdc-icon.svg" 
              alt="Circle" 
              style={{ 
                width: '20px', 
                height: '20px',
                filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))'
              }} 
            />
            USDC Faucet
          </a>
        </div>
        <p>Arc Network üzerinde stabilcoin takası</p>
        
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <nav className="header-nav">
            <Link to="/">
              <img src="/swap-icon.svg" alt="Swap" style={{ width: '22px', height: '22px' }} />
              Swap
            </Link>
            <Link to="/pool">
              <img src="/pool-icon.svg" alt="Pool" style={{ width: '22px', height: '22px' }} />
              Pool
            </Link>
            <Link to="/staking">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 0 2px rgba(20, 184, 166, 0.5))' }}>
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Staking
            </Link>
            <Link to="/faucet">
              <img src="/faucet-icon.svg" alt="Faucet" style={{ width: '22px', height: '22px' }} />
              Faucet
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
                <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {networkStatus && networkStatus.name !== 'Arc Testnet' && (
                    <button 
                      onClick={switchToArcNetwork}
                      className="header-btn header-btn-primary"
                      style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                    >
                      🌐 Arc'e Geç
                    </button>
                  )}
                  
                  <button 
                    onClick={addArcNetwork}
                    className="header-btn header-btn-success"
                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  >
                    ➕ Arc Ekle
                  </button>
                </div>
                
                <button 
                  onClick={disconnectWallet}
                  className="header-btn"
                  style={{ fontSize: '0.85rem', padding: '6px 12px', marginTop: '8px', width: '100%' }}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'right' }}>
                <button 
                  onClick={connectWallet}
                  className="header-btn"
                  style={{ 
                    padding: '10px 20px',
                    fontSize: '1rem',
                    marginBottom: '10px',
                    width: '100%',
                    fontWeight: '600'
                  }}
                >
                  🔗 Wallet Bağla
                </button>
                
                {/* Network buttons for non-connected users */}
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={addArcNetwork}
                    className="header-btn header-btn-success"
                    style={{ fontSize: '0.85rem', padding: '8px 14px' }}
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
