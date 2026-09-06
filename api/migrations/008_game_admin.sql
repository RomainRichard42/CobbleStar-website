CREATE TABLE game_players (
  uuid CHAR(32) PRIMARY KEY,
  username VARCHAR(16) NOT NULL,
  server_id VARCHAR(48) NOT NULL,
  snapshot_id CHAR(36) NOT NULL,
  snapshot_json JSON NOT NULL,
  online BOOLEAN NOT NULL,
  observed_at BIGINT NOT NULL,
  first_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX game_players_recent (received_at),
  INDEX game_players_name (username)
);
CREATE TABLE game_events (
  id CHAR(36) PRIMARY KEY,
  uuid CHAR(32) NOT NULL,
  kind VARCHAR(48) NOT NULL,
  detail_json JSON NOT NULL,
  occurred_at BIGINT NOT NULL,
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX game_events_player (uuid, occurred_at),
  INDEX game_events_retention (received_at)
);
CREATE TABLE game_admin_actions (
  id CHAR(36) PRIMARY KEY,
  uuid CHAR(32) NOT NULL,
  server_id VARCHAR(48) NOT NULL,
  actor_id CHAR(36) NOT NULL,
  actor_discord_id VARCHAR(32) NOT NULL,
  reason VARCHAR(300) NOT NULL,
  payload_json JSON NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'queued',
  result_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  dispatched_at DATETIME NULL,
  completed_at DATETIME NULL,
  INDEX game_actions_player (uuid, created_at),
  INDEX game_actions_queue (server_id, uuid, status),
  INDEX game_actions_retention (created_at)
);
