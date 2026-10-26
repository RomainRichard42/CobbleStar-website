CREATE TABLE IF NOT EXISTS discord_admin_audit (
  id CHAR(36) PRIMARY KEY,
  guild_id VARCHAR(24) NOT NULL,
  actor_discord_id VARCHAR(24) NOT NULL,
  action VARCHAR(32) NOT NULL,
  reason VARCHAR(300) NOT NULL,
  payload JSON NOT NULL,
  status VARCHAR(16) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  INDEX discord_admin_history (guild_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
