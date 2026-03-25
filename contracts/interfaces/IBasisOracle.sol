// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBasisOracle {
    function getScore(address token) external view returns (uint256 score, uint256 timestamp);

    function getScores(address[] calldata tokens)
        external
        view
        returns (uint256[] memory scores, uint256[] memory timestamps);

    function hasScore(address token) external view returns (bool);
}
