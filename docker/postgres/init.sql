-- PostgreSQL inicijalizacija za K1.ba

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Full-text search optimization
CREATE INDEX IF NOT EXISTS articles_title_trgm ON articles USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS articles_content_trgm ON articles USING gin(content gin_trgm_ops);
