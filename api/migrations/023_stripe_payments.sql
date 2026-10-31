CREATE TABLE IF NOT EXISTS stripe_checkouts (
  order_id CHAR(36) PRIMARY KEY,
  request_id CHAR(36) NOT NULL UNIQUE,
  pack_id VARCHAR(32) NOT NULL,
  minecraft_uuid CHAR(32) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'eur',
  payment_mode VARCHAR(8) NOT NULL,
  checkout_url TEXT NULL,
  payment_intent_id VARCHAR(128) NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  CONSTRAINT stripe_checkout_order_fk FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id VARCHAR(128) PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  event_type VARCHAR(80) NOT NULL,
  processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT stripe_event_order_fk FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
  INDEX stripe_events_order_idx (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
