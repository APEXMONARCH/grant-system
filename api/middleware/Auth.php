<?php
// ─────────────────────────────────────────────────────────────
//  middleware/Auth.php
// ─────────────────────────────────────────────────────────────

function getBearerToken(): ?string {
    $headers = function_exists('getallheaders') ? (getallheaders() ?: []) : [];

    $header = $_SERVER['HTTP_AUTHORIZATION']
           ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
           ?? $headers['Authorization']
           ?? $headers['authorization']
           ?? '';

    if (preg_match('/Bearer\s+(\S+)/i', $header, $matches)) {
        return $matches[1];
    }
    return null;
}

function requireAuth(): array {
    $token = getBearerToken();
    if (!$token) jsonError('Unauthorised — no token provided.', 401);

    $payload = JWT::decode($token);
    if (!$payload) jsonError('Unauthorised — invalid or expired token.', 401);

    return $payload;
}

function requireAdmin(): array {
    $user = requireAuth();
    if ($user['role'] !== 'admin') {
        jsonError('Forbidden — admin access required.', 403);
    }
    return $user;
}

function optionalAuth(): ?array {
    $token = getBearerToken();
    if (!$token) return null;
    return JWT::decode($token);
}
