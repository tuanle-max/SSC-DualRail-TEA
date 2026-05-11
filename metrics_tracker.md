# Experimental Metrics Tracker

| Metric ID | Description | Result | Notes |
| :--- | :--- | :--- | :--- |
| **LAT-1** | Submission-to-Receipt Latency | 609 ms | API response time before block confirmation. txHash: bd08227e2682f57882afe8660b443434fec9ca533cb9a61d8b4a7d2c4a927b7f. Không bao gồm thời gian xác nhận khối (~20s). |
| **BATCH-1** | Kích thước lô (Batch Size) | 1681 payment events | 1681 giao dịch hợp lệ |
| **FIR-1** | Fault Injection Rate | 15.70% | Simulated fault injection for stress-testing; not indicative of live error rates. |
| **VER-1** | Thời gian kiểm chứng (Verification Time) | 0.0735 ms | Trung bình 100 lần chạy (local node test). Chỉ tính thời gian xác minh logic tại máy khách, không bao gồm độ trễ mạng khi lấy dữ liệu. |
| **COST-1** | Chi phí neo (Anchoring Cost) | 15.30 ADA | ~$4.28 USD/tháng (3 batches/ngày × 30 ngày × 0.17 ADA = 15.30 ADA; 1 ADA = 0.28 USD, nguồn CoinMarketCap ngày May 11, 2026). |
