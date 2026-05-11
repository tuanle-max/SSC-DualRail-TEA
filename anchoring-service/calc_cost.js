const txHash = "bd08227e2682f57882afe8660b443434fec9ca533cb9a61d8b4a7d2c4a927b7f";
const url = "https://preprod.koios.rest/api/v1/tx_info";

async function calc() {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'accept': 'application/json', 'content-type': 'application/json' },
            body: JSON.stringify({ "_tx_hashes": [txHash] })
        });
        const data = await response.json();
        if (!data || data.length === 0) {
            throw new Error("No data returned from Koios API");
        }
        const feeLovelace = parseInt(data[0].fee);
        const feeADA = feeLovelace / 1000000;
        
        const batchesPerDay = 3;
        const days = 30;
        const totalADA = feeADA * batchesPerDay * days;
        const totalUSD = totalADA * 0.5;
        
        const result = {
            feePerBatchADA: feeADA,
            totalMonthlyADA: totalADA.toFixed(2),
            totalMonthlyUSD: totalUSD.toFixed(2)
        };
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Error calculating cost:", e.message);
        process.exit(1);
    }
}
calc();
