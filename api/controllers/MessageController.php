<?php
// ─────────────────────────────────────────────────────────────
//  controllers/MessageController.php  (FIXED v2 — Two-Way)
//
//  GET    /api/messages              — list messages for current user (applicant)
//                                      OR all threads (admin)
//  POST   /api/messages              — admin sends a new message to a user
//                                      OR applicant replies to a thread
//  PATCH  /api/messages/{id}/read    — mark one message read
//  POST   /api/messages/read-all     — mark all read
//  GET    /api/messages/{id}/thread  — get full thread (replies)
// ─────────────────────────────────────────────────────────────
require_once __DIR__ . '/../models/Message.php';
require_once __DIR__ . '/../models/User.php';

$auth = requireAuth();

// ── PATCH /api/messages/{id}/read ──────────────────────────
if ($id && $action === 'read' && $method === 'PATCH') {
    Message::markRead((int)$id, $auth['id']);
    jsonSuccess([], 'Marked as read.');
}

// ── GET /api/messages/{id}/thread ──────────────────────────
if ($id && $action === 'thread' && $method === 'GET') {
    $thread = Message::getThread((int)$id, $auth['id'], $auth['role']);
    jsonSuccess(['items' => $thread]);
}

// ── POST /api/messages/read-all ────────────────────────────
if ($id === 'read-all' && $method === 'POST') {
    Message::markAllRead($auth['id']);
    jsonSuccess([], 'All marked as read.');
}

// ── GET /api/messages ──────────────────────────────────────
if ($method === 'GET' && !$id) {
    if ($auth['role'] === 'admin') {
        // Admin: see all message threads grouped by user
        $filters = [
            'q'       => $_GET['q']      ?? '',
            'user_id' => $_GET['user_id'] ?? '',
        ];
        $items = Message::allThreadsForAdmin($filters);
        jsonSuccess(['items' => $items]);
    } else {
        // Applicant: see their own messages
        $filters = [
            'filter' => $_GET['filter'] ?? 'all',
            'q'      => $_GET['q']     ?? '',
        ];
        $items = Message::forUser($auth['id'], $filters);
        jsonSuccess(['items' => $items]);
    }
}

// ── POST /api/messages ─────────────────────────────────────
if ($method === 'POST' && !$id) {
    $body = jsonBody();

    if ($auth['role'] === 'admin') {
        // Admin sending a new message to a specific user
        $targetUserId = (int)($body['user_id'] ?? 0);
        if (!$targetUserId) jsonError('user_id is required.', 422);

        $targetUser = User::findById($targetUserId);
        if (!$targetUser) jsonError('User not found.', 404);

        $subject = trim($body['subject'] ?? '');
        $message = trim($body['message'] ?? '');
        if (!$message) jsonError('message is required.', 422);
        if (!$subject) $subject = 'Message from Admin';

        $newId = Message::send(
            $targetUserId,
            $subject,
            $message,
            $auth['first_name'] . ' ' . $auth['last_name'],
            'admin',
            $auth['id']
        );

        jsonSuccess(['id' => $newId], 'Message sent.', 201);

    } else {
        // Applicant replying to a thread
        $threadId = (int)($body['thread_id'] ?? 0);
        $message  = trim($body['message'] ?? '');
        if (!$threadId) jsonError('thread_id is required to reply.', 422);
        if (!$message)  jsonError('message is required.', 422);

        // Verify the thread belongs to this user
        $root = Message::findById($threadId);
        if (!$root || (int)$root['user_id'] !== (int)$auth['id']) {
            jsonError('Thread not found.', 404);
        }

        $senderName = $auth['first_name'] . ' ' . $auth['last_name'];
        $newId = Message::sendReply(
            $auth['id'],
            $threadId,
            'Re: ' . $root['subject'],
            $message,
            $senderName,
            'applicant',
            $auth['id']
        );

        jsonSuccess(['id' => $newId], 'Reply sent.', 201);
    }
}

jsonError('Method not allowed.', 405);
