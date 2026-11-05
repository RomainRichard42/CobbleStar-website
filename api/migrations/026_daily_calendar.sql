CREATE TABLE IF NOT EXISTS daily_calendars (
  month CHAR(7) PRIMARY KEY,
  draft_json JSON NOT NULL,
  published_json JSON NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 0,
  published_revision INT UNSIGNED NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daily_publications (
  id CHAR(36) PRIMARY KEY,
  month CHAR(7) NOT NULL,
  revision INT UNSIGNED NOT NULL,
  actor_id CHAR(36) NOT NULL,
  content_json JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daily_players (
  uuid CHAR(32) PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daily_claims (
  id CHAR(36) PRIMARY KEY,
  uuid CHAR(32) NOT NULL,
  month CHAR(7) NOT NULL,
  day TINYINT UNSIGNED NOT NULL,
  claim_date CHAR(10) NOT NULL,
  server_id VARCHAR(48) NOT NULL,
  reward_json JSON NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'reserved',
  message VARCHAR(300) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dispatched_at DATETIME NULL,
  completed_at DATETIME NULL,
  delivered_date CHAR(10) NULL,
  UNIQUE KEY daily_once_per_date (uuid, claim_date),
  UNIQUE KEY daily_once_per_step (uuid, month, day),
  INDEX daily_pending (uuid, status),
  INDEX daily_month (month, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daily_catalogs (
  server_id VARCHAR(48) PRIMARY KEY,
  items_json JSON NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
