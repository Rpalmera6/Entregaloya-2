# api.py - EntregaLoYa (deploy-friendly, env-driven)
import os
import time
from datetime import datetime
from functools import wraps

from flask import Flask, request, session, jsonify, make_response, url_for
from flask_cors import CORS
import pymysql
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

# ----- Config ----- #
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

app = Flask(__name__, static_folder="static", template_folder="templates")
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.secret_key = os.getenv('FLASK_SECRET', 'dev-secret-key')

# Cookie security (configurable via env)
SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'false').lower() == 'true'
SESSION_COOKIE_SAMESITE = os.getenv('SESSION_COOKIE_SAMESITE', 'None')  # 'None', 'Lax' or 'Strict'

app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = None if SESSION_COOKIE_SAMESITE.lower() == 'none' else SESSION_COOKIE_SAMESITE
app.config['SESSION_COOKIE_SECURE'] = SESSION_COOKIE_SECURE

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ALLOWED_ORIGINS: coma-separado en env o fallback local hosts
allowed_env = os.getenv('ALLOWED_ORIGINS', '')
if allowed_env:
    ALLOWED_ORIGINS = set([s.strip() for s in allowed_env.split(',') if s.strip()])
else:
    ALLOWED_ORIGINS = {
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    }

# Add optional production frontend origin (Vercel)
vf = os.getenv('FRONTEND_URL')
if vf:
    ALLOWED_ORIGINS.add(vf)

CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": list(ALLOWED_ORIGINS)}})

# ----- DB helper ----- #
def connect_to_db():
    """
    Lee variables:
    MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB, MYSQL_PORT
    """
    host = os.getenv('MYSQL_HOST')
    user = os.getenv('MYSQL_USER')
    password = os.getenv('MYSQL_PASSWORD', '')
    database = os.getenv('MYSQL_DB')
    port_env = os.getenv('MYSQL_PORT')
    try:
        port = int(port_env) if port_env is not None else 3306
    except ValueError:
        port = 3306

    if not host or not user or not database:
        app.logger.error("Missing MySQL env vars. Require MYSQL_HOST, MYSQL_USER, MYSQL_DB")
        raise RuntimeError("Missing MySQL configuration (MYSQL_HOST, MYSQL_USER, MYSQL_DB)")

    # WARNING if host is local (Render no podrá acceder)
    if host in ('127.0.0.1', 'localhost'):
        app.logger.warning("MYSQL_HOST is set to local address (%s). If running on Render, it won't be able to reach your local DB.", host)

    return pymysql.connect(
        host=host,
        user=user,
        password=password,
        database=database,
        port=port,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False
    )

def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def _data_json_or_form():
    return request.get_json(silent=True) or request.form.to_dict() or {}

# ----- CORS: preflight y headers ----- #
@app.before_request
def handle_preflight():
    if request.method == 'OPTIONS':
        origin = request.headers.get('Origin', '')
        resp = make_response(('', 200))
        if origin and origin in ALLOWED_ORIGINS:
            resp.headers['Access-Control-Allow-Origin'] = origin
        else:
            resp.headers['Access-Control-Allow-Origin'] = origin or ''
        resp.headers['Access-Control-Allow-Credentials'] = 'true'
        resp.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        return resp

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get('Origin')
    if origin and origin in ALLOWED_ORIGINS:
        response.headers['Access-Control-Allow-Origin'] = origin
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    return response

# ----- Auth / decorators ----- #
from functools import wraps
def login_required(f):
    @wraps(f)
    def wrap(*args, **kwargs):
        if request.method == 'OPTIONS':
            return ('', 200)
        if 'usuario_id' not in session:
            return jsonify({"ok": False, "msg": "No autenticado"}), 401
        return f(*args, **kwargs)
    return wrap

def role_required(role):
    def decorator(f):
        @wraps(f)
        def wrap(*args, **kwargs):
            if request.method == 'OPTIONS':
                return ('', 200)
            if 'usuario_id' not in session:
                return jsonify({"ok": False, "msg": "No autenticado"}), 401
            if session.get('tipo') != role:
                return jsonify({"ok": False, "msg": "Acceso denegado"}), 403
            return f(*args, **kwargs)
        return wrap
    return decorator

# --- (A continuación copia todas tus rutas actuales sin cambios importantes) ---
# Por brevedad en este snippet omito la repetición de todas las rutas (auth, negocios, productos, pedidos).
# Simplemente pega aquí abajo tus rutas existentes tal cual (o pídeme que las vuelva a incluir completas).

# ----- Run ----- #
if __name__ == '__main__':
    # Info útil en consola para debugging local / deploy
    app.logger.info("Starting EntregaLoYa API. Allowed origins: %s", ", ".join(sorted(ALLOWED_ORIGINS)))
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(debug=debug, host='0.0.0.0', port=port)
