-- Migration to add source_url to songs table
ALTER TABLE songs ADD COLUMN source_url TEXT;
