from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS
from flask_httpauth import HTTPBasicAuth
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import os
import json

app = Flask(__name__, static_folder='static')
CORS(app)
auth = HTTPBasicAuth()

# Konfiguration
DATA_DIR = os.environ.get('DATA_DIR', '/config/tennis_stringing')
DB_PATH = os.path.join(DATA_DIR, 'tennis_stringing.db')
REQUIRE_LOGIN = os.environ.get('REQUIRE_LOGIN', 'false').lower() == 'true'
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', '')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', '')

# Admin-Auth
users = {}
if ADMIN_USERNAME and ADMIN_PASSWORD:
    users[ADMIN_USERNAME] = generate_password_hash(ADMIN_PASSWORD)

@auth.verify_password
def verify_password(username, password):
    if not REQUIRE_LOGIN:
        return True
    if username in users and check_password_hash(users.get(username), password):
        return username
    return None

@auth.error_handler
def auth_error(status):
    return jsonify({"error": "Nicht autorisiert"}), status

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = get_db()
    cursor = conn.cursor()
    
    # Personen Tabelle
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS personen (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            telefon TEXT,
            email TEXT,
            geburtsdatum DATE,
            kommentar TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Schläger Tabelle
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS schlaeger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            marke TEXT NOT NULL,
            modell TEXT NOT NULL,
            nummer TEXT,
            griffstaerke TEXT,
            kaufdatum DATE,
            verkaeufer TEXT,
            person_id INTEGER,
            kommentar TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (person_id) REFERENCES personen(id) ON DELETE SET NULL
        )
    ''')
    
    # Saiten Tabelle
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS saiten (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            marke TEXT NOT NULL,
            modell TEXT NOT NULL,
            nummer TEXT,
            dicke REAL,
            laenge REAL,
            kaufdatum DATE,
            verkaeufer TEXT,
            kommentar TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Bespannungen Tabelle
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bespannungen (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bespanndatum DATE NOT NULL,
            haerte_laengs REAL,
            haerte_quer REAL,
            schlaeger_id INTEGER NOT NULL,
            saite_id INTEGER NOT NULL,
            datum_gerissen DATE,
            kommentar TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (schlaeger_id) REFERENCES schlaeger(id) ON DELETE CASCADE,
            FOREIGN KEY (saite_id) REFERENCES saiten(id) ON DELETE CASCADE
        )
    ''')
    
    conn.commit()
    conn.close()
    print("Datenbank initialisiert")

def row_to_dict(row):
    return {key: row[key] for key in row.keys()}

# Health Check für Watchdog
@app.route('/health')
def health():
    return jsonify({"status": "ok"})

# Auth-Status
@app.route('/api/auth')
def auth_status():
    return jsonify({
        "require_login": REQUIRE_LOGIN,
        "authenticated": True  # Wenn wir hier sind, ist man authentifiziert
    })

# ============ PERSONEN API ============

@app.route('/api/personen', methods=['GET'])
@auth.login_required
def get_personen():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM personen ORDER BY name')
    personen = [row_to_dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(personen)

@app.route('/api/personen/<int:id>', methods=['GET'])
@auth.login_required
def get_person(id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM personen WHERE id = ?', (id,))
    person = cursor.fetchone()
    conn.close()
    if person is None:
        return jsonify({'error': 'Person nicht gefunden'}), 404
    return jsonify(row_to_dict(person))

@app.route('/api/personen', methods=['POST'])
@auth.login_required
def create_person():
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO personen (name, telefon, email, geburtsdatum, kommentar)
        VALUES (?, ?, ?, ?, ?)
    ''', (data.get('name'), data.get('telefon'), data.get('email'), 
          data.get('geburtsdatum'), data.get('kommentar')))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': new_id, 'message': 'Person erstellt'})

@app.route('/api/personen/<int:id>', methods=['PUT'])
@auth.login_required
def update_person(id):
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE personen SET name = ?, telefon = ?, email = ?, 
        geburtsdatum = ?, kommentar = ? WHERE id = ?
    ''', (data.get('name'), data.get('telefon'), data.get('email'),
          data.get('geburtsdatum'), data.get('kommentar'), id))
    conn.commit()
    changes = cursor.rowcount
    conn.close()
    return jsonify({'message': 'Person aktualisiert', 'changes': changes})

@app.route('/api/personen/<int:id>', methods=['DELETE'])
@auth.login_required
def delete_person(id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM personen WHERE id = ?', (id,))
    conn.commit()
    changes = cursor.rowcount
    conn.close()
    return jsonify({'message': 'Person gelöscht', 'changes': changes})

# ============ SCHLÄGER API ============

@app.route('/api/schlaeger', methods=['GET'])
@auth.login_required
def get_schlaeger():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT s.*, p.name as person_name 
        FROM schlaeger s 
        LEFT JOIN personen p ON s.person_id = p.id 
        ORDER BY s.marke, s.modell
    ''')
    schlaeger = [row_to_dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(schlaeger)

@app.route('/api/schlaeger/<int:id>', methods=['GET'])
@auth.login_required
def get_schlaeger_single(id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM schlaeger WHERE id = ?', (id,))
    schlaeger = cursor.fetchone()
    conn.close()
    if schlaeger is None:
        return jsonify({'error': 'Schläger nicht gefunden'}), 404
    return jsonify(row_to_dict(schlaeger))

@app.route('/api/schlaeger', methods=['POST'])
@auth.login_required
def create_schlaeger():
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO schlaeger (marke, modell, nummer, griffstaerke, kaufdatum, 
        verkaeufer, person_id, kommentar)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (data.get('marke'), data.get('modell'), data.get('nummer'),
          data.get('griffstaerke'), data.get('kaufdatum'), data.get('verkaeufer'),
          data.get('person_id'), data.get('kommentar')))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': new_id, 'message': 'Schläger erstellt'})

@app.route('/api/schlaeger/<int:id>', methods=['PUT'])
@auth.login_required
def update_schlaeger(id):
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE schlaeger SET marke = ?, modell = ?, nummer = ?, 
        griffstaerke = ?, kaufdatum = ?, verkaeufer = ?, person_id = ?, 
        kommentar = ? WHERE id = ?
    ''', (data.get('marke'), data.get('modell'), data.get('nummer'),
          data.get('griffstaerke'), data.get('kaufdatum'), data.get('verkaeufer'),
          data.get('person_id'), data.get('kommentar'), id))
    conn.commit()
    changes = cursor.rowcount
    conn.close()
    return jsonify({'message': 'Schläger aktualisiert', 'changes': changes})

@app.route('/api/schlaeger/<int:id>', methods=['DELETE'])
@auth.login_required
def delete_schlaeger(id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM schlaeger WHERE id = ?', (id,))
    conn.commit()
    changes = cursor.rowcount
    conn.close()
    return jsonify({'message': 'Schläger gelöscht', 'changes': changes})

# ============ SAITEN API ============

@app.route('/api/saiten', methods=['GET'])
@auth.login_required
def get_saiten():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM saiten ORDER BY marke, modell')
    saiten = [row_to_dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(saiten)

@app.route('/api/saiten/<int:id>', methods=['GET'])
@auth.login_required
def get_saite(id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM saiten WHERE id = ?', (id,))
    saite = cursor.fetchone()
    conn.close()
    if saite is None:
        return jsonify({'error': 'Saite nicht gefunden'}), 404
    return jsonify(row_to_dict(saite))

@app.route('/api/saiten', methods=['POST'])
@auth.login_required
def create_saite():
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO saiten (marke, modell, nummer, dicke, laenge, 
        kaufdatum, verkaeufer, kommentar)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (data.get('marke'), data.get('modell'), data.get('nummer'),
          data.get('dicke'), data.get('laenge'), data.get('kaufdatum'),
          data.get('verkaeufer'), data.get('kommentar')))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': new_id, 'message': 'Saite erstellt'})

@app.route('/api/saiten/<int:id>', methods=['PUT'])
@auth.login_required
def update_saite(id):
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE saiten SET marke = ?, modell = ?, nummer = ?, 
        dicke = ?, laenge = ?, kaufdatum = ?, verkaeufer = ?, 
        kommentar = ? WHERE id = ?
    ''', (data.get('marke'), data.get('modell'), data.get('nummer'),
          data.get('dicke'), data.get('laenge'), data.get('kaufdatum'),
          data.get('verkaeufer'), data.get('kommentar'), id))
    conn.commit()
    changes = cursor.rowcount
    conn.close()
    return jsonify({'message': 'Saite aktualisiert', 'changes': changes})

@app.route('/api/saiten/<int:id>', methods=['DELETE'])
@auth.login_required
def delete_saite(id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM saiten WHERE id = ?', (id,))
    conn.commit()
    changes = cursor.rowcount
    conn.close()
    return jsonify({'message': 'Saite gelöscht', 'changes': changes})

# ============ BESPANNUNGEN API ============

@app.route('/api/bespannungen', methods=['GET'])
@auth.login_required
def get_bespannungen():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT b.*, s.marke as schlaeger_marke, s.modell as schlaeger_modell,
        sa.marke as saite_marke, sa.modell as saite_modell,
        p.name as person_name
        FROM bespannungen b
        JOIN schlaeger s ON b.schlaeger_id = s.id
        JOIN saiten sa ON b.saite_id = sa.id
        LEFT JOIN personen p ON s.person_id = p.id
        ORDER BY b.bespanndatum DESC
    ''')
    bespannungen = [row_to_dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(bespannungen)

@app.route('/api/bespannungen/<int:id>', methods=['GET'])
@auth.login_required
def get_bespannung(id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM bespannungen WHERE id = ?', (id,))
    bespannung = cursor.fetchone()
    conn.close()
    if bespannung is None:
        return jsonify({'error': 'Bespannung nicht gefunden'}), 404
    return jsonify(row_to_dict(bespannung))

@app.route('/api/bespannungen', methods=['POST'])
@auth.login_required
def create_bespannung():
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO bespannungen (bespanndatum, haerte_laengs, haerte_quer, 
        schlaeger_id, saite_id, datum_gerissen, kommentar)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (data.get('bespanndatum'), data.get('haerte_laengs'), 
          data.get('haerte_quer'), data.get('schlaeger_id'),
          data.get('saite_id'), data.get('datum_gerissen'), data.get('kommentar')))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': new_id, 'message': 'Bespannung erstellt'})

@app.route('/api/bespannungen/<int:id>', methods=['PUT'])
@auth.login_required
def update_bespannung(id):
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE bespannungen SET bespanndatum = ?, haerte_laengs = ?, 
        haerte_quer = ?, schlaeger_id = ?, saite_id = ?, 
        datum_gerissen = ?, kommentar = ? WHERE id = ?
    ''', (data.get('bespanndatum'), data.get('haerte_laengs'),
          data.get('haerte_quer'), data.get('schlaeger_id'),
          data.get('saite_id'), data.get('datum_gerissen'), 
          data.get('kommentar'), id))
    conn.commit()
    changes = cursor.rowcount
    conn.close()
    return jsonify({'message': 'Bespannung aktualisiert', 'changes': changes})

@app.route('/api/bespannungen/<int:id>', methods=['DELETE'])
@auth.login_required
def delete_bespannung(id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM bespannungen WHERE id = ?', (id,))
    conn.commit()
    changes = cursor.rowcount
    conn.close()
    return jsonify({'message': 'Bespannung gelöscht', 'changes': changes})

# Statische Dateien
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('static', path)

if __name__ == '__main__':
    init_db()
    # Produktion: Gunicorn, Entwicklung: Flask Server
    if os.environ.get('FLASK_ENV') == 'development':
        app.run(host='0.0.0.0', port=5000, debug=True)
    else:
        from gunicorn.app.wsgiapp import run
        import sys
        sys.argv = ['gunicorn', '-w', '4', '-b', '0.0.0.0:5000', '--access-logfile', '-', 'app:app']
        run()
