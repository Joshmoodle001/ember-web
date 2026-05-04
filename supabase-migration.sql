-- =====================================================
-- EMBER WEB - COMPLETE SUPABASE MIGRATION
-- Safe to re-run — uses IF NOT EXISTS throughout
-- =====================================================

-- ===========================
-- 1. CLIENTS TABLE
-- ===========================
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  company TEXT,
  phone TEXT,
  status TEXT DEFAULT 'lead' CHECK (status IN ('lead', 'active', 'inactive', 'archived')),
  notes TEXT,
  access_token TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'Service role full access on clients') THEN
    CREATE POLICY "Service role full access on clients" ON clients FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_access_token ON clients(access_token);
UPDATE clients SET access_token = encode(gen_random_bytes(24), 'hex') WHERE access_token IS NULL;

-- ===========================
-- 2. ADMINS TABLE
-- ===========================
CREATE TABLE IF NOT EXISTS admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role TEXT DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'developer', 'designer')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  assigned_projects JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admins' AND policyname = 'Service role full access on admins') THEN
    CREATE POLICY "Service role full access on admins" ON admins FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
INSERT INTO admins (name, email, role, status) VALUES
  ('Josh Moodley', 'joshmoodley01@gmail.com', 'super_admin', 'active')
ON CONFLICT (email) DO NOTHING;

-- ===========================
-- 3. PROJECTS TABLE
-- ===========================
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  service_type TEXT,
  status TEXT DEFAULT 'inquiry' CHECK (status IN ('inquiry', 'proposal', 'deposit', 'in_progress', 'review', 'delivered', 'completed', 'on_hold', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  budget NUMERIC DEFAULT 0,
  paid NUMERIC DEFAULT 0,
  due_date DATE,
  notes TEXT,
  assigned_to UUID,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  client_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Service role full access on projects') THEN
    CREATE POLICY "Service role full access on projects" ON projects FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_assigned ON projects(assigned_to);

-- ===========================
-- 4. PAYMENTS TABLE
-- ===========================
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'ZAR',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'complete', 'failed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Service role full access on payments') THEN
    CREATE POLICY "Service role full access on payments" ON payments FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ===========================
-- 5. INVOICES TABLE
-- ===========================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  items JSONB DEFAULT '[]',
  subtotal NUMERIC DEFAULT 0,
  vat NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  due_date DATE,
  notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'Service role full access on invoices') THEN
    CREATE POLICY "Service role full access on invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- ===========================
-- 6. CONTACT SUBMISSIONS TABLE
-- ===========================
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  service TEXT,
  budget TEXT,
  message TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'spam')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contact_submissions' AND policyname = 'Service role full access on contact_submissions') THEN
    CREATE POLICY "Service role full access on contact_submissions" ON contact_submissions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_email ON contact_submissions(email);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created ON contact_submissions(created_at DESC);

-- ===========================
-- 7. ACTIVITY LOG TABLE
-- ===========================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_log' AND policyname = 'Service role full access on activity_log') THEN
    CREATE POLICY "Service role full access on activity_log" ON activity_log FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

-- ===========================
-- 8. TESTIMONIALS TABLE
-- ===========================
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  role TEXT,
  content TEXT NOT NULL,
  rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  avatar_url TEXT,
  featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'hidden')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'testimonials' AND policyname = 'Service role full access on testimonials') THEN
    CREATE POLICY "Service role full access on testimonials" ON testimonials FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'testimonials' AND policyname = 'Public read approved testimonials') THEN
    CREATE POLICY "Public read approved testimonials" ON testimonials FOR SELECT USING (status = 'approved');
  END IF;
END $$;

-- ===========================
-- 9. PROJECT MILESTONES TABLE
-- ===========================
CREATE TABLE IF NOT EXISTS project_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  order_num INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_milestones' AND policyname = 'Service role full access on project_milestones') THEN
    CREATE POLICY "Service role full access on project_milestones" ON project_milestones FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_milestones_project ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_order ON project_milestones(project_id, order_num);

-- ===========================
-- 10. PROJECT FILES TABLE
-- ===========================
CREATE TABLE IF NOT EXISTS project_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_files' AND policyname = 'Service role full access on project_files') THEN
    CREATE POLICY "Service role full access on project_files" ON project_files FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id);

-- ===========================
-- 11. STORAGE BUCKET
-- ===========================
INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public read project files') THEN
    CREATE POLICY "Public read project files" ON storage.objects FOR SELECT USING (bucket_id = 'project-files');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Service role upload project files') THEN
    CREATE POLICY "Service role upload project files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'project-files' AND auth.role() = 'service_role');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Service role delete project files') THEN
    CREATE POLICY "Service role delete project files" ON storage.objects FOR DELETE USING (bucket_id = 'project-files' AND auth.role() = 'service_role');
  END IF;
END $$;