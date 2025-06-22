# NostrX Database Schema Design

## Overview

This document outlines the comprehensive database structure for NostrX extension, designed to support user management, subscription tiers, quota tracking, analytics, and Nostr operations at scale.

## Database Architecture

**Recommended Stack:**
- **Primary DB**: PostgreSQL (for ACID compliance and complex queries)
- **Cache Layer**: Redis (for real-time quota tracking)
- **Analytics DB**: ClickHouse or BigQuery (for high-volume analytics)
- **File Storage**: AWS S3 or CloudFlare R2 (for attachments/media)

## Core Tables Structure

### 1. User Management

#### `users`
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nostr_public_key VARCHAR(64) UNIQUE NOT NULL,
    extension_id VARCHAR(64), -- Chrome extension installation ID
    email VARCHAR(320), -- Optional, for billing
    display_name VARCHAR(100),
    avatar_url TEXT,
    
    -- Authentication & Security
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    email_verified BOOLEAN DEFAULT false,
    status user_status_enum DEFAULT 'active',
    
    -- Privacy & Preferences
    data_retention_days INTEGER DEFAULT 90,
    analytics_enabled BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    
    -- Metadata
    timezone VARCHAR(50) DEFAULT 'UTC',
    locale VARCHAR(10) DEFAULT 'en-US',
    created_from_ip INET,
    user_agent TEXT,
    
    CONSTRAINT valid_nostr_pubkey CHECK (LENGTH(nostr_public_key) = 64),
    CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE TYPE user_status_enum AS ENUM ('active', 'suspended', 'deleted', 'pending_verification');

-- Indexes
CREATE INDEX idx_users_nostr_pubkey ON users(nostr_public_key);
CREATE INDEX idx_users_extension_id ON users(extension_id);
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_last_active ON users(last_active_at);
```

#### `user_sessions`
```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    extension_id VARCHAR(64) NOT NULL,
    
    -- Session Data
    session_token VARCHAR(128) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Browser/Extension Info
    extension_version VARCHAR(20),
    browser_name VARCHAR(50),
    browser_version VARCHAR(50),
    os VARCHAR(50),
    ip_address INET,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_reason TEXT
);

CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
```

### 2. Subscription & Payment Management

#### `subscription_plans`
```sql
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_code VARCHAR(50) UNIQUE NOT NULL, -- 'basic', 'premium', 'advanced'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Pricing
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    price_yearly DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Features & Limits
    daily_post_limit INTEGER NOT NULL, -- -1 for unlimited
    monthly_post_limit INTEGER, -- -1 for unlimited
    custom_relays_allowed BOOLEAN DEFAULT false,
    analytics_enabled BOOLEAN DEFAULT false,
    priority_support BOOLEAN DEFAULT false,
    multiple_identities BOOLEAN DEFAULT false,
    
    -- Plan Status
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT true, -- Hidden plans for special users
    sort_order INTEGER DEFAULT 100,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default plans
INSERT INTO subscription_plans (plan_code, name, description, price_monthly, daily_post_limit, custom_relays_allowed, analytics_enabled) VALUES
('basic', 'Basic', 'Perfect for casual users', 0.00, 3, false, false),
('premium', 'Premium', 'Great for regular posters', 4.99, 25, true, true),
('advanced', 'Advanced', 'For power users and creators', 9.99, -1, true, true);

CREATE INDEX idx_plans_code ON subscription_plans(plan_code);
CREATE INDEX idx_plans_active ON subscription_plans(is_active, is_public);
```

#### `user_subscriptions`
```sql
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id),
    
    -- Subscription Details
    status subscription_status_enum DEFAULT 'active',
    billing_cycle billing_cycle_enum DEFAULT 'monthly',
    
    -- Dates
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_period_end TIMESTAMP WITH TIME ZONE,
    ends_at TIMESTAMP WITH TIME ZONE, -- For cancellations
    canceled_at TIMESTAMP WITH TIME ZONE,
    
    -- Pricing (snapshot at subscription time)
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Payment Integration
    payment_provider_id VARCHAR(100), -- ExtensionPay/Stripe subscription ID
    payment_provider VARCHAR(50) DEFAULT 'extensionpay',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    
    CONSTRAINT one_active_subscription_per_user UNIQUE(user_id) DEFERRABLE INITIALLY DEFERRED
);

CREATE TYPE subscription_status_enum AS ENUM (
    'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'trialing'
);

CREATE TYPE billing_cycle_enum AS ENUM ('monthly', 'yearly', 'lifetime');

CREATE INDEX idx_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_subscriptions_period ON user_subscriptions(current_period_start, current_period_end);
```

#### `payments`
```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id),
    
    -- Payment Details
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status payment_status_enum DEFAULT 'pending',
    
    -- Provider Info
    payment_provider VARCHAR(50) DEFAULT 'extensionpay',
    provider_payment_id VARCHAR(100) UNIQUE, -- ExtensionPay/Stripe payment ID
    provider_customer_id VARCHAR(100),
    
    -- Payment Method
    payment_method VARCHAR(50), -- 'card', 'paypal', 'bank_transfer'
    last_four_digits VARCHAR(4),
    
    -- Dates
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    failure_reason TEXT,
    provider_fee DECIMAL(10,2),
    net_amount DECIMAL(10,2),
    invoice_url TEXT,
    receipt_url TEXT
);

CREATE TYPE payment_status_enum AS ENUM (
    'pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded'
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_provider_id ON payments(provider_payment_id);
CREATE INDEX idx_payments_created_at ON payments(created_at);
```

### 3. Quota & Usage Tracking

#### `user_quotas`
```sql
CREATE TABLE user_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Quota Period
    quota_date DATE NOT NULL, -- Daily quotas
    quota_type quota_type_enum DEFAULT 'daily',
    
    -- Usage Tracking
    posts_used INTEGER DEFAULT 0,
    posts_limit INTEGER NOT NULL,
    
    -- Reset Information
    resets_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_quota_date UNIQUE(user_id, quota_date, quota_type)
);

CREATE TYPE quota_type_enum AS ENUM ('daily', 'monthly', 'yearly');

CREATE INDEX idx_quotas_user_date ON user_quotas(user_id, quota_date);
CREATE INDEX idx_quotas_resets_at ON user_quotas(resets_at);
CREATE INDEX idx_quotas_updated ON user_quotas(updated_at);
```

#### `usage_events`
```sql
CREATE TABLE usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Event Details
    event_type usage_event_type_enum NOT NULL,
    event_action VARCHAR(50) NOT NULL, -- 'post_created', 'quota_exceeded', 'tier_upgraded'
    
    -- Context
    source_platform VARCHAR(50) DEFAULT 'twitter', -- 'twitter', 'x.com'
    extension_version VARCHAR(20),
    
    -- Usage Metrics
    posts_used_before INTEGER,
    posts_used_after INTEGER,
    quota_limit INTEGER,
    
    -- Event Data (JSON for flexibility)
    event_data JSONB,
    
    -- Timestamps
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Geo/IP (for analytics)
    ip_address INET,
    country_code VARCHAR(2),
    timezone VARCHAR(50)
);

CREATE TYPE usage_event_type_enum AS ENUM (
    'quota_usage', 'quota_exceeded', 'quota_reset', 'tier_change', 
    'post_success', 'post_failure', 'relay_error'
);

-- Partitioning by month for performance
CREATE TABLE usage_events_y2024m06 PARTITION OF usage_events
    FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');

CREATE INDEX idx_usage_events_user_occurred ON usage_events(user_id, occurred_at);
CREATE INDEX idx_usage_events_type ON usage_events(event_type);
CREATE INDEX idx_usage_events_action ON usage_events(event_action);
CREATE INDEX idx_usage_events_data ON usage_events USING GIN(event_data);
```

#### `daily_usage_stats`
```sql
-- Aggregated daily statistics for faster queries
CREATE TABLE daily_usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,
    
    -- Post Statistics
    total_posts INTEGER DEFAULT 0,
    successful_posts INTEGER DEFAULT 0,
    failed_posts INTEGER DEFAULT 0,
    
    -- Relay Statistics
    unique_relays_used INTEGER DEFAULT 0,
    total_relay_attempts INTEGER DEFAULT 0,
    successful_relay_publishes INTEGER DEFAULT 0,
    
    -- Performance Metrics
    avg_publish_time_ms INTEGER,
    max_publish_time_ms INTEGER,
    min_publish_time_ms INTEGER,
    
    -- Platform Breakdown
    twitter_posts INTEGER DEFAULT 0,
    x_com_posts INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_stat_date UNIQUE(user_id, stat_date)
);

CREATE INDEX idx_daily_stats_user_date ON daily_usage_stats(user_id, stat_date);
CREATE INDEX idx_daily_stats_date ON daily_usage_stats(stat_date);
```

### 4. Nostr-Specific Data Models

#### `nostr_events`
```sql
CREATE TABLE nostr_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Nostr Event Data
    event_id VARCHAR(64) UNIQUE NOT NULL, -- Nostr event ID (hex)
    event_kind INTEGER NOT NULL DEFAULT 1, -- NIP-01 kind (1 = text note)
    content TEXT NOT NULL,
    created_at_nostr INTEGER NOT NULL, -- Nostr timestamp (Unix)
    
    -- Original Tweet Data
    original_tweet_id VARCHAR(50), -- Twitter/X tweet ID
    original_tweet_url TEXT,
    original_tweet_text TEXT,
    original_username VARCHAR(100),
    
    -- Publishing Status
    status event_status_enum DEFAULT 'pending',
    published_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    
    -- Relay Publishing
    total_relays INTEGER DEFAULT 0,
    successful_relays INTEGER DEFAULT 0,
    failed_relays INTEGER DEFAULT 0,
    
    -- Performance Metrics
    publish_duration_ms INTEGER,
    signature_duration_ms INTEGER,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_event_id CHECK (LENGTH(event_id) = 64)
);

CREATE TYPE event_status_enum AS ENUM (
    'pending', 'signing', 'publishing', 'published', 'failed', 'partial'
);

CREATE INDEX idx_nostr_events_user_id ON nostr_events(user_id);
CREATE INDEX idx_nostr_events_event_id ON nostr_events(event_id);
CREATE INDEX idx_nostr_events_status ON nostr_events(status);
CREATE INDEX idx_nostr_events_created ON nostr_events(created_at);
CREATE INDEX idx_nostr_events_tweet_id ON nostr_events(original_tweet_id);
```

#### `user_relays`
```sql
CREATE TABLE user_relays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Relay Information
    relay_url TEXT NOT NULL,
    relay_name VARCHAR(100),
    is_default BOOLEAN DEFAULT false,
    
    -- Status & Performance
    is_active BOOLEAN DEFAULT true,
    last_connected_at TIMESTAMP WITH TIME ZONE,
    last_publish_success TIMESTAMP WITH TIME ZONE,
    last_publish_failure TIMESTAMP WITH TIME ZONE,
    
    -- Performance Metrics
    success_rate DECIMAL(5,2) DEFAULT 0.00, -- Percentage
    avg_response_time_ms INTEGER,
    total_publishes INTEGER DEFAULT 0,
    successful_publishes INTEGER DEFAULT 0,
    failed_publishes INTEGER DEFAULT 0,
    
    -- Relay Metadata
    supported_nips INTEGER[], -- Array of supported NIPs
    relay_info JSONB, -- Relay info document (NIP-11)
    
    -- Timestamps
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_relay UNIQUE(user_id, relay_url),
    CONSTRAINT valid_relay_url CHECK (relay_url ~* '^wss?://.+')
);

CREATE INDEX idx_user_relays_user_id ON user_relays(user_id);
CREATE INDEX idx_user_relays_url ON user_relays(relay_url);
CREATE INDEX idx_user_relays_active ON user_relays(is_active);
CREATE INDEX idx_user_relays_performance ON user_relays(success_rate, avg_response_time_ms);
```

#### `relay_publishes`
```sql
CREATE TABLE relay_publishes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES nostr_events(id) ON DELETE CASCADE,
    user_relay_id UUID REFERENCES user_relays(id),
    
    -- Publishing Details
    status relay_publish_status_enum DEFAULT 'pending',
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Performance
    connection_time_ms INTEGER,
    publish_time_ms INTEGER,
    total_time_ms INTEGER,
    
    -- Response Data
    relay_response JSONB,
    error_message TEXT,
    error_code VARCHAR(50),
    
    -- Network Info
    ip_address INET,
    connection_type VARCHAR(20), -- 'websocket', 'http'
    
    CONSTRAINT valid_times CHECK (
        (completed_at IS NULL OR completed_at >= attempted_at) AND
        (total_time_ms IS NULL OR total_time_ms >= 0)
    )
);

CREATE TYPE relay_publish_status_enum AS ENUM (
    'pending', 'connecting', 'connected', 'publishing', 'published', 
    'failed', 'timeout', 'rejected'
);

CREATE INDEX idx_relay_publishes_event ON relay_publishes(event_id);
CREATE INDEX idx_relay_publishes_relay ON relay_publishes(user_relay_id);
CREATE INDEX idx_relay_publishes_status ON relay_publishes(status);
CREATE INDEX idx_relay_publishes_attempted ON relay_publishes(attempted_at);
```

## Database Relationships & Constraints

### Entity Relationship Diagram (ERD)

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
│    users    │────│ user_subscriptions│────│subscription_plans│
│             │    │                  │    │                 │
│ - id (PK)   │    │ - user_id (FK)   │    │ - id (PK)       │
│ - nostr_pk  │    │ - plan_id (FK)   │    │ - plan_code     │
│ - email     │    │ - status         │    │ - daily_limit   │
└─────────────┘    └──────────────────┘    └─────────────────┘
       │                     │
       │                     │
       ▼                     ▼
┌─────────────┐    ┌──────────────────┐
│ user_quotas │    │    payments      │
│             │    │                  │
│ - user_id   │    │ - subscription_id│
│ - quota_date│    │ - amount         │
│ - posts_used│    │ - status         │
└─────────────┘    └──────────────────┘
       │
       │
       ▼
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
│usage_events │    │   nostr_events   │────│  relay_publishes│
│             │    │                  │    │                 │
│ - user_id   │    │ - user_id (FK)   │    │ - event_id (FK) │
│ - event_type│    │ - event_id       │    │ - relay_id (FK) │
│ - event_data│    │ - content        │    │ - status        │
└─────────────┘    └──────────────────┘    └─────────────────┘
                           │
                           │
                           ▼
                    ┌─────────────────┐
                    │   user_relays   │
                    │                 │
                    │ - user_id (FK)  │
                    │ - relay_url     │
                    │ - success_rate  │
                    └─────────────────┘
```

### Key Relationships

1. **Users ↔ Subscriptions**: One-to-One (current active subscription)
2. **Subscriptions ↔ Plans**: Many-to-One (many users can have same plan)
3. **Users ↔ Quotas**: One-to-Many (daily quotas)
4. **Users ↔ Events**: One-to-Many (published events)
5. **Events ↔ Publishes**: One-to-Many (published to multiple relays)
6. **Users ↔ Relays**: Many-to-Many (custom relay configurations)

### Business Logic Constraints

#### Subscription Rules
```sql
-- Only one active subscription per user
ALTER TABLE user_subscriptions 
ADD CONSTRAINT one_active_subscription 
EXCLUDE (user_id WITH =) WHERE (status = 'active');

-- Subscription must have valid period
ALTER TABLE user_subscriptions 
ADD CONSTRAINT valid_subscription_period 
CHECK (current_period_end > current_period_start);

-- Payment amount must be positive
ALTER TABLE payments 
ADD CONSTRAINT positive_amount 
CHECK (amount >= 0);
```

#### Quota Rules
```sql
-- Posts used cannot exceed limit
ALTER TABLE user_quotas 
ADD CONSTRAINT usage_within_limit 
CHECK (posts_used <= posts_limit);

-- Quota date cannot be in future
ALTER TABLE user_quotas 
ADD CONSTRAINT quota_date_valid 
CHECK (quota_date <= CURRENT_DATE);

-- Usage events must have valid user
ALTER TABLE usage_events 
ADD CONSTRAINT valid_usage_user 
CHECK (user_id IS NOT NULL);
```

#### Nostr Rules
```sql
-- Event ID must be valid hex
ALTER TABLE nostr_events 
ADD CONSTRAINT valid_event_id_format 
CHECK (event_id ~* '^[a-f0-9]{64}$');

-- Relay URL must be WebSocket
ALTER TABLE user_relays 
ADD CONSTRAINT valid_relay_protocol 
CHECK (relay_url ~* '^wss?://');

-- Success rate must be percentage
ALTER TABLE user_relays 
ADD CONSTRAINT valid_success_rate 
CHECK (success_rate >= 0 AND success_rate <= 100);
```

## Database Operations & Queries

### Common Query Patterns

#### User Management Queries
```sql
-- Get user with current subscription details
SELECT u.*, sp.plan_code, sp.daily_post_limit, us.status as subscription_status
FROM users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE u.nostr_public_key = $1;

-- Get user's current quota status
SELECT uq.*, sp.daily_post_limit
FROM user_quotas uq
JOIN users u ON uq.user_id = u.id
JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE u.nostr_public_key = $1 AND uq.quota_date = CURRENT_DATE;
```

#### Analytics Queries
```sql
-- Daily revenue report
SELECT 
    DATE(p.created_at) as payment_date,
    sp.plan_code,
    COUNT(*) as payment_count,
    SUM(p.amount) as total_revenue,
    AVG(p.amount) as avg_payment
FROM payments p
JOIN user_subscriptions us ON p.subscription_id = us.id
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE p.status = 'succeeded'
    AND p.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(p.created_at), sp.plan_code
ORDER BY payment_date DESC;

-- User engagement metrics
SELECT 
    sp.plan_code,
    COUNT(DISTINCT dus.user_id) as active_users,
    AVG(dus.total_posts) as avg_posts_per_user,
    AVG(dus.successful_posts::FLOAT / NULLIF(dus.total_posts, 0)) as success_rate
FROM daily_usage_stats dus
JOIN users u ON dus.user_id = u.id
JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE dus.stat_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY sp.plan_code;
```

#### Performance Monitoring
```sql
-- Relay performance analysis
SELECT 
    ur.relay_url,
    ur.success_rate,
    ur.avg_response_time_ms,
    COUNT(rp.id) as total_publishes_7d,
    AVG(rp.total_time_ms) as avg_publish_time_7d
FROM user_relays ur
LEFT JOIN relay_publishes rp ON ur.id = rp.user_relay_id 
    AND rp.attempted_at >= CURRENT_DATE - INTERVAL '7 days'
WHERE ur.is_active = true
GROUP BY ur.id, ur.relay_url, ur.success_rate, ur.avg_response_time_ms
ORDER BY ur.success_rate DESC, ur.avg_response_time_ms ASC;
```

## Performance Optimization

### Indexing Strategy

#### Primary Indexes (Already Created)
- All foreign keys have indexes
- Unique constraints are automatically indexed
- Time-based queries have appropriate indexes

#### Additional Performance Indexes
```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_users_active_subscription ON users(id) 
WHERE id IN (SELECT user_id FROM user_subscriptions WHERE status = 'active');

CREATE INDEX idx_quota_current_period ON user_quotas(user_id, quota_date) 
WHERE quota_date >= CURRENT_DATE - INTERVAL '1 day';

CREATE INDEX idx_events_recent ON nostr_events(user_id, created_at) 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- Partial indexes for frequently filtered data
CREATE INDEX idx_payments_successful ON payments(created_at, amount) 
WHERE status = 'succeeded';

CREATE INDEX idx_relays_active_performance ON user_relays(success_rate, avg_response_time_ms) 
WHERE is_active = true;
```

### Partitioning Strategy

#### Time-Based Partitioning
```sql
-- Partition usage_events by month
CREATE TABLE usage_events_y2024m07 PARTITION OF usage_events
    FOR VALUES FROM ('2024-07-01') TO ('2024-08-01');

CREATE TABLE usage_events_y2024m08 PARTITION OF usage_events
    FOR VALUES FROM ('2024-08-01') TO ('2024-09-01');

-- Partition relay_publishes by month (high volume)
CREATE TABLE relay_publishes (
    -- ... existing columns
) PARTITION BY RANGE (attempted_at);

CREATE TABLE relay_publishes_y2024m06 PARTITION OF relay_publishes
    FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');
```

## Data Retention & Archival

### Retention Policies
```sql
-- Archive old usage events (keep 90 days)
DELETE FROM usage_events 
WHERE occurred_at < CURRENT_DATE - INTERVAL '90 days';

-- Archive old relay publishes (keep 30 days)
DELETE FROM relay_publishes 
WHERE attempted_at < CURRENT_DATE - INTERVAL '30 days';

-- Archive old payment records (keep 7 years for compliance)
UPDATE payments SET archived = true 
WHERE created_at < CURRENT_DATE - INTERVAL '7 years';
```

### Backup Strategy
```sql
-- Daily incremental backup
pg_dump --format=custom \
        --no-owner \
        --no-privileges \
        --exclude-table=usage_events_* \
        --exclude-table=relay_publishes_* \
        nostrx_db > backup_$(date +%Y%m%d).sql

-- Weekly full backup with compression
pg_dump --format=custom \
        --compress=9 \
        --verbose \
        nostrx_db > backup_full_$(date +%Y%m%d).sql
```

## Security Considerations

### Data Protection
```sql
-- Encrypt sensitive fields
ALTER TABLE users ADD COLUMN email_encrypted BYTEA;
ALTER TABLE payments ADD COLUMN provider_data_encrypted BYTEA;

-- Row Level Security (RLS)
ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_quota_policy ON user_quotas
    FOR ALL TO app_user
    USING (user_id = current_setting('app.current_user_id')::UUID);

-- Audit trail
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    operation VARCHAR(10) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Access Control
```sql
-- Database roles
CREATE ROLE nostrx_app_read;
CREATE ROLE nostrx_app_write;
CREATE ROLE nostrx_admin;

-- Grant appropriate permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO nostrx_app_read;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO nostrx_app_write;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nostrx_admin;
```

## Migration Strategy

### Database Versioning
```sql
CREATE TABLE schema_migrations (
    version VARCHAR(20) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT
);

-- Example migration
INSERT INTO schema_migrations (version, description) VALUES 
('001_initial_schema', 'Initial database schema creation'),
('002_add_quotas', 'Add quota management system'),
('003_add_analytics', 'Add usage analytics tables');
```

### Deployment Checklist
1. **Pre-deployment**: Backup current database
2. **Schema Migration**: Apply new tables/columns
3. **Data Migration**: Populate new fields from existing data
4. **Index Creation**: Add performance indexes
5. **Constraint Validation**: Verify all constraints
6. **Performance Testing**: Query performance validation
7. **Rollback Plan**: Document rollback procedures

## Future Considerations

### Scalability Planning
- **Horizontal Scaling**: Read replicas for analytics queries
- **Caching Layer**: Redis for real-time quota checks
- **Message Queues**: Async processing for usage events
- **CDN Integration**: Static asset delivery optimization

### Feature Extensions
- **Multi-tenancy**: Support for team accounts
- **Advanced Analytics**: Machine learning insights
- **API Rate Limiting**: Advanced quota management
- **Compliance**: GDPR, CCPA data handling