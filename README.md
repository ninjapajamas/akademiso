# Akademiso - Learning Management System (LMS)

Akademiso adalah platform Learning Management System (LMS) modern yang dibangun dengan teknologi terkini untuk memfasilitasi pembelajaran online yang efektif. Aplikasi ini memiliki dua sisi utama: **User Interface** untuk siswa dan **Admin Panel** untuk pengelolaan konten.

## 🚀 Teknologi yang Digunakan

### Frontend
-   **Framework**: [Next.js 15](https://nextjs.org/) (React)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Icons**: [Lucide React](https://lucide.dev/)
-   **HTTP Client**: Fetch API
-   **Deployment**: Vercel (Recommended)

### Backend
-   **Framework**: [Django](https://www.djangoproject.com/)
-   **API**: [Django REST Framework (DRF)](https://www.django-rest-framework.org/)
-   **Authentication**: [SimpleJWT](https://django-rest-framework-simplejwt.readthedocs.io/)
-   **Database**: SQLite (Development) / PostgreSQL (Production recommended)
-   **Media**: Django Media Files

## ✨ Fitur Utama

### 1. User Platform (Siswa)
-   **Katalog Kursus**: Menjelajahi kursus berdasarkan kategori.
-   **Pembelajaran**: Video player interaktif dan materi bacaan.
-   **Progress Tracking**: Melacak kemajuan belajar per kursus.
-   **Checkout**: Integrasi pembayaran (Midtrans ready).
-   **Dashboard Siswa**: Melihat kursus yang diikuti.

### 2. Admin Panel (Pengelola)
-   **Dashboard Ringkasan**: Statistik total siswa, kursus, dan pendapatan.
-   **Manajemen Instruktur**: CRUD data instruktur.
-   **Manajemen Kursus**: Membuat, mengedit, dan menghapus kursus.
-   **Manajemen Materi (Lesson)**:
    -   Upload Video (URL) & Artikel.
    -   Pengaturan urutan materi.
    -   Dukungan gambar sampul.
-   **Manajemen Siswa**: Memantau pengguna terdaftar.

## 🛠️ Cara Install & Menjalankan Project

Ikuti langkah-langkah berikut untuk menjalankan aplikasi di komputer lokal Anda.

### Prasyarat
-   Node.js (v18+)
-   Python (v3.9+)
-   Git

### 1. Backend (Django)

```bash
# Clone repository
git clone https://github.com/username/akademiso.git
cd akademiso/backend

# Buat Virtual Environment
python -m venv venv
source venv/bin/activate  # Mac/Linux
venv\Scripts\activate     # Windows

# Install Dependencies
pip install -r requirements.txt

# Migrasi Database
python manage.py makemigrations
python manage.py migrate

# Buat Superuser (untuk akses Admin)
python manage.py createsuperuser

# Jalankan Server
python manage.py runserver
```
*Backend akan berjalan di `http://localhost:8000`*

### 2. Frontend (Next.js)

```bash
# Masuk ke folder frontend
cd ../frontend

# Install Dependencies
npm install

# Setup Environment Variables
# Buat file .env.local dan isi:
NEXT_PUBLIC_API_URL=http://localhost:8000

# Jalankan Server Development
npm run dev
```
*Frontend akan berjalan di `http://localhost:3000`*

## Docker Production

Project ini sekarang sudah punya konfigurasi Docker yang lebih cocok untuk production ringan:

- Frontend berjalan dengan `next build` lalu `next start`
- Backend berjalan dengan `gunicorn`
- Static files dikumpulkan otomatis saat startup
- PostgreSQL berjalan sebagai service Docker terpisah
- Data PostgreSQL, media, dan static disimpan di Docker volume agar tetap ada saat redeploy

### Cara menjalankan

```bash
docker compose up -d --build
```

Setelah container berjalan:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Django Admin: `http://localhost:8000/admin`

### Variabel environment penting

Sebelum deploy, sangat disarankan set variabel berikut:

```bash
DJANGO_SECRET_KEY=isi-secret-yang-kuat
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,backend,domain-anda.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://domain-anda.com
DJANGO_DB_ENGINE=postgresql
POSTGRES_DB=akademiso
POSTGRES_USER=akademiso
POSTGRES_PASSWORD=password-postgres-yang-kuat
NEXT_PUBLIC_API_URL=https://api.domain-anda.com
```

Jika Anda ingin container otomatis membuat superuser saat startup:

```bash
DJANGO_CREATE_SUPERUSER=1
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@example.com
DJANGO_SUPERUSER_PASSWORD=password-yang-kuat
```

Jika Anda ingin data dummy otomatis dibuat saat deploy:

```bash
DJANGO_LOAD_DEMO_DATA=1
```

Catatan:
- `DJANGO_LOAD_DEMO_DATA=1` cocok untuk server demo, staging, atau local testing.
- Untuk production sungguhan, sebaiknya tetap `0` agar data demo tidak ikut masuk.

Jika server Anda sudah sepenuhnya memakai HTTPS di balik reverse proxy, Anda juga bisa mengaktifkan:

```bash
DJANGO_SECURE_SSL_REDIRECT=1
DJANGO_SESSION_COOKIE_SECURE=1
DJANGO_CSRF_COOKIE_SECURE=1
DJANGO_SECURE_HSTS_SECONDS=31536000
DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=1
DJANGO_SECURE_HSTS_PRELOAD=1
```

### Catatan konfigurasi

- Request server-side dari Next.js container menggunakan alamat internal Docker `http://backend:8000`.
- Rewrite di Next.js tetap tersedia untuk `/api` dan `/media`.
- Backend mendukung `SQLite` untuk local non-Docker, tetapi stack Docker sekarang default ke `PostgreSQL`.
- Saat startup, container backend otomatis menjalankan `migrate` dan `collectstatic`.
- Jika diaktifkan, container backend juga bisa otomatis menjalankan `ensure_superuser` dan `seed_data`.
- Jika perlu fallback ke SQLite, set `DJANGO_DB_ENGINE=sqlite3` dan isi `DJANGO_DB_PATH`.

### Jika sebelumnya sudah pernah deploy

Jika sebelumnya container backend Anda menyimpan database SQLite di filesystem container lama, backup dulu database lama sebelum menjalankan deploy baru. Setelah konfigurasi baru ini aktif, database utama berjalan di volume PostgreSQL. Jika ingin memindahkan data lama, ekspor dulu dari SQLite lalu impor ke PostgreSQL.

## 📚 Dokumentasi API

Backend menyediakan API lengkap yang dapat diakses melalui endpoint berikut (jika server berjalan):

-   `GET /api/courses/` - List semua kursus
-   `GET /api/instructors/` - List instruktur
-   `POST /api/token/` - Login & ambil token JWT

## 🔐 Akun Admin

Untuk mengakses **Admin Panel** di `http://localhost:3000/admin`, pastikan Anda login menggunakan akun yang memiliki status **Superuser** atau **Staff** (dibuat via `createsuperuser`).

---
**Akademiso Team** © 2026
