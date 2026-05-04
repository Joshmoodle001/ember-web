-- Supabase SQL Setup for Ember Web
-- Run this in your Supabase SQL Editor after creating a project

-- Create contact_submissions table
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  service TEXT,
  budget TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow inserts from anon users (via the API route)
CREATE POLICY "Allow anonymous inserts" ON contact_submissions
  FOR INSERT
  WITH CHECK (true);

-- Create policy to allow reads only for authenticated users (admin)
CREATE POLICY "Allow authenticated reads" ON contact_submissions
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create index on created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions (created_at DESC);