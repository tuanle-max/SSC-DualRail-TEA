import http.server
import socketserver
import json
import re
import os

PORT = 3000

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/data/merkle_proofs.json':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            with open('../data/merkle_proofs.json', 'rb') as file:
                self.wfile.write(file.read())
            return
            
        if self.path.startswith('/data/leaf_data'):
            from urllib.parse import urlparse, parse_qs
            query = parse_qs(urlparse(self.path).query)
            tx_id = query.get('txId', [None])[0]
            
            if tx_id:
                try:
                    last_line = None
                    with open('../data/ingestion_chain.log', 'r', encoding='utf-8') as f:
                        for line in f:
                            if f'"tx_id": "{tx_id}"' in line:
                                last_line = line.rstrip('\n')
                    
                    if last_line:
                        self.send_response(200)
                        self.send_header('Content-type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(json.dumps({"line": last_line}).encode('utf-8'))
                        return
                except Exception as e:
                    pass
            
            self.send_response(404)
            self.end_headers()
            return
        
        return super().do_GET()

    def do_POST(self):
        if self.path == '/koios_proxy':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            import urllib.request
            req = urllib.request.Request(
                'https://preprod.koios.rest/api/v1/tx_metadata',
                data=post_data,
                headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
            )
            try:
                with urllib.request.urlopen(req) as response:
                    res_data = response.read()
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(res_data)
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
            return

        if self.path == '/update_metric':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                ver1 = data.get('ver1')
                
                if ver1 is not None:
                    metrics_file = '../metrics_tracker.md'
                    with open(metrics_file, "r", encoding="utf-8") as f:
                        content = f.read()
                    
                    pattern = r"(\| \*\*VER-1\*\* \| Thời gian kiểm chứng \(Verification Time\) \|)(.*?\|.*?\|)"
                    replacement = rf"\1 {ver1:.2f} ms | Client-side JS |"
                    new_content = re.sub(pattern, replacement, content)
                    
                    with open(metrics_file, "w", encoding="utf-8") as f:
                        f.write(new_content)
                        
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"status": "success"}')
            except Exception as e:
                self.send_response(500)
                self.end_headers()
            return

if __name__ == "__main__":
    # Ensure working directory is school-verifier
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"==================================================")
        print(f"School Verifier Server is running on port {PORT}")
        print(f"Access the UI here: http://localhost:{PORT}")
        print(f"==================================================")
        httpd.serve_forever()
