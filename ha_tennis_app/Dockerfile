FROM python:3.11-alpine
USER root

# Installiere System-Abhängigkeiten
RUN apk add --no-cache \
    gcc \
    musl-dev \
    libffi-dev \
    sqlite \
    sqlite-dev

# Arbeitsverzeichnis
WORKDIR /app

# Python Abhängigkeiten
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Kopiere App
COPY . .

# Port
EXPOSE 5000

# Start-Skript ausführbar machen
RUN chmod a+x run.sh

# Start
CMD ["./run.sh"]
