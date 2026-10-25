"""Serveur statique strict : sert <racine> sous un préfixe arbitraire, fichiers exacts uniquement (pas d'index de dossier),
avec une CSP proche de celle des Artifacts (scripts et fetch limités à l'origine)."""
import http.server, mimetypes, os, sys
racine, prefixe, port = sys.argv[1], sys.argv[2], int(sys.argv[3])
CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; font-src 'self' data:"
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        chemin = self.path.split("?")[0].split("#")[0]
        if not chemin.startswith(prefixe):
            return self.send_error(404)
        f = os.path.join(racine, chemin[len(prefixe):].lstrip("/"))
        if not os.path.isfile(f) and os.path.isfile(f + ".racine.html"):
            f = f + ".racine.html"
        if not os.path.isfile(f):
            return self.send_error(404)
        ext = os.path.splitext(f)[1]
        ct = "text/html; charset=utf-8" if ext in ("", ".html") else (mimetypes.guess_type(f)[0] or "application/octet-stream")
        if ext == ".mjs": ct = "text/javascript"
        data = open(f, "rb").read()
        self.send_response(200); self.send_header("Content-Type", ct); self.send_header("Content-Security-Policy", CSP)
        self.send_header("Content-Length", str(len(data))); self.end_headers(); self.wfile.write(data)
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
