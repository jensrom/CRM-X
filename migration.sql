-- ============================================================
-- CRM-X Schema Migration — Kør i Neon SQL Console
-- Tilføjer: bundlePrefix, invoicePrefix, HourBundle.number/name,
--           TimeLog.bundleId/deductedFromBundle, project_bundles,
--           invoices, invoice_lines
-- ============================================================

-- 1. TENANTS: nye præfikser
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bundle_prefix TEXT NOT NULL DEFAULT 'KB';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS invoice_prefix TEXT NOT NULL DEFAULT 'F';

-- 2. HOUR_BUNDLES: unikt løbenummer + valgfrit navn
ALTER TABLE hour_bundles ADD COLUMN IF NOT EXISTS number INTEGER;
ALTER TABLE hour_bundles ADD COLUMN IF NOT EXISTS name TEXT;

-- Tildel nummer til eksisterende rækker (KB-0001 per tenant)
DO $$
DECLARE
  r RECORD;
  seq INT;
BEGIN
  FOR r IN
    SELECT DISTINCT tenant_id FROM hour_bundles WHERE number IS NULL
  LOOP
    seq := 1;
    FOR r2 IN
      SELECT id FROM hour_bundles
      WHERE tenant_id = r.tenant_id AND number IS NULL
      ORDER BY created_at ASC, id ASC
    LOOP
      UPDATE hour_bundles SET number = seq WHERE id = r2.id;
      seq := seq + 1;
    END LOOP;
  END LOOP;
END $$;

-- Gør number NOT NULL og unik
ALTER TABLE hour_bundles ALTER COLUMN number SET NOT NULL;
ALTER TABLE hour_bundles ADD CONSTRAINT IF NOT EXISTS hour_bundles_tenant_id_number_key UNIQUE (tenant_id, number);

-- 3. TIME_LOGS: klippekort-reference
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS bundle_id TEXT;
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS deducted_from_bundle BOOLEAN NOT NULL DEFAULT false;

-- FK til hour_bundles (kun hvis ikke allerede der)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'time_logs_bundle_id_fkey'
  ) THEN
    ALTER TABLE time_logs
      ADD CONSTRAINT time_logs_bundle_id_fkey
      FOREIGN KEY (bundle_id) REFERENCES hour_bundles(id);
  END IF;
END $$;

-- 4. PROJECT_BUNDLES: junction tabel (projekt ↔ klippekort)
CREATE TABLE IF NOT EXISTS project_bundles (
  id          TEXT        NOT NULL,
  tenant_id   TEXT        NOT NULL,
  project_id  TEXT        NOT NULL,
  bundle_id   TEXT        NOT NULL,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  added_at    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT project_bundles_pkey PRIMARY KEY (id),
  CONSTRAINT project_bundles_project_id_bundle_id_key UNIQUE (project_id, bundle_id),
  CONSTRAINT project_bundles_tenant_id_fkey  FOREIGN KEY (tenant_id)  REFERENCES tenants(id)     ON DELETE CASCADE,
  CONSTRAINT project_bundles_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id)    ON DELETE CASCADE,
  CONSTRAINT project_bundles_bundle_id_fkey  FOREIGN KEY (bundle_id)  REFERENCES hour_bundles(id)
);

-- 5. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id          TEXT        NOT NULL,
  tenant_id   TEXT        NOT NULL,
  company_id  TEXT        NOT NULL,
  project_id  TEXT,
  number      INTEGER     NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'draft',
  issue_date  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_date    TIMESTAMP(3),
  currency    TEXT        NOT NULL DEFAULT 'DKK',
  notes       TEXT,
  created_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT invoices_pkey            PRIMARY KEY (id),
  CONSTRAINT invoices_tenant_number   UNIQUE (tenant_id, number),
  CONSTRAINT invoices_tenant_id_fkey  FOREIGN KEY (tenant_id)  REFERENCES tenants(id)   ON DELETE CASCADE,
  CONSTRAINT invoices_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT invoices_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- 6. INVOICE_LINES
CREATE TABLE IF NOT EXISTS invoice_lines (
  id          TEXT           NOT NULL,
  invoice_id  TEXT           NOT NULL,
  description TEXT           NOT NULL,
  quantity    DECIMAL(10,3)  NOT NULL DEFAULT 1,
  unit_price  DECIMAL(10,2)  NOT NULL DEFAULT 0,
  type        TEXT           NOT NULL DEFAULT 'manual',
  is_credit   BOOLEAN        NOT NULL DEFAULT false,
  sort_order  INTEGER        NOT NULL DEFAULT 0,
  time_log_id TEXT,
  product_id  TEXT,
  CONSTRAINT invoice_lines_pkey           PRIMARY KEY (id),
  CONSTRAINT invoice_lines_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- 7. ACTIVITIES (hvis ikke oprettet endnu)
CREATE TABLE IF NOT EXISTS activities (
  id           TEXT        NOT NULL,
  tenant_id    TEXT        NOT NULL,
  user_id      TEXT        NOT NULL,
  related_type TEXT,
  related_id   TEXT,
  type         TEXT        NOT NULL DEFAULT 'note',
  title        TEXT        NOT NULL,
  notes        TEXT,
  due_at       TIMESTAMP(3),
  completed_at TIMESTAMP(3),
  created_at   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT activities_pkey           PRIMARY KEY (id),
  CONSTRAINT activities_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT activities_user_id_fkey   FOREIGN KEY (user_id)   REFERENCES users(id)
);

-- Bekræft
SELECT 'Migration fuldført ✓' AS status;
