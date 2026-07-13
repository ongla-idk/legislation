PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT NOT NULL UNIQUE,
  citation TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  date_introduced TEXT NOT NULL DEFAULT '',
  date_concluded TEXT NOT NULL DEFAULT '',
  sponsor TEXT NOT NULL DEFAULT '',
  ministry TEXT NOT NULL DEFAULT '',
  session TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  pdf_url TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 1 CHECK (published IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_stages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  stage_date TEXT NOT NULL DEFAULT '',
  completed INTEGER NOT NULL DEFAULT 1 CHECK (completed IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS related_documents (
  document_id INTEGER NOT NULL,
  related_document_id INTEGER NOT NULL,
  PRIMARY KEY (document_id, related_document_id),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (related_document_id) REFERENCES documents(id) ON DELETE CASCADE,
  CHECK (document_id <> related_document_id)
);

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  constituency TEXT NOT NULL DEFAULT '',
  party TEXT NOT NULL DEFAULT '',
  affiliation TEXT NOT NULL DEFAULT '',
  biography TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  vote_date TEXT NOT NULL,
  vote_type TEXT NOT NULL,
  majority_rule TEXT NOT NULL DEFAULT 'simple',
  result_override TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vote_choices (
  vote_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  choice TEXT NOT NULL CHECK (choice IN ('For','Against','Abstain','Absent')),
  PRIMARY KEY (vote_id, member_id),
  FOREIGN KEY (vote_id) REFERENCES votes(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_documents_published ON documents(published);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_date ON documents(date_introduced);
CREATE INDEX IF NOT EXISTS idx_votes_document ON votes(document_id);
CREATE INDEX IF NOT EXISTS idx_votes_date ON votes(vote_date);
CREATE INDEX IF NOT EXISTS idx_vote_choices_member ON vote_choices(member_id);
