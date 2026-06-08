# Grant Management System

A full-stack grant management platform for universities and research institutions. Admins can create and manage grants, review applications via a Kanban board, and track disbursements. Applicants can browse grants, submit multi-step applications with document uploads, and receive status notifications.

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | HTML, CSS, JavaScript (Vanilla)     |
| Backend   | PHP 8.0+                            |
| Database  | MySQL 8+                            |
| Auth      | JWT (custom implementation)         |
| Server    | Apache (XAMPP / Laragon)            |

---

## Features

### Admin Portal
- Dashboard with live fund statistics and Chart.js visualisations
- Grant creation (multi-step form)
- Kanban board for application review (Submitted → Under Review → Approved → Rejected)
- Full application detail view with approve/reject actions
- Beneficiaries tracking and CSV export
- Reports with date-range filtering
- User management and role-based access control
- Notification system

### User Portal
- Browse and search open grants
- Multi-step application form with file uploads (PDF, DOC, images)
- Application status tracking
- In-app messaging and notifications
- Profile management

---

## Project Structure

```
grant-system/
├── .htaccess                  ← Apache rewrite rules (root level)
├── .gitignore
├── README.md
│
├── assets/                    ← Frontend assets
│   ├── css/
│   │   ├── styles.css
│   │   └── user-dashboard.css
│   └── js/
│       ├── api.js             ← Central HTTP client
│       ├── auth.js            ← JWT auth + route guards
│       ├── app.js             ← Shared UI (sidebar, toasts, notifications)
│       ├── dashboard.js
│       ├── grants.js
│       ├── applications.js
│       ├── admin-application-details.js
│       ├── beneficiaries.js
│       ├── reports.js
│       ├── settings.js
│       ├── create-grant.js
│       └── user-dashboard.js
│
├── *.html                     ← All HTML pages
│
└── api/                       ← PHP backend
    ├── .htaccess              ← API-level rewrite rules
    ├── index.php              ← Main router
    ├── schema.sql             ← Full database schema + seed data
    │
    ├── config/
    │   ├── constants.example.php   ← Copy to constants.php and fill in values
    │   └── database.php
    │
    ├── controllers/
    ├── models/
    ├── helpers/
    ├── middleware/
    └── uploads/               ← Not committed (in .gitignore)
```

---

## Local Setup

### Requirements
- XAMPP or Laragon (PHP 8.0+, Apache, MySQL)
- A modern browser

### Steps

**1. Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/grant-system.git
```
Place the cloned folder inside `C:\xampp\htdocs\` (XAMPP) or `C:\laragon\www\` (Laragon).

**2. Create the database**

Open phpMyAdmin → create a database named `grant_system` with collation `utf8mb4_unicode_ci`.

Then import `api/schema.sql` via the SQL tab.

**3. Configure the backend**
```bash
cp api/config/constants.example.php api/config/constants.php
```
Open `constants.php` and fill in your database credentials and a JWT secret.

**4. Configure the frontend**

Open `assets/js/api.js` and set line 15:
```js
const BASE_URL = '/grant-system/api'; // match your folder name
```

Open `assets/js/auth.js` and confirm line 26:
```js
const DEV_MODE = false;
```

**5. Enable mod_rewrite (XAMPP only)**

In `httpd.conf`:
- Uncomment `LoadModule rewrite_module modules/mod_rewrite.so`
- Change `AllowOverride None` → `AllowOverride All`
- Restart Apache

**6. Open the app**
```
http://localhost/grant-system/login.html
```

Default admin credentials:
- Email: `admin@grantsystem.com`
- Password: `Admin@1234`

> ⚠️ Change the admin password immediately after first login.

---

## API Endpoints

Full endpoint documentation is in [`PHP_API_CONTRACT.md`](PHP_API_CONTRACT.md).

Key routes:
```
POST /api/auth/login
POST /api/auth/register
GET  /api/grants
POST /api/grants              [admin]
GET  /api/applications
POST /api/applications
PATCH /api/applications/{id}/status  [admin]
GET  /api/dashboard/summary
GET  /api/reports/summary
```

---

## Default Roles

| Role      | Access                                          |
|-----------|-------------------------------------------------|
| admin     | Full access — grants, applications, users, reports |
| reviewer  | View applications, add notes                    |
| applicant | Browse grants, submit applications              |

---

## Deployment

When deploying to a live server:

1. Set `APP_ENV` to `production` in `constants.php`
2. Set `FRONTEND_URL` to your actual domain
3. Use HTTPS — JWT tokens must not travel over plain HTTP
4. Set `DEV_MODE = false` in `auth.js`
5. Remove `test_api.php`, `fix_admin.php`, `diagnostic.html` if present
6. Make `api/uploads/` writable: `chmod -R 775 api/uploads/`
