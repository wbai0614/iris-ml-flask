FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
 && pip install --no-cache-dir -r requirements.txt

COPY . .

# Run as non-root
RUN useradd -u 10001 -m appuser
USER appuser

EXPOSE 8080
CMD ["bash","-lc","gunicorn -w 2 -k gthread -t 60 --bind 0.0.0.0:${PORT} app:app"]
