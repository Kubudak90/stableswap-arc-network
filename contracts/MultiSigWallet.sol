// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MultiSigWallet
 * @notice Çoklu imza cüzdanı - kritik işlemler için birden fazla onay gerektirir
 * @dev Gnosis Safe benzeri basitleştirilmiş multi-sig implementasyonu
 */
contract MultiSigWallet {
    // ============ EVENTS ============
    event Deposit(address indexed sender, uint256 amount, uint256 balance);
    event SubmitTransaction(
        address indexed owner,
        uint256 indexed txIndex,
        address indexed to,
        uint256 value,
        bytes data
    );
    event ConfirmTransaction(address indexed owner, uint256 indexed txIndex);
    event RevokeConfirmation(address indexed owner, uint256 indexed txIndex);
    event ExecuteTransaction(address indexed owner, uint256 indexed txIndex);
    event OwnerAdded(address indexed owner);
    event OwnerRemoved(address indexed owner);
    event RequirementChanged(uint256 required);

    // ============ STATE ============
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public numConfirmationsRequired;

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 numConfirmations;
        uint256 submitTime;
    }

    // txIndex => owner => bool
    mapping(uint256 => mapping(address => bool)) public isConfirmed;

    Transaction[] public transactions;

    // Execution delay (opsiyonel güvenlik)
    uint256 public executionDelay = 0; // Default: anında çalıştırma

    // ============ MODIFIERS ============
    modifier onlyOwner() {
        require(isOwner[msg.sender], "MultiSig: not owner");
        _;
    }

    modifier txExists(uint256 _txIndex) {
        require(_txIndex < transactions.length, "MultiSig: tx does not exist");
        _;
    }

    modifier notExecuted(uint256 _txIndex) {
        require(!transactions[_txIndex].executed, "MultiSig: tx already executed");
        _;
    }

    modifier notConfirmed(uint256 _txIndex) {
        require(!isConfirmed[_txIndex][msg.sender], "MultiSig: tx already confirmed");
        _;
    }

    // ============ CONSTRUCTOR ============
    constructor(address[] memory _owners, uint256 _numConfirmationsRequired) {
        require(_owners.length > 0, "MultiSig: owners required");
        require(
            _numConfirmationsRequired > 0 &&
                _numConfirmationsRequired <= _owners.length,
            "MultiSig: invalid number of required confirmations"
        );

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];

            require(owner != address(0), "MultiSig: invalid owner");
            require(!isOwner[owner], "MultiSig: owner not unique");

            isOwner[owner] = true;
            owners.push(owner);
        }

        numConfirmationsRequired = _numConfirmationsRequired;
    }

    // ============ RECEIVE ============
    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    // ============ CORE FUNCTIONS ============

    /**
     * @notice Yeni işlem öner
     * @param _to Hedef adres
     * @param _value Gönderilecek ETH
     * @param _data Çağrılacak fonksiyon datası
     */
    function submitTransaction(
        address _to,
        uint256 _value,
        bytes memory _data
    ) public onlyOwner returns (uint256) {
        require(_to != address(0), "MultiSig: invalid target");

        uint256 txIndex = transactions.length;

        transactions.push(
            Transaction({
                to: _to,
                value: _value,
                data: _data,
                executed: false,
                numConfirmations: 0,
                submitTime: block.timestamp
            })
        );

        emit SubmitTransaction(msg.sender, txIndex, _to, _value, _data);

        // Otomatik olarak öneren de onaylasın
        confirmTransaction(txIndex);

        return txIndex;
    }

    /**
     * @notice İşlemi onayla
     * @param _txIndex İşlem indeksi
     */
    function confirmTransaction(uint256 _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
        notConfirmed(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations += 1;
        isConfirmed[_txIndex][msg.sender] = true;

        emit ConfirmTransaction(msg.sender, _txIndex);
    }

    /**
     * @notice İşlemi yürüt (yeterli onay varsa)
     * @param _txIndex İşlem indeksi
     */
    function executeTransaction(uint256 _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];

        require(
            transaction.numConfirmations >= numConfirmationsRequired,
            "MultiSig: cannot execute tx - not enough confirmations"
        );

        // Execution delay kontrolü
        if (executionDelay > 0) {
            require(
                block.timestamp >= transaction.submitTime + executionDelay,
                "MultiSig: execution delay not passed"
            );
        }

        transaction.executed = true;

        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );
        require(success, "MultiSig: tx failed");

        emit ExecuteTransaction(msg.sender, _txIndex);
    }

    /**
     * @notice Onayı geri çek
     * @param _txIndex İşlem indeksi
     */
    function revokeConfirmation(uint256 _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
    {
        require(isConfirmed[_txIndex][msg.sender], "MultiSig: tx not confirmed");

        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations -= 1;
        isConfirmed[_txIndex][msg.sender] = false;

        emit RevokeConfirmation(msg.sender, _txIndex);
    }

    // ============ OWNER MANAGEMENT ============

    /**
     * @notice Yeni owner ekle (multi-sig onayı gerektirir)
     * @dev Bu fonksiyon submitTransaction ile çağrılmalı
     */
    function addOwner(address _owner) external {
        require(msg.sender == address(this), "MultiSig: only via multisig");
        require(_owner != address(0), "MultiSig: invalid owner");
        require(!isOwner[_owner], "MultiSig: owner exists");

        isOwner[_owner] = true;
        owners.push(_owner);

        emit OwnerAdded(_owner);
    }

    /**
     * @notice Owner kaldır (multi-sig onayı gerektirir)
     * @dev Bu fonksiyon submitTransaction ile çağrılmalı
     */
    function removeOwner(address _owner) external {
        require(msg.sender == address(this), "MultiSig: only via multisig");
        require(isOwner[_owner], "MultiSig: not owner");
        require(owners.length > numConfirmationsRequired, "MultiSig: cannot remove - would break quorum");

        isOwner[_owner] = false;

        // owners dizisinden kaldır
        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] == _owner) {
                owners[i] = owners[owners.length - 1];
                owners.pop();
                break;
            }
        }

        emit OwnerRemoved(_owner);
    }

    /**
     * @notice Gerekli onay sayısını değiştir (multi-sig onayı gerektirir)
     * @dev Bu fonksiyon submitTransaction ile çağrılmalı
     */
    function changeRequirement(uint256 _required) external {
        require(msg.sender == address(this), "MultiSig: only via multisig");
        require(_required > 0, "MultiSig: invalid requirement");
        require(_required <= owners.length, "MultiSig: requirement exceeds owners");

        numConfirmationsRequired = _required;

        emit RequirementChanged(_required);
    }

    /**
     * @notice Execution delay'i değiştir (multi-sig onayı gerektirir)
     * @dev Bu fonksiyon submitTransaction ile çağrılmalı
     */
    function setExecutionDelay(uint256 _delay) external {
        require(msg.sender == address(this), "MultiSig: only via multisig");
        require(_delay <= 7 days, "MultiSig: delay too long");

        executionDelay = _delay;
    }

    // ============ VIEW FUNCTIONS ============

    function getOwners() public view returns (address[] memory) {
        return owners;
    }

    function getTransactionCount() public view returns (uint256) {
        return transactions.length;
    }

    function getTransaction(uint256 _txIndex)
        public
        view
        returns (
            address to,
            uint256 value,
            bytes memory data,
            bool executed,
            uint256 numConfirmations,
            uint256 submitTime
        )
    {
        Transaction storage transaction = transactions[_txIndex];

        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numConfirmations,
            transaction.submitTime
        );
    }

    /**
     * @notice Bekleyen (onay bekleyen) işlem sayısı
     */
    function getPendingTransactionCount() public view returns (uint256 count) {
        for (uint256 i = 0; i < transactions.length; i++) {
            if (!transactions[i].executed) {
                count++;
            }
        }
    }

    /**
     * @notice İşlem çalıştırılabilir mi kontrol et
     */
    function canExecute(uint256 _txIndex) public view returns (bool) {
        if (_txIndex >= transactions.length) return false;

        Transaction storage transaction = transactions[_txIndex];

        if (transaction.executed) return false;
        if (transaction.numConfirmations < numConfirmationsRequired) return false;

        if (executionDelay > 0) {
            if (block.timestamp < transaction.submitTime + executionDelay) {
                return false;
            }
        }

        return true;
    }

    /**
     * @notice Belirli bir owner'ın işlemi onaylayıp onaylamadığını kontrol et
     */
    function hasConfirmed(uint256 _txIndex, address _owner) public view returns (bool) {
        return isConfirmed[_txIndex][_owner];
    }

    // ============ HELPER FUNCTIONS ============

    /**
     * @notice Fonksiyon çağrısı için data oluştur
     * @dev Frontend'den kullanım için yardımcı fonksiyon
     */
    function encodeTransactionData(
        string memory _functionSignature,
        bytes memory _params
    ) public pure returns (bytes memory) {
        return abi.encodePacked(bytes4(keccak256(bytes(_functionSignature))), _params);
    }
}
