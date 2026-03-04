-- ============================================================
-- Don't Reset Password - Database Schema
-- ============================================================

-- Table: domains
CREATE TABLE domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_domains_domain ON domains(domain);

-- Table: password_rules (canonical rules per domain, one per domain)
CREATE TABLE password_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    min_length SMALLINT,
    max_length SMALLINT,
    require_uppercase BOOLEAN,
    require_lowercase BOOLEAN,
    require_number BOOLEAN,
    require_special BOOLEAN,
    allowed_special_chars VARCHAR(100),
    disallowed_chars VARCHAR(100),
    no_spaces BOOLEAN,
    notes TEXT,
    confidence_score REAL DEFAULT 0.0,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    contributor_count INTEGER DEFAULT 1,
    is_hidden BOOLEAN DEFAULT FALSE,
    last_verified_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(domain_id)
);

-- Table: rule_contributions (individual submissions for consensus)
CREATE TABLE rule_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    contributor_fingerprint VARCHAR(64) NOT NULL,
    min_length SMALLINT,
    max_length SMALLINT,
    require_uppercase BOOLEAN,
    require_lowercase BOOLEAN,
    require_number BOOLEAN,
    require_special BOOLEAN,
    allowed_special_chars VARCHAR(100),
    disallowed_chars VARCHAR(100),
    no_spaces BOOLEAN,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contributions_domain ON rule_contributions(domain_id);
CREATE INDEX idx_contributions_fingerprint ON rule_contributions(contributor_fingerprint);

-- Table: votes
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES password_rules(id) ON DELETE CASCADE,
    voter_fingerprint VARCHAR(64) NOT NULL,
    vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(rule_id, voter_fingerprint)
);

-- Table: reports
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES password_rules(id) ON DELETE CASCADE,
    reporter_fingerprint VARCHAR(64) NOT NULL,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('incorrect', 'spam', 'outdated')),
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS) Policies
-- ============================================================

ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- domains: anyone can read
CREATE POLICY "domains_select" ON domains
    FOR SELECT USING (true);

-- password_rules: anyone can read non-hidden rules
CREATE POLICY "password_rules_select" ON password_rules
    FOR SELECT USING (is_hidden = false);

-- All write operations go through Edge Functions using service_role key,
-- which bypasses RLS. No public write policies needed.

-- ============================================================
-- Helper function: update updated_at on modification
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER domains_updated_at
    BEFORE UPDATE ON domains
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER password_rules_updated_at
    BEFORE UPDATE ON password_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
