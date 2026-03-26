// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IBasisOracle} from "../interfaces/IBasisOracle.sol";

contract MockBasisOracle is IBasisOracle {
    struct ScoreData {
        uint16 score;
        bytes2 grade;
        uint48 timestamp;
        uint16 version;
        bool exists;
    }

    mapping(address => ScoreData) private _scores;
    bool public paused;
    bool public shouldRevert;

    function setScore(address token, uint16 score, bytes2 grade, uint48 timestamp) external {
        _scores[token] = ScoreData({
            score: score,
            grade: grade,
            timestamp: timestamp,
            version: 100,
            exists: true
        });
    }

    function setScoreSimple(address token, uint256 score100, uint256 timestamp) external {
        _scores[token] = ScoreData({
            score: uint16(score100 * 100),
            grade: score100 >= 90 ? bytes2("A") : score100 >= 80 ? bytes2("B") : bytes2("C"),
            timestamp: uint48(timestamp),
            version: 100,
            exists: true
        });
    }

    function setPaused(bool _paused) external {
        paused = _paused;
    }

    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }

    function getScore(address token) external view override returns (
        uint16 score, bytes2 grade, uint48 timestamp, uint16 version
    ) {
        require(!shouldRevert, "MockBasisOracle: forced revert");
        ScoreData memory data = _scores[token];
        return (data.score, data.grade, data.timestamp, data.version);
    }

    function isStale(address token, uint256 maxAge) external view override returns (bool) {
        ScoreData memory data = _scores[token];
        if (data.timestamp == 0) return true;
        return (block.timestamp - data.timestamp) > maxAge;
    }

    function getScoredTokens() external pure override returns (address[] memory) {
        return new address[](0);
    }
}
