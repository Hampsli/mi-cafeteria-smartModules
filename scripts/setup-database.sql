-- =============================================
-- Mi Cafeteria Smart Modules - Core Database Schema
-- =============================================
-- Run this before starting the server for the first time.
-- These are the core tables used by the webhook system.
-- Each module has its own migration.sql for module-specific tables.

-- ─── WEBHOOK SUBSCRIPTIONS ──────────────────────────────
-- Stores external URL subscriptions for webhook events.
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name VARCHAR(255) NOT NULL,
  target_url TEXT NOT NULL,
  description TEXT DEFAULT '',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_name, target_url)
);

CREATE INDEX IF NOT EXISTS idx_webhook_subs_event ON webhook_subscriptions(event_name);
CREATE INDEX IF NOT EXISTS idx_webhook_subs_active ON webhook_subscriptions(active);

-- ─── WEBHOOK EVENTS LOG ─────────────────────────────────
-- Logs every dispatched event for audit / debugging.
CREATE TABLE IF NOT EXISTS webhook_events (
  id BIGSERIAL PRIMARY KEY,
  event_id UUID NOT NULL,
  event_name VARCHAR(255) NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_name ON webhook_events(event_name);
CREATE INDEX IF NOT EXISTS idx_webhook_events_date ON webhook_events(created_at);

-- ─── WEBHOOK DELIVERIES LOG ─────────────────────────────
-- Tracks delivery status for each external subscription.
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id BIGSERIAL PRIMARY KEY,
  event_id UUID NOT NULL,
  subscription_id UUID REFERENCES webhook_subscriptions(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  attempts INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event ON webhook_deliveries(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);

-- ─── EXAMPLE MODULE TABLE ───────────────────────────────
-- From: src/modules/example/migration.sql
CREATE TABLE IF NOT EXISTS example_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  status VARCHAR(50) DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_example_items_status ON example_items(status);
