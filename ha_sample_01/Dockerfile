FROM python:3.11-alpine

# Installiere System-Abhängigkeiten
#RUN apk add --no-cache gcc musl-dev libffi-dev sqlite sqlite-dev

# Arbeitsverzeichnis
WORKDIR /app

# Python Abhängigkeiten
#OPY requirements.txt /
#RUN pip install --no-cache-dir -r /requirements.txt

# Kopiere App
COPY app.py /
COPY . /

# Port
#EXPOSE 5000

# Copy data for app
COPY run.sh /
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]