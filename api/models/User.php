<?php
// ─────────────────────────────────────────────────────────────
//  models/User.php
// ─────────────────────────────────────────────────────────────

class User {

    public static function findByEmail(string $email): ?array {
        $stmt = db()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        return $stmt->fetch() ?: null;
    }

    public static function findById(int $id): ?array {
        $stmt = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public static function create(array $data): int {
        $pdo  = db();
        $stmt = $pdo->prepare('
            INSERT INTO users
              (first_name, last_name, email, password, role, organization, institution,
               faculty, academic_rank, staff_id, phone, status)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        ');
        $stmt->execute([
            $data['first_name']   ?? '',
            $data['last_name']    ?? '',
            $data['email'],
            password_hash($data['password'], PASSWORD_BCRYPT),
            $data['role']         ?? 'applicant',
            $data['organization'] ?? null,
            $data['institution']  ?? null,
            $data['faculty']      ?? null,
            $data['academic_rank']?? null,
            $data['staff_id']     ?? null,
            $data['phone']        ?? null,
            'active',
        ]);
        return (int) $pdo->lastInsertId();
    }

    public static function update(int $id, array $data): void {
        $allowed = ['first_name','last_name','phone','institution','faculty',
                    'academic_rank','staff_id','organization','avatar',
                    'email_notifications','application_alerts','deadline_reminders','reviewer_feedback'];

        $sets   = [];
        $values = [];
        foreach ($allowed as $col) {
            if (array_key_exists($col, $data)) {
                $sets[]   = "`{$col}` = ?";
                $values[] = $data[$col];
            }
        }
        if (empty($sets)) return;

        $values[] = $id;
        db()->prepare('UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = ?')
            ->execute($values);
    }

    public static function updatePassword(int $id, string $newPassword): void {
        db()->prepare('UPDATE users SET password = ? WHERE id = ?')
            ->execute([password_hash($newPassword, PASSWORD_BCRYPT), $id]);
    }

    public static function all(int $page = 1, int $limit = 50): array {
        $offset = ($page - 1) * $limit;
        $stmt   = db()->prepare(
            'SELECT id, first_name, last_name, email, role, status, created_at
             FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?'
        );
        $stmt->execute([$limit, $offset]);
        return $stmt->fetchAll();
    }

    public static function count(): int {
        return (int) db()->query('SELECT COUNT(*) FROM users')->fetchColumn();
    }

    public static function delete(int $id): void {
        db()->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
    }

    // Strip password before sending to client
    public static function safe(array $user): array {
        unset($user['password']);
        return $user;
    }

    // Build JWT payload
    public static function tokenPayload(array $user): array {
        return [
            'id'         => (int) $user['id'],
            'email'      => $user['email'],
            'role'       => $user['role'],
            'first_name' => $user['first_name'],
            'last_name'  => $user['last_name'],
            'iat'        => time(),
            'exp'        => time() + JWT_EXPIRY,
        ];
    }
}
