-- Susu SQLite schema (from PRD)
-- Not wired up yet — reference only for scaffolding.

-- users (id, name, invite_code_used)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  invite_code_used TEXT
);

-- groups (id, name, contribution_amount, schedule, current_cycle, current_round)
CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contribution_amount REAL NOT NULL,
  schedule TEXT NOT NULL,
  current_cycle INTEGER NOT NULL DEFAULT 1,
  current_round INTEGER NOT NULL DEFAULT 1
);

-- group_members (group_id, user_id, rotation_position, active, payout_received)
CREATE TABLE IF NOT EXISTS group_members (
  group_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  rotation_position INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  payout_received INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES groups(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- contributions (group_id, user_id, cycle_number, round_number, status, timestamp)
CREATE TABLE IF NOT EXISTS contributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  cycle_number INTEGER NOT NULL,
  round_number INTEGER NOT NULL,
  status TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (group_id) REFERENCES groups(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- polls (id, group_id, proposed_by, change_type, change_details, deadline, status)
CREATE TABLE IF NOT EXISTS polls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  proposed_by INTEGER NOT NULL,
  change_type TEXT NOT NULL,
  change_details TEXT NOT NULL,
  deadline TEXT NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY (group_id) REFERENCES groups(id),
  FOREIGN KEY (proposed_by) REFERENCES users(id)
);

-- poll_votes (poll_id, user_id, vote)
CREATE TABLE IF NOT EXISTS poll_votes (
  poll_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  vote INTEGER NOT NULL,
  PRIMARY KEY (poll_id, user_id),
  FOREIGN KEY (poll_id) REFERENCES polls(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
