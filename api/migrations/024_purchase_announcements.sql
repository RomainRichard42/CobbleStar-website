CREATE TABLE IF NOT EXISTS purchase_announcements (
  order_id CHAR(36) PRIMARY KEY,
  server_id VARCHAR(48) NOT NULL DEFAULT 'main',
  minecraft_uuid CHAR(32) NOT NULL,
  minecraft_username VARCHAR(16) NULL,
  stars_amount INT UNSIGNED NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  lease_token_hash CHAR(64) NULL,
  lease_expires_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  delivered_at DATETIME NULL,
  CONSTRAINT purchase_announcement_order_fk FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
  INDEX purchase_announcements_claim_idx (server_id,status,created_at),
  INDEX purchase_announcements_lease_idx (status,lease_expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
