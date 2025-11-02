import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'

const ASS_TOKEN_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
]

const STAKING_ABI = [
  "function stake(uint256 amount) external",
  "function unstake(uint256 amount) external",
  "function claimRewards() external",
  "function getPendingRewards(address user) external view returns (uint256)",
  "function stakers(address user) external view returns (uint256 stakedAmount, uint256 rewardDebt, uint256 pendingRewards)",
  "function totalStaked() external view returns (uint256)",
  "function rewardToken() external view returns (address)"
]

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
]

function StakingPanel({ provider, signer, account, contracts }) {
  const [assBalance, setAssBalance] = useState('0')
  const [stakedAmount, setStakedAmount] = useState('0')
  const [pendingRewards, setPendingRewards] = useState('0')
  const [stakeAmount, setStakeAmount] = useState('')
  const [unstakeAmount, setUnstakeAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [rewardToken, setRewardToken] = useState(null)

  useEffect(() => {
    if (provider && account && contracts.stakingContract) {
      loadData()
      const interval = setInterval(loadData, 5000)
      return () => clearInterval(interval)
    }
  }, [provider, account, contracts])

  const loadData = async () => {
    try {
      if (!contracts.assToken || !contracts.stakingContract || !account) {
        console.log('StakingPanel: Missing contracts or account', {
          assToken: !!contracts.assToken,
          stakingContract: !!contracts.stakingContract,
          account: !!account
        })
        return
      }

      // ASS Token balance - contracts.assToken zaten bir contract instance
      let balance
      let decimals
      if (typeof contracts.assToken.balanceOf === 'function') {
        // Zaten bir contract instance
        balance = await contracts.assToken.balanceOf(account)
        decimals = await contracts.assToken.decimals()
      } else {
        // String adres, yeni contract oluştur
        const assToken = new ethers.Contract(contracts.assToken, ASS_TOKEN_ABI, provider)
        balance = await assToken.balanceOf(account)
        decimals = await assToken.decimals()
      }
      
      const balanceFormatted = ethers.formatUnits(balance, decimals)
      setAssBalance(balanceFormatted)
      console.log('💰 ASS Token Balance:', balanceFormatted, 'ASS')

      // Staking info - contracts.stakingContract zaten bir contract instance olabilir
      let staking
      if (typeof contracts.stakingContract.stakers === 'function') {
        // Zaten bir contract instance
        staking = contracts.stakingContract
      } else {
        // String adres, yeni contract oluştur
        staking = new ethers.Contract(contracts.stakingContract, STAKING_ABI, provider)
      }
      
      const stakerInfo = await staking.stakers(account)
      const staked = ethers.formatUnits(stakerInfo.stakedAmount, decimals)
      setStakedAmount(staked)
      console.log('📊 Staked Amount:', staked, 'ASS')

      // Pending rewards
      const pending = await staking.getPendingRewards(account)
      const rewardTokenAddress = await staking.rewardToken()
      const rewardTokenContract = new ethers.Contract(rewardTokenAddress, ERC20_ABI, provider)
      const rewardDecimals = await rewardTokenContract.decimals()
      const pendingFormatted = ethers.formatUnits(pending, rewardDecimals)
      setPendingRewards(pendingFormatted)
      console.log('🎁 Pending Rewards:', pendingFormatted)

      // Reward token symbol
      const rewardSymbol = await rewardTokenContract.symbol()
      setRewardToken({ address: rewardTokenAddress, symbol: rewardSymbol, decimals: rewardDecimals })
      console.log('💎 Reward Token:', rewardSymbol)
      
      // FeeDistributor'dan ödül dağıtımını kontrol et
      if (contracts.feeDistributor) {
        try {
          // Toplanan fee'leri kontrol et
          const feeDistributor = contracts.feeDistributor
          const swap2Pool = "0x5d4D4C908D7dfb882d5a24af713158FC805e410B"
          const swap3Pool = "0x16d14659A50fFB31571e4e7ac4417C1Ff22bFc70"
          
          const fees2Pool = await feeDistributor.collectedFees(swap2Pool)
          const fees3Pool = await feeDistributor.collectedFees(swap3Pool)
          const totalFees = fees2Pool + fees3Pool
          
          if (totalFees > 0) {
            console.log('💰 Toplanan Fee\'ler:', {
              '2Pool': ethers.formatUnits(fees2Pool, 6),
              '3Pool': ethers.formatUnits(fees3Pool, 6),
              'Total': ethers.formatUnits(totalFees, 6)
            })
          }
        } catch (err) {
          // "missing revert data" hatası normal - view fonksiyonu bazen revert edebilir
          // Bu durum kritik değil, sessizce handle et
          if (!err.message || !err.message.includes('missing revert data')) {
            console.warn('⚠️ Fee kontrolü uyarısı:', err.message || err)
          }
        }
      }
    } catch (err) {
      console.error('Load data error:', err)
    }
  }

  const handleStake = async () => {
    if (!stakeAmount || !contracts.assToken || !contracts.stakingContract || !signer || !account) {
      console.error('Stake error: Missing data', {
        stakeAmount,
        assToken: !!contracts.assToken,
        stakingContract: !!contracts.stakingContract,
        signer: !!signer,
        account: !!account
      })
      setError('Tüm alanları doldurunuz')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // ASS Token ve StakingContract - contract instance veya string adres olabilir
      let assToken
      let staking
      let stakingContractAddress
      
      if (typeof contracts.assToken.approve === 'function') {
        // Zaten bir contract instance
        assToken = contracts.assToken
      } else {
        // String adres, yeni contract oluştur
        assToken = new ethers.Contract(contracts.assToken, ASS_TOKEN_ABI, signer)
      }
      
      if (typeof contracts.stakingContract.stake === 'function') {
        // Zaten bir contract instance
        staking = contracts.stakingContract
        stakingContractAddress = await contracts.stakingContract.getAddress()
      } else {
        // String adres, yeni contract oluştur
        staking = new ethers.Contract(contracts.stakingContract, STAKING_ABI, signer)
        stakingContractAddress = contracts.stakingContract
      }
      
      const decimals = await assToken.decimals()
      const amountWei = ethers.parseUnits(stakeAmount, decimals)
      console.log('📝 Staking amount:', amountWei.toString(), 'wei (', stakeAmount, 'ASS)')

      // Check allowance
      const allowance = await assToken.allowance(account, stakingContractAddress)
      console.log('🔍 Current allowance:', allowance.toString())
      
      if (allowance < amountWei) {
        console.log('🔐 Approving ASS token...')
        const approveTx = await assToken.approve(stakingContractAddress, ethers.MaxUint256)
        await approveTx.wait()
        console.log('✅ ASS token approved')
      }

      // Stake
      console.log('📥 Calling stake function...')
      const stakeTx = await staking.stake(amountWei)
      await stakeTx.wait()
      console.log('✅ Stake transaction confirmed')

      setSuccess(`✅ ${stakeAmount} ASS token stake edildi!`)
      setStakeAmount('')
      await loadData()
    } catch (err) {
      console.error('❌ Stake error:', err)
      setError('Stake işlemi başarısız: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUnstake = async () => {
    if (!unstakeAmount || !contracts.stakingContract || !signer || !account) {
      setError('Tüm alanları doldurunuz')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const staking = new ethers.Contract(contracts.stakingContract, STAKING_ABI, signer)
      const assToken = new ethers.Contract(contracts.assToken, ASS_TOKEN_ABI, provider)
      const decimals = await assToken.decimals()
      const amountWei = ethers.parseUnits(unstakeAmount, decimals)

      // Unstake
      const unstakeTx = await staking.unstake(amountWei)
      await unstakeTx.wait()

      setSuccess(`✅ ${unstakeAmount} ASS token unstake edildi!`)
      setUnstakeAmount('')
      await loadData()
    } catch (err) {
      setError('Unstake işlemi başarısız: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClaimRewards = async () => {
    if (!contracts.stakingContract || !signer || !account) {
      setError('Wallet bağlı değil')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // StakingContract - contract instance veya string adres olabilir
      let staking
      if (typeof contracts.stakingContract.claimRewards === 'function') {
        staking = contracts.stakingContract
      } else {
        staking = new ethers.Contract(contracts.stakingContract, STAKING_ABI, signer)
      }
      
      console.log('🎁 Claiming staking rewards...')
      const claimTx = await staking.claimRewards()
      await claimTx.wait()
      console.log('✅ Rewards claimed')

      setSuccess('✅ Ödüller başarıyla claim edildi!')
      await loadData()
    } catch (err) {
      console.error('❌ Claim error:', err)
      setError('Claim işlemi başarısız: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDistributeFees = async () => {
    if (!contracts.feeDistributor || !rewardToken || !signer || !account) {
      setError('FeeDistributor veya reward token bulunamadı')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // FeeDistributor - contract instance veya string adres olabilir
      let feeDistributor
      if (typeof contracts.feeDistributor.distributeFees === 'function') {
        feeDistributor = contracts.feeDistributor
        // Kontrat adresini logla
        const fdAddress = await feeDistributor.getAddress()
        console.log('✅ Using FeeDistributor contract instance:', fdAddress)
      } else {
        const FEE_DISTRIBUTOR_ABI = [
          "function distributeFees(address token) external",
          "function collectedFees(address swapContract) external view returns (uint256)"
        ]
        feeDistributor = new ethers.Contract(contracts.feeDistributor, FEE_DISTRIBUTOR_ABI, signer)
        console.log('✅ Created new FeeDistributor contract:', contracts.feeDistributor)
      }

      // Balance kontrolü
      const ERC20_ABI_BALANCE = ["function balanceOf(address owner) view returns (uint256)"]
      const tokenContract = new ethers.Contract(rewardToken.address, ERC20_ABI_BALANCE, provider)
      const fdAddress = typeof contracts.feeDistributor.getAddress === 'function' 
        ? await contracts.feeDistributor.getAddress()
        : contracts.feeDistributor
      const balance = await tokenContract.balanceOf(fdAddress)
      console.log('💰 FeeDistributor balance:', ethers.formatUnits(balance, rewardToken.decimals), rewardToken.symbol)
      
      if (balance === 0n) {
        throw new Error('FeeDistributor\'da hiç token yok! Önce swap işlemi yapın.')
      }

      console.log('💰 Distributing fees for token:', rewardToken.address)
      const distributeTx = await feeDistributor.distributeFees(rewardToken.address)
      console.log('⏳ Waiting for distribution transaction...')
      await distributeTx.wait()
      console.log('✅ Fees distributed')

      setSuccess('✅ Fee\'ler başarıyla dağıtıldı! Staker\'lar artık ödül alabilir.')
      await loadData()
    } catch (err) {
      console.error('❌ Distribute fees error:', err)
      setError('Fee dağıtımı başarısız: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h2>🔄 ASS Token Staking</h2>
        <p className="header-subtitle">ASS token stake edin ve swap fee'lerinden stablecoin ödül alın</p>

        {/* Info Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
          <div className="info-card">
            <div className="info-label">ASS Bakiyeniz</div>
            <div className="info-value">{parseFloat(assBalance).toFixed(6)} ASS</div>
          </div>
          <div className="info-card">
            <div className="info-label">Stake Edilen</div>
            <div className="info-value">{parseFloat(stakedAmount).toFixed(6)} ASS</div>
          </div>
          <div className="info-card">
            <div className="info-label">Bekleyen Ödül</div>
            <div className="info-value">
              {rewardToken 
                ? (() => {
                    const amount = parseFloat(pendingRewards)
                    if (amount < 0.000001 && amount > 0) {
                      return `< 0.000001 ${rewardToken.symbol}`
                    }
                    if (amount > 0 && amount < 1) {
                      const str = amount.toFixed(6)
                      return `${parseFloat(str)} ${rewardToken.symbol}`
                    }
                    return `${amount.toLocaleString('tr-TR', { maximumFractionDigits: 6, minimumFractionDigits: 0 })} ${rewardToken.symbol}`
                  })()
                : '0.0'
              }
            </div>
          </div>
        </div>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        {/* Fee Distribution Section */}
        {contracts.feeDistributor && rewardToken && (
          <div style={{ 
            marginBottom: '30px', 
            padding: '20px', 
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            borderRadius: '12px', 
            border: '1px solid #fbbf24' 
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '1.1rem', color: '#92400e' }}>
              💰 Fee Dağıtımı
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#78350f', marginBottom: '15px' }}>
              Swap işlemlerinden toplanan fee'leri staker'lara (%45), buyback'e (%45) ve treasury'ye (%10) dağıtın.
              Fee'ler dağıtılmadan staking ödülleri gelmez!
            </p>
            <button 
              className="btn" 
              onClick={handleDistributeFees}
              disabled={loading}
              style={{
                background: loading
                  ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                  : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                width: '100%'
              }}
            >
              {loading ? 'Dağıtılıyor...' : '💰 Fee\'leri Dağıt'}
            </button>
          </div>
        )}

        {/* Stake Section */}
        <div style={{ marginBottom: '30px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '1.1rem' }}>Stake Et</h3>
          <div className="form-group">
            <label>Stake Edilecek ASS Miktarı</label>
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              placeholder="0.0"
              step="0.000001"
            />
            <button 
              className="btn" 
              style={{ marginTop: '10px', fontSize: '0.85rem', padding: '6px 12px' }}
              onClick={() => setStakeAmount(assBalance)}
            >
              Max
            </button>
          </div>
          <button 
            className="btn" 
            onClick={handleStake}
            disabled={loading || !stakeAmount}
            style={{
              background: loading || !stakeAmount
                ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
            }}
          >
            {loading ? 'İşlem Yapılıyor...' : 'Stake Et'}
          </button>
        </div>

        {/* Unstake Section */}
        <div style={{ marginBottom: '30px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '1.1rem' }}>Unstake Et</h3>
          <div className="form-group">
            <label>Unstake Edilecek ASS Miktarı</label>
            <input
              type="number"
              value={unstakeAmount}
              onChange={(e) => setUnstakeAmount(e.target.value)}
              placeholder="0.0"
              step="0.000001"
            />
            <button 
              className="btn" 
              style={{ marginTop: '10px', fontSize: '0.85rem', padding: '6px 12px' }}
              onClick={() => setUnstakeAmount(stakedAmount)}
            >
              Max
            </button>
          </div>
          <button 
            className="btn" 
            onClick={handleUnstake}
            disabled={loading || !unstakeAmount}
            style={{
              background: loading || !unstakeAmount
                ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
            }}
          >
            {loading ? 'İşlem Yapılıyor...' : 'Unstake Et'}
          </button>
        </div>

        {/* Claim Rewards */}
        {parseFloat(pendingRewards) > 0 && (
          <div style={{ padding: '20px', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', borderRadius: '12px', border: '1px solid #fbbf24' }}>
            <div style={{ marginBottom: '15px' }}>
              <strong>🎁 Bekleyen Ödülünüz Var!</strong>
              <div style={{ fontSize: '1.2rem', marginTop: '8px', color: '#92400e' }}>
                {rewardToken && (() => {
                  const amount = parseFloat(pendingRewards)
                  // Eğer çok küçükse (< 0.000001), "~0" göster
                  if (amount < 0.000001 && amount > 0) {
                    return `< 0.000001 ${rewardToken.symbol}`
                  }
                  // 6 decimal'dan fazla sıfır varsa, önemli rakamlara kadar göster
                  if (amount > 0 && amount < 1) {
                    // Önemli rakam sayısını bul (sıfır olmayan ilk rakamdan sonra)
                    const str = amount.toFixed(6)
                    const trimmed = parseFloat(str).toString()
                    return `${trimmed} ${rewardToken.symbol}`
                  }
                  // Normal format
                  return `${amount.toLocaleString('tr-TR', { maximumFractionDigits: 6, minimumFractionDigits: 0 })} ${rewardToken.symbol}`
                })()}
              </div>
            </div>
            <button 
              className="btn" 
              onClick={handleClaimRewards}
              disabled={loading}
              style={{
                background: loading
                  ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                  : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                width: '100%'
              }}
            >
              {loading ? 'Claim Ediliyor...' : '🎁 Ödülleri Claim Et'}
            </button>
          </div>
        )}

        {/* Info */}
        <div className="info-card" style={{ marginTop: '30px', padding: '15px' }}>
          <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
            <strong>💡 Bilgi:</strong>
            <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
              <li>ASS token stake ederek swap fee'lerinden %45 pay alırsınız</li>
              <li>Ödüller stablecoin (tUSDC) olarak dağıtılır</li>
              <li>Stake ettiğiniz ASS token'larınız kilitlenir</li>
              <li>İstediğiniz zaman unstake edebilirsiniz</li>
              <li>Ödüller otomatik birikir, istediğiniz zaman claim edebilirsiniz</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StakingPanel

