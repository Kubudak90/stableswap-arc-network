// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MultiSigWallet
 * @author StableSwap Arc Network Team
 * @notice Multi-signature wallet requiring multiple owner confirmations for transactions
 * @dev Simplified Gnosis Safe-like implementation for critical protocol operations.
 *      Provides enhanced security by requiring consensus among multiple parties.
 *
 * Key Features:
 * - Configurable number of required confirmations
 * - Owner management (add/remove) via multisig consensus
 * - Optional execution delay for additional security
 * - Transaction submission, confirmation, revocation, and execution
 * - Support for ETH transfers and contract calls
 *
 * Security Considerations:
 * - All owner management functions require multisig approval
 * - Cannot remove owners below quorum threshold
 * - Transactions cannot be executed twice
 * - Automatic confirmation by submitter
 *
 * Usage Flow:
 * 1. Owner submits transaction (auto-confirmed)
 * 2. Other owners confirm the transaction
 * 3. Once enough confirmations, any owner can execute
 */
contract MultiSigWallet {
    // ============ EVENTS ============

    /// @notice Emitted when ETH is deposited
    /// @param sender Address that sent ETH
    /// @param amount Amount of ETH sent
    /// @param balance New contract balance
    event Deposit(address indexed sender, uint256 amount, uint256 balance);

    /// @notice Emitted when a new transaction is submitted
    /// @param owner Owner who submitted
    /// @param txIndex Transaction index
    /// @param to Target address
    /// @param value ETH value
    /// @param data Call data
    event SubmitTransaction(
        address indexed owner,
        uint256 indexed txIndex,
        address indexed to,
        uint256 value,
        bytes data
    );

    /// @notice Emitted when an owner confirms a transaction
    /// @param owner Owner who confirmed
    /// @param txIndex Transaction index
    event ConfirmTransaction(address indexed owner, uint256 indexed txIndex);

    /// @notice Emitted when an owner revokes their confirmation
    /// @param owner Owner who revoked
    /// @param txIndex Transaction index
    event RevokeConfirmation(address indexed owner, uint256 indexed txIndex);

    /// @notice Emitted when a transaction is executed
    /// @param owner Owner who executed
    /// @param txIndex Transaction index
    event ExecuteTransaction(address indexed owner, uint256 indexed txIndex);

    /// @notice Emitted when a new owner is added
    /// @param owner New owner address
    event OwnerAdded(address indexed owner);

    /// @notice Emitted when an owner is removed
    /// @param owner Removed owner address
    event OwnerRemoved(address indexed owner);

    /// @notice Emitted when confirmation requirement changes
    /// @param required New required number of confirmations
    event RequirementChanged(uint256 required);

    // ============ STATE ============

    /// @notice Array of owner addresses
    address[] public owners;

    /// @notice Mapping to check if address is an owner
    mapping(address => bool) public isOwner;

    /// @notice Number of confirmations required to execute a transaction
    uint256 public numConfirmationsRequired;

    /// @notice Transaction struct containing all transaction details
    struct Transaction {
        address to;           // Target address
        uint256 value;        // ETH value to send
        bytes data;           // Call data
        bool executed;        // Whether transaction has been executed
        uint256 numConfirmations; // Number of confirmations received
        uint256 submitTime;   // Timestamp when submitted
    }

    /// @notice Mapping of transaction index => owner => confirmation status
    mapping(uint256 => mapping(address => bool)) public isConfirmed;

    /// @notice Array of all transactions
    Transaction[] public transactions;

    /// @notice Optional delay between confirmation and execution
    uint256 public executionDelay = 0;

    // ============ MODIFIERS ============

    /// @notice Restricts function to owners only
    modifier onlyOwner() {
        require(isOwner[msg.sender], "MultiSig: not owner");
        _;
    }

    /// @notice Ensures transaction exists
    modifier txExists(uint256 _txIndex) {
        require(_txIndex < transactions.length, "MultiSig: tx does not exist");
        _;
    }

    /// @notice Ensures transaction hasn't been executed
    modifier notExecuted(uint256 _txIndex) {
        require(!transactions[_txIndex].executed, "MultiSig: tx already executed");
        _;
    }

    /// @notice Ensures caller hasn't already confirmed
    modifier notConfirmed(uint256 _txIndex) {
        require(!isConfirmed[_txIndex][msg.sender], "MultiSig: tx already confirmed");
        _;
    }

    // ============ CONSTRUCTOR ============

    /**
     * @notice Initializes the MultiSigWallet with initial owners and confirmation requirement
     * @dev All owners must be unique and non-zero. Required confirmations must be valid.
     * @param _owners Array of initial owner addresses
     * @param _numConfirmationsRequired Number of confirmations needed to execute
     */
    constructor(address[] memory _owners, uint256 _numConfirmationsRequired) {
        require(_owners.length > 0, "MultiSig: owners required");
        require(
            _numConfirmationsRequired > 0 &&
                _numConfirmationsRequired <= _owners.length,
            "MultiSig: invalid number of required confirmations"
        );

        uint256 ownersLength = _owners.length;
        for (uint256 i = 0; i < ownersLength; ) {
            address owner = _owners[i];

            require(owner != address(0), "MultiSig: invalid owner");
            require(!isOwner[owner], "MultiSig: owner not unique");

            isOwner[owner] = true;
            owners.push(owner);
            unchecked { ++i; }
        }

        numConfirmationsRequired = _numConfirmationsRequired;
    }

    // ============ RECEIVE ============

    /// @notice Allows contract to receive ETH
    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    // ============ CORE FUNCTIONS ============

    /**
     * @notice Submits a new transaction for approval
     * @dev Automatically confirms the transaction for the submitter
     * @param _to Target address for the transaction
     * @param _value Amount of ETH to send
     * @param _data Encoded function call data
     * @return txIndex Index of the submitted transaction
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

        // Automatically confirm for submitter
        confirmTransaction(txIndex);

        return txIndex;
    }

    /**
     * @notice Confirms a pending transaction
     * @dev Each owner can only confirm once per transaction
     * @param _txIndex Index of the transaction to confirm
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
     * @notice Executes a transaction after sufficient confirmations
     * @dev Requires numConfirmationsRequired confirmations and respects execution delay
     * @param _txIndex Index of the transaction to execute
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

        // Check execution delay if set
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
     * @notice Revokes a previous confirmation
     * @dev Can only revoke if transaction hasn't been executed
     * @param _txIndex Index of the transaction
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
     * @notice Adds a new owner to the wallet
     * @dev Must be called via multisig (submitTransaction to this contract)
     * @param _owner Address of the new owner
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
     * @notice Removes an owner from the wallet
     * @dev Must be called via multisig. Cannot break quorum.
     * @param _owner Address of the owner to remove
     */
    function removeOwner(address _owner) external {
        require(msg.sender == address(this), "MultiSig: only via multisig");
        require(isOwner[_owner], "MultiSig: not owner");
        require(owners.length > numConfirmationsRequired, "MultiSig: cannot remove - would break quorum");

        isOwner[_owner] = false;

        // Remove from owners array
        uint256 length = owners.length;
        for (uint256 i = 0; i < length; ) {
            if (owners[i] == _owner) {
                owners[i] = owners[length - 1];
                owners.pop();
                break;
            }
            unchecked { ++i; }
        }

        emit OwnerRemoved(_owner);
    }

    /**
     * @notice Changes the number of required confirmations
     * @dev Must be called via multisig. Cannot exceed owner count.
     * @param _required New number of required confirmations
     */
    function changeRequirement(uint256 _required) external {
        require(msg.sender == address(this), "MultiSig: only via multisig");
        require(_required > 0, "MultiSig: invalid requirement");
        require(_required <= owners.length, "MultiSig: requirement exceeds owners");

        numConfirmationsRequired = _required;

        emit RequirementChanged(_required);
    }

    /**
     * @notice Sets the execution delay
     * @dev Must be called via multisig. Maximum 7 days.
     * @param _delay New delay in seconds
     */
    function setExecutionDelay(uint256 _delay) external {
        require(msg.sender == address(this), "MultiSig: only via multisig");
        require(_delay <= 7 days, "MultiSig: delay too long");

        executionDelay = _delay;
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Returns all owner addresses
     * @return Array of owner addresses
     */
    function getOwners() public view returns (address[] memory) {
        return owners;
    }

    /**
     * @notice Returns the total number of transactions
     * @return Number of transactions
     */
    function getTransactionCount() public view returns (uint256) {
        return transactions.length;
    }

    /**
     * @notice Returns details of a specific transaction
     * @param _txIndex Index of the transaction
     * @return to Target address
     * @return value ETH value
     * @return data Call data
     * @return executed Whether executed
     * @return numConfirmations Number of confirmations
     * @return submitTime Submission timestamp
     */
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
     * @notice Returns count of pending (unexecuted) transactions
     * @return count Number of pending transactions
     */
    function getPendingTransactionCount() public view returns (uint256 count) {
        uint256 length = transactions.length;
        for (uint256 i = 0; i < length; ) {
            if (!transactions[i].executed) {
                unchecked { ++count; }
            }
            unchecked { ++i; }
        }
    }

    /**
     * @notice Checks if a transaction can be executed
     * @param _txIndex Index of the transaction
     * @return True if transaction can be executed
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
     * @notice Checks if an owner has confirmed a transaction
     * @param _txIndex Index of the transaction
     * @param _owner Owner address to check
     * @return True if owner has confirmed
     */
    function hasConfirmed(uint256 _txIndex, address _owner) public view returns (bool) {
        return isConfirmed[_txIndex][_owner];
    }

    // ============ HELPER FUNCTIONS ============

    /**
     * @notice Encodes transaction data for contract calls
     * @dev Utility function for frontend integration
     * @param _functionSignature Function signature (e.g., "transfer(address,uint256)")
     * @param _params ABI-encoded parameters
     * @return Encoded transaction data
     */
    function encodeTransactionData(
        string memory _functionSignature,
        bytes memory _params
    ) public pure returns (bytes memory) {
        return abi.encodePacked(bytes4(keccak256(bytes(_functionSignature))), _params);
    }
}
