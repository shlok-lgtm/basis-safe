// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IBasisOracle} from "../interfaces/IBasisOracle.sol";

contract MockBasisOracle is IBasisOracle {
    struct ScoreData {
        uint256 score;
        uint256 timestamp;
        bool exists;
    }

    mapping(address => ScoreData) private _scores;
    bool public shouldRevert;

    function setScore(address token, uint256 score, uint256 timestamp) external {
        _scores[token] = ScoreData({score: score, timestamp: timestamp, exists: true});
    }

    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }

    function getScore(address token) external view override returns (uint256 score, uint256 timestamp) {
        require(!shouldRevert, "MockBasisOracle: forced revert");
        ScoreData memory data = _scores[token];
        return (data.score, data.timestamp);
    }

    function getScores(address[] calldata tokens)
        external
        view
        override
        returns (uint256[] memory scores, uint256[] memory timestamps)
    {
        require(!shouldRevert, "MockBasisOracle: forced revert");
        scores = new uint256[](tokens.length);
        timestamps = new uint256[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            ScoreData memory data = _scores[tokens[i]];
            scores[i] = data.score;
            timestamps[i] = data.timestamp;
        }
    }

    function hasScore(address token) external view override returns (bool) {
        return _scores[token].exists;
    }
}
