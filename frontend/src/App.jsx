import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ethers } from 'ethers'
import { CONTRACTS, NETWORK, ABIS } from './config'

// New UI Components
import Header from './components/ui/Header'
import SwapCard from './components/ui/SwapCard'
import PoolCard from './components/ui/PoolCard'
import StakingCard from './components/ui/StakingCard'
import FaucetCard from './components/ui/FaucetCard'

// Styles
import './styles/shadcn.css'

// Page wrapper component
const PageContainer = ({ children }) => (
  <div className="page-container">
    {children}
  </div>
)

function App() {
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [account, setAccount] = useState(null)
  const [contracts, setContracts] = useState({})
  const [currentChainId, setCurrentChainId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Initialize contracts helper
  const initializeContracts = async (signerInstance) => {
    try {
      const swapContract = new ethers.Contract(CONTRACTS.swap, ABIS.swap, signerInstance)
      const swap3PoolContract = new ethers.Contract(CONTRACTS.swap3Pool, ABIS.swap3Pool, signerInstance)
      const token0Contract = new ethers.Contract(CONTRACTS.testUSDC, ABIS.erc20, signerInstance)
      const token1Contract = new ethers.Contract(CONTRACTS.testUSDT, ABIS.erc20, signerInstance)
      const token2Contract = new ethers.Contract(CONTRACTS.testUSDY, ABIS.erc20, signerInstance)
      const liquidityRewardsContract = new ethers.Contract(CONTRACTS.liquidityRewards, ABIS.liquidityRewards, signerInstance)
      const assTokenContract = new ethers.Contract(CONTRACTS.assToken, ABIS.erc20, signerInstance)
      const stakingContractInstance = new ethers.Contract(CONTRACTS.stakingContract, ABIS.stakingContract, signerInstance)
      const feeDistributorContract = new ethers.Contract(CONTRACTS.feeDistributor, ABIS.feeDistributor, signerInstance)

      setContracts({
        swap: swapContract,
        swap3Pool: swap3PoolContract,
        token0: token0Contract,
        token1: token1Contract,
        token2: token2Contract,
        liquidityRewards: liquidityRewardsContract,
        assToken: assTokenContract,
        stakingContract: stakingContractInstance,
        feeDistributor: feeDistributorContract
      })

      console.log('Contracts initialized successfully')
      return true
    } catch (err) {
      console.error('Failed to initialize contracts:', err)
      setError('Failed to initialize contracts: ' + err.message)
      return false
    }
  }

  // Listen for network changes
  useEffect(() => {
    if (window.ethereum) {
      const handleChainChanged = async (chainId) => {
        console.log('Chain changed to:', chainId)
        setCurrentChainId(chainId)

        if (chainId === NETWORK.chainIdHex) {
          console.log('Now on Arc Testnet!')
          if (account) {
            try {
              const newProvider = new ethers.BrowserProvider(window.ethereum)
              const newSigner = await newProvider.getSigner()
              setProvider(newProvider)
              setSigner(newSigner)
              await initializeContracts(newSigner)
              setError(null)
            } catch (err) {
              console.error('Failed to reinitialize on chain change:', err)
              setError('Failed to reinitialize contracts. Please refresh the page.')
            }
          }
        } else {
          console.log('Not on Arc Testnet, current chain:', chainId)
          setError('Please switch to Arc Testnet')
          // Clear contracts when on wrong network
          setContracts({})
        }
      }

      const handleAccountsChanged = async (accounts) => {
        console.log('Accounts changed:', accounts)
        if (accounts.length === 0) {
          disconnectWallet()
        } else if (accounts[0] !== account) {
          setAccount(accounts[0])
          // Reinitialize contracts for new account
          if (signer) {
            try {
              const newProvider = new ethers.BrowserProvider(window.ethereum)
              const newSigner = await newProvider.getSigner()
              setProvider(newProvider)
              setSigner(newSigner)
              await initializeContracts(newSigner)
            } catch (err) {
              console.error('Failed to reinitialize on account change:', err)
            }
          }
        }
      }

      window.ethereum.on('chainChanged', handleChainChanged)
      window.ethereum.on('accountsChanged', handleAccountsChanged)

      return () => {
        window.ethereum.removeListener('chainChanged', handleChainChanged)
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      }
    }
  }, [account, signer])

  const connectWallet = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not found! Please install MetaMask.')
      }

      console.log('Starting wallet connection...')

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      if (accounts.length === 0) {
        throw new Error('No accounts found')
      }

      const userAccount = accounts[0]
      console.log('Account connected:', userAccount)

      // First ensure we're on the correct network
      await ensureArcTestnet()

      const finalChainId = await window.ethereum.request({ method: 'eth_chainId' })
      if (finalChainId !== NETWORK.chainIdHex) {
        throw new Error('Could not switch to Arc Testnet. Please switch manually.')
      }

      // Create provider and signer AFTER network switch to ensure correct network
      const newProvider = new ethers.BrowserProvider(window.ethereum)
      const newSigner = await newProvider.getSigner()

      setProvider(newProvider)
      setSigner(newSigner)
      setAccount(userAccount)
      setCurrentChainId(finalChainId)

      await initializeContracts(newSigner)

      console.log('Wallet connected successfully')
    } catch (err) {
      console.error('Wallet connection error:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const ensureArcTestnet = async () => {
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      console.log('Current chain ID:', chainId)

      if (chainId === NETWORK.chainIdHex) {
        console.log('Already on Arc Testnet')
        return
      }

      console.log('Switching to Arc Testnet...')

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: NETWORK.chainIdHex }]
        })
        console.log('Successfully switched to Arc Testnet')
        return
      } catch (switchError) {
        console.log('Switch failed, trying to add network:', switchError)

        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: NETWORK.chainIdHex,
                chainName: NETWORK.name,
                rpcUrls: [NETWORK.rpcUrl],
                nativeCurrency: NETWORK.nativeCurrency,
                blockExplorerUrls: [NETWORK.explorerUrl]
              }]
            })
            console.log('Arc Testnet added successfully')

            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: NETWORK.chainIdHex }]
            })
            console.log('Successfully switched to Arc Testnet after adding')
          } catch (addError) {
            console.error('Could not add Arc Testnet:', addError)
            throw new Error('Could not add Arc Testnet. Please add it manually.')
          }
        } else {
          throw new Error('Could not switch to Arc Testnet. Please switch manually.')
        }
      }
    } catch (err) {
      console.error('ensureArcTestnet error:', err)
      throw err
    }
  }

  const disconnectWallet = () => {
    setProvider(null)
    setSigner(null)
    setAccount(null)
    setContracts({})
    setError(null)
    console.log('Wallet disconnected')
  }

  return (
    <Router>
      <div className="shadcn-app">
        <Header
          account={account}
          connectWallet={connectWallet}
          disconnectWallet={disconnectWallet}
          isLoading={isLoading}
          currentChainId={currentChainId}
        />

        {error && (
          <div className="alert alert-error" style={{
            position: 'fixed',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            maxWidth: '90%'
          }}>
            <span className="alert-content">{error}</span>
            <button className="alert-close" onClick={() => setError(null)}>&times;</button>
          </div>
        )}

        <Routes>
          <Route path="/" element={
            <PageContainer>
              <SwapCard contracts={contracts} account={account} />
            </PageContainer>
          } />
          <Route path="/pool" element={
            <PageContainer>
              <PoolCard contracts={contracts} account={account} />
            </PageContainer>
          } />
          <Route path="/staking" element={
            <StakingCard
              contracts={contracts}
              account={account}
              provider={provider}
              signer={signer}
            />
          } />
          <Route path="/faucet" element={
            <FaucetCard
              contracts={contracts}
              account={account}
            />
          } />
        </Routes>
      </div>
    </Router>
  )
}

export default App
