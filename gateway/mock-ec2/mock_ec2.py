import json
from http.server import BaseHTTPRequestHandler, HTTPServer


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length).decode("utf-8", errors="replace")
        try:
            body = json.loads(raw)
        except json.JSONDecodeError:
            body = {"raw": raw}

        print(f"[mock-ec2] RECEIVED path={self.path} body={body}")

        response = b'{"status":"ok"}'
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def log_message(self, fmt, *args):
        return


if __name__ == "__main__":
    print("[mock-ec2] Listening on 0.0.0.0:8080")
    server = HTTPServer(("0.0.0.0", 8080), Handler)
    server.serve_forever()
