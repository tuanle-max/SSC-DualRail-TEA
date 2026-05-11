# SSC-DualRail-TEA: School Smart Contract with Dual-Rail Triple-Entry Accounting

> **GitHub Repository:** [https://github.com/tuanle-max/SSC-DualRail-TEA](https://github.com/tuanle-max/SSC-DualRail-TEA)

## Overview
This repository contains the prototype and experimental results for a blockchain-anchored financial reconciliation system designed for educational institutions. The system utilizes a **Dual-Rail** architecture, bridging traditional RDBMS logs with the Cardano blockchain to achieve **Triple-Entry Accounting (TEA)** without high operational overhead.

## Experimental Metrics Summary

| Metric ID | Description | Result | Notes |
| :--- | :--- | :--- | :--- |
| **LAT-1** | Submission-to-Receipt Latency | 609 ms | API response time before block confirmation. |
| **BATCH-1** | Batch Size | 1,681 payment events | Transactions per Merkle root |
| **FIR-1** | Fault Injection Rate | 15.70% | Simulated fault injection for stress-testing; not indicative of live error rates. |
| **VER-1** | Verification Time | 0.0735 ms | Client-side logic only; excludes network retrieval latency. |
| **COST-1** | Anchoring Cost | 15.30 ADA (~$4.28 USD/mo) | 3 batches/day × 30 days × 0.17 ADA; at 0.28 USD/ADA (CoinMarketCap, May 11, 2026). |

## System Architecture
1. **Traditional Rail:** SMS generates invoices and records them in a local PostgreSQL/CSV log.
2. **Blockchain Rail:** Batches of invoice hashes are organized into a Merkle tree. The root is anchored to Cardano Preprod using CIP-20 metadata.
3. **Verification Rail:** The **School Verifier** (Prototype C) allows any stakeholder to verify invoice integrity by comparing local data against the on-chain Merkle root.

## Setup & Replication (Academic Reference)

### 1. Technical Environment
*   **Network:** Cardano Preprod (Testnet)
*   **Infrastructure:** Node.js v24+, Python 3.10+
*   **Oracles:** Koios API v1 for metadata ingestion.
*   **Hashing:** Keccak-256 (SHA3-256) for all cryptographic commitments.

### 2. Implementation Modules
*   `/anchoring-service`: Node.js service for pushing Merkle roots to Cardano and calculating costs.
*   `/school-verifier`: Modern Zen UI for end-user verification, built with Vanilla JS and CSS.
*   `/oracle-gateway`: Bridge for retrieving blockchain state.
*   `/data`: Contains mock datasets, ingestion logs, and generated Merkle proofs.

### 3. Reproduction

Follow the steps below to fully reproduce the experimental results reported in the paper.

#### Step 1 — Generate Dataset & Measure FIR-1 (Fault Injection Rate)

Start the Oracle Gateway ingestion server, then run the fault-injection pump script:

```bash
# Terminal 1: start the ingestion server
cd oracle-gateway
pip install -r requirements.txt
uvicorn main:app --reload

# Terminal 2: pump mock data with 15% fault injection
cd oracle-gateway
python pump_data.py
```

This script reads `data/mock_invoices.csv`, randomly injects ~15% malformed records (FIR-1), sends each record to the ingestion API, and auto-updates `metrics_tracker.md` with the measured Fault Injection Rate.

#### Step 2 — Measure VER-1 (Client-Side Verification Time)

```bash
cd school-verifier
npm install
node auto_test_ver1.js
```

This script runs 100 iterations of client-side Merkle proof verification and reports the average latency (VER-1) in milliseconds.

#### Step 3 — Calculate COST-1 (Anchoring Cost)

```bash
cd anchoring-service
npm install
node calc_cost.js
```

Reports the estimated monthly anchoring cost based on 3 batches/day × 30 days × 0.17 ADA/tx at the assumed exchange rate.

### 4. How to Run Benchmarks (Quick Reference)
*   **Cost Calculation:** `node anchoring-service/calc_cost.js`
*   **Performance Test:** `node school-verifier/auto_test_ver1.js`

---
*Created for ICBC 2026 Submission - Project SSC-DualRail-TEA.*
*Repository: [https://github.com/tuanle-max/SSC-DualRail-TEA](https://github.com/tuanle-max/SSC-DualRail-TEA)*
