<?php
// ─────────────────────────────────────────────────────────────
//  middleware/Cors.php  (FIXED)
//  Must be called before any output.
// ─────────────────────────────────────────────────────────────

function handleCors(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if (APP_ENV === 'production') {
        header('Access-Control-Allow-Origin: ' . FRONTEND_URL);
    } else {
        // In dev, reflect the actual requesting origin so credentials work.
        header('Access-Control-Allow-Origin: ' . ($origin !== '' ? $origin : '*'));
    }

    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
    header('Content-Type: application/json; charset=UTF-8');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
