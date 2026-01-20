import React from 'react'
import { Link } from 'react-router-dom'

const TermsOfService = () => {
  return (
    <div className="page-container">
      <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="card-header">
          <h2 className="card-title">Terms of Service</h2>
          <p className="card-description">Last updated: January 2026</p>
        </div>
        <div className="card-content" style={{ textAlign: 'left', lineHeight: '1.8' }}>

          <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: '600' }}>1. Acceptance of Terms</h3>
          <p style={{ marginBottom: '1rem', color: 'var(--muted-foreground)' }}>
            By accessing or using Arc StableSwap ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
          </p>

          <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: '600' }}>2. Description of Service</h3>
          <p style={{ marginBottom: '1rem', color: 'var(--muted-foreground)' }}>
            Arc StableSwap is a decentralized application (dApp) that provides an automated market maker (AMM) protocol for swapping stablecoins on the Arc Network. The Service operates through smart contracts deployed on the blockchain.
          </p>

          <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: '600' }}>3. Testnet Disclaimer</h3>
          <p style={{ marginBottom: '1rem', color: 'var(--muted-foreground)' }}>
            <strong>IMPORTANT:</strong> Arc StableSwap is currently deployed on Arc Testnet. All tokens available on this platform are test tokens with NO REAL MONETARY VALUE. This Service is provided for testing, development, and educational purposes only.
          </p>

          <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: '600' }}>4. User Responsibilities</h3>
          <p style={{ marginBottom: '1rem', color: 'var(--muted-foreground)' }}>
            You are responsible for:
          </p>
          <ul style={{ marginBottom: '1rem', color: 'var(--muted-foreground)', paddingLeft: '1.5rem' }}>
            <li>Maintaining the security of your wallet and private keys</li>
            <li>All transactions made through your connected wallet</li>
            <li>Understanding blockchain technology and associated risks</li>
            <li>Complying with applicable laws in your jurisdiction</li>
          </ul>

          <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: '600' }}>5. Risks</h3>
          <p style={{ marginBottom: '1rem', color: 'var(--muted-foreground)' }}>
            Using decentralized applications involves risks including but not limited to:
          </p>
          <ul style={{ marginBottom: '1rem', color: 'var(--muted-foreground)', paddingLeft: '1.5rem' }}>
            <li>Smart contract vulnerabilities</li>
            <li>Blockchain network issues</li>
            <li>Loss of funds due to user error</li>
            <li>Price volatility and impermanent loss</li>
            <li>Regulatory changes</li>
          </ul>

          <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: '600' }}>6. No Warranty</h3>
          <p style={{ marginBottom: '1rem', color: 'var(--muted-foreground)' }}>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
          </p>

          <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: '600' }}>7. Limitation of Liability</h3>
          <p style={{ marginBottom: '1rem', color: 'var(--muted-foreground)' }}>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
          </p>

          <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: '600' }}>8. Prohibited Activities</h3>
          <p style={{ marginBottom: '1rem', color: 'var(--muted-foreground)' }}>
            You agree not to:
          </p>
          <ul style={{ marginBottom: '1rem', color: 'var(--muted-foreground)', paddingLeft: '1.5rem' }}>
            <li>Use the Service for illegal activities</li>
            <li>Attempt to exploit or attack the smart contracts</li>
            <li>Interfere with the proper functioning of the Service</li>
            <li>Misrepresent your identity or affiliation</li>
          </ul>

          <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: '600' }}>9. Modifications</h3>
          <p style={{ marginBottom: '1rem', color: 'var(--muted-foreground)' }}>
            We reserve the right to modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the modified Terms.
          </p>

          <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: '600' }}>10. Contact</h3>
          <p style={{ marginBottom: '1rem', color: 'var(--muted-foreground)' }}>
            For questions about these Terms, please contact us through our GitHub repository.
          </p>

          <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <Link to="/" className="btn btn-outline" style={{ marginRight: '0.5rem' }}>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TermsOfService
