CREATE TABLE IF NOT EXISTS paid_subscriptions (
  user_id CHAR(36) PRIMARY KEY,
  tier VARCHAR(16) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT paid_subscriptions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS paid_subscription_gifts (
  user_id CHAR(36) NOT NULL,
  tier VARCHAR(16) NOT NULL,
  purchase_id CHAR(36) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  lease_token_hash CHAR(64) NULL,
  lease_expires_at DATETIME NULL,
  delivered_at DATETIME NULL,
  PRIMARY KEY (user_id,tier),
  CONSTRAINT paid_gifts_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT paid_gifts_purchase_fk FOREIGN KEY (purchase_id) REFERENCES shop_purchases(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
