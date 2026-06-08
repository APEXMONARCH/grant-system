<?php
// ─────────────────────────────────────────────────────────────
//  models/Application.php
// ─────────────────────────────────────────────────────────────

class Application {

    // Admin: all applications with optional filters
    public static function all(array $filters = [], int $page = 1, int $limit = 20): array {
        $where  = ['1=1'];
        $params = [];

        if (!empty($filters['status'])) {
            $where[]  = 'a.status = ?';
            $params[] = $filters['status'];
        }
        if (!empty($filters['q'])) {
            $where[]  = '(u.first_name LIKE ? OR u.last_name LIKE ? OR g.title LIKE ?)';
            $params[] = '%'.$filters['q'].'%';
            $params[] = '%'.$filters['q'].'%';
            $params[] = '%'.$filters['q'].'%';
        }

        $whereStr = implode(' AND ', $where);

        $cntStmt = db()->prepare("
            SELECT COUNT(*) FROM applications a
            JOIN users  u ON u.id = a.user_id
            JOIN grants g ON g.id = a.grant_id
            WHERE {$whereStr}
        ");
        $cntStmt->execute($params);
        $total  = (int) $cntStmt->fetchColumn();
        $offset = ($page - 1) * $limit;

        $sortMap = [
            'date_desc' => 'a.submitted_at DESC',
            'date_asc'  => 'a.submitted_at ASC',
            'amount'    => 'a.requested_amount DESC',
        ];
        $sort = $sortMap[$filters['sort'] ?? ''] ?? 'a.submitted_at DESC';

        $stmt = db()->prepare("
            SELECT a.id, a.status, a.requested_amount, a.submitted_at, a.score,
                   CONCAT(u.first_name, ' ', u.last_name) AS applicant_name,
                   u.avatar AS applicant_avatar,
                   g.title AS grant_title, g.id AS grant_id
            FROM applications a
            JOIN users  u ON u.id = a.user_id
            JOIN grants g ON g.id = a.grant_id
            WHERE {$whereStr}
            ORDER BY {$sort}
            LIMIT ? OFFSET ?
        ");
        $stmt->execute(array_merge($params, [$limit, $offset]));
        return ['items' => $stmt->fetchAll(), 'total' => $total];
    }

    // Applicant: their own applications only
    public static function forUser(int $userId, array $filters = [], int $page = 1, int $limit = 15): array {
        $where  = ['a.user_id = ?'];
        $params = [$userId];

        if (!empty($filters['status'])) { $where[] = 'a.status = ?'; $params[] = $filters['status']; }
        if (!empty($filters['q']))      { $where[] = 'g.title LIKE ?'; $params[] = '%'.$filters['q'].'%'; }

        $whereStr = implode(' AND ', $where);
        $cntStmt  = db()->prepare("SELECT COUNT(*) FROM applications a JOIN grants g ON g.id = a.grant_id WHERE {$whereStr}");
        $cntStmt->execute($params);
        $total  = (int) $cntStmt->fetchColumn();
        $offset = ($page - 1) * $limit;

        $stmt = db()->prepare("
            SELECT a.id, a.status, a.requested_amount, a.submitted_at, a.research_title,
                   g.title AS grant_title
            FROM applications a
            JOIN grants g ON g.id = a.grant_id
            WHERE {$whereStr}
            ORDER BY a.submitted_at DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->execute(array_merge($params, [$limit, $offset]));
        return ['items' => $stmt->fetchAll(), 'total' => $total];
    }

    public static function findById(int $id): ?array {
        $stmt = db()->prepare('
            SELECT a.*,
                   CONCAT(u.first_name, " ", u.last_name) AS applicant_name,
                   u.avatar AS applicant_avatar, u.email AS applicant_email,
                   g.title AS grant_title
            FROM applications a
            JOIN users  u ON u.id = a.user_id
            JOIN grants g ON g.id = a.grant_id
            WHERE a.id = ? LIMIT 1
        ');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) return null;

        // Decode JSON fields
        if ($row['budget_items']) $row['budget_items'] = json_decode($row['budget_items'], true);

        // Attach documents
        $docStmt = db()->prepare('SELECT id AS file_id, label, file_name, mime_type FROM application_documents WHERE application_id = ?');
        $docStmt->execute([$id]);
        $row['documents'] = $docStmt->fetchAll();

        return $row;
    }

    public static function create(array $data, int $userId): int {
        $pdo  = db();
        $stmt = $pdo->prepare('
            INSERT INTO applications
              (grant_id, user_id, full_name, staff_id, institution, faculty, academic_rank,
               email, phone, research_title, research_area, research_category,
               research_duration, objectives, methodology, research_problem,
               research_outcomes, research_location, proposed_start_date, proposed_end_date,
               requested_amount, impact_beneficiaries, impact_societal, impact_academic,
               impact_innovation, impact_risk, budget_items, digital_signature,
               declaration_date, status)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ');
        $stmt->execute([
            $data['grant_id'],        $userId,
            $data['full_name']        ?? null,
            $data['staff_id']         ?? null,
            $data['institution']      ?? null,
            $data['faculty']          ?? null,
            $data['academic_rank']    ?? null,
            $data['email']            ?? null,
            $data['phone']            ?? null,
            $data['research_title']   ?? null,
            $data['research_area']    ?? null,
            $data['research_category']?? null,
            $data['research_duration']?? null,
            $data['objectives']       ?? null,
            $data['methodology']      ?? null,
            $data['research_problem'] ?? null,
            $data['research_outcomes']?? null,
            $data['research_location']?? null,
            $data['proposed_start_date'] ?? null,
            $data['proposed_end_date']   ?? null,
            $data['requested_amount'] ?? 0,
            $data['impact_beneficiaries'] ?? null,
            $data['impact_societal']  ?? null,
            $data['impact_academic']  ?? null,
            $data['impact_innovation']?? null,
            $data['impact_risk']      ?? null,
            json_encode($data['budget_items'] ?? []),
            $data['digital_signature']?? null,
            $data['declaration_date'] ?? null,
            'submitted',
        ]);
        return (int) $pdo->lastInsertId();
    }

    public static function saveDocument(int $appId, string $label, array $fileInfo): void {
        db()->prepare('
            INSERT INTO application_documents
              (application_id, label, file_name, file_path, file_size, mime_type)
            VALUES (?,?,?,?,?,?)
        ')->execute([
            $appId, $label,
            $fileInfo['file_name'],
            $fileInfo['file_path'],
            $fileInfo['file_size'],
            $fileInfo['mime_type'],
        ]);
    }

    public static function updateStatus(int $id, string $status, ?string $reason, int $reviewerId): void {
        db()->prepare('
            UPDATE applications
            SET status = ?, reviewer_notes = ?, reviewed_by = ?, reviewed_at = NOW()
            WHERE id = ?
        ')->execute([$status, $reason, $reviewerId, $id]);
    }

    public static function countByStatus(): array {
        $stmt = db()->query('SELECT status, COUNT(*) AS cnt FROM applications GROUP BY status');
        $result = [];
        foreach ($stmt->fetchAll() as $row) $result[$row['status']] = (int)$row['cnt'];
        return $result;
    }
}
