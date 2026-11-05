CREATE TABLE IF NOT EXISTS battle_usage (
  server_id VARCHAR(48) NOT NULL,
  battle_id CHAR(36) NOT NULL,
  mode VARCHAR(24) NOT NULL,
  ended_at DATETIME(3) NOT NULL,
  payload_json JSON NOT NULL,
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (server_id, battle_id),
  INDEX battle_usage_period (ended_at, mode)
);
