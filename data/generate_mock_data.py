import csv
import random
import uuid
import datetime
import os

def generate_mock_data(filename="mock_invoices.csv", num_rows=1000):
    channels = ["Bank", "Wallet"]
    
    # Get the directory of this script to create the file in the same folder
    current_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(current_dir, filename)
    
    with open(file_path, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(["tx_id", "student_id", "amount", "channel", "timestamp"])
        
        base_time = datetime.datetime.now()
        
        for i in range(num_rows):
            tx_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
            student_id = f"STU{random.randint(10000, 99999)}"
            amount = random.randint(50, 500) * 1000  # VND amounts
            channel = random.choice(channels)
            timestamp = (base_time - datetime.timedelta(minutes=random.randint(0, 10000))).isoformat()
            
            writer.writerow([tx_id, student_id, amount, channel, timestamp])

if __name__ == "__main__":
    generate_mock_data()
    print(f"Generated 1000 rows of mock data.")
