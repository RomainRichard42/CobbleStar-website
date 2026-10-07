CREATE TABLE IF NOT EXISTS referral_rewards_v2 (
 guild_id VARCHAR(24) NOT NULL,
 uuid CHAR(32) NOT NULL,
 role VARCHAR(8) NOT NULL,
 milestone INT NOT NULL,
 vote_keys INT NOT NULL DEFAULT 0,
 pulsar_keys INT NOT NULL DEFAULT 0,
 alliance TINYINT NOT NULL DEFAULT 0,
 created_at_ms BIGINT NOT NULL,
 PRIMARY KEY(guild_id,uuid,role,milestone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
