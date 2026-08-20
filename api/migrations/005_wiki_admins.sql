CREATE TABLE IF NOT EXISTS wiki_admins (
  email VARCHAR(254) PRIMARY KEY,
  added_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT wiki_admins_user_fk FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO wiki_admins(email, added_by) VALUES('romain.richard42400@gmail.com', NULL);
