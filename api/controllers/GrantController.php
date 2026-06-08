<?php
// ─────────────────────────────────────────────────────────────
//  controllers/GrantController.php
//
//  GET    /api/grants              list (with filters + pagination)
//  POST   /api/grants              create  [admin]
//  GET    /api/grants/{id}         single
//  PUT    /api/grants/{id}         update  [admin]
//  DELETE /api/grants/{id}         delete  [admin]
// ─────────────────────────────────────────────────────────────

require_once __DIR__ . '/../models/Grant.php';

switch ($method) {

    // ── GET /api/grants  OR  GET /api/grants/{id} ───────────
    case 'GET':
        $auth = requireAuth();

        if ($id) {
            $grant = Grant::findById((int)$id);
            if (!$grant) jsonError('Grant not found.', 404);
            jsonSuccess($grant);
        }

        $filters = [
            'status'   => $_GET['status']   ?? '',
            'category' => $_GET['category'] ?? '',
            'date'     => $_GET['date']     ?? '',
            'q'        => $_GET['q']        ?? '',
        ];
        $page  = max(1, (int)($_GET['page']  ?? 1));
        $limit = min(50, max(1, (int)($_GET['limit'] ?? 10)));

        $result = Grant::all($filters, $page, $limit);
        jsonList($result['items'], $result['total'], $page, $limit);
        break;

    // ── POST /api/grants ────────────────────────────────────
    case 'POST':
        $auth = requireAdmin();
        $body = jsonBody();

        $errors = validate($body, [
            'title'  => 'required|max:255',
            'status' => 'in:draft,active,pending,closed',
        ]);
        if ($errors) jsonError('Validation failed.', 422, $errors);

        $newId = Grant::create($body, $auth['id']);
        $grant = Grant::findById($newId);
        jsonSuccess($grant, 'Grant created successfully.', 201);
        break;

    // ── PUT /api/grants/{id} ────────────────────────────────
    case 'PUT':
        requireAdmin();
        if (!$id) jsonError('Grant ID required.', 400);

        $body = jsonBody();
        $errors = validate($body, ['title' => 'required|max:255']);
        if ($errors) jsonError('Validation failed.', 422, $errors);

        if (!Grant::findById((int)$id)) jsonError('Grant not found.', 404);
        Grant::update((int)$id, $body);
        jsonSuccess(Grant::findById((int)$id), 'Grant updated.');
        break;

    // ── DELETE /api/grants/{id} ─────────────────────────────
    case 'DELETE':
        requireAdmin();
        if (!$id) jsonError('Grant ID required.', 400);
        if (!Grant::findById((int)$id)) jsonError('Grant not found.', 404);
        Grant::delete((int)$id);
        jsonSuccess([], 'Grant deleted.');
        break;

    default:
        jsonError('Method not allowed.', 405);
}
