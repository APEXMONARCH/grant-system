<?php
// ─────────────────────────────────────────────────────────────
//  controllers/NotificationController.php
// ─────────────────────────────────────────────────────────────
require_once __DIR__ . '/../models/Notification.php';

$auth = requireAuth();

// PATCH /api/notifications/{id}/read
if ($id && $action === 'read' && $method === 'PATCH') {
    Notification::markRead((int)$id, $auth['id']);
    jsonSuccess([], 'Marked as read.');
}

// POST /api/notifications/read-all
if ($id === 'read-all' && $method === 'POST') {
    Notification::markAllRead($auth['id']);
    jsonSuccess([], 'All marked as read.');
}

// GET /api/notifications
if ($method === 'GET') {
    $items = Notification::forUser($auth['id']);
    jsonSuccess([
        'unread_count' => Notification::unreadCount($auth['id']),
        'items'        => $items,
    ]);
}

jsonError('Method not allowed.', 405);
