// API Basis-URL (leer für relativen Pfad)
const API_BASE = '';

// Auth Management
let authHeader = localStorage.getItem('authHeader');
let currentUser = null;

// API Helper mit Auth
async function apiFetch(url, options = {}) {
    if (authHeader) {
        options.headers = options.headers || {};
        options.headers['Authorization'] = authHeader;
    }
    // Stelle sicher, dass die URL korrekt ist
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
    return fetch(fullUrl, options);
}

// Prüfe Auth-Status beim Start
async function checkAuth() {
    try {
        const response = await apiFetch('/api/auth');
        const data = await response.json();
        
        if (data.require_login && !data.authenticated) {
            showAuthOverlay();
        } else {
            hideAuthOverlay();
            loadData('dashboard');
        }
    } catch (e) {
        console.error('Auth check failed', e);
        // Wenn /api/auth nicht existiert, einfach weitermachen
        hideAuthOverlay();
        loadData('dashboard');
    }
}

function showAuthOverlay() {
    const overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.style.display = 'flex';
}

function hideAuthOverlay() {
    const overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.style.display = 'none';
    const userInfo = document.getElementById('user-info');
    if (userInfo) userInfo.style.display = 'flex';
}

// Login
document.getElementById('auth-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('auth-user').value;
    const pass = document.getElementById('auth-pass').value;
    
    authHeader = 'Basic ' + btoa(user + ':' + pass);
    
    // Teste Auth
    try {
        const response = await apiFetch('/api/personen');
        
        if (response.ok) {
            localStorage.setItem('authHeader', authHeader);
            currentUser = user;
            document.getElementById('username-display').textContent = user;
            hideAuthOverlay();
            loadData('dashboard');
        } else {
            alert('Anmeldung fehlgeschlagen');
            authHeader = null;
            localStorage.removeItem('authHeader');
        }
    } catch (e) {
        alert('Verbindungsfehler');
    }
});

function logout() {
    authHeader = null;
    currentUser = null;
    localStorage.removeItem('authHeader');
    location.reload();
}

// Globale Variablen
let currentEditId = null;
let currentEditType = null;

// Navigation
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Nur wenn es ein data-section Attribut hat (nicht für externe Links)
        if (!btn.dataset.section) return;
        
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
    try {
        const [personen, schlaeger, saiten, bespannungen] = await Promise.all([
            apiFetch('/api/personen').then(r => r.ok ? r.json() : []),
            apiFetch('/api/schlaeger').then(r => r.ok ? r.json() : []),
            apiFetch('/api/saiten').then(r => r.ok ? r.json() : []),
            apiFetch('/api/bespannungen').then(r => r.ok ? r.json() : [])
        ]);
        
        document.getElementById('stat-personen').textContent = personen.length;
        document.getElementById('stat-schlaeger').textContent = schlaeger.length;
        document.getElementById('stat-saiten').textContent = saiten.length;
        document.getElementById('stat-bespannungen').textContent = bespannungen.length;
        
        const recentContainer = document.getElementById('recent-bespannungen');
        if (recentContainer) {
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
    } catch (e) {
        console.error('Dashboard Fehler:', e);
    }
}

// Personen laden
async function loadPersonen() {
    try {
        const response = await apiFetch('/api/personen');
        if (!response.ok) throw new Error('Fehler beim Laden');
        const personen = await response.json();
        const tbody = document.querySelector('#personen-table tbody');
        if (!tbody) return;
        
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
    } catch (e) {
        console.error('Fehler:', e);
    }
}

// Schläger laden
async function loadSchlaeger() {
    try {
        const response = await apiFetch('/api/schlaeger');
        if (!response.ok) throw new Error('Fehler beim Laden');
        const schlaeger = await response.json();
        const tbody = document.querySelector('#schlaeger-table tbody');
        if (!tbody) return;
        
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
    } catch (e) {
        console.error('Fehler:', e);
    }
}

// Saiten laden
async function loadSaiten() {
    try {
        const response = await apiFetch('/api/saiten');
        if (!response.ok) throw new Error('Fehler beim Laden');
        const saiten = await response.json();
        const tbody = document.querySelector('#saiten-table tbody');
        if (!tbody) return;
        
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
    } catch (e) {
        console.error('Fehler:', e);
    }
}

// Bespannungen laden
async function loadBespannungen() {
    try {
        const response = await apiFetch('/api/bespannungen');
        if (!response.ok) throw new Error('Fehler beim Laden');
        const bespannungen = await response.json();
        const tbody = document.querySelector('#bespannungen-table tbody');
        if (!tbody) return;
        
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
    } catch (e) {
        console.error('Fehler:', e);
    }
}

// Modal öffnen
async function openModal(type, id = null) {
    currentEditType = type;
    currentEditId = id;
    const modal = document.getElementById('modal');
    const form = document.getElementById('modal-form');
    const title = document.getElementById('modal-title');
    
    if (!modal || !form || !title) return;
    
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
            try {
                const response = await apiFetch('/api/personen');
                const personen = await response.json();
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
            } catch (e) {
                console.error('Fehler beim Laden der Personen:', e);
            }
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
            try {
                const [schlaegerRes, saitenRes, bespannungenRes] = await Promise.all([
                    apiFetch('/api/schlaeger'),
                    apiFetch('/api/saiten'),
                    apiFetch('/api/bespannungen')
                ]);
        
                const allSchlaeger = await schlaegerRes.json();
                const saiten = await saitenRes.json();
                const bespannungen = await bespannungenRes.json();
                
                if (!saiten.length) {
                    alert('Bitte zuerst eine Saite anlegen!');
                    closeModal();
                    return;
                }
                
                // Erstelle Map der aktiven Bespannungen pro Schläger
                const activeBespannungen = {};
                bespannungen.forEach(b => {
                    if (!b.datum_gerissen) {
                        activeBespannungen[b.schlaeger_id] = b;
                    }
                });
                
                let availableSchlaeger = allSchlaeger;
                let currentBespannung = null;
                let infoText = '';
                
                if (!id) {
                    // NEU: Filtere belegte Schläger
                    availableSchlaeger = allSchlaeger.filter(s => !activeBespannungen[s.id]);
                    
                    // Info über belegte Schläger
                    const occupiedCount = allSchlaeger.length - availableSchlaeger.length;
                    if (occupiedCount > 0) {
                        infoText = `<div style="background: #fff3cd; padding: 10px; border-radius: 4px; margin-bottom: 15px; font-size: 0.9rem;">
                            <i class="fas fa-info-circle"></i> 
                            ${occupiedCount} Schläger sind aktuell bespannt und nicht verfügbar.
                            <br><small>Um einen bespannten Schläger neu zu bespannen, markiere die bestehende Bespannung zuerst als "gerissen".</small>
                        </div>`;
                    }
                    
                    if (!availableSchlaeger.length) {
                        alert('Keine freien Schläger verfügbar! Alle Schläger sind bereits bespannt.');
                        closeModal();
                        return;
                    }
                } else {
                    // BEARBEITEN: Lade aktuelle Daten
                    const currentRes = await apiFetch(`${API_BASE}/api/bespannungen/${id}`);
                    currentBespannung = await currentRes.json();
                    availableSchlaeger = allSchlaeger; // Alle anzeigen
                }
                
                // ... restlicher Code wie oben
                
                html = infoText + `
                    <div class="form-group">
                        <!-- ... Formularfelder ... -->
                    </div>
                `;
                
            } catch (e) {
                console.error('Fehler:', e);
                alert('Fehler beim Laden der Daten');
                return;
            }
            break;
            /*
        case 'bespannung':
            title.textContent = id ? 'Bespannung bearbeiten' : 'Neue Bespannung';
            try {
                const [schlaegerRes, saitenRes] = await Promise.all([
                    apiFetch('/api/schlaeger'),
                    apiFetch('/api/saiten')
                ]);
                const schlaeger = await schlaegerRes.json();
                const saiten = await saitenRes.json();
                
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
            } catch (e) {
                console.error('Fehler beim Laden:', e);
            }
            break;
            */
    }
    
    form.innerHTML = html;
    
    // Wenn Bearbeiten, Daten laden
    if (id) {
        try {
            const endpoint = type === 'person' ? 'personen' : type === 'saite' ? 'saiten' : type === 'bespannung' ? 'bespannungen' : type;
            const response = await apiFetch(`/api/${endpoint}/${id}`);
            const data = await response.json();
            Object.keys(data).forEach(key => {
                const input = form.querySelector(`[name="${key}"]`);
                if (input) input.value = data[key] || '';
            });
        } catch (e) {
            console.error('Fehler beim Laden der Daten:', e);
        }
    }
    
    modal.classList.add('active');
}

// Modal schließen
function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) modal.classList.remove('active');
    currentEditId = null;
    currentEditType = null;
}

// WICHTIG: Formular speichern - Hier war der Fehler!
async function saveForm() {
    const form = document.getElementById('modal-form');
    if (!form) return;
    
    const formData = new FormData(form);
    const data = {};
    
    // Konvertiere FormData zu Objekt
    formData.forEach((value, key) => {
        // Leere Strings zu null, aber behalte 0 bei
        data[key] = value === '' ? null : value;
    });
    
    // Bestimme den Endpunkt
    let endpoint;
    switch(currentEditType) {
        case 'person':
            endpoint = 'personen';
            break;
        case 'saite':
            endpoint = 'saiten';
            break;
        case 'schlaeger':
            endpoint = 'schlaeger';
            break;
        case 'bespannung':
            endpoint = 'bespannungen';
            break;
        default:
            console.error('Unbekannter Typ:', currentEditType);
            return;
    }
    
    const url = currentEditId ? `${API_BASE}/api/${endpoint}/${currentEditId}` : `${API_BASE}/api/${endpoint}`;
    const method = currentEditId ? 'PUT' : 'POST';
    
    console.log('Speichern:', { url, method, data }); // Debug
    
    try {
        const response = await apiFetch(url, {
            method: method,
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.status === 401) {
            showAuthOverlay();
            return;
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server-Fehler: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Gespeichert:', result); // Debug
        
        closeModal();
        
        // Aktuelle Section neu laden
        const activeSection = document.querySelector('.section.active')?.id;
        if (activeSection) {
            loadData(activeSection);
        }
        
    } catch (error) {
        console.error('Speicherfehler:', error);
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
        const response = await apiFetch(`${API_BASE}/api/${type}/${id}`, { method: 'DELETE' });
        
        if (response.status === 401) {
            showAuthOverlay();
            return;
        }
        
        if (!response.ok) throw new Error('Löschen fehlgeschlagen');
        
        const activeSection = document.querySelector('.section.active')?.id;
        if (activeSection) {
            loadData(activeSection);
        }
    } catch (error) {
        console.error('Löschfehler:', error);
        alert('Fehler beim Löschen: ' + error.message);
    }
}

// Hilfsfunktionen
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE');
}

// Initial laden
if (document.getElementById('auth-overlay')) {
    checkAuth();
} else {
    loadData('dashboard');
}
