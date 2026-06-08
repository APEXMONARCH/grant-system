<?php
// ─────────────────────────────────────────────────────────────
//  middleware/Cors.php
//  Must be called before any output.
// ─────────────────────────────────────────────────────────────

function handleCors(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';

    // In production, replace '*' with your exact frontend URL
    header('Access-Control-Allow-Origin: ' . (APP_ENV === 'production' ? FRONTEND_URL : '*'));
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
    header('Content-Type: application/json; charset=UTF-8');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
