# Vector Tournament System-ENG-readme

# Roles

* Administrator
* Jury
* Participant

# Technologies

* **Backend:** Django 6 + Django REST Framework
* **Frontend:** React (Vite)
* **Database:** SQLite (default)
* **Authorization:** JWT (if connected)

# Project Structure

```
vector-main/
│
├── apps/
│   ├── users/          # users
│   ├── tournament/     # tournaments
│   └── backend_api/    # API
│
├── config/             # Django settings
├── frontend/           # React app
├── manage.py
└── requirements.txt
```

# Getting Started

## 1. Clone the repository

```bash
git clone https://github.com/ttjelky/vector.git
```

## 2. Backend (Django)

```bash
python -m venv venv
```

## Activate the virtual environment:

**Windows:**

```bash
venv\Scripts\activate
```

**Linux / Mac:**

```bash
source venv/bin/activate
```

## 3. Install dependencies

```bash
pip install -r requirements.txt
```

## 4. Run migrations

```bash
python manage.py migrate
```

## 5. Start the server

```bash
python manage.py runserver
```

Backend runs at:

```
http://127.0.0.1:8000/
```

## 7. Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

```
http://localhost:5173/
```

# Testing

Run tests:

```bash
python manage.py test apps.tournaments.tests --verbosity=2
```

# Role Capabilities

## Administrator

* creates tournaments
* manages users
* views statistics

## Jury

* evaluates matches
* works with results

## Participant

* participates in tournaments
* views results

# Contact

```
Email: Vectorcommand6742@gmail.com
```


# Vector Tournament System-UA-readme

# Ролі:

* Адміністратор
* Журі
* Учасник

# Технології

* **Backend:** Django 6 + Django REST Framework
* **Frontend:** React (Vite)
* **База даних:** SQLite (за замовчуванням)
* **Авторизація:** JWT (якщо підключено)

# Структура проєкту

```
vector-main/
│
├── apps/
│   ├── users/          # користувачі
│   ├── tournament/     # турніри
│   └── backend_api/    # API
│
├── config/             # налаштування Django
├── frontend/           # React додаток
├── manage.py
└── requirements.txt
```


# Запуск проєкту

# 1. Клонування

```bash
git clone https://github.com/ttjelky/vector.git
```

# 2. Backend (Django)

```bash
python -m venv venv
```

# Активація:

**Windows:**

```bash
venv\Scripts\activate
```

**Linux / Mac:**

```bash
source venv/bin/activate
```

# 3. Встановлення залежностей

```bash
pip install -r requirements.txt
```

# 4. Міграції

```bash
python manage.py migrate
```

# 5. Запуск сервера

```bash
python manage.py runserver
```
Backend:

```
http://127.0.0.1:8000/
```

# 7. Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```
http://localhost:5173/
```

# Тестування

Запуск тестів:

```bash
python manage.py test apps.tournaments.tests --verbosity=2
```

# Що винокує кожна з ролей

# Адмін

* створює турніри
* керує користувачами
* переглядає статистику

# Журі

* оцінює матчі
* працює з результатами

# Учасник

* бере участь у турнірах
* переглядає результати

# Контакти

```
Email: Vectorcommand6742@gmail.com
```