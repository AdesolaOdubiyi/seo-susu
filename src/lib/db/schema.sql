-- Susu SQLite schema
-- Applied automatically on first connection (see index.ts).
-- Rules contract: docs/CHANGE_RULES.md. If they disagree, fix the code.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  invite_code_used TEXT
);

-- phase: 'setup' | 'awaiting_signatures' | 'scheduled' | 'live' | 'cycle_complete'
-- Terms (contribution_amount, schedule, round1_start_at) are NULL until the
-- matching setup proposal is unanimously approved.
-- round_due_at: when the current round's payment is due; set when the group
--   goes live (round1_start_at + one cadence interval) and rolls forward
--   each settled round. Can be moved by an approved remove_member poll.
CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  phase TEXT NOT NULL DEFAULT 'setup',
  contribution_amount REAL CHECK (contribution_amount IS NULL OR contribution_amount > 0),
  schedule TEXT,
  round1_start_at TEXT,
  current_cycle INTEGER NOT NULL DEFAULT 1,
  current_round INTEGER NOT NULL DEFAULT 1,
  round_due_at TEXT
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

-- Setup proposals (phase = setup):
--   'contribution_amount' {"amount"} | 'schedule' {"schedule"} |
--   'rotation_order' {"orderedUserIds"} | 'round1_start_date' {"startDate"}
-- Live polls:
--   'contribution_amount' | 'schedule' | 'add_member' {"userName"} |
--   'remove_member' {"targetUserId","newAmount","newPayoutDate"} |
--   'start_cycle' {}
-- status: 'open' | 'approved' | 'rejected' (expiry auto-rejects; no separate state)
-- Deadline: setup polls +7 days; live polls the UTC calendar day before the
-- round due date. Open polls block payout; contributions stay allowed.
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

-- Versioned Group Agreement snapshots (docs/CHANGE_RULES.md).
-- status: 'awaiting_signatures' | 'active' | 'superseded' | 'expired'
-- terms_json is the source of truth; rendered_text is generated from it.
-- Never mutated after creation — approved changes create a new version with
-- supersedes_id pointing at the old one.
CREATE TABLE IF NOT EXISTS group_agreements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  cycle_number INTEGER NOT NULL,
  version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'awaiting_signatures',
  terms_json TEXT NOT NULL,
  rendered_text TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  signing_deadline TEXT,
  effective_at TEXT,
  supersedes_id INTEGER,
  UNIQUE (group_id, version),
  FOREIGN KEY (group_id) REFERENCES groups(id),
  FOREIGN KEY (supersedes_id) REFERENCES group_agreements(id)
);

CREATE TABLE IF NOT EXISTS agreement_acceptances (
  agreement_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  accepted_at TEXT NOT NULL,
  agreement_hash TEXT NOT NULL,
  PRIMARY KEY (agreement_id, user_id),
  FOREIGN KEY (agreement_id) REFERENCES group_agreements(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
