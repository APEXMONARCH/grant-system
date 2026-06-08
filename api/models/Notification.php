<?php
// ─────────────────────────────────────────────────────────────
//  models/Notification.php
// ─────────────────────────────────────────────────────────────

class Notification {

    public static function forUser(int $userId): array {
        $stmt = db()->prepare('
            SELECT * FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 30
        ');
        $stmt->execute([$userId]);
        $items = $stmt->fetchAll();
        foreach ($items as &$item) $item['read'] = (bool)$item['is_read'];
        return $items;
    }

    public static function unreadCount(int $userId): int {
        $stmt = db()->prepare('SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0');
        $stmt->execute([$userId]);
        return (int) $stmt->fetchColumn();
    }

    public static function create(int $userId, string $title, string $message): void {
        db()->prepare('
            INSERT INTO notifications (user_id, title, message) VALUES (?,?,?)
        ')->execute([$userId, $title, $message]);
    }

    public static function markRead(int $id, int $userId): void {
        db()->prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?')
            ->execute([$id, $userId]);
    }

    public static function markAllRead(int $userId): void {
        db()->prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?')
            ->execute([$userId]);
    }
}
