<?php
// ─────────────────────────────────────────────────────────────
//  controllers/MessageController.php
// ─────────────────────────────────────────────────────────────
require_once __DIR__ . '/../models/Message.php';

$auth = requireAuth();

// PATCH /api/messages/{id}/read
if ($id && $action === 'read' && $method === 'PATCH') {
    Message::markRead((int)$id, $auth['id']);
    jsonSuccess([], 'Marked as read.');
}

// POST /api/messages/read-all
if ($id === 'read-all' && $method === 'POST') {
    Message::markAllRead($auth['id']);
    jsonSuccess([], 'All marked as read.');
}

// GET /api/messages
if ($method === 'GET') {
    $filters = [
        'filter' => $_GET['filter'] ?? 'all',
        'q'      => $_GET['q']     ?? '',
    ];
    $items = Message::forUser($auth['id'], $filters);
    jsonSuccess(['items' => $items]);
}

jsonError('Method not allowed.', 405);
