CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  email_verified_at DATETIME NULL,
  minecraft_username VARCHAR(16) NULL,
  minecraft_uuid CHAR(32) NULL UNIQUE,
  minecraft_linked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX sessions_user_idx (user_id),
  INDEX sessions_expiry_idx (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS link_codes (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  code_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT link_codes_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX link_codes_user_idx (user_id),
  INDEX link_codes_expiry_idx (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wallets (
  user_id CHAR(36) PRIMARY KEY,
  balance BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT wallets_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS star_transactions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  delta BIGINT NOT NULL,
  kind VARCHAR(32) NOT NULL,
  reference_id VARCHAR(128) NOT NULL UNIQUE,
  metadata_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT star_transactions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX star_transactions_user_idx (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  provider VARCHAR(32) NOT NULL,
  provider_reference VARCHAR(128) NOT NULL UNIQUE,
  amount_cents INT UNSIGNED NOT NULL,
  stars_amount INT UNSIGNED NOT NULL,
  status VARCHAR(24) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME NULL,
  CONSTRAINT orders_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX orders_user_idx (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vote_claims (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  vote_site VARCHAR(64) NOT NULL,
  external_reference VARCHAR(128) NOT NULL UNIQUE,
  reward_status VARCHAR(24) NOT NULL DEFAULT 'pending',
  voted_at DATETIME NOT NULL,
  delivered_at DATETIME NULL,
  CONSTRAINT vote_claims_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX vote_claims_user_idx (user_id, voted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
