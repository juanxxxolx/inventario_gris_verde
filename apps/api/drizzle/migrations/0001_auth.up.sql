-- InduInventory · 0001 · Núcleo de autenticación
-- PostgreSQL 17

CREATE TABLE users (
  id                    uuid PRIMARY KEY,
  full_name             text NOT NULL,
  email                 text NOT NULL,
  password_hash         text NOT NULL,
  role                  text NOT NULL DEFAULT 'VIEWER',
  is_active             boolean NOT NULL DEFAULT true,
  email_verified_at     timestamptz,
  password_changed_at   timestamptz NOT NULL DEFAULT now(),
  failed_login_attempts integer NOT NULL DEFAULT 0,
  locked_until          timestamptz,
  last_login_at         timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT users_full_name_len
    CHECK (char_length(full_name) BETWEEN 2 AND 80),
  CONSTRAINT users_email_normalized
    CHECK (email = lower(email) AND char_length(email) <= 254),
  CONSTRAINT users_password_is_argon2id
    CHECK (password_hash LIKE '$argon2id$%'),
  CONSTRAINT users_role_valid
    CHECK (role IN ('ADMIN', 'OPERATOR', 'VIEWER')),
  CONSTRAINT users_failed_attempts_nonnegative
    CHECK (failed_login_attempts >= 0)
);

CREATE UNIQUE INDEX users_email_lower_uq ON users (lower(email));
CREATE INDEX users_role_idx ON users (role);
CREATE INDEX users_active_idx ON users (is_active) WHERE is_active = true;
CREATE INDEX users_locked_idx ON users (locked_until) WHERE locked_until IS NOT NULL;

CREATE TABLE refresh_tokens (
  id                    uuid PRIMARY KEY,
  user_id               uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id             uuid NOT NULL,
  token_hash            text NOT NULL,
  expires_at            timestamptz NOT NULL,
  revoked_at            timestamptz,
  replaced_by_token_id  uuid REFERENCES refresh_tokens(id) ON DELETE SET NULL,
  ip_address            inet,
  user_agent            text,
  created_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT refresh_tokens_hash_format
    CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT refresh_tokens_expiry
    CHECK (expires_at > created_at),
  CONSTRAINT refresh_tokens_user_agent_len
    CHECK (user_agent IS NULL OR char_length(user_agent) <= 512)
);

CREATE UNIQUE INDEX refresh_tokens_hash_uq ON refresh_tokens (token_hash);
CREATE INDEX refresh_tokens_user_family_idx ON refresh_tokens (user_id, family_id);
CREATE INDEX refresh_tokens_family_active_idx
  ON refresh_tokens (family_id) WHERE revoked_at IS NULL;
CREATE INDEX refresh_tokens_expires_idx ON refresh_tokens (expires_at);

CREATE TABLE email_verification_tokens (
  id              uuid PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash      text NOT NULL,
  expires_at      timestamptz NOT NULL,
  used_at         timestamptz,
  invalidated_at  timestamptz,
  requested_ip    inet,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT email_verification_hash_format
    CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT email_verification_expiry
    CHECK (expires_at > created_at),
  CONSTRAINT email_verification_ua_len
    CHECK (user_agent IS NULL OR char_length(user_agent) <= 512)
);

CREATE UNIQUE INDEX email_verification_hash_uq
  ON email_verification_tokens (token_hash);
CREATE UNIQUE INDEX email_verification_one_active_uq
  ON email_verification_tokens (user_id)
  WHERE used_at IS NULL AND invalidated_at IS NULL;
CREATE INDEX email_verification_expires_idx
  ON email_verification_tokens (expires_at);

CREATE TABLE password_reset_tokens (
  id              uuid PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash      text NOT NULL,
  expires_at      timestamptz NOT NULL,
  used_at         timestamptz,
  invalidated_at  timestamptz,
  requested_ip    inet,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT password_reset_hash_format
    CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT password_reset_expiry
    CHECK (expires_at > created_at),
  CONSTRAINT password_reset_ua_len
    CHECK (user_agent IS NULL OR char_length(user_agent) <= 512)
);

CREATE UNIQUE INDEX password_reset_hash_uq
  ON password_reset_tokens (token_hash);
CREATE UNIQUE INDEX password_reset_one_active_uq
  ON password_reset_tokens (user_id)
  WHERE used_at IS NULL AND invalidated_at IS NULL;
CREATE INDEX password_reset_expires_idx
  ON password_reset_tokens (expires_at);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
