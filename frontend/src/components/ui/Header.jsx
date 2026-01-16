import React from 'react'
import { Link, useLocation } from 'react-router-dom'

// Logo Component
const Logo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: '10px',
        background: 'linear-gradient(135deg, #fc72ff 0%, #4c82fb 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: '1rem',
        color: 'white'
      }}
    >
      A
    </div>
    <span style={{
      fontSize: '1.25rem',
      fontWeight: 700,
      background: 'linear-gradient(135deg, #fc72ff 0%, #4c82fb 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent'
    }}>
      Arc
    </span>
  </div>
)

// Wallet Button
const WalletButton = ({ account, isLoading, onConnect, onDisconnect }) => {
  if (isLoading) {
    return (
      <button className="header-wallet-btn connecting">
        <span className="spinner" style={{ width: 16, height: 16 }}></span>
        Connecting...
      </button>
    )
  }

  if (account) {
    return (
      <button className="header-wallet-btn connected" onClick={onDisconnect}>
        <span className="wallet-dot"></span>
        {account.slice(0, 6)}...{account.slice(-4)}
      </button>
    )
  }

  return (
    <button className="header-wallet-btn" onClick={onConnect}>
      Connect Wallet
    </button>
  )
}

// Nav Link Component
const NavLink = ({ to, children }) => {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <Link
      to={to}
      className={`header-nav-link ${isActive ? 'active' : ''}`}
    >
      {children}
    </Link>
  )
}

// Main Header Component
function Header({ account, connectWallet, disconnectWallet, isLoading }) {
  return (
    <header className="header-container">
      <div className="header-content">
        {/* Left - Logo */}
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Logo />
        </Link>

        {/* Center - Navigation */}
        <nav className="header-nav">
          <NavLink to="/">Swap</NavLink>
          <NavLink to="/pool">Pool</NavLink>
          <NavLink to="/staking">Stake</NavLink>
          <NavLink to="/faucet">Faucet</NavLink>
        </nav>

        {/* Right - Wallet */}
        <div className="header-actions">
          <WalletButton
            account={account}
            isLoading={isLoading}
            onConnect={connectWallet}
            onDisconnect={disconnectWallet}
          />
        </div>
      </div>
    </header>
  )
}

// Header Styles (inline for component isolation)
const headerStyles = `
.header-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(13, 13, 13, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-xl);
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.header-nav-link {
  padding: var(--spacing-sm) var(--spacing-lg);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 1rem;
  font-weight: 500;
  border-radius: var(--radius-md);
  transition: var(--transition-fast);
}

.header-nav-link:hover {
  color: var(--text-primary);
  background: var(--background-hover);
}

.header-nav-link.active {
  color: var(--text-primary);
  background: var(--background-tertiary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.header-wallet-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--primary);
  color: var(--background);
  border: none;
  border-radius: var(--radius-full);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition-fast);
}

.header-wallet-btn:hover {
  background: var(--primary-hover);
  box-shadow: 0 0 20px rgba(252, 114, 255, 0.3);
}

.header-wallet-btn.connected {
  background: var(--background-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border);
}

.header-wallet-btn.connected:hover {
  background: var(--background-hover);
  border-color: var(--border-hover);
  box-shadow: none;
}

.header-wallet-btn.connecting {
  background: var(--background-tertiary);
  color: var(--text-secondary);
  cursor: wait;
}

.wallet-dot {
  width: 8px;
  height: 8px;
  background: var(--success);
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Mobile */
@media (max-width: 768px) {
  .header-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    top: auto;
    transform: none;
    background: var(--card);
    border-top: 1px solid var(--border);
    padding: var(--spacing-sm);
    justify-content: space-around;
  }

  .header-nav-link {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: 0.875rem;
  }

  .header-content {
    padding: 0 var(--spacing-lg);
  }
}
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleId = 'header-styles'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = headerStyles
    document.head.appendChild(style)
  }
}

export default Header
