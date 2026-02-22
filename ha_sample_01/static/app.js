// Auth Management
let authHeader = null;
let currentUser = null;

// Prüfe Auth-Status beim Start
async function checkAuth() {
    try {
        const response = await fetch('/api/auth');
        const data = await response.json();
        
        if (data.require_login && !data.authenticated) {
            showAuthOverlay();
        } else {
            hideAuthOverlay();
            loadData('dashboard');
        }
    } catch (e) {
        console.error('Auth check failed', e);
    }
}

function showAuthOverlay() {
    document.getElementById('auth-overlay').style.display = 'flex';
}

function hideAuthOverlay() {
    document.getElementById('auth-overlay').style.display = 'none';
    document.getElementById('user-info').style.display = 'flex';
}

// Login
document.getElementById('auth-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('auth-user').value;
    const pass = document.getElementById('auth-pass').value;
    
    authHeader = 'Basic ' + btoa(user + ':' + pass);
    currentUser = user;
    
    // Teste Auth
    try {
        const response = await fetch('/api/personen', {
            headers: { 'Authorization': authHeader }
        });
        
        if (response.ok) {
            document.getElementById('username-display').textContent = user;
            hideAuthOverlay();
            loadData('dashboard');
        } else {
            alert('Anmeldung fehlgeschlagen');
            authHeader = null;
        }
    } catch (e) {
        alert('Verbindungsfehler');
    }
});

function logout() {
    authHeader = null;
    currentUser = null;
    location.reload();
}

// API Helper mit Auth
async function apiFetch(url, options = {}) {
    if (authHeader) {
        options.headers = options.headers || {};
        options.headers['Authorization'] = authHeader;
    }
    return fetch(url, options);
}

// Rest der App.js bleibt gleich, aber ersetze alle fetch() durch apiFetch()
// Beispiel:
// Vor: fetch('/api/personen')
// Nach: apiFetch('/api/personen')

// Globale Variablen
let currentEditId = null;
let currentEditType = null;

// Navigation
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(btn.dataset.section).classList.add('active');
        
        loadData(btn.dataset.section);
    });
});

// Daten laden
async function loadData(section) {
    try {
        switch(section) {
            case 'dashboard':
                await loadDashboard();
                break;
            case 'personen':
                await loadPersonen();
                break;
            case 'schlaeger':
                await loadSchlaeger();
                break;
            case 'saiten':
                await loadSaiten();
                break;
            case 'bespannungen':
                await loadBespannungen();
                break;
        }
    } catch (error) {
        console.error('Fehler beim Laden:', error);
        if (error.message.includes('401')) {
            showAuthOverlay();
        }
    }
}

// Dashboard laden
async function loadDashboard() {
    const [personen, schlaeger, saiten, bespannungen] = await Promise.all([
        apiFetch('/api/personen').then(r => r.json()),
        apiFetch('/api/schlaeger').then(r => r.json()),
        apiFetch('/api/saiten').then(r => r.json()),
        apiFetch('/api/bespannungen').then(r => r.json())
    ]);
    
    document.getElementById('stat-personen').textContent = personen.length;
    document.getElementById('stat-schlaeger').textContent = schlaeger.length;
    document.getElementById('stat-saiten').textContent = saiten.length;
    document.getElementById('stat-bespannungen').textContent = bespannungen.length;
    
    const recentContainer = document.getElementById('recent-bespannungen');
    recentContainer.innerHTML = bespannungen.slice(0, 5).map(b => `
        <div class="recent-item">
            <div class="recent-item-info">
                <h4>${b.schlaeger_marke} ${b.schlaeger_modell}</h4>
                <p>${b.saite_marke} ${b.saite_modell} | ${b.person_name || 'Kein Besitzer'}</p>
            </div>
            <div class="recent-item-date">${formatDate(b.bespanndatum)}</div>
        </div>
    `).join('');
}

// Personen laden
async function loadPersonen() {
    const personen = await apiFetch('/api/personen').then(r => r.json());
    const tbody = document.querySelector('#personen-table tbody');
    tbody.innerHTML = personen.map(p => `
        <tr>
            <td>${p.name}</td>
            <td>${p.telefon || '-'}</td>
            <td>${p.email || '-'}</td>
            <td>${formatDate(p.geburtsdatum)}</td>
            <td>
                <button class="btn btn-edit" onclick="editPerson(${p.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger" onclick="deleteItem('personen', ${p.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Schläger laden
async function loadSchlaeger() {
    const schlaeger = await apiFetch('/api/schlaeger').then(r => r.json());
    const tbody = document.querySelector('#schlaeger-table tbody');
    tbody.innerHTML = schlaeger.map(s => `
        <tr>
            <td>${s.marke}</td>
            <td>${s.modell}</td>
            <td>${s.nummer || '-'}</td>
            <td>${s.griffstaerke || '-'}</td>
            <td>${s.person_name || '-'}</td>
            <td>
                <button class="btn btn-edit" onclick="editSchlaeger(${s.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger" onclick="deleteItem('schlaeger', ${s.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Saiten laden
async function loadSaiten() {
    const saiten = await apiFetch('/api/saiten').then(r => r.json());
    const tbody = document.querySelector('#saiten-table tbody');
    tbody.innerHTML = saiten.map(s => `
        <tr>
            <td>${s.marke}</td>
            <td>${s.modell}</td>
            <td>${s.nummer || '-'}</td>
            <td>${s.dicke || '-'}</td>
            <td>${s.laenge || '-'}</td>
            <td>
                <button class="btn btn-edit" onclick="editSaite(${s.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger" onclick="deleteItem('saiten', ${s.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Bespannungen laden
async function loadBespannungen() {
    const bespannungen = await apiFetch('/api/bespannungen').then(r => r.json());
    const tbody = document.querySelector('#bespannungen-table tbody');
    tbody.innerHTML = bespannungen.map(b => `
        <tr>
            <td>${formatDate(b.bespanndatum)}</td>
            <td>${b.schlaeger_marke} ${b.schlaeger_modell}</td>
            <td>${b.saite_marke} ${b.saite_modell}</td>
            <td>${b.haerte_laengs || '-'} kg</td>
            <td>${b.haerte_quer || '-'} kg</td>
            <td>
                ${b.datum_gerissen 
                    ? `<span class="status-badge status-broken">Gerissen (${formatDate(b.datum_gerissen)})</span>`
                    : '<span class="status-badge status-active">Aktiv</span>'
                }
            </td>
            <td>
                <button class="btn btn-edit" onclick="editBespannung(${b.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger" onclick="deleteItem('bespannungen', ${b.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Modal öffnen
async function openModal(type, id = null) {
    currentEditType = type;
    currentEditId = id;
    const modal = document.getElementById('modal');
    const form = document.getElementById('modal-form');
    const title = document.getElementById('modal-title');
    
    let html = '';
    
    switch(type) {
        case 'person':
            title.textContent = id ? 'Person bearbeiten' : 'Neue Person';
            html = `
                <div class="form-group">
                    <label>Name *</label>
                    <input type="text" name="name" required>
                </div>
                <div class="form-group">
                    <label>Telefon</label>
                    <input type="tel" name="telefon">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="email">
                </div>
                <div class="form-group">
                    <label>Geburtsdatum</label>
                    <input type="date" name="geburtsdatum">
                </div>
                <div class="form-group">
                    <label>Kommentar</label>
                    <textarea name="kommentar"></textarea>
                </div>
            `;
            break;
            
        case 'schlaeger':
            title.textContent = id ? 'Schläger bearbeiten' : 'Neuer Schläger';
            const personen = await apiFetch('/api/personen').then(r => r.json());
            html = `
                <div class="form-group">
                    <label>Marke *</label>
                    <input type="text" name="marke" required>
                </div>
                <div class="form-group">
                    <label>Modell *</label>
                    <input type="text" name="modell" required>
                </div>
                <div class="form-group">
                    <label>Nummer</label>
                    <input type="text" name="nummer">
                </div>
                <div class="form-group">
                    <label>Griffstärke</label>
                    <input type="text" name="griffstaerke">
                </div>
                <div class="form-group">
                    <label>Kaufdatum</label>
                    <input type="date" name="kaufdatum">
                </div>
                <div class="form-group">
                    <label>Verkäufer</label>
                    <input type="text" name="verkaeufer">
                </div>
                <div class="form-group">
                    <label>Besitzer</label>
                    <select name="person_id">
                        <option value="">-- Keiner --</option>
                        ${personen.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Kommentar</label>
                    <textarea name="kommentar"></textarea>
                </div>
            `;
            break;
            
        case 'saite':
            title.textContent = id ? 'Saite bearbeiten' : 'Neue Saite';
            html = `
                <div class="form-group">
                    <label>Marke *</label>
                    <input type="text" name="marke" required>
                </div>
                <div class="form-group">
                    <label>Modell *</label>
                    <input type="text" name="modell" required>
                </div>
                <div class="form-group">
                    <label>Nummer</label>
                    <input type="text" name="nummer">
                </div>
                <div class="form-group">
                    <label>Dicke (mm)</label>
                    <input type="number" step="0.01" name="dicke">
                </div>
                <div class="form-group">
                    <label>Länge (m)</label>
                    <input type="number" step="0.1" name="laenge">
                </div>
                <div class="form-group">
                    <label>Kaufdatum</label>
                    <input type="date" name="kaufdatum">
                </div>
                <div class="form-group">
                    <label>Verkäufer</label>
                    <input type="text" name="verkaeufer">
                </div>
                <div class="form-group">
                    <label>Kommentar</label>
                    <textarea name="kommentar"></textarea>
                </div>
            `;
            break;
            
        case 'bespannung':
            title.textContent = id ? 'Bespannung bearbeiten' : 'Neue Bespannung';
            const [schlaeger, saiten] = await Promise.all([
                apiFetch('/api/schlaeger').then(r => r.json()),
                apiFetch('/api/saiten').then(r => r.json())
            ]);
            html = `
                <div class="form-group">
                    <label>Bespanndatum *</label>
                    <input type="date" name="bespanndatum" required>
                </div>
                <div class="form-group">
                    <label>Schläger *</label>
                    <select name="schlaeger_id" required>
                        <option value="">-- Wählen --</option>
                        ${schlaeger.map(s => `<option value="${s.id}">${s.marke} ${s.modell} (${s.nummer || 'ohne Nr.'})</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Saite *</label>
                    <select name="saite_id" required>
                        <option value="">-- Wählen --</option>
                        ${saiten.map(s => `<option value="${s.id}">${s.marke} ${s.modell}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Härte Längs (kg)</label>
                    <input type="number" step="0.1" name="haerte_laengs">
                </div>
                <div class="form-group">
                    <label>Härte Quer (kg)</label>
                    <input type="number" step="0.1" name="haerte_quer">
                </div>
                <div class="form-group">
                    <label>Datum gerissen</label>
                    <input type="date" name="datum_gerissen">
                </div>
                <div class="form-group">
                    <label>Kommentar</label>
                    <textarea name="kommentar"></textarea>
                </div>
            `;
            break;
    }
    
    form.innerHTML = html;
    
    if (id) {
        const endpoint = type === 'person' ? 'personen' : type === 'saite' ? 'saiten' : type;
        const data = await apiFetch(`/api/${endpoint}/${id}`).then(r => r.json());
        Object.keys(data).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) input.value = data[key] || '';
        });
    }
    
    modal.classList.add('active');
}

// Modal schließen
function closeModal() {
    document.getElementById('modal').classList.remove('active');
    currentEditId = null;
    currentEditType = null;
}

// Formular speichern
async function saveForm() {
    const form = document.getElementById('modal-form');
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
        data[key] = value === '' ? null : value;
    });
    
    const endpoint = currentEditType === 'person' ? 'personen' : 
                    currentEditType === 'saite' ? 'saiten' : 
                    currentEditType;
    
    const url = currentEditId ? `/api/${endpoint}/${currentEditId}` : `/api/${endpoint}`;
    const method = currentEditId ? 'PUT' : 'POST';
    
    try {
        const response = await apiFetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.status === 401) {
            showAuthOverlay();
            return;
        }
        
        if (!response.ok) throw new Error('Speichern fehlgeschlagen');
        
        closeModal();
        
        const activeSection = document.querySelector('.section.active').id;
        loadData(activeSection);
        
    } catch (error) {
        alert('Fehler beim Speichern: ' + error.message);
    }
}

// Bearbeiten Funktionen
async function editPerson(id) { await openModal('person', id); }
async function editSchlaeger(id) { await openModal('schlaeger', id); }
async function editSaite(id) { await openModal('saite', id); }
async function editBespannung(id) { await openModal('bespannung', id); }

// Löschen
async function deleteItem(type, id) {
    if (!confirm('Wirklich löschen?')) return;
    
    try {
        const response = await apiFetch(`/api/${type}/${id}`, { method: 'DELETE' });
        if (response.status === 401) {
            showAuthOverlay();
            return;
        }
        if (!response.ok) throw new Error('Löschen fehlgeschlagen');
        
        const activeSection = document.querySelector('.section.active').id;
        loadData(activeSection);
    } catch (error) {
        alert('Fehler beim Löschen: ' + error.message);
    }
}

// Hilfsfunktionen
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE');
}

// Initial Auth-Check
checkAuth();
