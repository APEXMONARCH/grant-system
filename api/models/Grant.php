<?php
// ─────────────────────────────────────────────────────────────
//  models/Grant.php
// ─────────────────────────────────────────────────────────────

class Grant {

    public static function all(array $filters = [], int $page = 1, int $limit = 10): array {
        $where  = ['1=1'];
        $params = [];

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $where[]  = 'g.status = ?';
            $params[] = $filters['status'];
        }
        if (!empty($filters['category']) && $filters['category'] !== 'all') {
            $where[]  = 'g.category = ?';
            $params[] = $filters['category'];
        }
        if (!empty($filters['q'])) {
            $where[]  = 'g.title LIKE ?';
            $params[] = '%' . $filters['q'] . '%';
        }
        if (!empty($filters['date']) && $filters['date'] !== 'all') {
            $dateFilter = self::dateFilter($filters['date']);
            if ($dateFilter) {
                $where[]  = 'g.created_at >= ?';
                $params[] = $dateFilter;
            }
        }

        $whereStr = implode(' AND ', $where);
        $offset   = ($page - 1) * $limit;

        $total = (int) db()->prepare("SELECT COUNT(*) FROM grants g WHERE {$whereStr}")
            ->execute($params) && ($cnt = db()->prepare("SELECT COUNT(*) FROM grants g WHERE {$whereStr}"))
            ? (function() use ($whereStr, $params) {
                $s = db()->prepare("SELECT COUNT(*) FROM grants g WHERE {$whereStr}");
                $s->execute($params);
                return (int)$s->fetchColumn();
            })()
            : 0;

        // Clean re-query for total
        $cntStmt = db()->prepare("SELECT COUNT(*) FROM grants g WHERE {$whereStr}");
        $cntStmt->execute($params);
        $total = (int) $cntStmt->fetchColumn();

        $stmt = db()->prepare("
            SELECT g.*,
                   (SELECT COUNT(*) FROM applications a WHERE a.grant_id = g.id) AS applicants_count
            FROM grants g
            WHERE {$whereStr}
            ORDER BY g.created_at DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->execute(array_merge($params, [$limit, $offset]));

        return ['items' => $stmt->fetchAll(), 'total' => $total];
    }

    public static function findById(int $id): ?array {
        $stmt = db()->prepare('
            SELECT g.*,
                   (SELECT COUNT(*) FROM applications a WHERE a.grant_id = g.id) AS applicants_count
            FROM grants g WHERE g.id = ? LIMIT 1
        ');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) return null;
        if ($row['requirements']) $row['requirements'] = json_decode($row['requirements'], true);
        return $row;
    }

    public static function create(array $data, int $createdBy): int {
        $pdo  = db();
        $stmt = $pdo->prepare('
            INSERT INTO grants
              (title, description, category, total_budget, max_per_applicant, min_per_applicant,
               eligibility_location, requirements, application_deadline, review_period,
               disbursement_date, announcement_date, status, created_by)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ');
        $stmt->execute([
            $data['title'],
            $data['description']          ?? null,
            $data['category']             ?? null,
            $data['total_budget']         ?? null,
            $data['max_per_applicant']    ?? null,
            $data['min_per_applicant']    ?? null,
            $data['eligibility_location'] ?? null,
            json_encode($data['requirements'] ?? []),
            $data['application_deadline'] ?? null,
            $data['review_period']        ?? null,
            $data['disbursement_date']    ?? null,
            $data['announcement_date']    ?? null,
            $data['status']               ?? 'draft',
            $createdBy,
        ]);
        return (int) $pdo->lastInsertId();
    }

    public static function update(int $id, array $data): void {
        $allowed = ['title','description','category','total_budget','max_per_applicant',
                    'min_per_applicant','eligibility_location','requirements',
                    'application_deadline','review_period','disbursement_date',
                    'announcement_date','status'];
        $sets = []; $values = [];
        foreach ($allowed as $col) {
            if (array_key_exists($col, $data)) {
                $sets[]   = "`{$col}` = ?";
                $values[] = $col === 'requirements' ? json_encode($data[$col]) : $data[$col];
            }
        }
        if (empty($sets)) return;
        $values[] = $id;
        db()->prepare('UPDATE grants SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($values);
    }

    public static function delete(int $id): void {
        db()->prepare('DELETE FROM grants WHERE id = ?')->execute([$id]);
    }

    private static function dateFilter(string $range): ?string {
        return match($range) {
            'today'   => date('Y-m-d 00:00:00'),
            'week'    => date('Y-m-d', strtotime('-7 days')),
            'month'   => date('Y-m-01'),
            'quarter' => date('Y-m-d', strtotime('-90 days')),
            'year'    => date('Y-01-01'),
            default   => null,
        };
    }
}
