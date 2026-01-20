import React from 'react'
import { Link } from 'react-router-dom'

const PrivacyPolicy = () => {
  return (
    <div className="page-container">
      <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="card-header">
          <h2 className="card-title">Privacy Policy</h2>
          <p className="card-description">Last updated: January 2026</p>
        </div>
        <div className="card-content" style={{ textAlign: 'left', lineHeight: '1.8' }}>

          <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: '600' }}>1. Introduction</h3>
          <p style={{ marginBottom: '1rem', color: 'var(--muted-foreground)' }}>
            Arc StableSwap ("we", "our", or "us") operates arcstableswap.app. This Privacy Policy explains how we collect, use, and protect information when you use our decentralized application (dApp).
          </p>

          <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: '600' }}>2. Information We Collect</h3>
          <p style={{ marginBottom: '1rem', color: 'var(--muted-foreground)' }}>
            <strong>Blockchain Data:</strong> When you interact with our smart contracts, your wallet address and transaction data are recorded on the public blockchain. This data is publicly visible and immutable.
          </p>
          <p style={{ marginBottom: '1rem', color: 'var(--muted-foreground)' }}>
            <strong>No Personal Data Collection:</strong> We do not collect personal information such as names, email addresses, or IP addresses. Our dApp operates in a decentralized manner.
          </p>

          <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: '600' }}>3. Wallet Connection</h3>
          <p style={{ marginBottom: '1rem', color: 'var(--muted-foreground)' }}>
            When you connect your wallet (e.g., MetaMask), we only access your public wallet address to enable transactions. We never have access to your private keys or seed phrases.
          </p>

          <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: '600' }}>4. Third-Party Services</h3>
          <p style={{ marginBottom: '1rem', color: 'var(--muted-foreground)' }}>
            Our dApp may interact with third-party services including:
          </p>
          <ul style={{ marginBottom: '1rem', color: 'var(--muted-foreground)', paddingLeft: '1.5rem' }}>
            <li>Arc Network blockchain infrastructure</li>
            <li>Wallet providers (MetaMask, etc.)</li>
            <li>Vercel hosting services</li>
          </ul>

          <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: '600' }}>5. Cookies</h3>
          <p style={{ marginBottom: '1rem', color: 'var(--muted-foreground)' }}>
            We do not use cookies or tracking technologies. Any local storage used is solely for improving your user experience (e.g., remembering UI preferences).
          </p>

          <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: '600' }}>6. Data Security</h3>
          <p style={{ marginBottom: '1rem', color: 'var(--muted-foreground)' }}>
            All interactions with our smart contracts are secured by blockchain cryptography. We recommend using hardware wallets for additional security.
          </p>

          <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: '600' }}>7. Testnet Notice</h3>
          <p style={{ marginBottom: '1rem', color: 'var(--muted-foreground)' }}>
            Arc StableSwap currently operates on Arc Testnet. All tokens are test tokens with no real monetary value. This platform is for testing and educational purposes.
          </p>

          <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: '600' }}>8. Changes to This Policy</h3>
          <p style={{ marginBottom: '1rem', color: 'var(--muted-foreground)' }}>
            We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date.
          </p>

          <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: '600' }}>9. Contact Us</h3>
          <p style={{ marginBottom: '1rem', color: 'var(--muted-foreground)' }}>
            If you have any questions about this Privacy Policy, please contact us through our GitHub repository.
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

export default PrivacyPolicy
