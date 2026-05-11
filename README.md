# SSC-DualRail-TEA: School Smart Contract with Dual-Rail Triple-Entry Accounting

## Overview
This repository contains the prototype and experimental results for a blockchain-anchored financial reconciliation system designed for educational institutions. The system utilizes a **Dual-Rail** architecture, bridging traditional RDBMS logs with the Cardano blockchain to achieve **Triple-Entry Accounting (TEA)** without high operational overhead.

## Experimental Metrics Summary

| Metric ID | Description | Result | Notes |
| :--- | :--- | :--- | :--- |
| **LAT-1** | Latency | 609 ms | On-chain anchoring confirmation |
| **BATCH-1** | Batch Size | 1,681 txs | Transactions per Merkle root |
| **EXC-1** | Exception Rate | 15.70% | Simulated data discrepancies |
| **VER-1** | Verification Time | 0.0735 ms | Client-side validation speed |
| **COST-1** | Anchoring Cost | $7.86 USD/mo | Based on 5,000 tx/day scale |

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

### 3. How to Run Benchmarks
*   **Cost Calculation:** `node anchoring-service/calc_cost.js`
*   **Performance Test:** `node school-verifier/auto_test_ver1.js`

---
*Created for ICBC 2026 Submission - Project SSC-DualRail-TEA.*
