// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TimeLock
 * @author StableSwap Arc Network Team
 * @notice Time-delayed execution contract for critical admin operations
 * @dev Implements a timelock mechanism where transactions must be queued
 *      and wait for a delay period before execution. This provides:
 *      - Transparency: Users can see pending changes before they happen
 *      - Security: Gives time to react to malicious proposals
 *      - Governance: Prevents instant unauthorized changes
 *
 * Key Features:
 * - Configurable delay (1 hour to 30 days)
 * - Grace period for execution (14 days after ETA)
 * - Multiple executors support
 * - Transaction queuing and cancellation
 *
 * Security Considerations:
 * - Only owner can queue/cancel transactions
 * - Only executors can execute transactions
 * - Transactions expire after grace period
 * - Cannot execute before ETA
 */
contract TimeLock is Ownable {
    /// @notice Minimum delay time (1 hour)
    uint256 public constant MIN_DELAY = 1 hours;

    /// @notice Maximum delay time (30 days)
    uint256 public constant MAX_DELAY = 30 days;

    /// @notice Grace period after ETA during which transaction can be executed (14 days)
    uint256 public constant GRACE_PERIOD = 14 days;

    /// @notice Current delay time for transactions
    uint256 public delay;

    /// @notice Mapping of transaction hash to queued status
    mapping(bytes32 => bool) public queuedTransactions;

    /// @notice Mapping of addresses authorized to execute transactions
    mapping(address => bool) public isExecutor;

    /// @notice Emitted when delay is updated
    /// @param newDelay New delay value in seconds
    event NewDelay(uint256 indexed newDelay);

    /// @notice Emitted when an executor is added
    /// @param executor Address of the new executor
    event ExecutorAdded(address indexed executor);

    /// @notice Emitted when an executor is removed
    /// @param executor Address of the removed executor
    event ExecutorRemoved(address indexed executor);

    /// @notice Emitted when a transaction is queued
    /// @param txHash Unique hash identifying the transaction
    /// @param target Target contract address
    /// @param value ETH value to send
    /// @param signature Function signature
    /// @param data Encoded function parameters
    /// @param eta Earliest execution time
    event QueueTransaction(
        bytes32 indexed txHash,
        address indexed target,
        uint256 value,
        string signature,
        bytes data,
        uint256 eta
    );

    /// @notice Emitted when a transaction is cancelled
    event CancelTransaction(
        bytes32 indexed txHash,
        address indexed target,
        uint256 value,
        string signature,
        bytes data,
        uint256 eta
    );

    /// @notice Emitted when a transaction is executed
    event ExecuteTransaction(
        bytes32 indexed txHash,
        address indexed target,
        uint256 value,
        string signature,
        bytes data,
        uint256 eta
    );

    /**
     * @notice Initializes the TimeLock contract
     * @dev Sets initial delay and makes deployer an executor
     * @param _delay Initial delay time (must be between MIN_DELAY and MAX_DELAY)
     */
    constructor(uint256 _delay) Ownable(msg.sender) {
        require(_delay >= MIN_DELAY, "TimeLock: delay must exceed minimum");
        require(_delay <= MAX_DELAY, "TimeLock: delay must not exceed maximum");
        delay = _delay;
        isExecutor[msg.sender] = true;
    }

    /// @notice Allows contract to receive ETH
    receive() external payable {}

    /// @notice Restricts function access to executors only
    modifier onlyExecutor() {
        require(isExecutor[msg.sender], "TimeLock: caller is not executor");
        _;
    }

    /**
     * @notice Updates the delay time for new transactions
     * @dev Only owner can call. This change takes effect immediately.
     *      Consider using timelock for changing delay in production.
     * @param _delay New delay time (must be between MIN_DELAY and MAX_DELAY)
     */
    function setDelay(uint256 _delay) external onlyOwner {
        require(_delay >= MIN_DELAY, "TimeLock: delay must exceed minimum");
        require(_delay <= MAX_DELAY, "TimeLock: delay must not exceed maximum");
        delay = _delay;
        emit NewDelay(_delay);
    }

    /**
     * @notice Adds a new executor
     * @dev Only owner can call. Executors can execute queued transactions.
     * @param _executor Address to add as executor (cannot be zero)
     */
    function addExecutor(address _executor) external onlyOwner {
        require(_executor != address(0), "TimeLock: zero address");
        isExecutor[_executor] = true;
        emit ExecutorAdded(_executor);
    }

    /**
     * @notice Removes an executor
     * @dev Only owner can call
     * @param _executor Address to remove from executors
     */
    function removeExecutor(address _executor) external onlyOwner {
        isExecutor[_executor] = false;
        emit ExecutorRemoved(_executor);
    }

    /**
     * @notice Queues a transaction for later execution
     * @dev Only owner can call. Transaction must wait until ETA to be executed.
     * @param target Target contract address (cannot be zero)
     * @param value ETH amount to send with the call
     * @param signature Function signature (e.g., "setFee(uint256)")
     * @param data ABI-encoded function parameters
     * @param eta Execution Time After - earliest time transaction can be executed
     * @return txHash Unique hash identifying this transaction
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
     * @notice Cancels a queued transaction
     * @dev Only owner can call. Transaction must be in queue.
     * @param target Target contract address
     * @param value ETH amount
     * @param signature Function signature
     * @param data Encoded parameters
     * @param eta Execution time
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
     * @notice Executes a queued transaction
     * @dev Only executors can call. Transaction must be queued and within execution window.
     * @param target Target contract address
     * @param value ETH amount to send
     * @param signature Function signature
     * @param data Encoded parameters
     * @param eta Execution time (must have passed but within grace period)
     * @return returnData Data returned by the executed call
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
     * @notice Computes the hash of a transaction
     * @dev Useful for verifying transaction identity off-chain
     * @param target Target contract address
     * @param value ETH amount
     * @param signature Function signature
     * @param data Encoded parameters
     * @param eta Execution time
     * @return Transaction hash
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
     * @notice Returns the current block timestamp
     * @dev Useful for calculating ETA values
     * @return Current block timestamp
     */
    function getCurrentTimestamp() external view returns (uint256) {
        return block.timestamp;
    }

    /**
     * @notice Checks if a transaction is queued
     * @param txHash Hash of the transaction to check
     * @return True if transaction is queued, false otherwise
     */
    function isTransactionQueued(bytes32 txHash) external view returns (bool) {
        return queuedTransactions[txHash];
    }
}
