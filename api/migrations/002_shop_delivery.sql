CREATE TABLE IF NOT EXISTS shop_purchases (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  product_id VARCHAR(64) NOT NULL,
  stars_spent INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT shop_purchases_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX shop_purchases_user_idx (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reward_deliveries (
  id CHAR(36) PRIMARY KEY,
  purchase_id CHAR(36) NOT NULL UNIQUE,
  user_id CHAR(36) NOT NULL,
  product_id VARCHAR(64) NOT NULL,
  item_id VARCHAR(128) NOT NULL,
  item_count INT UNSIGNED NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'pending',
  lease_token_hash CHAR(64) NULL,
  lease_expires_at DATETIME NULL,
  failure_count INT UNSIGNED NOT NULL DEFAULT 0,
  last_error VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  delivered_at DATETIME NULL,
  CONSTRAINT reward_deliveries_purchase_fk FOREIGN KEY (purchase_id) REFERENCES shop_purchases(id) ON DELETE RESTRICT,
  CONSTRAINT reward_deliveries_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX reward_deliveries_claim_idx (user_id, status, created_at),
  INDEX reward_deliveries_lease_idx (status, lease_expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
