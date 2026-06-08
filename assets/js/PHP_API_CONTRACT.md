# PHP Backend API Contract
## Grant Management System

This document defines every endpoint the frontend expects.
All responses use the envelope: `{ "success": true/false, "data": {}, "message": "..." }`
Errors add: `"errors": { "field_name": ["validation message"] }`

---

## SETUP

### htaccess (place in /api/.htaccess)
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^(.*)$ index.php [QSA,L]
```

### Auth Middleware (check on every protected route)
```php
function requireAuth(): array {
    $token = getBearerToken();
    if (!$token) jsonError('Unauthorised', 401);
    $payload = JWT::decode($token, JWT_SECRET);
    if (!$payload) jsonError('Invalid token', 401);
    return $payload; // { id, email, role, name }
}

function getBearerToken(): ?string {
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s(\S+)/', $h, $m)) return $m[1];
    return null;
}
```

### Response helpers
```php
function jsonSuccess($data = [], string $message = 'OK', int $code = 200): void {
    http_response_code($code);
    echo json_encode(['success' => true, 'data' => $data, 'message' => $message]);
    exit;
}
function jsonError(string $message, int $code = 400, array $errors = []): void {
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message, 'errors' => $errors]);
    exit;
}
```

---

## AUTH ENDPOINTS

### POST /api/auth/login
No auth required.
```json
// Request
{ "email": "admin@example.com", "password": "secret" }

// Response 200
{
  "success": true,
  "data": {
    "token": "eyJhbGci...",
    "user": { "id": 1, "first_name": "Admin", "last_name": "User", "email": "admin@example.com",
               "role": "admin", "avatar": null }
  }
}
// Error 401 → { "success": false, "message": "Invalid email or password." }
```

### POST /api/auth/register
```json
// Request
{ "first_name": "John", "last_name": "Doe", "email": "john@x.com",
  "password": "secret", "organization": "Acme" }

// Response 201 — same shape as login
// Error 422 → { "errors": { "email": ["Email already taken."] } }
```

### POST /api/auth/logout
Bearer token required. Invalidate token server-side if using a blocklist.
```json
// Response 200
{ "success": true, "message": "Logged out successfully." }
```

---

## DASHBOARD

### GET /api/dashboard/summary   [admin]
```json
{
  "data": {
    "total_funds": 500000,
    "allocated_funds": 540000,
    "remaining_funds": 76000,
    "funds_trend": 12.5,
    "allocated_trend": 8.2,
    "remaining_trend": -5.3,
    "chart": {
      "labels": ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"],
      "allocated": [80000, 95000, 110000, 130000, 150000, 175000],
      "available":  [70000, 85000, 100000, 120000, 140000, 160000],
      "disbursed":  [60000, 75000,  90000, 105000, 125000, 145000]
    }
  }
}
```

### GET /api/dashboard/user-summary   [applicant]
```json
{
  "data": {
    "total_applications": 4,
    "approved": 1,
    "under_review": 2,
    "open_grants": 6,
    "recent_applications": [ /* array of application objects – see Applications */ ]
  }
}
```

---

## GRANTS

### GET /api/grants
Query params: `status`, `category`, `date`, `q`, `page` (default 1), `limit` (default 10)
```json
{
  "data": {
    "items": [{
      "id": 1,
      "title": "SME Business Grant",
      "description": "Supports small businesses...",
      "category": "Business",
      "budget": 260000,
      "max_per_applicant": 50000,
      "min_per_applicant": 5000,
      "applicants_count": 100,
      "status": "active",
      "application_deadline": "2025-06-30",
      "created_at": "2024-01-15T10:00:00Z"
    }],
    "total": 42,
    "page": 1,
    "pages": 5
  }
}
```

### POST /api/grants   [admin]
```json
// Request body (JSON)
{
  "title": "New Grant", "description": "...", "category": "research",
  "eligibility_location": "Nigeria", "total_budget": 500000,
  "max_per_applicant": 50000, "min_per_applicant": 5000,
  "application_deadline": "2025-06-30", "review_period": "2025-07-15",
  "disbursement_date": "2025-08-01", "announcement_date": "2025-05-01",
  "requirements": ["registered_business", "financial_statements"],
  "status": "active"
}
// Response 201 → { "data": { "id": 7, ...grant } }
```

### GET /api/grants/{id}
Returns single grant object (same shape as list item, full fields).

### PUT /api/grants/{id}   [admin]
Same body as POST. Response 200 → updated grant.

### DELETE /api/grants/{id}   [admin]
Response 200 → `{ "message": "Grant deleted." }`

---

## APPLICATIONS

### GET /api/applications   [admin]
Query: `status` (submitted|under-review|approved|rejected), `q`, `page`, `limit`, `sort`
```json
{
  "data": {
    "items": [{
      "id": 1, "applicant_name": "Dr. Jane Smith",
      "applicant_avatar": null, "grant_title": "Research Grant",
      "grant_id": 3, "requested_amount": 45000,
      "submitted_at": "2025-03-15T09:00:00Z",
      "score": 78, "status": "submitted"
    }],
    "total": 24
  }
}
```

### GET /api/applications/my   [applicant]
Same shape, filtered to current user's applications.

### GET /api/applications/{id}   [admin or owner]
Returns full detail:
```json
{
  "data": {
    "id": 1, "applicant_name": "Dr. Jane Smith", "staff_id": "ST-0042",
    "institution": "Unilag", "faculty": "Engineering", "academic_rank": "Senior Lecturer",
    "email": "jane@uni.edu", "phone": "+234 800 0000000",
    "grant_title": "Research Grant", "requested_amount": 45000,
    "research_title": "AI in Healthcare", "research_area": "Computer Science",
    "research_category": "Applied Research", "research_duration": 12,
    "objectives": "...", "methodology": "...",
    "impact_beneficiaries": "...", "impact_societal": "...",
    "impact_academic": "...", "impact_innovation": "...", "impact_risk": "...",
    "budget_items": [
      { "item": "Equipment", "description": "Laptops", "cost": 15000 },
      { "item": "Travel",    "description": "Conference fees", "cost": 5000 }
    ],
    "documents": [
      { "label": "Research Proposal PDF", "file_name": "proposal.pdf", "file_id": "abc123" },
      { "label": "Curriculum Vitae (CV)", "file_name": "cv.pdf",       "file_id": "def456" }
    ],
    "status": "submitted", "reviewer_notes": null,
    "submitted_at": "2025-03-15T09:00:00Z"
  }
}
```

### POST /api/applications   [applicant]
**multipart/form-data** (files + text fields)
```
Fields: grant_id, full_name, staff_id, institution, faculty, academic_rank, email, phone,
        research_title, research_area, research_category, research_duration, objectives, methodology,
        impact_beneficiaries, impact_societal, impact_academic, impact_innovation, impact_risk,
        budget_items (JSON string), digital_signature, declaration_date
Files:  uploadProposal, uploadCv, uploadPublications, uploadApprovalLetter,
        uploadPreviousEvidence (optional), uploadSupportingDocs (optional)

Response 201 → { "data": { "id": 7 }, "message": "Application submitted." }
```

### PATCH /api/applications/{id}/status   [admin]
```json
// Request
{ "status": "approved", "reason": "Strong proposal with clear outcomes." }
// Response 200 → { "message": "Status updated." }
```

### GET /api/applications/{id}/download   [admin]
Returns the bundled application as a PDF (file stream with Content-Disposition: attachment).

---

## BENEFICIARIES

### GET /api/beneficiaries   [admin]
Query: `page`, `limit`
```json
{
  "data": {
    "items": [{
      "id": 1, "name": "John Doe", "email": "john@x.com",
      "grant_title": "SME Grant", "amount": 25000,
      "status": "paid", "date": "2025-02-10T00:00:00Z"
    }],
    "total": 156,
    "total_disbursed": 1245000,
    "pending_payments": 5
  }
}
```

### GET /api/beneficiaries/stats   [admin]
```json
{
  "data": {
    "by_category": [
      { "label": "Business", "value": 450000 },
      { "label": "Research", "value": 320000 }
    ],
    "approval_rate": {
      "labels": ["Business", "Research", "Education", "Community"],
      "approved": [45, 30, 22, 18],
      "rejected": [12, 8, 5, 7]
    }
  }
}
```

### GET /api/beneficiaries/export   [admin]
Returns CSV file stream. Use `?token=` query param for download links.

---

## REPORTS

### GET /api/reports/summary   [admin]
Query: `dateRange`, `grantType`, `status`
```json
{ "data": { "total_funds": 1505000, "total_disbursed": 1245000,
            "beneficiaries": 156, "approval_rate": 78.5,
            "avg_grant_size": 35500, "avg_processing_time": 14,
            "success_rate": 82, "total_applications": 214 } }
```

### GET /api/reports/funds-distribution   [admin]
Query: `dateRange`
```json
{ "data": { "labels": ["Nov","Dec","Jan","Feb","Mar","Apr"],
            "disbursed": [120000,135000,148000,162000,178000,195000],
            "allocated": [130000,145000,158000,172000,188000,205000] } }
```

### GET /api/reports/allocation   [admin]
Query: `dateRange`, `grantType`
Returns array of `{ label, value }`.

### GET /api/reports/approval-rate   [admin]
Query: `dateRange`
Returns `{ labels, rates }`.

### GET /api/reports/top-grants   [admin]
Query: `dateRange`, `limit`
Returns array of `{ title, disbursed, applicants }`.

### GET /api/reports/export   [admin]
Query: `dateRange`, `grantType`, `status`. Returns PDF stream.

---

## NOTIFICATIONS

### GET /api/notifications   [any auth]
```json
{ "data": { "unread_count": 3,
            "items": [{ "id": 1, "title": "Application Approved",
                        "message": "Your SME application was approved.",
                        "read": false, "created_at": "2025-03-20T..." }] } }
```

### PATCH /api/notifications/{id}/read
Response 200 → `{ "message": "Marked as read." }`

### POST /api/notifications/read-all
Response 200 → `{ "message": "All marked as read." }`

---

## USERS (Settings)

### GET /api/users   [admin]
```json
{ "data": { "items": [{ "id":1, "name":"Admin User", "email":"admin@x.com",
                         "role":"admin", "status":"active" }] } }
```

### POST /api/users   [admin]
```json
{ "name": "New User", "email": "new@x.com", "password": "temp123",
  "role": "reviewer", "status": "active" }
```

### PUT /api/users/{id}   [admin]
Same fields (password optional on update).

### DELETE /api/users/{id}   [admin]

---

## ROLES

### GET /api/roles   [admin]
```json
{ "data": [{ "id":1, "name":"Admin", "icon":"shield-alt", "users_count": 2,
              "permissions": ["Manage grants","Approve applications","Manage users"] }] }
```

---

## SETTINGS

### GET /api/settings/notifications   [any auth]
```json
{ "data": { "emailNotifications": true, "systemAlerts": true,
            "newApplications": true, "statusUpdates": true,
            "deadlineReminders": true, "weeklyReports": false } }
```

### PUT /api/settings/notifications   [any auth]
Same keys as GET. Response 200.

---

## PROFILE

### GET /api/profile   [any auth]
```json
{ "data": { "id":5, "first_name":"Jane", "last_name":"Smith",
            "email":"jane@uni.edu", "phone":"+234...", "avatar": null,
            "institution":"Unilag", "faculty":"Engineering",
            "academic_rank":"Senior Lecturer", "staff_id":"ST-0042",
            "organization":null, "created_at":"2024-01-10T..." } }
```

### PUT /api/profile   [any auth]
Fields: `first_name`, `last_name`, `phone`, `institution`, `faculty`, `academic_rank`, `staff_id`, `organization`

---

## MESSAGES

### GET /api/messages   [applicant]
Query: `filter` (all|read|unread), `q`
```json
{ "data": { "items": [{ "id":1, "subject":"Application Update",
                         "message": "Your application has been moved to review.",
                         "sender": "Grant Committee", "read": false,
                         "created_at": "2025-03-18T..." }] } }
```

### PATCH /api/messages/{id}/read
Response 200.

### POST /api/messages/read-all
Response 200.

---

## FILE UPLOADS (for document viewing)

### GET /api/uploads/{file_id}
Query: `token` (JWT for download links)
Returns the file stream with correct Content-Type and Content-Disposition.

---

## JWT Configuration (PHP example using firebase/php-jwt)
```php
define('JWT_SECRET', 'your-strong-secret-key-here');
define('JWT_EXPIRY', 60 * 60 * 24); // 24 hours

// Create token
$payload = [
    'iat'  => time(),
    'exp'  => time() + JWT_EXPIRY,
    'id'   => $user['id'],
    'email'=> $user['email'],
    'role' => $user['role'],
    'name' => $user['first_name'] . ' ' . $user['last_name'],
];
$token = JWT::encode($payload, JWT_SECRET, 'HS256');
```

## CORS Headers (add to index.php for cross-origin requests)
```php
header('Access-Control-Allow-Origin: *'); // or specific origin
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
```
