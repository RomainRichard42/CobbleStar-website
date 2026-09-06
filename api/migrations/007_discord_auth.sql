ALTER TABLE users
  MODIFY COLUMN email VARCHAR(254) NULL,
  MODIFY COLUMN password_hash VARCHAR(255) NULL,
  ADD COLUMN discord_id VARCHAR(32) NULL AFTER password_hash,
  ADD COLUMN discord_username VARCHAR(64) NULL AFTER discord_id,
  ADD COLUMN discord_global_name VARCHAR(64) NULL AFTER discord_username,
  ADD COLUMN discord_avatar VARCHAR(128) NULL AFTER discord_global_name,
  ADD COLUMN discord_linked_at DATETIME NULL AFTER discord_avatar,
  ADD COLUMN discord_guild_joined_at DATETIME NULL AFTER discord_linked_at;

CREATE UNIQUE INDEX users_discord_id_unique ON users(discord_id);
