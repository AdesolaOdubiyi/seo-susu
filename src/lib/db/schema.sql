-- Susu SQLite schema
-- Applied automatically on first connection (see index.ts).

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  invite_code_used TEXT
);

-- schedule: 'weekly' | 'biweekly' | 'monthly'
-- round_due_at: ISO timestamp; when the current round's payment is due.
--   Advances by one schedule interval each round, and can be moved by an
--   approved remove_member poll (its "new payout date" input).
-- cycle_complete: 1 once every active member has received a payout; the
--   group then waits for any member to start a new cycle.
CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  contribution_amount REAL NOT NULL CHECK (contribution_amount > 0),
  schedule TEXT NOT NULL,
  current_cycle INTEGER NOT NULL DEFAULT 1,
  current_round INTEGER NOT NULL DEFAULT 1,
  round_due_at TEXT NOT NULL,
  cycle_complete INTEGER NOT NULL DEFAULT 0
);

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

-- status: 'confirmed' (contributions are simulated; a row exists once sent)
CREATE TABLE IF NOT EXISTS contributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  cycle_number INTEGER NOT NULL,
  round_number INTEGER NOT NULL,
  status TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (group_id, user_id, cycle_number, round_number),
  FOREIGN KEY (group_id) REFERENCES groups(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_contributions_group_round
  ON contributions (group_id, cycle_number, round_number);

-- change_type: 'contribution_amount' | 'schedule' | 'add_member' | 'remove_member'
-- change_details: JSON, e.g. {"amount": 50}, {"schedule": "monthly"},
--   {"userName": "Ama"}, or for remove_member the removal plus the group's
--   renegotiated terms: {"userId": 3, "amount": 75, "payoutDate": "..."}
-- status: 'open' | 'approved' | 'rejected'
-- Polls require unanimous approval from eligible voters (active members,
-- excluding the target of a remove_member poll). Polls never block payouts.
CREATE TABLE IF NOT EXISTS polls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  proposed_by INTEGER NOT NULL,
  change_type TEXT NOT NULL,
  change_details TEXT NOT NULL,
  deadline TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  FOREIGN KEY (group_id) REFERENCES groups(id),
  FOREIGN KEY (proposed_by) REFERENCES users(id)
);

-- vote: 1 = approve, 0 = reject
CREATE TABLE IF NOT EXISTS poll_votes (
  poll_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  vote INTEGER NOT NULL,
  PRIMARY KEY (poll_id, user_id),
  FOREIGN KEY (poll_id) REFERENCES polls(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
