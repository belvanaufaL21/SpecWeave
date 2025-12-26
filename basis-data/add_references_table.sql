-- Add References Table for Knowledge Base functionality
-- This table stores Gherkin scenario references that can be used to enhance LLM accuracy

CREATE TABLE IF NOT EXISTS scenario_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  gherkin_content TEXT NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'general',
  tags TEXT[],
  usage_count INTEGER DEFAULT 0,
  average_score FLOAT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE scenario_references ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scenario_references
CREATE POLICY "Users can view own references" ON scenario_references
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert own references" ON scenario_references
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own references" ON scenario_references
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own references" ON scenario_references
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for scenario_references
CREATE INDEX IF NOT EXISTS idx_scenario_references_user_id ON scenario_references(user_id);
CREATE INDEX IF NOT EXISTS idx_scenario_references_category ON scenario_references(category);
CREATE INDEX IF NOT EXISTS idx_scenario_references_tags ON scenario_references USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_scenario_references_created_at ON scenario_references(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scenario_references_usage_count ON scenario_references(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_scenario_references_public ON scenario_references(is_public) WHERE is_public = true;

-- Add trigger for updated_at
CREATE TRIGGER update_scenario_references_updated_at BEFORE UPDATE ON scenario_references
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some default system references
INSERT INTO scenario_references (user_id, title, description, gherkin_content, category, tags, is_public) 
SELECT 
  (SELECT id FROM auth.users LIMIT 1), -- Use first user as system user, or we can create a system user
  'Login Authentication',
  'Basic login scenario with email and password validation',
  E'Feature: User Authentication\n\nScenario: Successful login with valid credentials\n  Given pengguna berada di halaman login\n  When pengguna memasukkan email "user@example.com"\n  And pengguna memasukkan password "validpassword"\n  And pengguna mengklik tombol "Login"\n  Then pengguna berhasil masuk ke dashboard\n  And pengguna melihat pesan "Selamat datang"',
  'authentication',
  ARRAY['login', 'authentication', 'security'],
  true
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1);

INSERT INTO scenario_references (user_id, title, description, gherkin_content, category, tags, is_public) 
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Form Validation',
  'Form validation scenario with required fields and error handling',
  E'Feature: Form Validation\n\nScenario: Form submission with missing required fields\n  Given pengguna berada di halaman formulir pendaftaran\n  When pengguna mengosongkan field "Email"\n  And pengguna mengklik tombol "Submit"\n  Then sistem menampilkan pesan error "Email wajib diisi"\n  And formulir tidak terkirim\n  And fokus berpindah ke field "Email"',
  'form',
  ARRAY['validation', 'form', 'error-handling'],
  true
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1);

INSERT INTO scenario_references (user_id, title, description, gherkin_content, category, tags, is_public) 
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'API Integration',
  'API call scenario with success and error handling',
  E'Feature: API Integration\n\nScenario: Successful API data retrieval\n  Given sistem terhubung dengan API eksternal\n  When pengguna meminta data dari endpoint "/api/users"\n  Then sistem mengirim request GET ke API\n  And API mengembalikan status code 200\n  And sistem menerima data dalam format JSON\n  And data ditampilkan kepada pengguna',
  'api',
  ARRAY['api', 'integration', 'http'],
  true
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1);