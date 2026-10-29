ALTER TABLE player_collection_goals
  ADD COLUMN star BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN stage ENUM('plan','active') NOT NULL DEFAULT 'plan';
