const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Replicates the hashing logic used in app.js
 * Node's sha3-256 is equivalent to CryptoJS.SHA3(data, { outputLength: 256 })
 */
function hash(data) {
    return crypto.createHash('sha3-256').update(data).digest('hex');
}

async function runTest() {
    try {
        const proofPath = path.join(__dirname, '../data/merkle_proofs.json');
        if (!fs.existsSync(proofPath)) {
            throw new Error(`Proof file not found at ${proofPath}`);
        }
        
        const rawData = fs.readFileSync(proofPath, 'utf8');
        const proofData = JSON.parse(rawData);
        
        const invoiceIds = Object.keys(proofData.proofs);
        if (invoiceIds.length === 0) {
            throw new Error("No proofs found in merkle_proofs.json");
        }
        
        const targetId = invoiceIds[0];
        const proof = proofData.proofs[targetId];
        
        console.log(`--- VER-1 Performance Test ---`);
        console.log(`Target Invoice: ${targetId}`);
        console.log(`Proof depth: ${proof.length}`);
        console.log(`Iterations: 100`);

        const iterations = 100;
        let timings = [];

        for (let i = 0; i < iterations; i++) {
            const startTime = performance.now();
            
            // 1. Initial Leaf Hash
            let currentHash = hash("dummy_leaf_data_string_for_testing_purposes");
            
            // 2. Merkle Proof Path Hashing
            for (let p of proof) {
                if (p.position === 'left') {
                    currentHash = hash(p.data + currentHash);
                } else {
                    currentHash = hash(currentHash + p.data);
                }
            }
            
            const endTime = performance.now();
            timings.push(endTime - startTime);
        }

        const sum = timings.reduce((a, b) => a + b, 0);
        const avg = sum / iterations;

        console.log(`\nResults:`);
        console.log(`Total time: ${sum.toFixed(2)} ms`);
        console.log(`Average (VER-1): ${avg.toFixed(4)} ms`);
        
        // Output for parent process to consume
        console.log(`METRIC_VER1=${avg.toFixed(4)}`);

    } catch (e) {
        console.error("Test failed:", e.message);
        process.exit(1);
    }
}

runTest();
