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

// External Link Icon
const ExternalLinkIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
)

// Gas Icon (fuel pump)
const GasIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 22V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/>
    <path d="M3 22h12"/>
    <path d="M15 10h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2v0a2 2 0 0 0 2-2V8l-4-4"/>
    <rect x="6" y="8" width="6" height="4"/>
  </svg>
)

// Hamburger Menu Icon
const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
)

// Close Icon
const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
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
const NetworkButton = ({ isCorrectNetwork, onAddNetwork, isMobile }) => {
  const [isHovered, setIsHovered] = useState(false)

  if (isCorrectNetwork) {
    return (
      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: isMobile ? '10px 14px' : '8px 12px',
          background: 'rgba(0, 211, 149, 0.1)',
          border: '1px solid rgba(0, 211, 149, 0.3)',
          borderRadius: '12px',
          color: '#00d395',
          fontSize: isMobile ? '0.95rem' : '0.875rem',
          fontWeight: '500',
          cursor: 'default',
          width: isMobile ? '100%' : 'auto',
          justifyContent: isMobile ? 'center' : 'flex-start'
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
        color: '#f59e0b',
        width: isMobile ? '100%' : 'auto',
        justifyContent: isMobile ? 'center' : 'flex-start'
      }}
    >
      <WarningIcon />
      Switch to Arc
    </InteractiveHoverButton>
  )
}

// Wallet Button
const WalletButton = ({ account, isLoading, onConnect, onDisconnect, isMobile }) => {
  const [isHovered, setIsHovered] = useState(false)

  if (isLoading) {
    return (
      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: isMobile ? '12px 20px' : '10px 20px',
          background: 'var(--background-tertiary)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          color: 'var(--text-secondary)',
          fontSize: '0.95rem',
          fontWeight: '600',
          cursor: 'wait',
          width: isMobile ? '100%' : 'auto'
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
          justifyContent: 'center',
          gap: '8px',
          padding: isMobile ? '12px 16px' : '10px 16px',
          background: isHovered ? 'var(--background-hover)' : 'var(--background-tertiary)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          color: 'white',
          fontSize: '0.95rem',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          width: isMobile ? '100%' : 'auto'
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
    <InteractiveHoverButton
      onClick={onConnect}
      style={{
        width: isMobile ? '100%' : 'auto',
        justifyContent: 'center'
      }}
    >
      Connect Wallet
    </InteractiveHoverButton>
  )
}

// Nav Link Component
const NavLink = ({ to, children, onClick, isMobile }) => {
  const location = useLocation()
  const isActive = location.pathname === to
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Link
      to={to}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: isMobile ? '14px 20px' : '8px 16px',
        color: isActive ? 'white' : (isHovered ? 'white' : 'var(--text-secondary)'),
        textDecoration: 'none',
        fontSize: isMobile ? '1.1rem' : '1rem',
        fontWeight: '500',
        borderRadius: '12px',
        background: isActive ? 'var(--background-tertiary)' : (isHovered ? 'var(--background-hover)' : 'transparent'),
        transition: 'all 0.15s ease',
        display: 'block',
        width: isMobile ? '100%' : 'auto',
        textAlign: isMobile ? 'center' : 'left'
      }}
    >
      {children}
    </Link>
  )
}

// Main Header Component
function Header({ account, connectWallet, disconnectWallet, isLoading, currentChainId }) {
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close mobile menu on route change
  const location = useLocation()
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

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

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <>
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
          padding: isMobile ? '0 16px' : '0 24px',
          height: isMobile ? '64px' : '72px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Left - Logo */}
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Logo />
          </Link>

          {/* Center - Desktop Navigation */}
          {!isMobile && (
            <nav style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)'
            }}>
              <NavLink to="/">Swap</NavLink>
              <NavLink to="/pools">Pools</NavLink>
              <NavLink to="/staking">Stake</NavLink>
              <NavLink to="/faucet">Faucet</NavLink>
              <NavLink to="/docs">Docs</NavLink>
              <a
                href="https://faucet.circle.com/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 12px',
                  color: '#2775ca',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  borderRadius: '12px',
                  background: 'rgba(39, 117, 202, 0.1)',
                  border: '1px solid rgba(39, 117, 202, 0.2)',
                  transition: 'all 0.15s ease',
                  marginLeft: '8px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(39, 117, 202, 0.2)'
                  e.target.style.borderColor = 'rgba(39, 117, 202, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(39, 117, 202, 0.1)'
                  e.target.style.borderColor = 'rgba(39, 117, 202, 0.2)'
                }}
                title="Get USDC for gas fees"
              >
                <GasIcon />
                Gas
                <ExternalLinkIcon />
              </a>
            </nav>
          )}

          {/* Right - Desktop: Theme + Network + Wallet, Mobile: Menu Button */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            {!isMobile && (
              <>
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
              </>
            )}
            {isMobile && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            top: '64px',
            left: 0,
            right: 0,
            bottom: 0,
            background: 'var(--background)',
            zIndex: 99,
            overflowY: 'auto',
            animation: 'slideDown 0.2s ease'
          }}
        >
          <div style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {/* Navigation Links */}
            <nav style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              marginBottom: '24px'
            }}>
              <NavLink to="/" onClick={closeMobileMenu} isMobile>Swap</NavLink>
              <NavLink to="/pools" onClick={closeMobileMenu} isMobile>Pools</NavLink>
              <NavLink to="/staking" onClick={closeMobileMenu} isMobile>Stake</NavLink>
              <NavLink to="/faucet" onClick={closeMobileMenu} isMobile>Faucet</NavLink>
              <NavLink to="/docs" onClick={closeMobileMenu} isMobile>Docs</NavLink>
              <a
                href="https://faucet.circle.com/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMobileMenu}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px 20px',
                  color: '#2775ca',
                  textDecoration: 'none',
                  fontSize: '1.1rem',
                  fontWeight: '500',
                  borderRadius: '12px',
                  background: 'rgba(39, 117, 202, 0.1)',
                  border: '1px solid rgba(39, 117, 202, 0.2)',
                  transition: 'all 0.15s ease'
                }}
              >
                <GasIcon />
                Get Gas (USDC)
                <ExternalLinkIcon />
              </a>
            </nav>

            {/* Divider */}
            <div style={{
              height: '1px',
              background: 'var(--border)',
              margin: '8px 0 24px'
            }} />

            {/* Theme Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 20px',
              background: 'var(--background-secondary)',
              borderRadius: '12px',
              marginBottom: '12px'
            }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Theme</span>
              <ThemeToggler />
            </div>

            {/* Network Button */}
            <div style={{ marginBottom: '12px' }}>
              <NetworkButton
                isCorrectNetwork={isCorrectNetwork}
                onAddNetwork={handleAddNetwork}
                isMobile
              />
            </div>

            {/* Wallet Button */}
            <WalletButton
              account={account}
              isLoading={isLoading}
              onConnect={connectWallet}
              onDisconnect={disconnectWallet}
              isMobile
            />
          </div>
        </div>
      )}

      {/* Animation Keyframes */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </>
  )
}

export default Header
