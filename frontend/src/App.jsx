import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import SwapPanel from './components/SwapPanel'
import PoolPanel from './components/PoolPanel'
import Header from './components/Header'
import { ethers } from 'ethers'

// Deployed contract addresses
const CONTRACTS = {
  testUSDC: "0x53646C53e712cE320182E289E7364d4d0e4D6D01",
  testUSDT: "0x2587521Ca49A69813991E9076B6eFbBb5CbfD19E",
  swap: "0x665A82180fa7a58e2efeF5270cC2c2974087A030"
}

// SimpleSwap ABI
const SWAP_ABI = [
  "function addLiquidity(uint256 amount0, uint256 amount1) external",
  "function swap(bool zeroForOne, uint256 amountIn) external returns (uint256 amountOut)",
  "function getReserves() external view returns (uint256, uint256)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)"
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

  useEffect(() => {
    connectWallet()
  }, [])

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum)
        
        // Check if we're on Arc Testnet
        const network = await provider.getNetwork()
        const arcTestnetChainId = 5042002n
        
        if (network.chainId !== arcTestnetChainId) {
          // Switch to Arc Testnet
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x4D0A2A' }], // 5042002 in hex
          }).catch(async (error) => {
            if (error.code === 4902) {
              // Chain not added, add it
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0x4D0A2A',
                  chainName: 'Arc Testnet',
                  rpcUrls: ['https://rpc.testnet.arc.network'],
                  nativeCurrency: {
                    name: 'USDC',
                    symbol: 'USDC',
                    decimals: 6
                  },
                  blockExplorerUrls: ['https://testnet.arcscan.app']
                }]
              })
            }
          })
        }
        
        const signer = await provider.getSigner()
        const account = await signer.getAddress()
        
        setProvider(provider)
        setSigner(signer)
        setAccount(account)

        // Initialize contracts
        const swapContract = new ethers.Contract(CONTRACTS.swap, SWAP_ABI, signer)
        const token0Contract = new ethers.Contract(CONTRACTS.testUSDC, ERC20_ABI, signer)
        const token1Contract = new ethers.Contract(CONTRACTS.testUSDT, ERC20_ABI, signer)

        setContracts({
          swap: swapContract,
          token0: token0Contract,
          token1: token1Contract
        })

        console.log('Wallet connected:', account)
        console.log('Network:', network.name, network.chainId)
      } else {
        alert('MetaMask bulunamadı!')
      }
    } catch (error) {
      console.error('Wallet connection error:', error)
    }
  }

  return (
    <Router>
      <div className="App">
        <Header 
          account={account} 
          connectWallet={connectWallet}
          contracts={contracts}
        />
        <Routes>
          <Route path="/" element={<SwapPanel contracts={contracts} account={account} />} />
          <Route path="/pool" element={<PoolPanel contracts={contracts} account={account} />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App