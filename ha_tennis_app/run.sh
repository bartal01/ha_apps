#!/usr/bin/env bashio

bashio::log.info "Starte Tennis Bespannungs-Manager..."

# Config auslesen
REQUIRE_LOGIN=$(bashio::config 'require_login')
ADMIN_USER=$(bashio::config 'admin_username')
ADMIN_PASS=$(bashio::config 'admin_password')

# Umgebungsvariablen setzen
export REQUIRE_LOGIN="$REQUIRE_LOGIN"
export ADMIN_USERNAME="$ADMIN_USER"
export ADMIN_PASSWORD="$ADMIN_PASS"
export DATA_DIR="/config/tennis_stringing"
export FLASK_APP="app.py"

# Daten-Verzeichnis erstellen
mkdir -p "$DATA_DIR"

bashio::log.info "Initialisiert"
bashio::log.info "Daten werden gespeichert in: $DATA_DIR"

# Starte App
exec python app.py
