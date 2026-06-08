<?php
// ─────────────────────────────────────────────────────────────
//  models/Message.php
// ─────────────────────────────────────────────────────────────

class Message {

    public static function forUser(int $userId, array $filters = []): array {
        $where  = ['m.user_id = ?'];
        $params = [$userId];

        if (!empty($filters['filter'])) {
            if ($filters['filter'] === 'unread') { $where[] = 'm.is_read = 0'; }
            if ($filters['filter'] === 'read')   { $where[] = 'm.is_read = 1'; }
        }
        if (!empty($filters['q'])) {
            $where[]  = '(m.subject LIKE ? OR m.message LIKE ? OR m.sender LIKE ?)';
            $params[] = '%'.$filters['q'].'%';
            $params[] = '%'.$filters['q'].'%';
            $params[] = '%'.$filters['q'].'%';
        }

        $stmt = db()->prepare('
            SELECT * FROM messages
            WHERE ' . implode(' AND ', $where) . '
            ORDER BY created_at DESC
        ');
        $stmt->execute($params);
        $items = $stmt->fetchAll();
        foreach ($items as &$item) $item['read'] = (bool)$item['is_read'];
        return $items;
    }

    public static function send(int $userId, string $subject, string $message, string $sender = 'Grant Committee'): void {
        db()->prepare('
            INSERT INTO messages (user_id, subject, message, sender) VALUES (?,?,?,?)
        ')->execute([$userId, $subject, $message, $sender]);
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
