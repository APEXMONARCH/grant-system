<?php
// ─────────────────────────────────────────────────────────────
//  helpers/Validate.php
//  Returns an errors array. If empty → valid.
//  Usage:
//    $errors = validate($data, ['email' => 'required|email', 'name' => 'required|max:100']);
//    if (!empty($errors)) jsonError('Validation failed', 422, $errors);
// ─────────────────────────────────────────────────────────────

function validate(array $data, array $rules): array {
    $errors = [];

    foreach ($rules as $field => $ruleStr) {
        $value = $data[$field] ?? null;
        $ruleList = explode('|', $ruleStr);

        foreach ($ruleList as $rule) {
            [$ruleName, $param] = array_pad(explode(':', $rule, 2), 2, null);

            switch ($ruleName) {
                case 'required':
                    if ($value === null || $value === '') {
                        $errors[$field][] = ucfirst(str_replace('_', ' ', $field)) . ' is required.';
                    }
                    break;

                case 'email':
                    if ($value && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                        $errors[$field][] = 'Please enter a valid email address.';
                    }
                    break;

                case 'min':
                    if ($value !== null && strlen((string)$value) < (int)$param) {
                        $errors[$field][] = ucfirst(str_replace('_', ' ', $field)) . " must be at least {$param} characters.";
                    }
                    break;

                case 'max':
                    if ($value !== null && strlen((string)$value) > (int)$param) {
                        $errors[$field][] = ucfirst(str_replace('_', ' ', $field)) . " must not exceed {$param} characters.";
                    }
                    break;

                case 'numeric':
                    if ($value !== null && !is_numeric($value)) {
                        $errors[$field][] = ucfirst(str_replace('_', ' ', $field)) . ' must be a number.';
                    }
                    break;

                case 'in':
                    $allowed = explode(',', $param);
                    if ($value && !in_array($value, $allowed, true)) {
                        $errors[$field][] = ucfirst(str_replace('_', ' ', $field)) . ' is invalid.';
                    }
                    break;

                case 'unique':
                    // usage: unique:table,column
                    [$table, $col] = explode(',', $param);
                    if ($value) {
                        $pdo  = db();
                        $stmt = $pdo->prepare("SELECT id FROM `{$table}` WHERE `{$col}` = ? LIMIT 1");
                        $stmt->execute([$value]);
                        if ($stmt->fetch()) {
                            $errors[$field][] = ucfirst(str_replace('_', ' ', $field)) . ' is already taken.';
                        }
                    }
                    break;
            }

            // Stop further checks for this field once required fails
            if ($ruleName === 'required' && !empty($errors[$field])) break;
        }
    }

    return $errors;
}
