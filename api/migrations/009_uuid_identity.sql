ALTER TABLE users
  ADD COLUMN discord_email VARCHAR(254) NULL,
  ADD COLUMN merged_into CHAR(36) NULL;

ALTER TABLE sessions ADD COLUMN discord_id VARCHAR(32) NULL;

UPDATE sessions s JOIN users u ON u.id=s.user_id SET s.discord_id=u.discord_id;

ALTER TABLE link_codes
  ADD COLUMN issuer_discord_id VARCHAR(32) NULL,
  ADD COLUMN session_token_hash CHAR(64) NULL,
  ADD COLUMN allow_relink BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN completed_at DATETIME NULL,
  ADD COLUMN result_uuid CHAR(32) NULL;

UPDATE link_codes SET used_at=UTC_TIMESTAMP() WHERE used_at IS NULL;

CREATE TABLE account_link_events (
  id CHAR(36) PRIMARY KEY,
  code_id CHAR(36) NOT NULL UNIQUE,
  source_user_id CHAR(36) NOT NULL,
  target_user_id CHAR(36) NOT NULL,
  minecraft_uuid CHAR(32) NOT NULL,
  discord_id VARCHAR(32) NOT NULL,
  previous_discord_id VARCHAR(32) NULL,
  previous_minecraft_uuid CHAR(32) NULL,
  merged_stars BIGINT UNSIGNED NOT NULL DEFAULT 0,
  merged_records_json JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX account_links_uuid (minecraft_uuid, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
