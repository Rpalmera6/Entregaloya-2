# api.py - EntregaLoYa (corregido para deploy en plataformas tipo Render)
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
# NOTE: SameSite None requiere Secure=True en navegadores modernos. Configúralo según tu entorno.
app.config['SESSION_COOKIE_SAMESITE'] = None if SESSION_COOKIE_SAMESITE.lower() == 'none' else SESSION_COOKIE_SAMESITE
app.config['SESSION_COOKIE_SECURE'] = SESSION_COOKIE_SECURE

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Orígenes permitidos (ajusta si tu front corre en otra url)
ALLOWED_ORIGINS = {
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    # agrega aquí otros orígenes si los usas, ej "http://localhost:5174"
}

# Inicializamos CORS
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": list(ALLOWED_ORIGINS)}})


# ----- DB helper ----- #
def connect_to_db():
    """
    Conexión robusta a MySQL. Asegúrate de tener las vars de entorno:
    MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB, MYSQL_PORT
    """
    port_env = os.getenv('MYSQL_PORT')
    try:
        port = int(port_env) if port_env is not None else 3306
    except ValueError:
        port = 3306

    host = os.getenv('MYSQL_HOST')
    user = os.getenv('MYSQL_USER')
    password = os.getenv('MYSQL_PASSWORD', '')
    database = os.getenv('MYSQL_DB')

    if not host or not user or not database:
        # Mejor logear y lanzar error controlado para facilitar debugging en deploy
        app.logger.error("Missing MySQL env vars. Require MYSQL_HOST, MYSQL_USER, MYSQL_DB")
        raise RuntimeError("Missing MySQL configuration (MYSQL_HOST, MYSQL_USER, MYSQL_DB)")

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


# ----- CORS: preflight y headers en todas las respuestas ----- #
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
        return resp  # corta aquí para OPTIONS


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


# ----- Routes ----- #
@app.route('/api/ping', methods=['GET', 'OPTIONS'])
def ping():
    if request.method == 'OPTIONS':
        return ('', 200)
    return jsonify({"ok": True, "msg": "pong"})


# ---------------- RUTA: CATEGORÍAS (para evitar 500 si falta)
@app.route('/api/categorias', methods=['GET', 'OPTIONS'])
def api_get_categorias():
    if request.method == 'OPTIONS':
        return ('', 200)
    conn = connect_to_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, nombre, descripcion FROM categorias ORDER BY nombre ASC")
            categorias = cur.fetchall()
            return jsonify({"ok": True, "categorias": categorias}), 200
    except Exception as ex:
        app.logger.exception("ERROR api_get_categorias")
        return jsonify({"ok": False, "msg": "Error al obtener categorías.", "error": str(ex)}), 500
    finally:
        try:
            conn.close()
        except Exception:
            pass


# ---------- AUTH ---------- #
@app.route('/api/auth/register', methods=['POST', 'OPTIONS'])
def api_register():
    if request.method == 'OPTIONS':
        return ('', 200)
    data = _data_json_or_form()
    tipo = (data.get('tipo') or '').strip()
    nombre = (data.get('nombre') or '').strip()
    telefono = (data.get('telefono') or '').strip()
    password = data.get('password') or ''

    if tipo not in ('cliente', 'negocio') or not nombre or not telefono or not password:
        return jsonify({"ok": False, "msg": "Faltan campos"}), 400

    conn = connect_to_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM usuarios WHERE telefono=%s", (telefono,))
            if cur.fetchone():
                return jsonify({"ok": False, "msg": "Teléfono ya registrado"}), 409

            pw_hash = generate_password_hash(password)
            cur.execute("""
                INSERT INTO usuarios (nombre, telefono, tipo_usuario, contrasena)
                VALUES (%s, %s, %s, %s)
            """, (nombre, telefono, tipo, pw_hash))
            conn.commit()
            usuario_id = cur.lastrowid

            if tipo == 'negocio':
                cur.execute("""
                    INSERT INTO negocios (usuario_id, nombre)
                    VALUES (%s, %s)
                """, (usuario_id, nombre))
                conn.commit()

            return jsonify({"ok": True, "msg": "Registrado", "user_id": usuario_id}), 201
    except Exception as e:
        conn.rollback()
        app.logger.exception("register error")
        return jsonify({"ok": False, "msg": "Error servidor", "error": str(e)}), 500
    finally:
        try:
            conn.close()
        except Exception:
            pass


@app.route('/api/auth/login', methods=['POST', 'OPTIONS'])
def api_login():
    if request.method == 'OPTIONS':
        return ('', 200)
    data = _data_json_or_form()
    tipo = (data.get('tipo') or '').strip()
    telefono = (data.get('telefono') or '').strip()
    password = data.get('password') or ''
    if not tipo or not telefono or not password:
        return jsonify({"ok": False, "msg": "Faltan campos"}), 400

    conn = connect_to_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT u.id, u.nombre, u.contrasena, u.tipo_usuario, n.id AS negocio_id
                FROM usuarios u
                LEFT JOIN negocios n ON n.usuario_id = u.id
                WHERE u.telefono = %s AND u.tipo_usuario = %s
            """, (telefono, tipo))
            user = cur.fetchone()
            if not user:
                return jsonify({"ok": False, "msg": "Usuario no encontrado"}), 404

            stored = user.get('contrasena') or ''
            ok = False
            try:
                ok = check_password_hash(stored, password)
            except Exception:
                ok = False
            if not ok and stored == password:
                # fallback: rehash plain text passwords
                new_hash = generate_password_hash(password)
                try:
                    cur.execute("UPDATE usuarios SET contrasena=%s WHERE id=%s", (new_hash, user['id']))
                    conn.commit()
                except:
                    conn.rollback()
                ok = True

            if not ok:
                return jsonify({"ok": False, "msg": "Credenciales incorrectas"}), 401

            session.clear()
            session['usuario_id'] = user['id']
            session['nombre'] = user['nombre']
            session['tipo'] = user['tipo_usuario']

            return jsonify({"ok": True, "msg": "Login ok", "user": {
                "id": user['id'], "nombre": user['nombre'], "tipo": user['tipo_usuario'], "negocio_id": user.get('negocio_id')
            }}), 200
    except Exception as e:
        app.logger.exception("login error")
        return jsonify({"ok": False, "msg": "Error interno", "error": str(e)}), 500
    finally:
        try:
            conn.close()
        except Exception:
            pass


@app.route('/api/auth/logout', methods=['POST', 'OPTIONS'])
def api_logout():
    if request.method == 'OPTIONS':
        return ('', 200)
    session.clear()
    return jsonify({"ok": True, "msg": "Logout"}), 200


# ---------- NEGOCIOS ---------- #
@app.route('/api/negocios', methods=['GET', 'OPTIONS'])
def api_negocios():
    if request.method == 'OPTIONS':
        return ('', 200)
    usuario_id = request.args.get('usuario_id')
    conn = connect_to_db()
    try:
        with conn.cursor() as cur:
            if usuario_id:
                cur.execute("SELECT * FROM negocios WHERE usuario_id = %s", (usuario_id,))
                items = cur.fetchall()
                return jsonify({"ok": True, "negocios": items}), 200
            else:
                cur.execute("""
                    SELECT n.*, c.nombre AS categoria FROM negocios n
                    LEFT JOIN categorias c ON c.id = n.categoria_id
                    ORDER BY n.id DESC
                """)
                items = cur.fetchall()
                return jsonify({"ok": True, "negocios": items}), 200
    except Exception as e:
        app.logger.exception("negocios list error")
        return jsonify({"ok": False, "msg": "Error servidor", "error": str(e)}), 500
    finally:
        try:
            conn.close()
        except Exception:
            pass


@app.route('/api/negocios/<int:negocio_id>', methods=['GET', 'OPTIONS'])
def api_negocio_get(negocio_id):
    if request.method == 'OPTIONS':
        return ('', 200)
    conn = connect_to_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM negocios WHERE id = %s", (negocio_id,))
            nb = cur.fetchone()
            if not nb:
                return jsonify({"ok": False, "msg": "No encontrado"}), 404
            return jsonify({"ok": True, "negocio": nb}), 200
    except Exception as e:
        app.logger.exception("negocio get error")
        return jsonify({"ok": False, "msg": "Error servidor", "error": str(e)}), 500
    finally:
        try:
            conn.close()
        except Exception:
            pass


# ---------- PRODUCTOS (CRUD) ---------- #
@app.route('/api/negocios/<int:negocio_id>/productos', methods=['GET', 'POST', 'OPTIONS'])
@login_required
@role_required('negocio')
def api_productos_list_create(negocio_id):
    if request.method == 'OPTIONS':
        return ('', 200)
    # Verify user owns the negocio
    conn = connect_to_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, usuario_id FROM negocios WHERE id = %s", (negocio_id,))
            nb = cur.fetchone()
            if not nb or nb.get('usuario_id') != session.get('usuario_id'):
                return jsonify({"ok": False, "msg": "No autorizado para este negocio"}), 403

            if request.method == 'GET':
                cur.execute("SELECT id, negocio_id, nombre, descripcion, precio, imagen_url FROM productos WHERE negocio_id = %s", (negocio_id,))
                prods = cur.fetchall()
                return jsonify({"ok": True, "productos": prods}), 200

            # POST create product (multipart or json)
            if request.content_type and request.content_type.startswith('multipart/form-data'):
                nombre = request.form.get('nombre') or ''
                descripcion = request.form.get('descripcion') or ''
                precio_raw = request.form.get('precio') or None
                precio = None
                if precio_raw:
                    try:
                        precio = float(precio_raw)
                    except:
                        precio = None
                file = request.files.get('file') or request.files.get('imagen')
            else:
                data = request.get_json(silent=True) or {}
                nombre = data.get('nombre') or ''
                descripcion = data.get('descripcion') or ''
                precio = data.get('precio')
                file = None

            if not nombre:
                return jsonify({"ok": False, "msg": "Nombre requerido"}), 400

            imagen_url = ''
            if file and file.filename and allowed_file(file.filename):
                fn = secure_filename(file.filename)
                unique = f"prod_{negocio_id}_{int(time.time())}_{fn}"
                dest = os.path.join(app.config['UPLOAD_FOLDER'], unique)
                file.save(dest)
                imagen_url = url_for('static', filename=f"uploads/{unique}", _external=True)

            with conn.cursor() as cur2:
                cur2.execute("INSERT INTO productos (negocio_id, nombre, descripcion, precio, imagen_url) VALUES (%s,%s,%s,%s,%s)",
                             (negocio_id, nombre, descripcion, precio, imagen_url))
                conn.commit()
                pid = cur2.lastrowid
                cur2.execute("SELECT id, negocio_id, nombre, descripcion, precio, imagen_url FROM productos WHERE id=%s", (pid,))
                p = cur2.fetchone()
                return jsonify({"ok": True, "producto": p}), 201
    except Exception as e:
        conn.rollback()
        app.logger.exception("productos create/list error")
        return jsonify({"ok": False, "msg": "Error servidor", "error": str(e)}), 500
    finally:
        try:
            conn.close()
        except Exception:
            pass


@app.route('/api/productos/<int:prod_id>', methods=['PUT', 'POST', 'DELETE', 'OPTIONS'])
@login_required
@role_required('negocio')
def api_producto_manage(prod_id):
    if request.method == 'OPTIONS':
        return ('', 200)
    conn = connect_to_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM productos WHERE id = %s", (prod_id,))
            prod = cur.fetchone()
            if not prod:
                return jsonify({"ok": False, "msg": "Producto no encontrado"}), 404

            # verify owner
            cur.execute("SELECT id FROM negocios WHERE usuario_id = %s", (session.get('usuario_id'),))
            nb = cur.fetchone()
            if not nb or nb.get('id') != prod.get('negocio_id'):
                return jsonify({"ok": False, "msg": "No autorizado"}), 403

            if request.method == 'DELETE':
                cur.execute("DELETE FROM productos WHERE id=%s", (prod_id,))
                conn.commit()
                return jsonify({"ok": True, "msg": "Producto eliminado"}), 200

            # Update
            if request.content_type and request.content_type.startswith('multipart/form-data'):
                nombre = request.form.get('nombre') or prod.get('nombre') or ''
                descripcion = request.form.get('descripcion') or prod.get('descripcion') or ''
                precio_raw = request.form.get('precio') or None
                precio = prod.get('precio')
                if precio_raw is not None and precio_raw != '':
                    try:
                        precio = float(precio_raw)
                    except:
                        pass
                file = request.files.get('file') or request.files.get('imagen')
            else:
                data = request.get_json(silent=True) or {}
                nombre = data.get('nombre', prod.get('nombre'))
                descripcion = data.get('descripcion', prod.get('descripcion'))
                precio = prod.get('precio')
                if 'precio' in data and data.get('precio') not in (None, ''):
                    try:
                        precio = float(data.get('precio'))
                    except:
                        pass
                file = None

            imagen_url = prod.get('imagen_url') or ''
            if file and file.filename and allowed_file(file.filename):
                fn = secure_filename(file.filename)
                unique = f"prod_{prod.get('negocio_id')}_{int(time.time())}_{fn}"
                dest = os.path.join(app.config['UPLOAD_FOLDER'], unique)
                file.save(dest)
                imagen_url = url_for('static', filename=f"uploads/{unique}", _external=True)

            cur.execute("UPDATE productos SET nombre=%s, descripcion=%s, precio=%s, imagen_url=%s WHERE id=%s",
                        (nombre, descripcion, precio, imagen_url, prod_id))
            conn.commit()
            cur.execute("SELECT id, negocio_id, nombre, descripcion, precio, imagen_url FROM productos WHERE id=%s", (prod_id,))
            updated = cur.fetchone()
            return jsonify({"ok": True, "producto": updated}), 200
    except Exception as e:
        conn.rollback()
        app.logger.exception("producto manage error")
        return jsonify({"ok": False, "msg": "Error servidor", "error": str(e)}), 500
    finally:
        try:
            conn.close()
        except Exception:
            pass


# ---------- PEDIDOS ---------- #
@app.route('/api/pedidos', methods=['POST', 'OPTIONS'])
def api_create_pedido():
    if request.method == 'OPTIONS':
        return ('', 200)
    data = request.get_json(silent=True) or request.form.to_dict() or {}
    try:
        negocio_id = int(data.get('negocio_id'))
    except (TypeError, ValueError):
        return jsonify({"ok": False, "msg": "negocio_id inválido"}), 400

    cliente_id = None
    if data.get('cliente_id'):
        try:
            cliente_id = int(data.get('cliente_id'))
        except:
            cliente_id = None

    producto_id = None
    if data.get('producto_id'):
        try:
            producto_id = int(data.get('producto_id'))
        except:
            producto_id = None

    mensaje = (data.get('mensaje') or '').strip()
    try:
        cantidad = int(data.get('cantidad', 1))
        if cantidad < 1:
            cantidad = 1
    except:
        cantidad = 1

    if not mensaje:
        return jsonify({"ok": False, "msg": "mensaje requerido"}), 400

    conn = connect_to_db()
    try:
        with conn.cursor() as cur:
            cur.execute("INSERT INTO pedidos (cliente_id, negocio_id, producto_id, mensaje, estado, fecha, cantidad) VALUES (%s,%s,%s,%s,%s,%s,%s)",
                        (cliente_id, negocio_id, producto_id, mensaje, 'pendiente', datetime.utcnow(), cantidad))
            conn.commit()
            pid = cur.lastrowid
            return jsonify({"ok": True, "pedido_id": pid}), 201
    except Exception as e:
        conn.rollback()
        app.logger.exception("create pedido error")
        return jsonify({"ok": False, "msg": "Error servidor", "error": str(e)}), 500
    finally:
        try:
            conn.close()
        except Exception:
            pass


@app.route('/api/pedidos/cliente/<int:cliente_id>', methods=['GET', 'OPTIONS'])
def api_pedidos_cliente(cliente_id):
    if request.method == 'OPTIONS':
        return ('', 200)
    conn = connect_to_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT p.*, prod.nombre AS producto_nombre, n.nombre AS negocio_nombre
                FROM pedidos p
                LEFT JOIN productos prod ON p.producto_id = prod.id
                LEFT JOIN negocios n ON p.negocio_id = n.id
                WHERE p.cliente_id = %s
                ORDER BY p.fecha DESC
            """, (cliente_id,))
            rows = cur.fetchall()
            return jsonify({"ok": True, "pedidos": rows}), 200
    except Exception as e:
        app.logger.exception("pedidos cliente error")
        return jsonify({"ok": False, "msg": "Error servidor", "error": str(e)}), 500
    finally:
        try:
            conn.close()
        except Exception:
            pass


@app.route('/api/pedidos/negocio/<int:negocio_id>', methods=['GET', 'OPTIONS'])
def api_pedidos_negocio(negocio_id):
    if request.method == 'OPTIONS':
        return ('', 200)
    conn = connect_to_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT p.*, u.nombre AS cliente_nombre, u.telefono AS cliente_telefono, prod.nombre AS producto_nombre
                FROM pedidos p
                LEFT JOIN usuarios u ON p.cliente_id = u.id
                LEFT JOIN productos prod ON p.producto_id = prod.id
                WHERE p.negocio_id = %s
                ORDER BY p.fecha DESC
            """, (negocio_id,))
            rows = cur.fetchall()
            return jsonify({"ok": True, "pedidos": rows}), 200
    except Exception as e:
        app.logger.exception("pedidos negocio error")
        return jsonify({"ok": False, "msg": "Error servidor", "error": str(e)}), 500
    finally:
        try:
            conn.close()
        except Exception:
            pass


# Edit / delete single pedido (PUT by cliente to edit, DELETE by client or business)
@app.route('/api/pedidos/<int:pedido_id>', methods=['PUT', 'DELETE', 'OPTIONS'])
@login_required
def api_pedido_edit_delete(pedido_id):
    if request.method == 'OPTIONS':
        return ('', 200)
    if request.method == 'PUT':
        # Cliente edits only their own pending pedido
        data = request.get_json(silent=True) or {}
        nuevo_mensaje = (data.get('mensaje') or '').strip()
        nueva_cantidad = data.get('cantidad', None)
        if nueva_cantidad is not None:
            try:
                nueva_cantidad = int(nueva_cantidad)
            except:
                return jsonify({"ok": False, "msg": "cantidad inválida"}), 400

        conn = connect_to_db()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT cliente_id, estado FROM pedidos WHERE id = %s", (pedido_id,))
                pedido = cur.fetchone()
                if not pedido:
                    return jsonify({"ok": False, "msg": "Pedido no encontrado"}), 404
                if pedido['cliente_id'] is None or pedido['cliente_id'] != session.get('usuario_id'):
                    return jsonify({"ok": False, "msg": "No autorizado para editar"}), 403
                if pedido['estado'] != 'pendiente':
                    return jsonify({"ok": False, "msg": "Solo pedidos pendientes se pueden editar"}), 403

                sets = []
                params = []
                if nuevo_mensaje:
                    sets.append("mensaje=%s")
                    params.append(nuevo_mensaje)
                if nueva_cantidad is not None:
                    sets.append("cantidad=%s")
                    params.append(nueva_cantidad)
                if not sets:
                    return jsonify({"ok": False, "msg": "Nada que actualizar"}), 400
                params.append(pedido_id)
                sql = f"UPDATE pedidos SET {', '.join(sets)} WHERE id=%s"
                cur.execute(sql, tuple(params))
                conn.commit()
                return jsonify({"ok": True, "msg": "Pedido actualizado"}), 200
        except Exception as e:
            conn.rollback()
            app.logger.exception("pedido edit error")
            return jsonify({"ok": False, "msg": "Error servidor", "error": str(e)}), 500
        finally:
            try:
                conn.close()
            except Exception:
                pass

    # DELETE: allow client (pending) or negocio (if belongs to their negocio)
    if request.method == 'DELETE':
        conn = connect_to_db()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT cliente_id, negocio_id, estado FROM pedidos WHERE id=%s", (pedido_id,))
                pedido = cur.fetchone()
                if not pedido:
                    return jsonify({"ok": False, "msg": "Pedido no encontrado"}), 404
                uid = session.get('usuario_id')
                tipo = session.get('tipo')
                if tipo == 'cliente':
                    if pedido['cliente_id'] != uid:
                        return jsonify({"ok": False, "msg": "No autorizado"}), 403
                    if pedido['estado'] != 'pendiente':
                        return jsonify({"ok": False, "msg": "Cliente solo puede eliminar pedidos pendientes"}), 403
                elif tipo == 'negocio':
                    cur.execute("SELECT id FROM negocios WHERE usuario_id = %s", (uid,))
                    nb = cur.fetchone()
                    if not nb or nb.get('id') != pedido.get('negocio_id'):
                        return jsonify({"ok": False, "msg": "No autorizado (no es tu negocio)"}), 403
                else:
                    return jsonify({"ok": False, "msg": "Tipo no autorizado"}), 403

                cur.execute("DELETE FROM pedidos WHERE id = %s", (pedido_id,))
                conn.commit()
                return jsonify({"ok": True, "msg": "Pedido eliminado"}), 200
        except Exception as e:
            conn.rollback()
            app.logger.exception("pedido delete error")
            return jsonify({"ok": False, "msg": "Error servidor", "error": str(e)}), 500
        finally:
            try:
                conn.close()
            except Exception:
                pass


# Business updates status/response
@app.route('/api/pedidos/negocio/<int:pedido_id>', methods=['PUT', 'OPTIONS'])
@login_required
@role_required('negocio')
def api_pedido_negocio_update(pedido_id):
    if request.method == 'OPTIONS':
        return ('', 200)
    data = request.get_json(silent=True) or request.form.to_dict() or {}
    nuevo_estado = data.get('estado')
    respuesta = (data.get('respuesta') or '').strip()
    if nuevo_estado not in ('pendiente', 'confirmado', 'cancelado'):
        return jsonify({"ok": False, "msg": "estado inválido"}), 400

    conn = connect_to_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM negocios WHERE usuario_id = %s", (session.get('usuario_id'),))
            nb = cur.fetchone()
            if not nb:
                return jsonify({"ok": False, "msg": "No tienes negocio asociado"}), 403
            negocio_id = nb.get('id')
            cur.execute("SELECT 1 FROM pedidos WHERE id=%s AND negocio_id=%s", (pedido_id, negocio_id))
            if not cur.fetchone():
                return jsonify({"ok": False, "msg": "Pedido no encontrado o no pertenece a tu negocio"}), 404
            cur.execute("UPDATE pedidos SET estado=%s, respuesta=%s WHERE id=%s", (nuevo_estado, respuesta, pedido_id))
            conn.commit()
            return jsonify({"ok": True, "msg": "Pedido actualizado por negocio"}), 200
    except Exception as e:
        conn.rollback()
        app.logger.exception("pedido negocio update error")
        return jsonify({"ok": False, "msg": "Error servidor", "error": str(e)}), 500
    finally:
        try:
            conn.close()
        except Exception:
            pass


# ----- Run (solo si se ejecuta directamente) ----- #
if __name__ == '__main__':
    # Info útil en consola para debugging local
    app.logger.info("Starting EntregaLoYa API. Allowed origins: %s", ", ".join(ALLOWED_ORIGINS))
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    # Bind a 0.0.0.0 para que PaaS (Render, Heroku) detecten el puerto abierto
    app.run(debug=debug, host='0.0.0.0', port=port)
