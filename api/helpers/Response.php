<?php
// ─────────────────────────────────────────────────────────────
//  helpers/Response.php
// ─────────────────────────────────────────────────────────────

function jsonSuccess($data = [], string $message = 'OK', int $code = 200): void {
    // Clear any stray output (PHP warnings etc) before sending JSON
    if (ob_get_level()) ob_clean();
    http_response_code($code);
    echo json_encode([
        'success' => true,
        'data'    => $data,
        'message' => $message,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError(string $message, int $code = 400, array $errors = []): void {
    if (ob_get_level()) ob_clean();
    http_response_code($code);
    $body = ['success' => false, 'message' => $message];
    if (!empty($errors)) $body['errors'] = $errors;
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonList(array $items, int $total, int $page, int $limit, string $message = 'OK'): void {
    jsonSuccess([
        'items' => $items,
        'total' => $total,
        'page'  => $page,
        'pages' => (int) ceil($total / max($limit, 1)),
    ], $message);
}

function jsonBody(): array {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function input(array $data, string $key, $default = null) {
    return isset($data[$key]) && $data[$key] !== '' ? $data[$key] : $default;
}
