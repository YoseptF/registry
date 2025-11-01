-- Enable Realtime for check_ins table
-- Run this in your Supabase SQL Editor

-- First, enable replication for the check_ins table
alter publication supabase_realtime add table check_ins;

-- Verify it's enabled (should show check_ins in the list)
select * from pg_publication_tables where pubname = 'supabase_realtime';
