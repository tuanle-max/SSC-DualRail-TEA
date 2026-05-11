function keccak256(data) {
    return CryptoJS.SHA3(data, { outputLength: 256 }).toString(CryptoJS.enc.Hex);
}

async function verifyPayment() {
    const txHash = document.getElementById('txHash').value.trim();
    const invoiceId = document.getElementById('invoiceId').value.trim();
    const studentId = document.getElementById('studentId').value.trim();
    const amount = document.getElementById('amount').value.trim();

    const resultBox = document.getElementById('resultBox');
    const resultMessage = document.getElementById('resultMessage');
    const resultTime = document.getElementById('resultTime');
    const verifyBtn = document.getElementById('verifyBtn');

    if (!txHash || !invoiceId || !studentId || !amount) {
        showResult(false, 'Vui lòng điền đầy đủ thông tin.', 0);
        return;
    }

    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Đang xác minh...';
    
    // Bắt đầu bấm giờ
    const startTime = performance.now();

    try {
        // Bước A: Lấy Metadata từ Cardano (qua Proxy nội bộ để tránh lỗi CORS)
        const koiosRes = await fetch('/koios_proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ _tx_hashes: [txHash] })
        });
        const koiosData = await koiosRes.json();
        
        if (!koiosData || koiosData.length === 0) {
            throw new Error('Không tìm thấy giao dịch trên Cardano Preprod.');
        }

        let onChainRoot = null;
        const metadataMap = koiosData[0].metadata;
        
        if (metadataMap["1337"]) {
            onChainRoot = metadataMap["1337"].root;
        }

        if (!onChainRoot) {
            throw new Error('Không tìm thấy Merkle Root trong metadata (Label 1337).');
        }

        // Bước B: Lấy Dữ liệu nguyên thủy (Leaf) từ Server (giả lập database của trường)
        const leafRes = await fetch(`/data/leaf_data?txId=${invoiceId}`);
        if (!leafRes.ok) {
            throw new Error('Không tìm thấy Invoice ID trong hệ thống cục bộ.');
        }
        const leafData = await leafRes.json();
        const exactLine = leafData.line;
        const parsedData = JSON.parse(exactLine).data;

        // Đối chiếu dữ liệu nhập vào với dữ liệu nguyên thủy
        if (parsedData.student_id !== studentId || parsedData.amount != amount) {
            throw new Error('Thông tin không khớp! (Sai Student ID hoặc Amount)');
        }

        // Băm dữ liệu để tạo Leaf Hash (Keccak256)
        // Lưu ý: Dữ liệu gốc trong log trên Windows có ký tự \r ở cuối mỗi dòng trước \n
        const leafHash = keccak256(exactLine);

        // Lấy Merkle Proof
        const proofRes = await fetch('/data/merkle_proofs.json');
        const proofData = await proofRes.json();
        const proof = proofData.proofs[invoiceId];

        if (!proof) {
            throw new Error('Không có Merkle Proof cho Invoice ID này.');
        }

        // Bước C: Tính toán lại Merkle Root từ Proof
        let currentHash = leafHash;
        for (let p of proof) {
            if (p.position === 'left') {
                currentHash = keccak256(p.data + currentHash);
            } else {
                currentHash = keccak256(currentHash + p.data);
            }
        }

        // Kết thúc bấm giờ
        const endTime = performance.now();
        const ver1 = endTime - startTime;

        if (currentHash === onChainRoot) {
            showResult(true, 'Xác minh thành công! Dữ liệu nguyên bản và On-chain khớp 100%.', ver1);
            
            // Tự động ghi nhận metric VER-1
            fetch('/update_metric', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ver1 })
            }).catch(e => console.error('Lỗi khi lưu metric:', e));
            
        } else {
            showResult(false, 'Xác minh thất bại! Merkle Proof không khớp với On-chain Root.', ver1);
        }

    } catch (err) {
        const endTime = performance.now();
        showResult(false, err.message, endTime - startTime);
    } finally {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify Payment';
    }
}

function showResult(isSuccess, message, timeMs) {
    const resultBox = document.getElementById('resultBox');
    const resultMessage = document.getElementById('resultMessage');
    const resultTime = document.getElementById('resultTime');

    resultBox.className = 'result-box visible';
    if (isSuccess) {
        resultBox.classList.add('success');
    } else {
        resultBox.classList.add('error');
    }

    resultMessage.textContent = message;
    if (timeMs > 0) {
        resultTime.textContent = `VER-1 (Thời gian kiểm chứng): ${timeMs.toFixed(2)} ms`;
    } else {
        resultTime.textContent = '';
    }
}
