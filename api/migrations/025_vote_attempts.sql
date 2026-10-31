CREATE TABLE vote_attempts (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  vote_site VARCHAR(64) NOT NULL,
  minecraft_uuid CHAR(32) NOT NULL,
  username VARCHAR(16) NOT NULL,
  otp VARCHAR(200) NULL,
  ip_hash CHAR(64) NULL,
  created_at DATETIME(3) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  claim_id CHAR(36) NULL,
  CONSTRAINT vote_attempts_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX vote_attempts_active_idx (user_id, vote_site, expires_at),
  INDEX vote_attempts_ip_idx (vote_site, ip_hash, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vote_identity_locks (
  identity_hash CHAR(64) PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
