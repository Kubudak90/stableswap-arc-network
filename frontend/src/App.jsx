import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import SwapPanel from './components/SwapPanel'
import PoolPanel from './components/PoolPanel'
import Swap3PoolPanel from './components/Swap3PoolPanel'
import Pool3Panel from './components/Pool3Panel'
import UnifiedSwapPanel from './components/UnifiedSwapPanel'
import UnifiedPoolPanel from './components/UnifiedPoolPanel'
import FaucetPanel from './components/FaucetPanel'
import Header from './components/Header'
import { ethers } from 'ethers'

// Deployed contract addresses (NEW - with mintable tokens)
const CONTRACTS = {
  testUSDC: "0x1eccf89268C90C5Ac954ed020Ca498D96F9f9733", // TestUSDCV2 (mintable)
  testUSDT: "0x787804d1f98F4Da65C6de63AaA00906A8C6868F3", // TestUSDTV2 (mintable)
  testUSDY: "0x4D81e87902aA4Cf67D99055D44b6D0341fCc419a", // TestUSDYV2 (mintable)
  swap: "0xC4d8543f5b879eDe6885c43647E32e67Ca6DFC87", // StableSwap V2 - 1:1 oran (2 tokens, with removeLiquidity)
  swap3Pool: "0x34a0d6A10f26A31Ca2f7F71d4eA4B76F1Cbc2806", // StableSwap3Pool - 1:1:1 oran (3 tokens)
  faucetV3: "0xdbF8fC63B9cFa254B1b6eD80fa40927271A4dfC0" // TestTokenFaucetV3 (with developer support)
}

// StableSwap ABI (2 tokens)
const SWAP_ABI = [
  "function addLiquidity(uint256 amount0, uint256 amount1) external",
  "function removeLiquidity(uint256 amount0, uint256 amount1) external",
  "function swap(bool zeroForOne, uint256 amountIn) external returns (uint256 amountOut)",
  "function getReserves() external view returns (uint256, uint256)",
  "function getAmountOut(uint256 amountIn, bool zeroForOne) external view returns (uint256)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)"
]

// StableSwap3Pool ABI (3 tokens)
const SWAP3POOL_ABI = [
  "function addLiquidity(uint256 amount0, uint256 amount1, uint256 amount2) external",
  "function removeLiquidity(uint256 amount0, uint256 amount1, uint256 amount2) external",
  "function swap(uint8 tokenIn, uint8 tokenOut, uint256 amountIn) external returns (uint256 amountOut)",
  "function getReserves() external view returns (uint256, uint256, uint256)",
  "function getAmountOut(uint256 amountIn, uint8 tokenIn, uint8 tokenOut) external view returns (uint256)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
  "function token2() external view returns (address)"
]

// ERC20 ABI
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
]

function App() {
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [account, setAccount] = useState(null)
  const [contracts, setContracts] = useState({})
  const [currentChainId, setCurrentChainId] = useState(null)

  // Listen for network changes
  useEffect(() => {
    if (window.ethereum) {
      const handleChainChanged = (chainId) => {
        console.log('Chain changed to:', chainId)
        setCurrentChainId(chainId)
        
        if (chainId === '0x4cef52') { // 5050194 in decimal
          console.log('Now on Arc Testnet!')
          // Reinitialize contracts if wallet is connected
          if (account) {
            const provider = new ethers.BrowserProvider(window.ethereum)
            provider.getSigner().then(signer => {
              const swapContract = new ethers.Contract(CONTRACTS.swap, SWAP_ABI, signer)
              const swap3PoolContract = new ethers.Contract(CONTRACTS.swap3Pool, SWAP3POOL_ABI, signer)
              const token0Contract = new ethers.Contract(CONTRACTS.testUSDC, ERC20_ABI, signer)
              const token1Contract = new ethers.Contract(CONTRACTS.testUSDT, ERC20_ABI, signer)
              const token2Contract = new ethers.Contract(CONTRACTS.testUSDY, ERC20_ABI, signer)

              setContracts({
                swap: swapContract,
                swap3Pool: swap3PoolContract,
                token0: token0Contract,
                token1: token1Contract,
                token2: token2Contract
              })
            })
          }
        } else {
          console.log('Not on Arc Testnet, current chain:', chainId)
        }
      }

      const handleAccountsChanged = (accounts) => {
        console.log('Accounts changed:', accounts)
        if (accounts.length === 0) {
          // User disconnected
          disconnectWallet()
        } else if (accounts[0] !== account) {
          // User switched accounts
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
    try {
      if (window.ethereum) {
        console.log('Starting wallet connection...')
        
        // First, request account access
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        })
        
        if (accounts.length === 0) {
          throw new Error('No accounts found')
        }
        
        const account = accounts[0]
        console.log('Account connected:', account)

        // Create provider and signer
        const provider = new ethers.BrowserProvider(window.ethereum)
        const signer = await provider.getSigner()
        
        setProvider(provider)
        setSigner(signer)
        setAccount(account)

        // Now handle network switching - more aggressive
        try {
          await ensureArcTestnet()
          
          // Double check we're on the right network
          const finalChainId = await window.ethereum.request({ method: 'eth_chainId' })
          if (finalChainId !== '0x4cef52') { // 5050194 in decimal
            console.warn('Still not on Arc Testnet after switching, current chain:', finalChainId)
            alert('⚠️ Arc Testnet\'e geçiş yapılamadı!\n\nLütfen:\n1. "Arc Network Ekle" butonuna tıklayın\n2. Veya manuel olarak Arc Testnet\'e geçin\n\nSonra tekrar "Wallet Bağla" butonuna tıklayın.')
            return
          }
        } catch (networkError) {
          console.error('Network switching failed:', networkError)
          alert('⚠️ Network değiştirme hatası!\n\n' + networkError.message + '\n\nLütfen "Arc Network Ekle" butonunu kullanın.')
          return
        }

        // Initialize contracts after network is set
        const swapContract = new ethers.Contract(CONTRACTS.swap, SWAP_ABI, signer)
        const swap3PoolContract = new ethers.Contract(CONTRACTS.swap3Pool, SWAP3POOL_ABI, signer)
        const token0Contract = new ethers.Contract(CONTRACTS.testUSDC, ERC20_ABI, signer)
        const token1Contract = new ethers.Contract(CONTRACTS.testUSDT, ERC20_ABI, signer)
        const token2Contract = new ethers.Contract(CONTRACTS.testUSDY, ERC20_ABI, signer)

        setContracts({
          swap: swapContract,
          swap3Pool: swap3PoolContract,
          token0: token0Contract,
          token1: token1Contract,
          token2: token2Contract
        })

        console.log('Contracts initialized')
      } else {
        alert('MetaMask bulunamadı! Lütfen MetaMask yükleyin.')
      }
    } catch (error) {
      console.error('Wallet connection error:', error)
      alert('Cüzdan bağlanamadı: ' + error.message)
    }
  }

  const ensureArcTestnet = async () => {
    try {
      // Check current chain
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      console.log('Current chain ID:', chainId)
      
      if (chainId === '0x4cef52') { // 5050194 in decimal
        console.log('Already on Arc Testnet')
        return
      }

      console.log('Switching to Arc Testnet...')
      
      // Try to switch to Arc Testnet
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x4cef52' }] // 5050194 in decimal
        })
        console.log('Successfully switched to Arc Testnet')
        return
      } catch (switchError) {
        console.log('Switch failed, trying to add network:', switchError)
        
        if (switchError.code === 4902) {
          // Chain not added, add it
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x4cef52', // 5050194 in decimal
                chainName: 'Arc Testnet',
                rpcUrls: ['https://rpc.testnet.arc.network'],
                nativeCurrency: {
                  name: 'USDC',
                  symbol: 'USDC',
                  decimals: 18
                },
                blockExplorerUrls: ['https://testnet.arcscan.app']
              }]
            })
            console.log('Arc Testnet added successfully')
            
            // Try to switch again after adding
            try {
              await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x4cef52' }] // 5050194 in decimal
              })
              console.log('Successfully switched to Arc Testnet after adding')
            } catch (secondSwitchError) {
              console.error('Could not switch after adding:', secondSwitchError)
              throw new Error('Arc Testnet eklendi ama geçiş yapılamadı. Lütfen manuel olarak geçin.')
            }
          } catch (addError) {
            console.error('Could not add Arc Testnet:', addError)
            throw new Error('Arc Testnet eklenemedi. Lütfen "Arc Network Ekle" butonunu kullanın.')
          }
        } else {
          console.error('Could not switch to Arc Testnet:', switchError)
          throw new Error('Arc Testnet\'e geçiş yapılamadı. Lütfen "Arc Network Ekle" butonunu kullanın.')
        }
      }
      
    } catch (error) {
      console.error('ensureArcTestnet error:', error)
      throw error
    }
  }

  const disconnectWallet = () => {
    setProvider(null)
    setSigner(null)
    setAccount(null)
    setContracts({})
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
        />
        <Routes>
          <Route path="/" element={<UnifiedSwapPanel contracts={contracts} account={account} />} />
          <Route path="/pool" element={<UnifiedPoolPanel contracts={contracts} account={account} />} />
          <Route path="/faucet" element={<FaucetPanel contracts={contracts} account={account} />} />
          {/* Legacy routes - kept for backwards compatibility */}
          <Route path="/pool-old-2" element={<PoolPanel contracts={contracts} account={account} />} />
          <Route path="/pool-old-3" element={<Pool3Panel contracts={contracts} account={account} />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App