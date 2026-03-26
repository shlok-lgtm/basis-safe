// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBasisOracle {
    function getScore(address token) external view returns (
        uint16 score,      // 0-10000 (divide by 100 for human-readable 0-100)
        bytes2 grade,      // ASCII grade e.g. "A+", "B-"
        uint48 timestamp,  // Unix timestamp of score calculation
        uint16 version     // Formula version (100 = v1.0.0)
    );

    function isStale(address token, uint256 maxAge) external view returns (bool);
    function paused() external view returns (bool);
    function getScoredTokens() external view returns (address[] memory);
}
