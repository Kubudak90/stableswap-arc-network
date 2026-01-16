import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import SwapPanel from './components/SwapPanel'
import PoolPanel from './components/PoolPanel'
import Swap3PoolPanel from './components/Swap3PoolPanel'
import Pool3Panel from './components/Pool3Panel'
import UnifiedSwapPanel from './components/UnifiedSwapPanel'
import UnifiedPoolPanel from './components/UnifiedPoolPanel'
import FaucetPanel from './components/FaucetPanel'
import StakingPanel from './components/StakingPanel'
import Header from './components/Header'
import { ethers } from 'ethers'
import { CONTRACTS, NETWORK, ABIS } from './config'

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
          // Reinitialize contracts if wallet is connected
          if (account) {
            try {
              const newProvider = new ethers.BrowserProvider(window.ethereum)
              const newSigner = await newProvider.getSigner()
              await initializeContracts(newSigner)
            } catch (err) {
              console.error('Failed to reinitialize on chain change:', err)
            }
          }
        } else {
          console.log('Not on Arc Testnet, current chain:', chainId)
          setError('Please switch to Arc Testnet')
        }
      }

      const handleAccountsChanged = (accounts) => {
        console.log('Accounts changed:', accounts)
        if (accounts.length === 0) {
          disconnectWallet()
        } else if (accounts[0] !== account) {
          setAccount(accounts[0])
        }
      }

      window.ethereum.on('chainChanged', handleChainChanged)
      window.ethereum.on('accountsChanged', handleAccountsChanged)

      return () => {
        window.ethereum.removeListener('chainChanged', handleChainChanged)
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      }
    }
  }, [account])

  const connectWallet = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (!window.ethereum) {
        throw new Error('MetaMask bulunamadı! Lütfen MetaMask yükleyin.')
      }

      console.log('Starting wallet connection...')

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      if (accounts.length === 0) {
        throw new Error('No accounts found')
      }

      const userAccount = accounts[0]
      console.log('Account connected:', userAccount)

      // Create provider and signer
      const newProvider = new ethers.BrowserProvider(window.ethereum)
      const newSigner = await newProvider.getSigner()

      setProvider(newProvider)
      setSigner(newSigner)
      setAccount(userAccount)

      // Handle network switching
      await ensureArcTestnet()

      // Double check we're on the right network
      const finalChainId = await window.ethereum.request({ method: 'eth_chainId' })
      if (finalChainId !== NETWORK.chainIdHex) {
        throw new Error('Arc Testnet\'e geçiş yapılamadı. Lütfen manuel olarak geçin.')
      }

      // Initialize contracts
      await initializeContracts(newSigner)

      console.log('Wallet connected successfully')
    } catch (err) {
      console.error('Wallet connection error:', err)
      setError(err.message)
      alert('Cüzdan bağlanamadı: ' + err.message)
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

            // Try to switch again after adding
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: NETWORK.chainIdHex }]
            })
            console.log('Successfully switched to Arc Testnet after adding')
          } catch (addError) {
            console.error('Could not add Arc Testnet:', addError)
            throw new Error('Arc Testnet eklenemedi. Lütfen manuel olarak ekleyin.')
          }
        } else {
          throw new Error('Arc Testnet\'e geçiş yapılamadı. Lütfen manuel olarak geçin.')
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
      <div className="App">
        <Header
          account={account}
          connectWallet={connectWallet}
          disconnectWallet={disconnectWallet}
          contracts={contracts}
          currentChainId={currentChainId}
          isLoading={isLoading}
          error={error}
        />
        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}
        <Routes>
          <Route path="/" element={
            <UnifiedSwapPanel
              contracts={contracts}
              account={account}
              provider={provider}
              signer={signer}
            />
          } />
          <Route path="/pool" element={
            <UnifiedPoolPanel
              contracts={contracts}
              account={account}
              provider={provider}
              signer={signer}
            />
          } />
          <Route path="/staking" element={
            <StakingPanel
              contracts={contracts}
              account={account}
              provider={provider}
              signer={signer}
            />
          } />
          <Route path="/faucet" element={
            <FaucetPanel
              contracts={contracts}
              account={account}
            />
          } />
          {/* Legacy routes */}
          <Route path="/pool-old-2" element={<PoolPanel contracts={contracts} account={account} />} />
          <Route path="/pool-old-3" element={<Pool3Panel contracts={contracts} account={account} />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
