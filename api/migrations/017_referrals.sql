CREATE TABLE IF NOT EXISTS referral_campaigns (
 guild_id VARCHAR(24) PRIMARY KEY,
 id CHAR(36) NOT NULL,
 config JSON NOT NULL,
 started_at_ms BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS referral_members (
 guild_id VARCHAR(24) NOT NULL,
 invitee_id VARCHAR(24) NOT NULL,
 inviter_id VARCHAR(24) NULL,
 joined_at_ms BIGINT NOT NULL,
 qualified_uuid CHAR(32) NULL,
 qualified_at_ms BIGINT NULL,
 active TINYINT NOT NULL DEFAULT 1,
 PRIMARY KEY(guild_id,invitee_id),
 UNIQUE KEY referral_unique_player(guild_id,qualified_uuid),
 INDEX referral_inviter(guild_id,inviter_id,qualified_at_ms)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS referral_identities (
 guild_id VARCHAR(24) NOT NULL,
 discord_id VARCHAR(24) NOT NULL,
 uuid CHAR(32) NOT NULL,
 PRIMARY KEY(guild_id,discord_id),
 UNIQUE KEY referral_identity_uuid(guild_id,uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS referral_invites (
 guild_id VARCHAR(24) NOT NULL,
 code VARCHAR(32) NOT NULL,
 owner_id VARCHAR(24) NOT NULL,
 PRIMARY KEY(guild_id,code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS referral_playtime (
 guild_id VARCHAR(24) NOT NULL,
 uuid CHAR(32) NOT NULL,
 active_seconds BIGINT NOT NULL,
 first_seen_ms BIGINT NOT NULL,
 PRIMARY KEY(guild_id,uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS referral_rewards (
 guild_id VARCHAR(24) NOT NULL,
 uuid CHAR(32) NOT NULL,
 role VARCHAR(8) NOT NULL,
 milestone INT NOT NULL,
 vote_keys INT NOT NULL,
 alliance TINYINT NOT NULL,
 created_at_ms BIGINT NOT NULL,
 PRIMARY KEY(guild_id,uuid,role,milestone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS referral_audit (
 id CHAR(36) PRIMARY KEY,
 guild_id VARCHAR(24) NOT NULL,
 actor_id VARCHAR(24) NOT NULL,
 action VARCHAR(32) NOT NULL,
 details JSON NOT NULL,
 created_at_ms BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
