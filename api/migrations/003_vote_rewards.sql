ALTER TABLE vote_claims
  ADD COLUMN reward_keys TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER external_reference,
  ADD COLUMN lease_token_hash CHAR(64) NULL AFTER reward_status,
  ADD COLUMN lease_expires_at DATETIME NULL AFTER lease_token_hash;

CREATE INDEX vote_claims_monthly_ranking_idx ON vote_claims(voted_at, user_id);
CREATE INDEX vote_claims_delivery_idx ON vote_claims(user_id, reward_status, voted_at);
