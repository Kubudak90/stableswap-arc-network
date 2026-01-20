import React from 'react'
import { Link } from 'react-router-dom'

const Footer = () => {
  return (
    <footer style={{
      marginTop: 'auto',
      padding: '2rem 1rem',
      borderTop: '1px solid var(--border)',
      backgroundColor: 'var(--card)',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}>
        {/* Main Footer Content */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: '2rem',
        }}>
          {/* Brand Section */}
          <div style={{ flex: '1', minWidth: '200px' }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              marginBottom: '0.75rem',
              color: 'var(--foreground)'
            }}>
              Arc StableSwap
            </h3>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--muted-foreground)',
              lineHeight: '1.6'
            }}>
              Decentralized stablecoin exchange on Arc Network.
              Low slippage, efficient swaps.
            </p>
          </div>

          {/* Links Section */}
          <div style={{ flex: '1', minWidth: '150px' }}>
            <h4 style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              marginBottom: '0.75rem',
              color: 'var(--foreground)'
            }}>
              Legal
            </h4>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link
                to="/privacy"
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--muted-foreground)',
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.color = 'var(--primary)'}
                onMouseOut={(e) => e.target.style.color = 'var(--muted-foreground)'}
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--muted-foreground)',
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.color = 'var(--primary)'}
                onMouseOut={(e) => e.target.style.color = 'var(--muted-foreground)'}
              >
                Terms of Service
              </Link>
            </nav>
          </div>

          {/* Contact Section */}
          <div style={{ flex: '1', minWidth: '200px' }}>
            <h4 style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              marginBottom: '0.75rem',
              color: 'var(--foreground)'
            }}>
              Contact & Resources
            </h4>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link
                to="/docs"
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--muted-foreground)',
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.color = 'var(--primary)'}
                onMouseOut={(e) => e.target.style.color = 'var(--muted-foreground)'}
              >
                Documentation
              </Link>
              <a
                href="https://github.com/Kubudak90/stableswap-arc-network"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--muted-foreground)',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.color = 'var(--primary)'}
                onMouseOut={(e) => e.target.style.color = 'var(--muted-foreground)'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </a>
              <a
                href="https://arc.io"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--muted-foreground)',
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.color = 'var(--primary)'}
                onMouseOut={(e) => e.target.style.color = 'var(--muted-foreground)'}
              >
                Arc Network
              </a>
              <a
                href="https://testnet.explorer.arc.io"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--muted-foreground)',
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.color = 'var(--primary)'}
                onMouseOut={(e) => e.target.style.color = 'var(--muted-foreground)'}
              >
                Block Explorer
              </a>
            </nav>
          </div>
        </div>

        {/* Bottom Section */}
        <div style={{
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          fontSize: '0.75rem',
          color: 'var(--muted-foreground)'
        }}>
          <p>2026 Arc StableSwap. All rights reserved.</p>
          <p style={{
            padding: '0.25rem 0.75rem',
            backgroundColor: 'var(--accent)',
            borderRadius: '9999px',
            fontSize: '0.75rem'
          }}>
            Testnet - No Real Value
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
