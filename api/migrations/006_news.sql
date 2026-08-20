CREATE TABLE IF NOT EXISTS news_documents (
  slot ENUM('draft','published') PRIMARY KEY,
  content_json JSON NOT NULL,
  version INT NOT NULL DEFAULT 1,
  updated_by CHAR(36) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT news_documents_user_fk FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
