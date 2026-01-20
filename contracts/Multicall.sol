// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Multicall
 * @author StableSwap Arc Network Team
 * @notice Aggregate multiple contract calls into a single transaction
 * @dev Reduces gas costs by batching multiple calls and avoiding
 *      base transaction costs for each individual call.
 *
 * Key Features:
 * - Batch multiple read calls (aggregate)
 * - Batch multiple write calls with failure tolerance (tryAggregate)
 * - Get block information alongside calls (blockAndAggregate)
 * - Support for calls with ETH value
 *
 * Gas Savings:
 * - Eliminates 21,000 base gas per transaction for batched calls
 * - Single signature verification instead of multiple
 * - Reduced overall network congestion
 *
 * Security Considerations:
 * - Reverts all calls if any single call fails (aggregate)
 * - Optional failure tolerance with tryAggregate
 * - No state stored, pure utility contract
 */
contract Multicall {
    /// @notice Call struct for batched operations
    struct Call {
        address target;   // Contract to call
        bytes callData;   // Encoded function call
    }

    /// @notice Call struct with ETH value
    struct Call3 {
        address target;       // Contract to call
        bool allowFailure;    // Whether to allow this call to fail
        bytes callData;       // Encoded function call
    }

    /// @notice Call struct with ETH value
    struct Call3Value {
        address target;       // Contract to call
        bool allowFailure;    // Whether to allow this call to fail
        uint256 value;        // ETH value to send
        bytes callData;       // Encoded function call
    }

    /// @notice Result struct for call results
    struct Result {
        bool success;     // Whether the call succeeded
        bytes returnData; // Return data from the call
    }

    /**
     * @notice Aggregate multiple calls into a single transaction
     * @dev Reverts if any call fails
     * @param calls Array of Call structs
     * @return blockNumber Current block number
     * @return returnData Array of return data from each call
     */
    function aggregate(Call[] calldata calls)
        external
        returns (uint256 blockNumber, bytes[] memory returnData)
    {
        blockNumber = block.number;
        uint256 length = calls.length;
        returnData = new bytes[](length);

        for (uint256 i = 0; i < length; ) {
            (bool success, bytes memory ret) = calls[i].target.call(calls[i].callData);
            require(success, "Multicall: call failed");
            returnData[i] = ret;

            unchecked { ++i; }
        }
    }

    /**
     * @notice Aggregate calls with optional failure tolerance
     * @dev Does not revert if a call fails when allowFailure is true
     * @param requireSuccess If true, reverts on any failure
     * @param calls Array of Call structs
     * @return returnData Array of Result structs
     */
    function tryAggregate(bool requireSuccess, Call[] calldata calls)
        external
        returns (Result[] memory returnData)
    {
        uint256 length = calls.length;
        returnData = new Result[](length);

        for (uint256 i = 0; i < length; ) {
            (bool success, bytes memory ret) = calls[i].target.call(calls[i].callData);

            if (requireSuccess) {
                require(success, "Multicall: call failed");
            }

            returnData[i] = Result(success, ret);

            unchecked { ++i; }
        }
    }

    /**
     * @notice Aggregate calls and return block information
     * @param calls Array of Call structs
     * @return blockNumber Current block number
     * @return blockHash Current block hash
     * @return returnData Array of Result structs
     */
    function blockAndAggregate(Call[] calldata calls)
        external
        returns (uint256 blockNumber, bytes32 blockHash, Result[] memory returnData)
    {
        blockNumber = block.number;
        blockHash = blockhash(block.number);
        uint256 length = calls.length;
        returnData = new Result[](length);

        for (uint256 i = 0; i < length; ) {
            (bool success, bytes memory ret) = calls[i].target.call(calls[i].callData);
            require(success, "Multicall: call failed");
            returnData[i] = Result(success, ret);

            unchecked { ++i; }
        }
    }

    /**
     * @notice Aggregate calls with individual failure tolerance
     * @dev Each call can specify whether it's allowed to fail
     * @param calls Array of Call3 structs
     * @return returnData Array of Result structs
     */
    function aggregate3(Call3[] calldata calls)
        external
        returns (Result[] memory returnData)
    {
        uint256 length = calls.length;
        returnData = new Result[](length);

        for (uint256 i = 0; i < length; ) {
            (bool success, bytes memory ret) = calls[i].target.call(calls[i].callData);

            if (!calls[i].allowFailure) {
                require(success, "Multicall: call failed");
            }

            returnData[i] = Result(success, ret);

            unchecked { ++i; }
        }
    }

    /**
     * @notice Aggregate calls with ETH value support
     * @dev Allows sending ETH with each call
     * @param calls Array of Call3Value structs
     * @return returnData Array of Result structs
     */
    function aggregate3Value(Call3Value[] calldata calls)
        external
        payable
        returns (Result[] memory returnData)
    {
        uint256 length = calls.length;
        returnData = new Result[](length);

        for (uint256 i = 0; i < length; ) {
            (bool success, bytes memory ret) = calls[i].target.call{value: calls[i].value}(
                calls[i].callData
            );

            if (!calls[i].allowFailure) {
                require(success, "Multicall: call failed");
            }

            returnData[i] = Result(success, ret);

            unchecked { ++i; }
        }

        // Refund any leftover ETH
        if (address(this).balance > 0) {
            (bool sent, ) = msg.sender.call{value: address(this).balance}("");
            require(sent, "Multicall: ETH refund failed");
        }
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get current block number
     * @return blockNumber Current block number
     */
    function getBlockNumber() external view returns (uint256 blockNumber) {
        return block.number;
    }

    /**
     * @notice Get current block timestamp
     * @return timestamp Current block timestamp
     */
    function getCurrentBlockTimestamp() external view returns (uint256 timestamp) {
        return block.timestamp;
    }

    /**
     * @notice Get current block hash
     * @return blockHash Current block hash (of previous block)
     */
    function getBlockHash(uint256 blockNumber) external view returns (bytes32 blockHash) {
        return blockhash(blockNumber);
    }

    /**
     * @notice Get current block coinbase
     * @return coinbase Current block coinbase address
     */
    function getCurrentBlockCoinbase() external view returns (address coinbase) {
        return block.coinbase;
    }

    /**
     * @notice Get current block gas limit
     * @return gaslimit Current block gas limit
     */
    function getCurrentBlockGasLimit() external view returns (uint256 gaslimit) {
        return block.gaslimit;
    }

    /**
     * @notice Get ETH balance of an address
     * @param addr Address to check
     * @return balance ETH balance in wei
     */
    function getEthBalance(address addr) external view returns (uint256 balance) {
        return addr.balance;
    }

    /**
     * @notice Get last block hash
     * @return blockHash Hash of the previous block
     */
    function getLastBlockHash() external view returns (bytes32 blockHash) {
        unchecked {
            return blockhash(block.number - 1);
        }
    }
}
