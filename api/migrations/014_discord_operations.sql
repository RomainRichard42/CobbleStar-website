CREATE TABLE IF NOT EXISTS discord_settings (
  guild_id VARCHAR(24) PRIMARY KEY,
  settings JSON NOT NULL
);
CREATE TABLE IF NOT EXISTS discord_tickets (
  id CHAR(36) PRIMARY KEY,
  guild_id VARCHAR(24) NOT NULL,
  owner_id VARCHAR(24) NOT NULL,
  channel_id VARCHAR(24) UNIQUE,
  subject VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'reception',
  claimed_by VARCHAR(24),
  members JSON NOT NULL,
  close_token CHAR(36),
  close_expires DATETIME,
  close_reason TEXT,
  archive_message VARCHAR(24),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME,
  INDEX ticket_owner (guild_id, owner_id, status)
);
CREATE TABLE IF NOT EXISTS discord_message_cache (
  message_id VARCHAR(24) PRIMARY KEY,
  guild_id VARCHAR(24) NOT NULL,
  channel_id VARCHAR(24) NOT NULL,
  author_id VARCHAR(24) NOT NULL,
  content MEDIUMTEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX discord_message_age (updated_at)
);
CREATE TABLE IF NOT EXISTS discord_event_outbox (
  id VARCHAR(160) PRIMARY KEY,
  kind VARCHAR(24) NOT NULL,
  body JSON NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  available_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  delivered_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX discord_outbox_pending (delivered_at, available_at)
);
CREATE TABLE IF NOT EXISTS discord_invites (
  guild_id VARCHAR(24) NOT NULL,
  code VARCHAR(64) NOT NULL,
  uses INT NOT NULL,
  inviter_id VARCHAR(24),
  PRIMARY KEY (guild_id, code)
);
CREATE TABLE IF NOT EXISTS discord_log_posts (
  message_id VARCHAR(24) PRIMARY KEY,
  channel_id VARCHAR(24) NOT NULL,
  guild_id VARCHAR(24) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX discord_log_age (guild_id,created_at)
);
