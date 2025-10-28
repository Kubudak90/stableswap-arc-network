import React from 'react'
import { Link } from 'react-router-dom'

function Header({ account, connectWallet, contracts }) {
  const formatAddress = (addr) => {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <header className="header">
      <div className="container">
        <h1>🔄 StableSwap AMM</h1>
        <p>Arc Network üzerinde stabilcoin takası</p>
        
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <nav>
            <Link to="/" style={{ marginRight: '20px', color: 'white', textDecoration: 'none' }}>
              Swap
            </Link>
            <Link to="/pool" style={{ color: 'white', textDecoration: 'none' }}>
              Pool
            </Link>
          </nav>
          
          <div>
            {account ? (
              <div style={{ color: 'white', fontSize: '0.9rem' }}>
                <div>🔗 {formatAddress(account)}</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                  {contracts.swap ? '✅ Kontratlar Bağlı' : '⏳ Bağlanıyor...'}
                </div>
              </div>
            ) : (
              <button 
                onClick={connectWallet}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                🔗 Wallet Bağla
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
