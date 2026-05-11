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

# Fault Injection Rate target: ~15% of records will be intentionally malformed.
# This is a STRESS-TEST scenario and does NOT reflect live production error rates.
# Measured output is reported as metric FIR-1 in metrics_tracker.md.
FAULT_INJECTION_THRESHOLD = 0.15

def update_metrics(fir_rate):
    """Update the FIR-1 metric in metrics_tracker.md with the measured fault injection rate."""
    with open(METRICS_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    pattern = r"(\| \*\*FIR-1\*\* \| Fault Injection Rate \|)(.*?\|.*?\|)"
    replacement = (
        rf"\1 {fir_rate:.2f}% | "
        r"Simulated fault injection for stress-testing; not indicative of live error rates. |"
    )
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

            # =================================================================
            # FAULT INJECTION: Stress-test for Ingestion Pipeline filter
            # -----------------------------------------------------------------
            # The fault threshold is intentionally set to 15% (FAULT_INJECTION_THRESHOLD),
            # producing a measured FIR-1 of ~15.70% due to statistical variance.
            #
            # This is an INTENTIONAL stress-test, NOT a reflection of real-world
            # production error rates. Three fault types are injected:
            #   1. negative_amount    : Negative payment value (business rule violation)
            #   2. missing_student_id : Mandatory identifier field removed
            #   3. invalid_student_id : Student ID with invalid format (e.g. "XYZ12345")
            # =================================================================
            if random.random() < FAULT_INJECTION_THRESHOLD:
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
            except urllib.error.HTTPError:
                total_rejected += 1
            except Exception:
                total_rejected += 1

    fir_rate = (total_rejected / total_sent) * 100 if total_sent > 0 else 0

    print(f"--- BÁO CÁO KẾT QUẢ INGESTION ---")
    print(f"Tổng số request gửi đi: {total_sent}")
    print(f"Tổng số request hợp lệ (ghi log): {total_logged}")
    print(f"Tổng số request bị từ chối (HTTP 400/422): {total_rejected}")
    print(f"Fault Injection Rate applied: {fir_rate:.2f}% (Stress-test scenario)")
    print(f"[FIR-1] Chỉ số Fault Injection Rate: {fir_rate:.2f}%")

    update_metrics(fir_rate)
    print("Đã cập nhật chỉ số FIR-1 vào file metrics_tracker.md")

if __name__ == "__main__":
    run()
