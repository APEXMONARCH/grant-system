<?php
// ─────────────────────────────────────────────────────────────
//  api/index.php  — Main router
// ─────────────────────────────────────────────────────────────

ob_start();
ini_set('display_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);

require_once __DIR__ . '/config/constants.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/helpers/Response.php';
require_once __DIR__ . '/helpers/Validate.php';
require_once __DIR__ . '/helpers/Upload.php';
require_once __DIR__ . '/helpers/JWT.php';
require_once __DIR__ . '/middleware/Cors.php';
require_once __DIR__ . '/middleware/Auth.php';

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

handleCors();

$method   = $_SERVER['REQUEST_METHOD'];
$rawUri   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri      = trim(preg_replace('#^.*?/api/?#', '', $rawUri), '/');
$parts    = $uri !== '' ? explode('/', $uri) : [];

$resource = $parts[0] ?? '';
$id       = $parts[1] ?? null;
$action   = $parts[2] ?? null;

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

    case 'roles':
        // BUG FIX: /api/roles must set $id = 'roles' so SettingsController
        // can handle it with the $settingKey check (since $resource is not
        // in scope inside controller files).
        $id = 'roles';
        require_once __DIR__ . '/controllers/SettingsController.php';
        break;

    case 'dashboard':
        require_once __DIR__ . '/controllers/DashboardController.php';
        break;

    case 'uploads':
        require_once __DIR__ . '/controllers/UploadController.php';
        break;

    case 'audit':
        require_once __DIR__ . '/controllers/AuditController.php';
        break;

    case '':
        jsonSuccess(['status' => 'Grant Management API running', 'version' => '1.1.0'], 'OK');
        break;

    default:
        jsonError("Route '/{$resource}' not found.", 404);
}
