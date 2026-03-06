FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY sync_actual_snapshot.py .

CMD ["python", "-u", "sync_actual_snapshot.py"]
