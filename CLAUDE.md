# Basis Safe — Claude Code Context

> This is the ONLY context file for the `basis-safe` repo.
> This project is SEPARATE from the main Basis Protocol codebase.
> Do not look for CLAUDE.md, STRATEGY.md, or other files from the main repo — they don't exist here.

## What Basis Protocol Is

Basis Protocol is decision integrity infrastructure for on-chain finance. It produces standardized risk scores for crypto assets. The wedge product is the **Stablecoin Integrity Index (SII)** — a deterministic, versioned scoring system for stablecoin risk (0–100 scale, grades A+ through F).

The V4 evolution adds a **Wallet Risk Graph**: every Ethereum address gets a risk profile based on the stablecoins it holds. The wallet is the universal join key. A DAO treasury is a wallet — it has a composite risk score, concentration analysis, coverage quality, and exposure to unscored assets.

**What Basis is NOT:** a wallet, a DEX, an aggregator, a portfolio manager, a consulting firm, a compliance tool. Infrastructure only.

## What This Project Is

A **Safe Guard Module** (Solidity contract) and **Safe App** (React web UI) that bring Basis wallet risk intelligence into DAO treasuries managed by Safe multisigs.

**Two deliverables. Not three. No backend.**

1. **Guard Module** — `BasisSafeGuard.sol`. Solidity contract implementing Safe's `ITransactionGuard` interface. Deployed on-chain. Called by the Safe before and after every transaction. Checks stablecoin risk scores. Blocks or warns if thresholds are violated.

2. **Safe App** — React + TypeScript web app loaded inside Safe{Wallet} as an iframe. Shows treasury risk dashboard, holdings breakdown, concentration analysis, Guard configuration panel, historical risk trend, event log.

Both consume the **existing Basis API** at `https://basis-demo.replit.app`. There is NO separate backend, Express server, or API to build. The Safe App is a frontend that calls the live API directly.

## What's Already Running (the API this project consumes)

The Basis API is live at `https://basis-demo.replit.app` with these endpoints:

```
GET /api/health              → API status, last scoring cycle
GET /api/scores              → All 10 stablecoin SII scores
GET /api/scores/{coin}       → Single stablecoin detail (e.g., /api/scores/usdc)
GET /api/wallets/{address}   → Wallet risk profile: score, grade, holdings, HHI, coverage
GET /api/wallets/{address}/history → Daily risk score history
GET /api/methodology         → SII formula documentation
```

The API scores 10 stablecoins: USDC, USDT, DAI, FRAX, PYUSD, FDUSD, TUSD, USDD, USDe, USD1.

**SII Formula (v1.0.0):**
```
SII = 0.30×Peg + 0.25×Liquidity + 0.15×MintBurn + 0.10×Distribution + 0.20×Structural
```

Scores are 0–100. Grades: A+ (95+), A (90+), A- (85+), B+ (80+), B (75+), B- (70+), C+ (65+), C (60+), C- (55+), D (50+), F (<50).

## Architecture

```
┌──────────────────────────────────────────────────┐
│ Safe{Wallet} Interface                           │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ Safe App (React, loaded as iframe)         │  │
│  │ Dashboard / Holdings / Concentration /     │  │
│  │ Guard Config / History / Event Log         │  │
│  └──────────────┬─────────────────────────────┘  │
│                 │                                 │
└─────────────────┼─────────────────────────────────┘
                  │ HTTP (fetch)
                  ▼
┌──────────────────────────────────────────────────┐
│ Existing Basis API (DO NOT REBUILD)              │
│ https://basis-demo.replit.app/api/*              │
│ Already running. Already has all endpoints.      │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ BasisSafeGuard.sol (on-chain)                    │
│ Implements Safe's ITransactionGuard              │
│ Reads scores from BasisOracle contract           │
│ FAIL-OPEN by default                             │
└──────────────────────────────────────────────────┘
```

## Project Structure

```
basis-safe/
├── CLAUDE.md                   # THIS FILE
├── contracts/
│   ├── BasisSafeGuard.sol      # Guard Module
│   ├── interfaces/
│   │   ├── IBasisOracle.sol
│   │   └── IBasisSafeGuard.sol
│   └── mocks/
│       ├── MockBasisOracle.sol
│       └── MockERC20.sol
├── test/
│   ├── BasisSafeGuard.t.sol
│   ├── FailOpen.t.sol
│   ├── MultiSend.t.sol
│   └── Integration.t.sol
├── script/
│   ├── Deploy.s.sol
│   └── ConfigureGuard.s.sol
├── app/                        # Safe App (React)
│   ├── public/
│   │   ├── manifest.json
│   │   └── basis-icon.svg
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Holdings.tsx
│   │   │   ├── Concentration.tsx
│   │   │   ├── GuardConfig.tsx
│   │   │   ├── HistoryChart.tsx
│   │   │   └── EventLog.tsx
│   │   ├── hooks/
│   │   │   ├── useBasisApi.ts
│   │   │   ├── useGuardContract.ts
│   │   │   └── useWalletRisk.ts
│   │   ├── config.ts
│   │   └── abi/
│   │       └── BasisSafeGuard.json
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── foundry.toml
└── README.md
```

## Conventions

- Solidity ^0.8.20, Foundry for tests and deployment
- React 18+ with TypeScript, Vite build
- Never use the word "rating" — use "score," "index," "surface"
- Scores are 0–100, grades A+ through F
- All API calls go to the existing Basis API, never to a local backend
- Dark theme matching Safe{Wallet} UI
- CORS headers required on all hosted assets

## Do NOT

- Build a backend, Express server, API server, or any server-side code
- Create a new database or any data storage
- Modify the main Basis codebase (different repo entirely)
- Use `sudo` for anything
- Add custodial logic — Guard cannot move funds, only block/warn
- Build multi-chain support in V1 (Ethereum mainnet only)
- Build real-time indexing (daily batch scoring from the main API is fine)
- Use token gating — Guard is permissionless, any Safe can install it

---

# SPEC: Guard Module — Solidity Contract

## Interface Compliance

Implements Safe's `ITransactionGuard` (from `@safe-global/safe-smart-account` v1.4+). Extends `BaseTransactionGuard` which implements IERC165.

```solidity
// Safe calls these on every transaction:

function checkTransaction(
    address to,
    uint256 value,
    bytes memory data,
    Enum.Operation operation,
    uint256 safeTxGas,
    uint256 baseGas,
    uint256 gasPrice,
    address gasToken,
    address payable refundReceiver,
    bytes memory signatures,
    address msgSender
) external;

function checkAfterExecution(bytes32 hash, bool success) external;
```

`checkTransaction` is called BEFORE the Safe executes any transaction. If it reverts, the transaction is blocked. `checkAfterExecution` is called AFTER execution — cannot revert to undo, used as audit trail only.

## Contract: BasisSafeGuard.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BaseTransactionGuard} from
    "@safe-global/safe-smart-account/contracts/base/GuardManager.sol";
import {Enum} from
    "@safe-global/safe-smart-account/contracts/common/Enum.sol";

contract BasisSafeGuard is BaseTransactionGuard {

    // --- Events ---
    event ConfigUpdated(
        address indexed safe,
        uint256 minWalletScore,
        uint256 minAssetScore,
        bool enforceMode
    );
    event TransactionBlocked(
        address indexed safe,
        bytes32 txHash,
        uint256 currentScore,
        uint256 minRequired,
        string reason
    );
    event TransactionWarned(
        address indexed safe,
        bytes32 txHash,
        uint256 currentScore,
        uint256 minRequired,
        string reason
    );
    event OracleUpdated(address indexed newOracle);
    event ApiFallbackUsed(address indexed safe, bytes32 txHash);
    event StaleDataWarning(address indexed safe, address token, uint256 age);

    // --- Errors ---
    error TransactionBelowThreshold(
        address token,
        uint256 score,
        uint256 minimum,
        string reason
    );
    error OnlyOwner();

    // --- Structs ---
    struct GuardConfig {
        uint256 minWalletRiskScore;   // 0-100, default 75
        uint256 minAssetSiiScore;     // 0-100, default 70
        bool enforceMode;             // true = block, false = warn-only
        bool useOracle;               // true = on-chain oracle, false = API relay
        bool initialized;
    }

    // --- Constants ---
    uint256 public constant MAX_SCORE_AGE = 24 hours;
    bytes4 private constant TRANSFER_SELECTOR = 0xa9059cbb;
    bytes4 private constant APPROVE_SELECTOR = 0x095ea7b3;
    bytes4 private constant MULTISEND_SELECTOR = 0x8d80ff0a;

    // --- State ---
    mapping(address => GuardConfig) public configs;
    address public basisOracle;
    address public owner;
    mapping(address => bool) public knownStablecoins;
    mapping(address => uint256) private _preExecScores;

    constructor(address _oracle) {
        owner = msg.sender;
        basisOracle = _oracle;
        _initKnownStablecoins();
    }

    // --- Configuration (callable by the Safe itself via multisig tx) ---
    function configure(
        uint256 _minWalletRiskScore,
        uint256 _minAssetSiiScore,
        bool _enforceMode,
        bool _useOracle
    ) external {
        configs[msg.sender] = GuardConfig({
            minWalletRiskScore: _minWalletRiskScore,
            minAssetSiiScore: _minAssetSiiScore,
            enforceMode: _enforceMode,
            useOracle: _useOracle,
            initialized: true
        });
        emit ConfigUpdated(
            msg.sender,
            _minWalletRiskScore,
            _minAssetSiiScore,
            _enforceMode
        );
    }

    function setOracle(address _oracle) external {
        if (msg.sender != owner) revert OnlyOwner();
        basisOracle = _oracle;
        emit OracleUpdated(_oracle);
    }

    // --- checkTransaction (BEFORE every Safe tx) ---
    function checkTransaction(
        address to,
        uint256 value,
        bytes memory data,
        Enum.Operation operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address payable refundReceiver,
        bytes memory signatures,
        address msgSender
    ) external override {
        GuardConfig memory cfg = configs[msg.sender];
        if (!cfg.initialized) return; // no policy set — allow everything

        if (data.length >= 4) {
            bytes4 selector = bytes4(data[:4]);

            if (selector == MULTISEND_SELECTOR) {
                _checkMultiSend(msg.sender, data, cfg);
            } else if (selector == TRANSFER_SELECTOR && knownStablecoins[to]) {
                _checkAssetScore(msg.sender, to, cfg);
            }
            // approve: log only, no funds move
            // unknown selectors: pass through
        }
        // ETH transfers (no data): pass through
    }

    // --- checkAfterExecution (AFTER tx, cannot revert) ---
    function checkAfterExecution(bytes32 hash, bool success) external override {
        // Audit trail only — future: emit pre/post score delta
    }

    // --- Check single asset SII score ---
    function _checkAssetScore(
        address safe,
        address token,
        GuardConfig memory cfg
    ) internal {
        if (basisOracle == address(0)) {
            emit ApiFallbackUsed(safe, bytes32(0));
            return; // fail open
        }

        try IBasisOracle(basisOracle).getScore(token)
            returns (uint256 score, uint256 timestamp)
        {
            if (score == 0 || score > 100) {
                emit ApiFallbackUsed(safe, bytes32(0));
                return; // invalid score — fail open
            }
            if (block.timestamp - timestamp > MAX_SCORE_AGE) {
                emit StaleDataWarning(safe, token, block.timestamp - timestamp);
                return; // stale — fail open
            }
            if (score < cfg.minAssetSiiScore) {
                if (cfg.enforceMode) {
                    revert TransactionBelowThreshold(
                        token, score, cfg.minAssetSiiScore,
                        "Asset SII score below minimum"
                    );
                } else {
                    emit TransactionWarned(
                        safe, bytes32(0), score,
                        cfg.minAssetSiiScore,
                        "Asset SII score below minimum"
                    );
                }
            }
        } catch {
            emit ApiFallbackUsed(safe, bytes32(0));
            // oracle failed — fail open
        }
    }

    // --- Decode and check MultiSend batch ---
    function _checkMultiSend(
        address safe,
        bytes memory data,
        GuardConfig memory cfg
    ) internal {
        if (data.length < 68) return;
        uint256 offset = 68;
        uint256 dataLength = uint256(bytes32(data[36:68]));
        uint256 end = 68 + dataLength;

        while (offset < end && offset < data.length) {
            if (offset + 85 > data.length) break;

            address to;
            assembly {
                to := shr(96, mload(add(add(data, 0x21), offset)))
            }

            uint256 subDataLen;
            assembly {
                subDataLen := mload(add(add(data, 0x55), offset))
            }

            if (subDataLen >= 4 && knownStablecoins[to]) {
                bytes4 subSelector;
                assembly {
                    subSelector := mload(add(add(data, 0x75), offset))
                }
                if (subSelector == TRANSFER_SELECTOR) {
                    _checkAssetScore(safe, to, cfg);
                }
            }
            offset += 85 + subDataLen;
        }
    }

    // --- Known stablecoin addresses (Ethereum mainnet) ---
    function _initKnownStablecoins() internal {
        knownStablecoins[0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48] = true; // USDC
        knownStablecoins[0xdAC17F958D2ee523a2206206994597C13D831ec7] = true; // USDT
        knownStablecoins[0x6B175474E89094C44Da98b954EedeAC495271d0F] = true; // DAI
        knownStablecoins[0x853d955aCEf822Db058eb8505911ED77F175b99e] = true; // FRAX
        knownStablecoins[0x6c3ea9036406852006290770BEdFcAbA0e23A0e8] = true; // PYUSD
        knownStablecoins[0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409] = true; // FDUSD
        knownStablecoins[0x0000000000085d4780B73119b644AE5ecd22b376] = true; // TUSD
        knownStablecoins[0x0C10bF8FcB7Bf5412187A595ab97a3609160b5c6] = true; // USDD
        knownStablecoins[0x4c9EDD5852cd905f086C759E8383e09bff1E68B3] = true; // USDe
        knownStablecoins[0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d] = true; // USD1
    }
}

interface IBasisOracle {
    function getScore(address token)
        external view returns (uint256 score, uint256 timestamp);
    function getScores(address[] calldata tokens)
        external view returns (uint256[] memory scores, uint256[] memory timestamps);
    function hasScore(address token)
        external view returns (bool);
}
```

## Fail-Open Design (NON-NEGOTIABLE)

| Scenario | Behavior | Rationale |
|----------|----------|-----------|
| Oracle returns 0 / reverts | Allow tx, emit `ApiFallbackUsed` | Zero is invalid; treat as unavailable |
| Oracle score stale (>24h) | Allow tx, emit `StaleDataWarning` | Stale data is unreliable |
| API error / timeout | Allow tx, emit `ApiFallbackUsed` | Downtime must not freeze treasury |
| Token not in registry | Allow tx (unscored) | No score ≠ evidence of risk |
| Guard has a bug | `setGuard(address(0))` removes it | Safe built-in escape |

**A DAO treasury is sovereign. No external data source freezes funds.**

## Transaction Types

| Pattern | Detection | Check |
|---------|-----------|-------|
| ERC-20 `transfer(to, amount)` | `0xa9059cbb` | Score token at `to` |
| ERC-20 `approve(spender, amount)` | `0x095ea7b3` | Log only |
| MultiSend batch | `0x8d80ff0a` | Decode + check each sub-tx |
| ETH transfer (no data) | `value > 0, data.length == 0` | Pass through |

## Configuration Defaults

| Parameter | Default | Description |
|-----------|---------|-------------|
| `minWalletRiskScore` | 75 | Min wallet-level risk score (0–100) |
| `minAssetSiiScore` | 70 | Min SII score for any asset (0–100) |
| `enforceMode` | `false` | `true` blocks, `false` warns only |
| `useOracle` | `false` | `true` reads on-chain oracle |

## Gas Budget

- Oracle reads: <50,000 gas
- Signature verification: ~30,000 gas
- MultiSend: O(n) per sub-tx
- Hard cap: 200,000 gas total overhead

---

# SPEC: Safe App — React Web UI

## Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18+ with TypeScript |
| Safe SDK | `@safe-global/safe-apps-react-sdk` |
| Web3 | ethers.js v6 or viem |
| Charts | Recharts |
| Styling | Tailwind CSS |
| Build | Vite |
| Hosting | Vercel or IPFS |

## SDK Integration

```tsx
import SafeProvider from '@safe-global/safe-apps-react-sdk';
import { useSafeAppsSDK } from '@safe-global/safe-apps-react-sdk';

// Root:
<SafeProvider><App /></SafeProvider>

// Inside any component:
const { sdk, safe } = useSafeAppsSDK();
const safeAddress = safe.safeAddress;  // the treasury wallet address
const chainId = safe.chainId;

// Propose a transaction to the Safe (requires multisig approval):
await sdk.txs.send({ txs: [{
  to: GUARD_CONTRACT_ADDRESS,
  value: '0',
  data: encodedFunctionData
}] });
```

## API Endpoints (from existing Basis API — DO NOT REBUILD)

Base URL: `https://basis-demo.replit.app`

| Endpoint | Returns | Used By |
|----------|---------|---------|
| `GET /api/scores` | All SII scores | Holdings table |
| `GET /api/scores/{coin}` | Single stablecoin detail | Asset drill-down |
| `GET /api/wallets/{address}` | Wallet risk profile | Main dashboard |
| `GET /api/wallets/{address}/history` | Daily score history | Trend chart |
| `GET /api/health` | API status | Status indicator |

## Screens

### 1. Treasury Dashboard (landing page)

Fetches `GET /api/wallets/{safe_address}`.

- **Wallet Risk Score**: Large circular gauge (0–100) with grade badge. Green 80+, yellow 60–79, red <60.
- **Risk Status Bar**: Current score vs. configured minimum threshold.
- **Coverage Quality Badge**: "Full" / "High" / "Partial" / "Low" (% unscored).
- **Concentration Grade**: HHI-derived.
- **Guard Status**: "Active — Enforce" / "Active — Warn" / "Not Installed" with setup flow.

### 2. Holdings Breakdown

Table of every stablecoin in the treasury:

| Column | Source | Visual |
|--------|--------|--------|
| Asset | symbol | Token icon + name |
| Balance | value_usd | Formatted USD |
| % of Treasury | pct_of_wallet | Progress bar |
| SII Score | sii_score | Score + grade pill (color-coded) |
| Status | is_scored | "Scored" / "Unscored" badge |

### 3. Concentration Analysis

- **Donut Chart**: Proportional allocation across holdings.
- **HHI Gauge**: 0–10,000 normalized to 0–100. <15 diversified, 15–25 moderate, >25 concentrated.
- **Recommendations**: If HHI > 25, suggest rebalancing.
- **Dominant Asset Warning**: Banner if any single asset > 50%.

### 4. Guard Configuration Panel

Writes to BasisSafeGuard via Safe SDK transaction proposals.

- Min Wallet Risk Score slider (0–100, default 75)
- Min Asset SII Score slider (0–100, default 70)
- Enforce/Warn toggle
- Oracle/API toggle (gray out oracle if not deployed)
- Save: proposes `guard.configure()` tx
- Install Guard: proposes `safe.setGuard(guardAddress)` with warning modal
- Remove Guard: proposes `safe.setGuard(address(0))` with confirmation

### 5. Historical Risk Trend

Line chart from `/api/wallets/{address}/history`. Daily points, threshold overlay, event markers, 7d/30d/90d/all-time.

### 6. Event Log

On-chain Guard events: `TransactionBlocked`, `TransactionWarned`, `ApiFallbackUsed`, `ConfigUpdated`. Each entry: timestamp, type, tx hash (linked to explorer), score, threshold.

## Guard Installation Flow

1. On load: read `guard()` slot on Safe contract to check if Guard is set
2. No Guard → "Install Basis Guard" button + warning modal
3. Install: batched tx via MultiSend — `setGuard(guardAddress)` + `configure()` with defaults
4. Different Guard active → show warning, don't offer to replace
5. Remove → `setGuard(address(0))` with confirmation

## manifest.json

```json
{
  "name": "Basis Treasury Guard",
  "description": "Risk intelligence for DAO treasuries. Monitor stablecoin integrity scores, concentration risk, and coverage quality.",
  "iconPath": "basis-icon.svg"
}
```

CORS headers required: `Access-Control-Allow-Origin: *`

---

# Security Model

## Threat Mitigations

| Threat | Mitigation |
|--------|-----------|
| Oracle manipulation | Sanity bounds 1–100, staleness >24h rejected |
| Oracle downtime | Fail-open: tx proceeds with warning |
| API compromise | Signing key rotation, signature verification |
| Guard locks treasury | `setGuard(address(0))` escape, standard multisig |
| Malicious config | Only Safe itself calls `configure()`, requires multisig |
| Score error → losses | Disclaimers, ToS, warn-mode default, deterministic formula |

## Fail-Open Rationale

- DAO treasury is sovereign
- Downtime is normal, not an edge case
- Guard is advisory, not custodial
- `setGuard(address(0))` always available

---

# Deployment Sequence

| Step | Action | Timeline |
|------|--------|----------|
| 1 | Deploy BasisSafeGuard to Sepolia | Week 1 |
| 2 | Deploy Safe App to Vercel | Week 1–2 |
| 3 | Test as Custom App in Safe{Wallet} on Sepolia | Week 2 |
| 4 | Solo audit of Guard contract | Week 2–3 |
| 5 | Deploy Guard to Ethereum mainnet | Week 3–4 |
| 6 | Submit Safe App pre-assessment form | Week 4 |
| 7 | Safe team review + staging | Week 4–6 |
| 8 | Production listing | Week 6+ |

---

# Success Metrics

| Metric | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|----------|
| Safes with Guard | 5–10 | 25–50 | 100+ |
| Value protected | $5–20M | $50–200M | $500M+ |
| App opens/month | 50–200 | 500+ | 2,000+ |
| Txs checked | 100–500 | 2,000+ | 10,000+ |

**Kill signal:** Zero Guard installs after Month 6.

---

# Wallet Risk Score Formula (wallet-v1.0.0)

For reference — this is computed by the main Basis API, not by this project:

```python
# Value-weighted average of SII scores across scored holdings
scored = [h for h in holdings if h.is_scored and h.sii_score is not None]
if not scored:
    risk_score = None
total_scored_value = sum(h.value_usd for h in scored)
risk_score = sum(h.value_usd * h.sii_score for h in scored) / total_scored_value

# Concentration HHI (all holdings)
total = sum(h.value_usd for h in all_holdings)
shares = [(h.value_usd / total) * 100 for h in all_holdings]
hhi = sum(s ** 2 for s in shares)
```
