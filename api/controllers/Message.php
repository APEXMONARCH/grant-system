<?php
// ─────────────────────────────────────────────────────────────
//  models/Message.php  (FIXED v2 — Two-Way Threading)
// ─────────────────────────────────────────────────────────────

class Message {

    // ── Get all root messages for an applicant ─────────────
    public static function forUser(int $userId, array $filters = []): array {
        $where  = ['m.user_id = ?', 'm.parent_id IS NULL'];
        $params = [$userId];

        if (!empty($filters['filter'])) {
            if ($filters['filter'] === 'unread') { $where[] = 'm.is_read = 0'; }
            if ($filters['filter'] === 'read')   { $where[] = 'm.is_read = 1'; }
        }
        if (!empty($filters['q'])) {
            $where[]  = '(m.subject LIKE ? OR m.message LIKE ? OR m.sender LIKE ?)';
            $params[] = '%' . $filters['q'] . '%';
            $params[] = '%' . $filters['q'] . '%';
            $params[] = '%' . $filters['q'] . '%';
        }

        $stmt = db()->prepare('
            SELECT m.*,
                   (SELECT COUNT(*) FROM messages r WHERE r.thread_id = m.id) AS reply_count
            FROM messages m
            WHERE ' . implode(' AND ', $where) . '
            ORDER BY m.created_at DESC
        ');
        $stmt->execute($params);
        $items = $stmt->fetchAll();
        foreach ($items as &$item) {
            $item['read']        = (bool)$item['is_read'];
            $item['reply_count'] = (int)$item['reply_count'];
        }
        return $items;
    }

    // ── Get a single message by id ─────────────────────────
    public static function findById(int $id): ?array {
        $stmt = db()->prepare('SELECT * FROM messages WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    // ── Get full thread (root + all replies) ───────────────
    public static function getThread(int $rootId, int $requesterId, string $role): array {
        // Admins can read any thread; applicants only their own
        if ($role === 'admin') {
            $stmt = db()->prepare('
                SELECT m.*, u.first_name, u.last_name
                FROM messages m
                LEFT JOIN users u ON u.id = m.sender_id
                WHERE m.id = ? OR m.thread_id = ?
                ORDER BY m.created_at ASC
            ');
            $stmt->execute([$rootId, $rootId]);
        } else {
            $stmt = db()->prepare('
                SELECT m.*, u.first_name, u.last_name
                FROM messages m
                LEFT JOIN users u ON u.id = m.sender_id
                WHERE (m.id = ? OR m.thread_id = ?) AND m.user_id = ?
                ORDER BY m.created_at ASC
            ');
            $stmt->execute([$rootId, $rootId, $requesterId]);
        }

        $items = $stmt->fetchAll();
        foreach ($items as &$item) {
            $item['read'] = (bool)$item['is_read'];
        }

        // Mark all as read for the requester
        db()->prepare('
            UPDATE messages SET is_read = 1
            WHERE (id = ? OR thread_id = ?) AND user_id = ?
        ')->execute([$rootId, $rootId, $requesterId]);

        return $items;
    }

    // ── Admin: all root threads across all users ───────────
    public static function allThreadsForAdmin(array $filters = []): array {
        $where  = ['m.parent_id IS NULL'];
        $params = [];

        if (!empty($filters['user_id'])) {
            $where[]  = 'm.user_id = ?';
            $params[] = (int)$filters['user_id'];
        }
        if (!empty($filters['q'])) {
            $where[]  = '(m.subject LIKE ? OR m.message LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
            $params[] = '%' . $filters['q'] . '%';
            $params[] = '%' . $filters['q'] . '%';
            $params[] = '%' . $filters['q'] . '%';
            $params[] = '%' . $filters['q'] . '%';
        }

        $stmt = db()->prepare('
            SELECT m.*,
                   u.first_name AS user_first_name,
                   u.last_name  AS user_last_name,
                   u.email      AS user_email,
                   (SELECT COUNT(*) FROM messages r WHERE r.thread_id = m.id) AS reply_count,
                   (SELECT COUNT(*) FROM messages r WHERE r.thread_id = m.id AND r.is_read = 0 AND r.sender_role = "applicant") AS unread_replies
            FROM messages m
            JOIN users u ON u.id = m.user_id
            WHERE ' . implode(' AND ', $where) . '
            ORDER BY m.created_at DESC
        ');
        $stmt->execute($params);
        $items = $stmt->fetchAll();
        foreach ($items as &$item) {
            $item['reply_count']    = (int)$item['reply_count'];
            $item['unread_replies'] = (int)$item['unread_replies'];
        }
        return $items;
    }

    // ── Admin sends a new message to a user ───────────────
    public static function send(
        int    $userId,
        string $subject,
        string $message,
        string $senderName = 'Grant Committee',
        string $senderRole = 'system',
        ?int   $senderId   = null
    ): int {
        $pdo = db();
        $pdo->prepare('
            INSERT INTO messages (user_id, subject, message, sender, sender_role, sender_id, is_read)
            VALUES (?,?,?,?,?,?,0)
        ')->execute([$userId, $subject, $message, $senderName, $senderRole, $senderId]);

        $newId = (int)$pdo->lastInsertId();

        // Set thread_id = its own id (root message)
        $pdo->prepare('UPDATE messages SET thread_id = ? WHERE id = ?')
            ->execute([$newId, $newId]);

        return $newId;
    }

    // ── User or Admin replies in an existing thread ────────
    public static function sendReply(
        int    $userId,
        int    $threadId,
        string $subject,
        string $message,
        string $senderName,
        string $senderRole,
        ?int   $senderId = null
    ): int {
        $pdo = db();
        $pdo->prepare('
            INSERT INTO messages (user_id, thread_id, parent_id, subject, message, sender, sender_role, sender_id, is_read)
            VALUES (?,?,?,?,?,?,?,?,0)
        ')->execute([$userId, $threadId, $threadId, $subject, $message, $senderName, $senderRole, $senderId]);

        return (int)$pdo->lastInsertId();
    }

    public static function markRead(int $id, int $userId): void {
        db()->prepare('UPDATE messages SET is_read = 1 WHERE id = ? AND user_id = ?')
            ->execute([$id, $userId]);
    }

    public static function markAllRead(int $userId): void {
        db()->prepare('UPDATE messages SET is_read = 1 WHERE user_id = ?')
            ->execute([$userId]);
    }
}
