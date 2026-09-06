CREATE TABLE IF NOT EXISTS quest_studio (
  server_id VARCHAR(48) NOT NULL PRIMARY KEY,
  draft_json JSON NULL,
  draft_revision INT UNSIGNED NOT NULL DEFAULT 0,
  published_json JSON NULL,
  published_revision INT UNSIGNED NOT NULL DEFAULT 0,
  observed_json JSON NULL,
  placements_json JSON NULL,
  applied_revision INT UNSIGNED NOT NULL DEFAULT 0,
  sync_error VARCHAR(500) NOT NULL DEFAULT '',
  last_seen_at DATETIME(3) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quest_publications (
  server_id VARCHAR(48) NOT NULL,
  revision INT UNSIGNED NOT NULL,
  content_json JSON NOT NULL,
  actor_discord_id VARCHAR(32) NOT NULL,
  reason VARCHAR(300) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (server_id, revision)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
