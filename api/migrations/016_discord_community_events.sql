CREATE TABLE IF NOT EXISTS discord_community_events (
  id CHAR(36) PRIMARY KEY,
  guild_id VARCHAR(24) NOT NULL,
  creator_id VARCHAR(24) NOT NULL,
  interaction_id VARCHAR(24) NOT NULL UNIQUE,
  channel_id VARCHAR(24) NOT NULL,
  message_id VARCHAR(24),
  title VARCHAR(100) NOT NULL,
  kind VARCHAR(16) NOT NULL,
  details TEXT NOT NULL,
  starts_at_ms BIGINT NOT NULL,
  ends_at_ms BIGINT NOT NULL,
  created_at_ms BIGINT NOT NULL,
  closed_at_ms BIGINT,
  capacity INT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'scheduled',
  cancel_reason VARCHAR(500),
  revision INT NOT NULL DEFAULT 1,
  published_revision INT NOT NULL DEFAULT 0,
  schedule_version INT NOT NULL DEFAULT 1,
  publish_retry_at_ms BIGINT NOT NULL DEFAULT 0,
  INDEX community_events_guild (guild_id,status,starts_at_ms),
  INDEX community_events_retention (guild_id,status,closed_at_ms)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS discord_community_participants (
  position BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  event_id CHAR(36) NOT NULL,
  user_id VARCHAR(24) NOT NULL,
  status VARCHAR(16) NOT NULL,
  joined_at_ms BIGINT NOT NULL,
  confirmed_at_ms BIGINT,
  dm_reminders BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE KEY community_participant (event_id,user_id),
  INDEX community_waitlist (event_id,status,position),
  FOREIGN KEY (event_id) REFERENCES discord_community_events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS discord_community_notifications (
  event_id CHAR(36) NOT NULL,
  schedule_version INT NOT NULL,
  kind VARCHAR(32) NOT NULL,
  user_id VARCHAR(24) NOT NULL,
  available_at_ms BIGINT NOT NULL,
  expires_at_ms BIGINT NOT NULL,
  state VARCHAR(16) NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  PRIMARY KEY (event_id,schedule_version,kind,user_id),
  INDEX community_notification_due (state,available_at_ms),
  FOREIGN KEY (event_id) REFERENCES discord_community_events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
