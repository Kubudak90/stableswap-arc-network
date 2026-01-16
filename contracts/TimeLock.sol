// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TimeLock
 * @notice Admin işlemleri için zaman gecikmeli yürütme kontratı
 * @dev Kritik işlemler önce queue'ya alınır, delay süresinden sonra execute edilir
 */
contract TimeLock is Ownable {
    // Minimum ve maksimum gecikme süreleri
    uint256 public constant MIN_DELAY = 1 hours;
    uint256 public constant MAX_DELAY = 30 days;
    uint256 public constant GRACE_PERIOD = 14 days;

    // Mevcut gecikme süresi
    uint256 public delay;

    // Queue'daki işlemler
    mapping(bytes32 => bool) public queuedTransactions;

    // Yetkili adresler (execute edebilir)
    mapping(address => bool) public isExecutor;

    event NewDelay(uint256 indexed newDelay);
    event ExecutorAdded(address indexed executor);
    event ExecutorRemoved(address indexed executor);
    event QueueTransaction(
        bytes32 indexed txHash,
        address indexed target,
        uint256 value,
        string signature,
        bytes data,
        uint256 eta
    );
    event CancelTransaction(
        bytes32 indexed txHash,
        address indexed target,
        uint256 value,
        string signature,
        bytes data,
        uint256 eta
    );
    event ExecuteTransaction(
        bytes32 indexed txHash,
        address indexed target,
        uint256 value,
        string signature,
        bytes data,
        uint256 eta
    );

    constructor(uint256 _delay) Ownable(msg.sender) {
        require(_delay >= MIN_DELAY, "TimeLock: delay must exceed minimum");
        require(_delay <= MAX_DELAY, "TimeLock: delay must not exceed maximum");
        delay = _delay;
        isExecutor[msg.sender] = true;
    }

    receive() external payable {}

    modifier onlyExecutor() {
        require(isExecutor[msg.sender], "TimeLock: caller is not executor");
        _;
    }

    /**
     * @notice Gecikme süresini değiştir
     * @dev Bu işlem de queue'dan geçmeli (önce queueSetDelay, sonra executeSetDelay)
     */
    function setDelay(uint256 _delay) external onlyOwner {
        require(_delay >= MIN_DELAY, "TimeLock: delay must exceed minimum");
        require(_delay <= MAX_DELAY, "TimeLock: delay must not exceed maximum");
        delay = _delay;
        emit NewDelay(_delay);
    }

    /**
     * @notice Executor ekle
     */
    function addExecutor(address _executor) external onlyOwner {
        require(_executor != address(0), "TimeLock: zero address");
        isExecutor[_executor] = true;
        emit ExecutorAdded(_executor);
    }

    /**
     * @notice Executor kaldır
     */
    function removeExecutor(address _executor) external onlyOwner {
        isExecutor[_executor] = false;
        emit ExecutorRemoved(_executor);
    }

    /**
     * @notice İşlemi queue'ya ekle
     * @param target Hedef kontrat adresi
     * @param value Gönderilecek ETH miktarı
     * @param signature Fonksiyon imzası (örn: "setFee(uint256)")
     * @param data Encode edilmiş parametreler
     * @param eta Execution Time After - işlemin yapılabileceği en erken zaman
     */
    function queueTransaction(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 eta
    ) external onlyOwner returns (bytes32) {
        require(target != address(0), "TimeLock: target zero address");
        require(
            eta >= block.timestamp + delay,
            "TimeLock: eta must satisfy delay"
        );

        bytes32 txHash = keccak256(abi.encode(target, value, signature, data, eta));
        require(!queuedTransactions[txHash], "TimeLock: tx already queued");

        queuedTransactions[txHash] = true;

        emit QueueTransaction(txHash, target, value, signature, data, eta);
        return txHash;
    }

    /**
     * @notice İşlemi iptal et
     */
    function cancelTransaction(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 eta
    ) external onlyOwner {
        bytes32 txHash = keccak256(abi.encode(target, value, signature, data, eta));
        require(queuedTransactions[txHash], "TimeLock: tx not queued");

        queuedTransactions[txHash] = false;

        emit CancelTransaction(txHash, target, value, signature, data, eta);
    }

    /**
     * @notice İşlemi yürüt
     */
    function executeTransaction(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 eta
    ) external payable onlyExecutor returns (bytes memory) {
        bytes32 txHash = keccak256(abi.encode(target, value, signature, data, eta));

        require(queuedTransactions[txHash], "TimeLock: tx not queued");
        require(block.timestamp >= eta, "TimeLock: tx not ready");
        require(
            block.timestamp <= eta + GRACE_PERIOD,
            "TimeLock: tx stale"
        );

        queuedTransactions[txHash] = false;

        bytes memory callData;

        if (bytes(signature).length == 0) {
            callData = data;
        } else {
            callData = abi.encodePacked(bytes4(keccak256(bytes(signature))), data);
        }

        (bool success, bytes memory returnData) = target.call{value: value}(callData);
        require(success, "TimeLock: tx execution reverted");

        emit ExecuteTransaction(txHash, target, value, signature, data, eta);

        return returnData;
    }

    /**
     * @notice İşlemin hash'ini hesapla
     */
    function getTxHash(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 eta
    ) external pure returns (bytes32) {
        return keccak256(abi.encode(target, value, signature, data, eta));
    }

    /**
     * @notice Şu anki timestamp'i al
     */
    function getCurrentTimestamp() external view returns (uint256) {
        return block.timestamp;
    }

    /**
     * @notice İşlem queue'da mı kontrol et
     */
    function isTransactionQueued(bytes32 txHash) external view returns (bool) {
        return queuedTransactions[txHash];
    }
}
