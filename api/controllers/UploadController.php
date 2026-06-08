<?php
// ─────────────────────────────────────────────────────────────
//  controllers/UploadController.php
//  Serves uploaded application documents securely.
//  URL: GET /api/uploads/{fileId}?token={jwt}
// ─────────────────────────────────────────────────────────────

// Validate token (passed as query param for download links)
$token = $_GET['token'] ?? getBearerToken();
if (!$token) jsonError('Unauthorised.', 401);

$payload = JWT::decode($token);
if (!$payload) jsonError('Unauthorised — invalid token.', 401);

if (!$id) jsonError('File ID required.', 400);

// Look up document in DB to get file_path
$stmt = db()->prepare('SELECT * FROM application_documents WHERE file_id = ? LIMIT 1');
$stmt->execute([$id]);
$doc  = $stmt->fetch();

if (!$doc) {
    // Also try matching just by filename
    $stmt2 = db()->prepare('SELECT * FROM application_documents WHERE file_name = ? LIMIT 1');
    $stmt2->execute([$id]);
    $doc   = $stmt2->fetch();
}

if (!$doc) jsonError('File not found.', 404);

// Admins can access any file; applicants can only access their own
if ($payload['role'] !== 'admin') {
    $appStmt = db()->prepare('SELECT user_id FROM applications WHERE id = ? LIMIT 1');
    $appStmt->execute([$doc['application_id']]);
    $app = $appStmt->fetch();
    if (!$app || (int)$app['user_id'] !== (int)$payload['id']) {
        jsonError('Forbidden.', 403);
    }
}

$filePath = $doc['file_path'];
if (!file_exists($filePath)) jsonError('File not found on server.', 404);

// Serve the file
$mimeType = $doc['mime_type'] ?? mime_content_type($filePath) ?: 'application/octet-stream';
header('Content-Type: ' . $mimeType);
header('Content-Disposition: inline; filename="' . basename($doc['file_name']) . '"');
header('Content-Length: ' . filesize($filePath));
header('Cache-Control: private, max-age=3600');
readfile($filePath);
exit;
