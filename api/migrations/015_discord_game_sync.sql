CREATE TABLE IF NOT EXISTS discord_game_status (
  guild_id VARCHAR(24) NOT NULL,
  server_id VARCHAR(48) NOT NULL,
  session_id CHAR(36) NOT NULL,
  started_at BIGINT NOT NULL,
  sequence_no BIGINT NOT NULL,
  state JSON NOT NULL,
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (guild_id, server_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS discord_game_players (
  guild_id VARCHAR(24) NOT NULL,
  server_id VARCHAR(48) NOT NULL,
  uuid CHAR(32) NOT NULL,
  profile JSON NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (guild_id, server_id, uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS discord_role_state (
  guild_id VARCHAR(24) NOT NULL,
  discord_id VARCHAR(24) NOT NULL,
  uuid CHAR(32) NULL,
  roles JSON NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (guild_id, discord_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
