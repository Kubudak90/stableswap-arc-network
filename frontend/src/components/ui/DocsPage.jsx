import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { CONTRACTS } from '../../config'

const DocsPage = () => {
  const [activeSection, setActiveSection] = useState('overview')

  const sections = [
    { id: 'overview', title: 'Overview' },
    { id: 'getting-started', title: 'Getting Started' },
    { id: 'swap', title: 'Swap' },
    { id: 'pools', title: 'Liquidity Pools' },
    { id: 'staking', title: 'Staking & Rewards' },
    { id: 'faucet', title: 'Faucet' },
    { id: 'contracts', title: 'Contract Addresses' },
    { id: 'tokenomics', title: 'Tokenomics' },
  ]

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  const ContractAddress = ({ label, address }) => (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.75rem',
      backgroundColor: 'var(--accent)',
      borderRadius: '0.5rem',
      marginBottom: '0.5rem',
      flexWrap: 'wrap',
      gap: '0.5rem'
    }}>
      <span style={{ fontWeight: '500', minWidth: '120px' }}>{label}</span>
      <code style={{
        fontSize: '0.8rem',
        color: 'var(--muted-foreground)',
        wordBreak: 'break-all',
        flex: 1,
        textAlign: 'right'
      }}>
        {address}
      </code>
      <button
        onClick={() => copyToClipboard(address)}
        style={{
          padding: '0.25rem 0.5rem',
          fontSize: '0.75rem',
          backgroundColor: 'var(--primary)',
          color: 'var(--primary-foreground)',
          border: 'none',
          borderRadius: '0.25rem',
          cursor: 'pointer'
        }}
      >
        Copy
      </button>
    </div>
  )

  return (
    <div className="page-container">
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        gap: '2rem',
        flexWrap: 'wrap'
      }}>
        {/* Sidebar Navigation */}
        <nav style={{
          width: '220px',
          flexShrink: 0,
          position: 'sticky',
          top: '100px',
          height: 'fit-content'
        }}>
          <div className="card" style={{ padding: '1rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--muted-foreground)' }}>
              Documentation
            </h3>
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                  marginBottom: '0.25rem',
                  backgroundColor: activeSection === section.id ? 'var(--accent)' : 'transparent',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: activeSection === section.id ? 'var(--foreground)' : 'var(--muted-foreground)',
                  fontWeight: activeSection === section.id ? '500' : '400',
                  transition: 'all 0.2s'
                }}
              >
                {section.title}
              </button>
            ))}
          </div>
        </nav>

        {/* Main Content */}
        <main style={{ flex: 1, minWidth: '300px' }}>
          <div className="card">
            <div className="card-content" style={{ padding: '2rem', textAlign: 'left', lineHeight: '1.8' }}>

              {/* Overview Section */}
              {activeSection === 'overview' && (
                <>
                  <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1rem' }}>
                    Arc StableSwap Documentation
                  </h1>
                  <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
                    Welcome to Arc StableSwap - a decentralized stablecoin exchange built on Arc Network.
                  </p>

                  <div style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(234, 179, 8, 0.1)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    borderRadius: '0.5rem',
                    marginBottom: '2rem'
                  }}>
                    <strong style={{ color: 'rgb(234, 179, 8)' }}>Testnet Notice:</strong>
                    <span style={{ color: 'var(--muted-foreground)', marginLeft: '0.5rem' }}>
                      This platform runs on Arc Testnet. All tokens are test tokens with no real monetary value.
                    </span>
                  </div>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginTop: '2rem', marginBottom: '1rem' }}>
                    What is Arc StableSwap?
                  </h2>
                  <p style={{ color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                    Arc StableSwap is an Automated Market Maker (AMM) protocol optimized for stablecoin swaps.
                    It uses the StableSwap invariant (similar to Curve Finance) to provide:
                  </p>
                  <ul style={{ color: 'var(--muted-foreground)', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
                    <li><strong>Low Slippage:</strong> Minimal price impact on trades between stablecoins</li>
                    <li><strong>Capital Efficiency:</strong> Better rates for liquidity providers</li>
                    <li><strong>Low Fees:</strong> 0.04% swap fee on all trades</li>
                    <li><strong>Yield Opportunities:</strong> Earn ASS tokens by providing liquidity</li>
                  </ul>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginTop: '2rem', marginBottom: '1rem' }}>
                    Key Features
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'var(--accent)', borderRadius: '0.5rem' }}>
                      <h4 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>2-Pool</h4>
                      <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
                        tUSDC/tUSDT pair for efficient stablecoin swaps
                      </p>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: 'var(--accent)', borderRadius: '0.5rem' }}>
                      <h4 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>3-Pool</h4>
                      <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
                        tUSDC/tUSDT/tUSDY for broader liquidity
                      </p>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: 'var(--accent)', borderRadius: '0.5rem' }}>
                      <h4 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>LP Staking</h4>
                      <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
                        Stake LP tokens to earn ASS rewards
                      </p>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: 'var(--accent)', borderRadius: '0.5rem' }}>
                      <h4 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>ASS Staking</h4>
                      <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
                        Stake ASS to earn protocol fees
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Getting Started Section */}
              {activeSection === 'getting-started' && (
                <>
                  <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1.5rem' }}>
                    Getting Started
                  </h1>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                    1. Install MetaMask
                  </h2>
                  <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>
                    Download and install the MetaMask browser extension from{' '}
                    <a href="https://metamask.io" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>
                      metamask.io
                    </a>
                  </p>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                    2. Connect to Arc Testnet
                  </h2>
                  <p style={{ color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                    When you click "Connect Wallet", the app will automatically prompt you to add Arc Testnet.
                    If not, add it manually with these details:
                  </p>
                  <div style={{
                    backgroundColor: 'var(--accent)',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    marginBottom: '1.5rem',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem'
                  }}>
                    <p><strong>Network Name:</strong> Arc Testnet</p>
                    <p><strong>RPC URL:</strong> https://rpc-testnet.arc.io</p>
                    <p><strong>Chain ID:</strong> 5042002</p>
                    <p><strong>Currency Symbol:</strong> ARC</p>
                    <p><strong>Explorer:</strong> https://testnet.explorer.arc.io</p>
                  </div>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                    3. Get Test Tokens
                  </h2>
                  <p style={{ color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                    You'll need ARC for gas fees and test stablecoins to use the platform:
                  </p>
                  <ul style={{ color: 'var(--muted-foreground)', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
                    <li><strong>ARC:</strong> Get testnet ARC from the Arc Network faucet</li>
                    <li><strong>Test Stablecoins:</strong> Use our <Link to="/faucet" style={{ color: 'var(--primary)' }}>Faucet</Link> to get tUSDC, tUSDT, and tUSDY</li>
                  </ul>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                    4. Start Using the Platform
                  </h2>
                  <ul style={{ color: 'var(--muted-foreground)', paddingLeft: '1.5rem' }}>
                    <li><Link to="/" style={{ color: 'var(--primary)' }}>Swap</Link> - Exchange stablecoins</li>
                    <li><Link to="/pools" style={{ color: 'var(--primary)' }}>Pools</Link> - Add liquidity and earn fees</li>
                    <li><Link to="/staking" style={{ color: 'var(--primary)' }}>Staking</Link> - Stake LP tokens for ASS rewards</li>
                  </ul>
                </>
              )}

              {/* Swap Section */}
              {activeSection === 'swap' && (
                <>
                  <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1.5rem' }}>
                    Swap
                  </h1>
                  <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>
                    Swap between stablecoins with minimal slippage using our optimized StableSwap algorithm.
                  </p>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                    How to Swap
                  </h2>
                  <ol style={{ color: 'var(--muted-foreground)', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
                    <li>Connect your wallet</li>
                    <li>Select the pool (2-Pool or 3-Pool)</li>
                    <li>Choose the tokens you want to swap</li>
                    <li>Enter the amount</li>
                    <li>Review the exchange rate and slippage</li>
                    <li>Click "Swap" and confirm the transaction</li>
                  </ol>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                    Fees & Slippage
                  </h2>
                  <ul style={{ color: 'var(--muted-foreground)', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
                    <li><strong>Swap Fee:</strong> 0.04% per trade</li>
                    <li><strong>Admin Fee:</strong> 50% of swap fees go to ASS stakers</li>
                    <li><strong>Slippage Tolerance:</strong> Default 0.5% (adjustable in settings)</li>
                  </ul>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                    Available Pairs
                  </h2>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'var(--accent)', borderRadius: '0.5rem' }}>
                      <h4 style={{ fontWeight: '600' }}>2-Pool</h4>
                      <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>tUSDC ↔ tUSDT</p>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: 'var(--accent)', borderRadius: '0.5rem' }}>
                      <h4 style={{ fontWeight: '600' }}>3-Pool</h4>
                      <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>tUSDC ↔ tUSDT ↔ tUSDY (any direction)</p>
                    </div>
                  </div>
                </>
              )}

              {/* Pools Section */}
              {activeSection === 'pools' && (
                <>
                  <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1.5rem' }}>
                    Liquidity Pools
                  </h1>
                  <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>
                    Provide liquidity to earn swap fees and LP tokens that can be staked for additional rewards.
                  </p>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                    How to Add Liquidity
                  </h2>
                  <ol style={{ color: 'var(--muted-foreground)', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
                    <li>Navigate to the Pools page</li>
                    <li>Select a pool (2-Pool or 3-Pool)</li>
                    <li>Enter the amount of tokens to deposit</li>
                    <li>Approve token spending (first time only)</li>
                    <li>Click "Add Liquidity" and confirm</li>
                    <li>Receive LP tokens representing your share</li>
                  </ol>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                    LP Tokens
                  </h2>
                  <p style={{ color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                    When you add liquidity, you receive LP (Liquidity Provider) tokens:
                  </p>
                  <ul style={{ color: 'var(--muted-foreground)', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
                    <li><strong>ARC-2POOL-LP:</strong> LP token for the 2-Pool (tUSDC/tUSDT)</li>
                    <li><strong>ARC-3POOL-LP:</strong> LP token for the 3-Pool (tUSDC/tUSDT/tUSDY)</li>
                  </ul>
                  <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>
                    LP tokens automatically accrue swap fees. You can also stake them for ASS rewards.
                  </p>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                    Removing Liquidity
                  </h2>
                  <p style={{ color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                    You can remove liquidity at any time:
                  </p>
                  <ul style={{ color: 'var(--muted-foreground)', paddingLeft: '1.5rem' }}>
                    <li>Withdraw in balanced proportions (all tokens)</li>
                    <li>Withdraw in a single token (with slippage)</li>
                  </ul>
                </>
              )}

              {/* Staking Section */}
              {activeSection === 'staking' && (
                <>
                  <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1.5rem' }}>
                    Staking & Rewards
                  </h1>
                  <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>
                    Earn additional rewards by staking your LP tokens or ASS tokens.
                  </p>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                    LP Token Staking
                  </h2>
                  <p style={{ color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                    Stake your LP tokens in the LiquidityRewards contract to earn ASS tokens:
                  </p>
                  <ol style={{ color: 'var(--muted-foreground)', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
                    <li>Add liquidity to a pool and receive LP tokens</li>
                    <li>Go to the Staking page</li>
                    <li>Select the LP Staking tab</li>
                    <li>Approve and stake your LP tokens</li>
                    <li>Earn ASS rewards over time</li>
                    <li>Claim rewards or unstake at any time</li>
                  </ol>

                  <div style={{
                    padding: '1rem',
                    backgroundColor: 'var(--accent)',
                    borderRadius: '0.5rem',
                    marginBottom: '1.5rem'
                  }}>
                    <h4 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Reward Rates</h4>
                    <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                      2-Pool LP: 1 ASS per block | 3-Pool LP: 1.5 ASS per block
                    </p>
                  </div>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                    ASS Token Staking
                  </h2>
                  <p style={{ color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                    Stake ASS tokens to earn a share of protocol fees:
                  </p>
                  <ul style={{ color: 'var(--muted-foreground)', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
                    <li>50% of all swap fees are distributed to ASS stakers</li>
                    <li>Fees are distributed in the tokens traded (tUSDC, tUSDT, tUSDY)</li>
                    <li>No lock-up period - unstake anytime</li>
                  </ul>
                </>
              )}

              {/* Faucet Section */}
              {activeSection === 'faucet' && (
                <>
                  <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1.5rem' }}>
                    Faucet
                  </h1>
                  <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>
                    Get free test tokens to use on the platform.
                  </p>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                    Available Tokens
                  </h2>
                  <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'var(--accent)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '500' }}>tUSDC</span>
                      <span style={{ color: 'var(--muted-foreground)' }}>Test USD Coin</span>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: 'var(--accent)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '500' }}>tUSDT</span>
                      <span style={{ color: 'var(--muted-foreground)' }}>Test Tether</span>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: 'var(--accent)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '500' }}>tUSDY</span>
                      <span style={{ color: 'var(--muted-foreground)' }}>Test USD Yield</span>
                    </div>
                  </div>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                    How to Use
                  </h2>
                  <ol style={{ color: 'var(--muted-foreground)', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
                    <li>Connect your wallet</li>
                    <li>Go to the <Link to="/faucet" style={{ color: 'var(--primary)' }}>Faucet</Link> page</li>
                    <li>Click "Claim Tokens"</li>
                    <li>Receive 1000 of each test token</li>
                  </ol>

                  <div style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '0.5rem'
                  }}>
                    <strong style={{ color: 'rgb(59, 130, 246)' }}>Note:</strong>
                    <span style={{ color: 'var(--muted-foreground)', marginLeft: '0.5rem' }}>
                      There's a 24-hour cooldown between faucet claims for each address.
                    </span>
                  </div>
                </>
              )}

              {/* Contracts Section */}
              {activeSection === 'contracts' && (
                <>
                  <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1.5rem' }}>
                    Contract Addresses
                  </h1>
                  <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>
                    All contracts are deployed on Arc Testnet (Chain ID: 5042002).
                  </p>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                    Core Contracts
                  </h2>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <ContractAddress label="2-Pool (Swap)" address={CONTRACTS.swap} />
                    <ContractAddress label="3-Pool (Swap)" address={CONTRACTS.swap3Pool} />
                    <ContractAddress label="Liquidity Rewards" address={CONTRACTS.liquidityRewards} />
                    <ContractAddress label="Fee Distributor" address={CONTRACTS.feeDistributor} />
                    <ContractAddress label="Faucet" address={CONTRACTS.faucetV3} />
                  </div>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                    Token Contracts
                  </h2>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <ContractAddress label="tUSDC" address={CONTRACTS.testUSDC} />
                    <ContractAddress label="tUSDT" address={CONTRACTS.testUSDT} />
                    <ContractAddress label="tUSDY" address={CONTRACTS.testUSDY} />
                    <ContractAddress label="ASS Token" address={CONTRACTS.assToken} />
                  </div>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                    LP Token Contracts
                  </h2>
                  <div>
                    <ContractAddress label="2-Pool LP" address={CONTRACTS.lp2Pool} />
                    <ContractAddress label="3-Pool LP" address={CONTRACTS.lp3Pool} />
                  </div>
                </>
              )}

              {/* Tokenomics Section */}
              {activeSection === 'tokenomics' && (
                <>
                  <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1.5rem' }}>
                    Tokenomics
                  </h1>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                    ASS Token (Arc StableSwap Token)
                  </h2>
                  <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>
                    ASS is the governance and utility token of Arc StableSwap.
                  </p>

                  <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'var(--accent)', borderRadius: '0.5rem' }}>
                      <h4 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Total Supply</h4>
                      <p style={{ color: 'var(--muted-foreground)', fontSize: '1.25rem' }}>100,000,000 ASS</p>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: 'var(--accent)', borderRadius: '0.5rem' }}>
                      <h4 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Decimals</h4>
                      <p style={{ color: 'var(--muted-foreground)', fontSize: '1.25rem' }}>18</p>
                    </div>
                  </div>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                    Utility
                  </h2>
                  <ul style={{ color: 'var(--muted-foreground)', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
                    <li><strong>Fee Sharing:</strong> Stake ASS to earn protocol fees</li>
                    <li><strong>Governance:</strong> Vote on protocol parameters (future)</li>
                    <li><strong>Boosted Rewards:</strong> Higher staking rewards (future)</li>
                  </ul>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                    Emission Schedule
                  </h2>
                  <p style={{ color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                    ASS tokens are emitted to LP stakers:
                  </p>
                  <ul style={{ color: 'var(--muted-foreground)', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
                    <li>2-Pool stakers: 1 ASS per block</li>
                    <li>3-Pool stakers: 1.5 ASS per block</li>
                  </ul>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                    Test Stablecoins
                  </h2>
                  <p style={{ color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                    All stablecoins on this testnet platform use 6 decimals (like real USDC/USDT):
                  </p>
                  <ul style={{ color: 'var(--muted-foreground)', paddingLeft: '1.5rem' }}>
                    <li><strong>tUSDC:</strong> Test USD Coin - 6 decimals</li>
                    <li><strong>tUSDT:</strong> Test Tether - 6 decimals</li>
                    <li><strong>tUSDY:</strong> Test USD Yield - 6 decimals</li>
                  </ul>
                </>
              )}

            </div>
          </div>

          {/* Bottom Navigation */}
          <div style={{ marginTop: '1.5rem' }}>
            <Link to="/" className="btn btn-outline">
              Back to App
            </Link>
          </div>
        </main>
      </div>
    </div>
  )
}

export default DocsPage
