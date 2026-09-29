CREATE TABLE IF NOT EXISTS players (
 id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE, token_hash TEXT NOT NULL,
 last_day TEXT, streak INTEGER NOT NULL DEFAULT 0, best_streak INTEGER NOT NULL DEFAULT 0,
 last_start INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS runs (
 id TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES players(id), started INTEGER NOT NULL,
 map INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS runs_started ON runs(started);
CREATE TABLE IF NOT EXISTS records (
 player_id TEXT NOT NULL REFERENCES players(id), category TEXT NOT NULL, value INTEGER NOT NULL,
 achieved INTEGER NOT NULL, PRIMARY KEY(player_id, category)
);
CREATE INDEX IF NOT EXISTS records_rank ON records(category, value DESC, achieved ASC);
CREATE INDEX IF NOT EXISTS streak_rank ON players(best_streak DESC);
CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS players_token ON players(token_hash);
