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

## 📚 Dokumentasi API

Backend menyediakan API lengkap yang dapat diakses melalui endpoint berikut (jika server berjalan):

-   `GET /api/courses/` - List semua kursus
-   `GET /api/instructors/` - List instruktur
-   `POST /api/token/` - Login & ambil token JWT

## 🔐 Akun Admin

Untuk mengakses **Admin Panel** di `http://localhost:3000/admin`, pastikan Anda login menggunakan akun yang memiliki status **Superuser** atau **Staff** (dibuat via `createsuperuser`).

---
**Akademiso Team** © 2026
