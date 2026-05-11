import csv
import json
import random
import urllib.request
import urllib.error
import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

URL = "http://127.0.0.1:8000/ingest"
CSV_FILE = "../data/mock_invoices.csv"
METRICS_FILE = "../metrics_tracker.md"

def update_metrics(exc_rate):
    with open(METRICS_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    
    pattern = r"(\| \*\*EXC-1\*\* \| Tỉ lệ lỗi \(Exception Rate\) \|)(.*?\|.*?\|)"
    replacement = rf"\1 {exc_rate:.2f}% | Mô phỏng chèn lỗi tự động |"
    new_content = re.sub(pattern, replacement, content)
    
    with open(METRICS_FILE, "w", encoding="utf-8") as f:
        f.write(new_content)

def run():
    total_sent = 0
    total_rejected = 0
    total_logged = 0

    with open(CSV_FILE, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            payload = {
                "tx_id": row["tx_id"],
                "student_id": row["student_id"],
                "amount": float(row["amount"]),
                "channel": row["channel"],
                "timestamp": row["timestamp"]
            }

            if random.random() < 0.15:
                fault_type = random.choice(["negative_amount", "missing_student_id", "invalid_student_id"])
                if fault_type == "negative_amount":
                    payload["amount"] = -1000
                elif fault_type == "missing_student_id":
                    if "student_id" in payload:
                        del payload["student_id"]
                elif fault_type == "invalid_student_id":
                    payload["student_id"] = "XYZ12345"

            total_sent += 1
            data = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(URL, data=data, headers={'Content-Type': 'application/json'})
            
            try:
                with urllib.request.urlopen(req, timeout=5) as response:
                    if response.status == 200:
                        total_logged += 1
            except urllib.error.HTTPError as e:
                total_rejected += 1
            except Exception as e:
                total_rejected += 1

    exc_rate = (total_rejected / total_sent) * 100 if total_sent > 0 else 0
    print(f"--- BÁO CÁO KẾT QUẢ INGESTION ---")
    print(f"Tổng số request gửi đi: {total_sent}")
    print(f"Tổng số request hợp lệ (ghi log): {total_logged}")
    print(f"Tổng số request bị từ chối (HTTP 400/422): {total_rejected}")
    print(f"Chỉ số EXC-1 (Exception Rate): {exc_rate:.2f}%")

    update_metrics(exc_rate)
    print("Đã cập nhật chỉ số EXC-1 vào file metrics_tracker.md")

if __name__ == "__main__":
    run()
