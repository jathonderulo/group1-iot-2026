FROM eclipse-mosquitto:2

COPY passwordfile /mosquitto/config/passwordfile
RUN chown mosquitto:mosquitto /mosquitto/config/passwordfile && \
    chmod 0700 /mosquitto/config/passwordfile
