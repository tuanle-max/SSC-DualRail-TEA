require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const CryptoJS = require('crypto-js');
const _libsodium = require('libsodium-wrappers-sumo');
const { MeshWallet, KoiosProvider, Transaction } = require('@meshsdk/core');

function keccak256(data) {
    return CryptoJS.SHA3(data, { outputLength: 256 }).toString(CryptoJS.enc.Hex);
}

class MerkleTree {
    constructor(leaves) {
        this.leaves = leaves;
        this.levels = [this.leaves];
        this.buildTree();
    }

    buildTree() {
        let currentLevel = this.leaves;
        while (currentLevel.length > 1) {
            const nextLevel = [];
            for (let i = 0; i < currentLevel.length; i += 2) {
                const left = currentLevel[i];
                const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
                nextLevel.push(keccak256(left + right));
            }
            this.levels.push(nextLevel);
            currentLevel = nextLevel;
        }
    }

    getRoot() {
        if (this.levels.length === 0 || this.levels[0].length === 0) return null;
        return this.levels[this.levels.length - 1][0];
    }

    getProof(index) {
        let proof = [];
        let currentIndex = index;
        for (let i = 0; i < this.levels.length - 1; i++) {
            const currentLevel = this.levels[i];
            const isRightNode = currentIndex % 2 !== 0;
            const siblingIndex = isRightNode ? currentIndex - 1 : Math.min(currentIndex + 1, currentLevel.length - 1);
            
            proof.push({
                position: isRightNode ? 'left' : 'right',
                data: currentLevel[siblingIndex]
            });
            currentIndex = Math.floor(currentIndex / 2);
        }
        return proof;
    }
}

async function main() {
    await _libsodium.ready;
    const mnemonicStr = process.env.WALLET_MNEMONIC;

    if (!mnemonicStr) {
        let newMnemonic = [];
        try {
            newMnemonic = AppWallet.brew(); // returns array of 24 words
        } catch (e) {
            console.error("Lỗi khi sinh Mnemonic:", e);
            process.exit(1);
        }
        
        const wallet = new MeshWallet({
            networkId: 0,
            fetcher: { fetch: () => {} },
            submitter: { submitTx: () => {} },
            key: { type: 'mnemonic', words: newMnemonic }
        });
        
        const address = await wallet.getChangeAddress();
        console.log(`\n======================================================`);
        console.log(`[CẢNH BÁO] THIẾU THÔNG TIN BẢO MẬT TRONG FILE .env!`);
        console.log(`Đã tạo ví mới tạm thời.`);
        console.log(`Mnemonic (24 words):`);
        console.log(`${newMnemonic.join(' ')}`);
        console.log(`\nVui lòng nạp tADA vào địa chỉ này:`);
        console.log(`${address}`);
        console.log(`qua link: https://docs.cardano.org/cardano-testnets/tools/faucet/`);
        console.log(`\nSau đó điền Mnemonic vào file .env và chạy lại script!`);
        console.log(`======================================================\n`);
        process.exit(0);
    }

    const provider = new KoiosProvider('preprod');
    const wallet = new MeshWallet({
        networkId: 0,
        fetcher: provider,
        submitter: provider,
        key: { type: 'mnemonic', words: mnemonicStr.split(' ') }
    });

    const address = await wallet.getChangeAddress();
    console.log(`Đã kết nối ví: ${address}`);

    const logFile = '../data/ingestion_chain.log';
    if (!fs.existsSync(logFile)) {
        console.error('Không tìm thấy file ingestion_chain.log!');
        process.exit(1);
    }

    const lines = fs.readFileSync(logFile, 'utf-8').split('\n').filter(line => line.trim() !== '');
    const batchSize = lines.length;
    
    console.log(`Đọc được ${batchSize} lá (giao dịch hợp lệ) từ log.`);

    const leaves = [];
    const txIdMapping = {}; 

    lines.forEach((line, index) => {
        const hash = keccak256(line);
        leaves.push(hash);
        try {
            const data = JSON.parse(line).data;
            if (data && data.tx_id) {
                txIdMapping[data.tx_id] = index;
            }
        } catch (e) {}
    });

    const tree = new MerkleTree(leaves);
    const root = tree.getRoot();
    
    const proofsExport = {
        root: root,
        batch_size: batchSize,
        leaves: leaves,
        proofs: {}
    };

    for (const [txId, index] of Object.entries(txIdMapping)) {
        proofsExport.proofs[txId] = tree.getProof(index);
    }

    fs.writeFileSync('../data/merkle_proofs.json', JSON.stringify(proofsExport, null, 2));
    console.log(`Đã xuất Merkle Root và Proofs ra data/merkle_proofs.json`);
    console.log(`Merkle Root: ${root}`);

    console.log('Bắt đầu giao dịch neo (Anchoring)...');
    
    try {
        const tx = new Transaction({ initiator: wallet });
        tx.sendLovelace(address, '1000000'); 
        tx.setMetadata(1337, {
            msg: ["SSC Anchor"],
            root: root,
            batch_size: batchSize
        });

        const unsignedTx = await tx.build();
        const signedTx = await wallet.signTx(unsignedTx);
        
        console.log('Đang submit giao dịch...');
        const startTime = Date.now();
        const txHash = await wallet.submitTx(signedTx);
        const endTime = Date.now();
        const lat1 = endTime - startTime;

        console.log(`\n--- BÁO CÁO KẾT QUẢ ANCHORING ---`);
        console.log(`BATCH-1 (Kích thước lô): ${batchSize} txs`);
        console.log(`LAT-1 (Độ trễ): ${lat1} ms`);
        console.log(`Giao dịch thành công! txHash: ${txHash}`);

        const metricsFile = '../metrics_tracker.md';
        let metricsContent = fs.readFileSync(metricsFile, 'utf-8');
        
        const latPattern = /(\| \*\*LAT-1\*\* \| Độ trễ \(Latency\) \|)(.*?\|.*?\|)/;
        metricsContent = metricsContent.replace(latPattern, `$1 ${lat1} ms | txHash: ${txHash} |`);
        
        const batchPattern = /(\| \*\*BATCH-1\*\* \| Kích thước lô \(Batch Size\) \|)(.*?\|.*?\|)/;
        metricsContent = metricsContent.replace(batchPattern, `$1 ${batchSize} txs | ${batchSize} giao dịch hợp lệ |`);
        
        fs.writeFileSync(metricsFile, metricsContent);
        console.log('Đã cập nhật chỉ số LAT-1 và BATCH-1 vào file metrics_tracker.md');
        
    } catch (error) {
        console.error('Lỗi khi thực hiện giao dịch neo:', error.message || error);
        process.exit(1);
    }
}

main();
