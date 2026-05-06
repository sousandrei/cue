-- Migration to add tags to songs table
ALTER TABLE songs ADD COLUMN tags TEXT;
