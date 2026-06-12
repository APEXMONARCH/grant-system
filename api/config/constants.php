<?php
// ─────────────────────────────────────────────────────────────
//  config/constants.example.php  (UPDATED v2)
//  COMMIT THIS FILE to GitHub.
//  Copy it to constants.php and fill in your real values.
//  constants.php is in .gitignore and will never be committed.
// ─────────────────────────────────────────────────────────────

// Database
define('DB_HOST',    'localhost');
define('DB_NAME',    'grant_system');   // ← your database name
define('DB_USER',    'root');           // ← your MySQL username
define('DB_PASS',    '');               // ← your MySQL password
define('DB_CHARSET', 'utf8mb4');

// JWT — replace with a long random string (32+ characters)
// Generate one at: https://randomkeygen.com
define('JWT_SECRET', 'REPLACE_WITH_YOUR_SECRET_KEY');
define('JWT_EXPIRY', 60 * 60 * 24);    // 24 hours

// Admin Registration Secret Key
// Anyone who knows this key can register as an admin.
// Change this to a strong, private passphrase. Never share it publicly.
// Example: 'MyGrantSystem$AdminKey!2024'
define('ADMIN_REGISTRATION_SECRET', 'GrantSystemAdmin2222');

// File uploads
define('UPLOAD_DIR',    __DIR__ . '/../uploads/applications/');
define('UPLOAD_URL',    '/api/uploads/');
define('MAX_FILE_SIZE',  10 * 1024 * 1024); // 10MB
define('ALLOWED_MIME_TYPES', [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

// App
define('APP_ENV',      'development'); // change to 'production' when live
define('FRONTEND_URL', 'http://localhost');
