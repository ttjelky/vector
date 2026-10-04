#!/bin/sh
# Entrypoint production-контейнера: міграції → gunicorn (ASGI, websockets).
set -e

# Папка даних (volume) — SQLite + media живуть тут, щоб переживати redeploy.
mkdir -p "$(dirname "${DATABASE_PATH:-/app/db.sqlite3}")" "${MEDIA_ROOT:-/app/media}"

echo "==> Django migrate"
python manage.py migrate --noinput

echo "==> Starting gunicorn (ASGI, ${WEB_CONCURRENCY:-1} worker)"
exec gunicorn config.asgi:application \
  -k uvicorn.workers.UvicornWorker \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers "${WEB_CONCURRENCY:-1}" \
  --access-logfile - \
  --error-logfile -
