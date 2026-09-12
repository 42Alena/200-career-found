CREATE TABLE IF NOT EXISTS workspaces (
  id text PRIMARY KEY,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspaces_updated_at_idx
  ON workspaces (updated_at DESC);
