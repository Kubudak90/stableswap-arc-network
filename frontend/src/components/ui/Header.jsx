import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { NETWORK } from '../../config'
import { ThemeToggler } from './ThemeToggler'
import { InteractiveHoverButton } from './InteractiveHoverButton'

// Network Icon
const NetworkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
)

// Warning Icon
const WarningIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
  </svg>
)

// Logo Component
const Logo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <img
      src="/logo.svg"
      alt="Arc Stable Swap"
      style={{
        width: 40,
        height: 40,
      }}
    />
    <span className="header-logo-text">
      ArcSwap
    </span>
  </div>
)

// Network Button
const NetworkButton = ({ isCorrectNetwork, onAddNetwork }) => {
  const [isHovered, setIsHovered] = useState(false)

  if (isCorrectNetwork) {
    return (
      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          background: 'rgba(0, 211, 149, 0.1)',
          border: '1px solid rgba(0, 211, 149, 0.3)',
          borderRadius: '12px',
          color: '#00d395',
          fontSize: '0.875rem',
          fontWeight: '500',
          cursor: 'default'
        }}
      >
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#00d395',
          animation: 'pulse 2s ease-in-out infinite'
        }} />
        Arc Testnet
      </button>
    )
  }

  return (
    <InteractiveHoverButton
      onClick={onAddNetwork}
      style={{
        border: '1px solid #f59e0b',
        color: '#f59e0b'
      }}
    >
      <WarningIcon />
      Switch to Arc
    </InteractiveHoverButton>
  )
}

// Wallet Button
const WalletButton = ({ account, isLoading, onConnect, onDisconnect }) => {
  const [isHovered, setIsHovered] = useState(false)

  if (isLoading) {
    return (
      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          background: 'var(--background-tertiary)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          color: 'var(--text-secondary)',
          fontSize: '0.95rem',
          fontWeight: '600',
          cursor: 'wait'
        }}
      >
        <span className="spinner" style={{ width: 16, height: 16 }}></span>
        Connecting...
      </button>
    )
  }

  if (account) {
    return (
      <button
        onClick={onDisconnect}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          background: isHovered ? 'var(--background-hover)' : 'var(--background-tertiary)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          color: 'white',
          fontSize: '0.95rem',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#00d395'
        }} />
        {account.slice(0, 6)}...{account.slice(-4)}
      </button>
    )
  }

  return (
    <InteractiveHoverButton onClick={onConnect}>
      Connect Wallet
    </InteractiveHoverButton>
  )
}

// Nav Link Component
const NavLink = ({ to, children }) => {
  const location = useLocation()
  const isActive = location.pathname === to
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Link
      to={to}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '8px 16px',
        color: isActive ? 'white' : (isHovered ? 'white' : 'var(--text-secondary)'),
        textDecoration: 'none',
        fontSize: '1rem',
        fontWeight: '500',
        borderRadius: '12px',
        background: isActive ? 'var(--background-tertiary)' : (isHovered ? 'var(--background-hover)' : 'transparent'),
        transition: 'all 0.15s ease'
      }}
    >
      {children}
    </Link>
  )
}

// Main Header Component
function Header({ account, connectWallet, disconnectWallet, isLoading, currentChainId }) {
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false)

  useEffect(() => {
    checkNetwork()

    if (window.ethereum) {
      window.ethereum.on('chainChanged', checkNetwork)
      return () => {
        window.ethereum.removeListener('chainChanged', checkNetwork)
      }
    }
  }, [currentChainId])

  const checkNetwork = async () => {
    if (window.ethereum) {
      try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' })
        setIsCorrectNetwork(chainId === NETWORK.chainIdHex)
      } catch (err) {
        console.error('Error checking network:', err)
      }
    }
  }

  const handleAddNetwork = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!')
      return
    }

    try {
      // First try to switch
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: NETWORK.chainIdHex }]
      })
      // Success - network switched
      setIsCorrectNetwork(true)
    } catch (switchError) {
      // If network doesn't exist (error 4902), add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: NETWORK.chainIdHex,
              chainName: NETWORK.name,
              rpcUrls: [NETWORK.rpcUrl],
              nativeCurrency: NETWORK.nativeCurrency,
              blockExplorerUrls: NETWORK.explorerUrl ? [NETWORK.explorerUrl] : []
            }]
          })
          // After adding, try to switch again
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: NETWORK.chainIdHex }]
          })
          setIsCorrectNetwork(true)
        } catch (addError) {
          console.error('Error adding network:', addError)
          alert('Could not add Arc Testnet. Please add it manually:\n\nNetwork Name: ' + NETWORK.name + '\nRPC URL: ' + NETWORK.rpcUrl + '\nChain ID: ' + NETWORK.chainId)
        }
      } else if (switchError.code === 4001) {
        // User rejected the request
        alert('Please switch to Arc Testnet to use this app.')
      } else {
        console.error('Error switching network:', switchError)
        alert('Could not switch network. Please switch to Arc Testnet manually.')
      }
    }
  }

  return (
    <header className="header" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: 'var(--background)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
        height: '72px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Left - Logo */}
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Logo />
        </Link>

        {/* Center - Navigation */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)'
        }}>
          <NavLink to="/">Swap</NavLink>
          <NavLink to="/pool">Pool</NavLink>
          <NavLink to="/staking">Stake</NavLink>
          <NavLink to="/faucet">Faucet</NavLink>
        </nav>

        {/* Right - Theme + Network + Wallet */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <ThemeToggler />
          <NetworkButton
            isCorrectNetwork={isCorrectNetwork}
            onAddNetwork={handleAddNetwork}
          />
          <WalletButton
            account={account}
            isLoading={isLoading}
            onConnect={connectWallet}
            onDisconnect={disconnectWallet}
          />
        </div>
      </div>

      {/* Mobile Navigation */}
      <style>{`
        @media (max-width: 768px) {
          nav {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            top: auto !important;
            transform: none !important;
            background: var(--card) !important;
            border-top: 1px solid var(--border) !important;
            padding: 8px !important;
            justify-content: space-around !important;
          }
        }
      `}</style>
    </header>
  )
}

export default Header
