<?php
// ─────────────────────────────────────────────────────────────
//  helpers/Upload.php
//  Handles multipart file uploads for application documents.
// ─────────────────────────────────────────────────────────────

function uploadFile(array $file, string $subfolder = ''): array {
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new RuntimeException(uploadErrorMessage($file['error']));
    }

    if ($file['size'] > MAX_FILE_SIZE) {
        throw new RuntimeException('File exceeds maximum allowed size of 10MB.');
    }

    // Validate MIME type using finfo (not just the extension)
    $finfo    = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($file['tmp_name']);
    if (!in_array($mimeType, ALLOWED_MIME_TYPES, true)) {
        throw new RuntimeException('File type not allowed. Please upload PDF, DOC, DOCX, JPG, or PNG.');
    }

    // Build safe file path
    $ext      = pathinfo($file['name'], PATHINFO_EXTENSION);
    $fileId   = uniqid('doc_', true) . '.' . strtolower($ext);
    $dir      = rtrim(UPLOAD_DIR, '/') . '/' . trim($subfolder, '/');

    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }

    $fullPath = $dir . '/' . $fileId;

    if (!move_uploaded_file($file['tmp_name'], $fullPath)) {
        throw new RuntimeException('Failed to save uploaded file.');
    }

    return [
        'file_id'   => $fileId,
        'file_name' => $file['name'],
        'file_path' => $fullPath,
        'file_size' => $file['size'],
        'mime_type' => $mimeType,
    ];
}

function uploadErrorMessage(int $code): string {
    return match($code) {
        UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'File is too large.',
        UPLOAD_ERR_PARTIAL   => 'File upload was interrupted.',
        UPLOAD_ERR_NO_FILE   => 'No file was uploaded.',
        UPLOAD_ERR_NO_TMP_DIR=> 'Server upload directory is missing.',
        UPLOAD_ERR_CANT_WRITE=> 'Failed to write file to disk.',
        default              => 'Unknown upload error.',
    };
}
