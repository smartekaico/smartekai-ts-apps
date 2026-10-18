CREATE TABLE rate_limits (
  key text NOT NULL,
  window_start timestamp NOT NULL,
  count integer NOT NULL,
  expires_at timestamp NOT NULL,
  PRIMARY KEY (key, window_start)
);
CREATE INDEX rate_limits_expires_at_idx ON rate_limits (expires_at);
