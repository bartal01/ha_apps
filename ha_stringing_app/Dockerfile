ARG BUILD_FROM=alpine:latest
FROM $BUILD_FROM

# Installiere System-Abhängigkeiten
RUN apk add --no-cache gcc musl-dev libffi-dev sqlite sqlite-dev python3 py3-pip python3-dev py3-flask py3-flask-cors py3-gunicorn
RUN apk add py3-flask-httpauth --repository=https://dl-cdn.alpinelinux.org/alpine/edge/testing

# Copy data for app
COPY . /
COPY run.sh /
RUN chmod a+x /run.sh

# Port
EXPOSE 5000

CMD [ "/run.sh" ]