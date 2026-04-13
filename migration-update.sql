-- Nachtrag-Migration: Packliste + fehlende Spalten
-- Auf dem Server ausführen: docker compose exec -T db psql -U dpsg -d dpsg_kurse < migration-update.sql

CREATE TABLE IF NOT EXISTS packliste (
  id SERIAL PRIMARY KEY,
  kurs_id INTEGER REFERENCES kurse(id) ON DELETE CASCADE,
  titel VARCHAR(500) NOT NULL,
  kategorie VARCHAR(100) DEFAULT 'Allgemein',
  pflicht BOOLEAN DEFAULT false,
  sortierung INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packliste_kurs ON packliste(kurs_id);

-- Sicherstellen dass alle Spalten existieren (idempotent)
ALTER TABLE kalkulation_posten ADD COLUMN IF NOT EXISTS phase VARCHAR(50) DEFAULT 'kurs';
ALTER TABLE kalkulation_posten ADD COLUMN IF NOT EXISTS parent_posten_id INTEGER REFERENCES kalkulation_posten(id) ON DELETE CASCADE;
ALTER TABLE kalkulation_posten ADD COLUMN IF NOT EXISTS nummer VARCHAR(20);
ALTER TABLE kalkulation_posten ADD COLUMN IF NOT EXISTS ist_gruppe BOOLEAN DEFAULT false;
ALTER TABLE anmeldungen ADD COLUMN IF NOT EXISTS bundesland VARCHAR(100);
ALTER TABLE anmeldungen ADD COLUMN IF NOT EXISTS funktion VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS todoist_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS todoist_connected_at TIMESTAMP;
ALTER TABLE kurs_team ADD COLUMN IF NOT EXISTS rechte VARCHAR(50) DEFAULT 'mitglied';
