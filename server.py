import http.server
import socketserver
import urllib.request
import urllib.error
import json
import os
import sys

PORT = 3001
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")

class ProxyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/api/"):
            self.proxy_request("GET")
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/"):
            self.proxy_request("POST")
        else:
            self.send_error(404, "Not Found")

    def proxy_request(self, method):
        target_url = f"{OLLAMA_URL}{self.path}"
        print(f"Proxying {method} {self.path} to {target_url}")

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else None

        req = urllib.request.Request(target_url, data=body, method=method)
        
        # Copy headers
        for key, value in self.headers.items():
            if key.lower() not in ['host', 'content-length', 'origin', 'referer']:
                req.add_header(key, value)
        req.add_header('Host', '127.0.0.1')
        req.add_header('Origin', OLLAMA_URL) # Spoof Origin to bypass CORS
        req.add_header('Referer', OLLAMA_URL)

        try:
            with urllib.request.urlopen(req) as response:
                self.send_response(response.status)
                for key, value in response.headers.items():
                    if key.lower() not in ['transfer-encoding', 'content-encoding', 'content-length']:
                         self.send_header(key, value)
                
                # Handle streaming or regular response
                self.end_headers()
                
                while True:
                    chunk = response.read(1024)
                    if not chunk:
                        break
                    try:
                        self.wfile.write(chunk)
                        self.wfile.flush()
                    except (BrokenPipeError, ConnectionResetError):
                        print("Client disconnected during streaming")
                        return

        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.end_headers()
            try:
                self.wfile.write(e.read())
            except (BrokenPipeError, ConnectionResetError):
                pass
        except (BrokenPipeError, ConnectionResetError):
            print("Client disconnected")
        except Exception as e:
            print(f"Proxy error: {e}")
            try:
                self.send_error(502, f"Bad Gateway: {e}")
            except (BrokenPipeError, ConnectionResetError):
                pass

print(f"Serving on port {PORT}, proxying to {OLLAMA_URL}")

# Check if Ollama is running
try:
    req = urllib.request.Request(f"{OLLAMA_URL}/api/tags")
    with urllib.request.urlopen(req) as response:
        if response.status == 200:
            print("✅ Connected to Ollama successfully.")
        else:
            print(f"⚠️ Ollama responded with status {response.status}")
except Exception as e:
    print(f"❌ Could not connect to Ollama at {OLLAMA_URL}")
    print("   Please ensure Ollama is installed and running!")
    print("   Install it from https://ollama.com/")
    print("   Run: ollama serve")

with socketserver.ThreadingTCPServer(("", PORT), ProxyHTTPRequestHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
