<?php
// ─────────────────────────────────────────────────────────────
//  api/index.php  — Main router
//  Every HTTP request arrives here.
// ─────────────────────────────────────────────────────────────

// Start output buffer immediately — catches any stray whitespace
// or PHP warnings that would corrupt the JSON response
ob_start();

// Suppress PHP notices/warnings from appearing in JSON output
// (errors are logged to file instead)
ini_set('display_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);

// Bootstrap
require_once __DIR__ . '/config/constants.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/helpers/Response.php';
require_once __DIR__ . '/helpers/Validate.php';
require_once __DIR__ . '/helpers/Upload.php';
require_once __DIR__ . '/helpers/JWT.php';
require_once __DIR__ . '/middleware/Cors.php';
require_once __DIR__ . '/middleware/Auth.php';

// Global exception handler — returns JSON instead of HTML error page
set_exception_handler(function(Throwable $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage(),
        'file'    => basename($e->getFile()),
        'line'    => $e->getLine(),
    ]);
    exit;
});

// Always handle CORS first
handleCors();

// Parse request
$method  = $_SERVER['REQUEST_METHOD'];
$rawUri  = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Strip everything up to and including /api from the path.
// Works whether the project is at domain root (/api/...)
// or inside a subfolder (/grant-system/api/...) or any other name.
$uri = trim(preg_replace('#^.*?/api/?#', '', $rawUri), '/');
$parts   = $uri !== '' ? explode('/', $uri) : [];

$resource = $parts[0] ?? '';
$id       = $parts[1] ?? null;   // e.g. /api/grants/5  → id = "5"
$action   = $parts[2] ?? null;   // e.g. /api/applications/5/status → action = "status"

// ─── ROUTE TABLE ───────────────────────────────────────────
switch ($resource) {

    case 'auth':
        require_once __DIR__ . '/controllers/AuthController.php';
        break;

    case 'grants':
        require_once __DIR__ . '/controllers/GrantController.php';
        break;

    case 'applications':
        require_once __DIR__ . '/controllers/ApplicationController.php';
        break;

    case 'beneficiaries':
        require_once __DIR__ . '/controllers/BeneficiaryController.php';
        break;

    case 'reports':
        require_once __DIR__ . '/controllers/ReportController.php';
        break;

    case 'users':
        require_once __DIR__ . '/controllers/UserController.php';
        break;

    case 'notifications':
        require_once __DIR__ . '/controllers/NotificationController.php';
        break;

    case 'messages':
        require_once __DIR__ . '/controllers/MessageController.php';
        break;

    case 'profile':
        require_once __DIR__ . '/controllers/ProfileController.php';
        break;

    case 'settings':
        require_once __DIR__ . '/controllers/SettingsController.php';
        break;

    case 'dashboard':
        require_once __DIR__ . '/controllers/DashboardController.php';
        break;

    case 'uploads':
        require_once __DIR__ . '/controllers/UploadController.php';
        break;

    case '':
        jsonSuccess(['status' => 'Grant Management API running'], 'OK');
        break;

    default:
        jsonError("Route '/{$resource}' not found.", 404);
}
