# ==================== Frontend build ====================
FROM node:20-alpine AS frontend

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ==================== Backend runtime ====================
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    WEB_CONCURRENCY=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./

# Зібраний SPA кладемо поверх (frontend/dist/ в .dockerignore).
COPY --from=frontend /app/frontend/dist ./frontend/dist

# collectstatic під час збірки (БД не потрібна; ключ — лише для цієї команди,
# у шарах образу не зберігається).
RUN SECRET_KEY=build-only-dummy-key DEBUG=False \
    python manage.py collectstatic --noinput

VOLUME ["/data"]
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:'+os.environ.get('PORT','8000')+'/api/health/')"

ENTRYPOINT ["./entrypoint.sh"]
