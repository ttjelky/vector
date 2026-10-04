# Деплой Vector

Проєкт зібрано як **один Docker-образ «все в одному»**: Python-бекенд (gunicorn +
uvicorn, з підтримкою websockets) роздає і API (`/api/`), і зібраний React SPA
(все інше), і медіа (`/media/`). База — SQLite у persistent volume `/data`.

## Варіант А — Railway (рекомендовано, найлегше)

Без SSH і сервера: автодеплой з GitHub, безкоштовний HTTPS-домен, Volume для SQLite.

1. Залий код на GitHub і створи проєкт на Railway → **Deploy from GitHub repo**.
   Railway сам знайде `Dockerfile`.
2. Вкладка сервісу → **Volumes** → **Add Volume**, mount path: `/data`.
   (Без цього `db.sqlite3` і завантажені картинки зітруться при кожному redeploy!)
3. Вкладка **Variables** — задай (значення — з `.env.example`):
   | Ключ | Значення |
   |---|---|
   | `SECRET_KEY` | згенеруй: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
   | `DEBUG` | `False` |
   | `ALLOWED_HOSTS` | `.up.railway.app` (або свій домен; можна кілька через кому) |
   | `CSRF_TRUSTED_ORIGINS` | `https://<твій-сервіс>.up.railway.app` |
   | `FRONTEND_URL` | `https://<твій-сервіс>.up.railway.app` |
   | `DATABASE_PATH` | `/data/db.sqlite3` |
   | `MEDIA_ROOT` | `/data/media` |
   | Email (`EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, …) | тільки якщо потрібен reset-password поштою |
   | HTTPS-флаги (`AUTH_COOKIE_SECURE`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_SSL_REDIRECT`) | `True` (на Railway завжди HTTPS) |
4. Deploy → перевір `https://<твій-сервіс>.up.railway.app/api/health/` → `{"status":"ok"}`.
5. Створи адміна: у сервісі **… → Run Command** (one-off):
   `python manage.py createsuperuser`
6. Свій домен (опційно): **Settings → Domains** → додай домен → онови
   `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `FRONTEND_URL`.

Оновлення — звичайний `git push`: Railway перебудує образ, міграції
застосуються автоматично в `entrypoint.sh`, дані в `/data` збережуться.

## Варіант Б — VPS (Hetzner / будь-який, ~€4–5/міс)

Повний контроль, найдешевше з персистентністю. Потрібні: Ubuntu 22.04+,
A-запис домена на IP сервера (або працюй через `http://IP`).

```bash
# 1. Docker
curl -fsSL https://get.docker.com | sh

# 2. Код
git clone <твій-репозиторій> vector && cd vector

# 3. Env
cp .env.example .env
nano .env   # SECRET_KEY, DEBUG=False,
            # ALLOWED_HOSTS=yourdomain.com,
            # CSRF_TRUSTED_ORIGINS=https://yourdomain.com,
            # FRONTEND_URL=https://yourdomain.com,
            # DOMAIN=yourdomain.com (+ email/HTTPS-флаги)

# 4. Старт (перша збірка ~3–5 хв: npm build + pip install)
DOMAIN=yourdomain.com docker compose up -d --build

# 5. Адмін
docker compose exec web python manage.py createsuperuser
```

Caddy сам випустить HTTPS-сертифікат (Let's Encrypt). Перевірка:
`https://yourdomain.com/api/health/` → `{"status":"ok"}`.

Корисне:

```bash
docker compose logs -f web        # логи бекенда
docker compose up -d --build      # оновлення після git pull
docker compose exec web python manage.py migrate
docker compose exec web python manage.py shell
```

**Бекап** (SQLite — один файл + папка картинок):

```bash
docker compose cp web:/data/db.sqlite3 ./backup-$(date +%F).sqlite3
docker compose cp web:/data/media ./backup-media-$(date +%F)
```

## Варіант В — Render (через `render.yaml`)

У репозиторії вже є Blueprint. Але: **SQLite на Render вимагає persistent disk,
а диски — лише на платному інстансі**. Безкоштовний інстанс + SQLite =
втрата БД при кожному redeploy. Тому для Render або бери Starter+disk,
або мігруй на Postgres (тоді цей гайд треба доповнити).

## Що змінено в коді під деплой

- `requirements.txt`: `gunicorn`, `uvicorn`, `websockets`, `whitenoise`.
- `config/settings.py`: WhiteNoise + `STATIC_ROOT`, шлях БД/медіа з env
  (`DATABASE_PATH`, `MEDIA_ROOT`), `FRONTEND_URL`, `CSRF_TRUSTED_ORIGINS`,
  `SECURE_PROXY_SSL_HEADER`, env-флаги HTTPS, необов'язкова пошта
  (сервер більше не падає без `EMAIL_HOST_USER`).
- `config/urls.py`: `GET /api/health/` + SPA fallback (всі не-API маршрути →
  `frontend/dist/index.html`), адмінка і DRF browsable API працюють як раніше.
- `apps/users/signals.py`: посилання reset-password будується з `FRONTEND_URL`,
  а не з хардкоду `localhost:5173`.
- `Dockerfile` (multi-stage: Node-збірка SPA → Python-рантайм, `collectstatic`
  на етапі збірки), `entrypoint.sh` (migrate → gunicorn ASGI, 1 воркер —
  channels InMemory не шаряться між процесами), `.dockerignore`,
  `docker-compose.yml` + `Caddyfile` (авто-HTTPS), `render.yaml`.
- Фронтенд без змін: API (`/api`) і медіа (`/media/...`) відносні → працюють
  на тому ж хості з коробки.

## Типові проблеми

| Симптом | Причина / фікс |
|---|---|
| `400 Bad Request` на проді | Домену немає в `ALLOWED_HOSTS` |
| `403 CSRF` в адмінці | Домену немає в `CSRF_TRUSTED_ORIGINS`, або змішаний http/https — увімкни `*_SECURE`/`SECURE_SSL_REDIRECT` |
| Порожня сторінка / 404 на `/tournament/5` після refresh | Немає `frontend/dist` в образі (локальний запуск без збірки) — виконай `npm run build` у `frontend/` |
| Пропали турніри/картинки після redeploy | БД/медіа не на persistent volume: перевір Volume `/data` + `DATABASE_PATH=/data/db.sqlite3`, `MEDIA_ROOT=/data/media` |
| Websocket не конектиться | Перевір, що `WEB_CONCURRENCY=1` (більше воркерів — лише з Redis channel layer) |
| Листи reset-password не йдуть | Немає `EMAIL_HOST_USER`/`EMAIL_HOST_PASSWORD` (для Gmail — App Password), або неправильний `FRONTEND_URL` у листі |
