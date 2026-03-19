FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app
RUN pip install --no-cache-dir paho-mqtt

COPY mock-esp32.py /app/mock-esp32.py

CMD ["python", "/app/mock-esp32.py"]
