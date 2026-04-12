-- DPSG Kursmanagement — Datenbankschema
-- Manuelle Migration, kein Prisma migrate

-- Benutzer (Dual-Auth: Azure AD + PIN)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  pin_hash VARCHAR(255),           -- NULL = nur Azure AD Login
  role VARCHAR(50) DEFAULT 'user', -- tenant_admin, admin, user
  azure_oid VARCHAR(255),          -- Azure AD Object ID
  avatar_url TEXT,
  todoist_token TEXT,              -- Todoist OAuth Token (pro User)
  todoist_connected_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Kurse
CREATE TABLE IF NOT EXISTS kurse (
  id SERIAL PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  beschreibung TEXT,
  status VARCHAR(50) DEFAULT 'planung', -- planung, ausgeschrieben, laufend, abgeschlossen, archiviert
  start_datum DATE,
  end_datum DATE,
  team_vorlauf_tage INTEGER DEFAULT 1,
  ort VARCHAR(500),
  haus_id VARCHAR(100),             -- Referenz auf Hausdatenbank
  verpflegung VARCHAR(20) DEFAULT 'vp', -- vp, hp, sv, keine
  max_teilnehmende INTEGER,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Kurs-Team (Teamende/Kursleitung) mit Berechtigungen
CREATE TABLE IF NOT EXISTS kurs_team (
  id SERIAL PRIMARY KEY,
  kurs_id INTEGER REFERENCES kurse(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  rolle VARCHAR(100) NOT NULL,      -- kursleitung, referentin, kueche, awareness, helfer
  rechte VARCHAR(50) DEFAULT 'mitglied', -- kurs_admin, kursleitung, mitglied, kueche_only
  name VARCHAR(255),                -- Falls kein User-Account
  email VARCHAR(255),
  telefon VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Teilnehmer*innen-Portal Tokens (Login ohne Account)
CREATE TABLE IF NOT EXISTS tn_tokens (
  id SERIAL PRIMARY KEY,
  anmeldung_id INTEGER REFERENCES anmeldungen(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '90 days'
);

-- Fahrgemeinschaften
CREATE TABLE IF NOT EXISTS fahrgemeinschaften (
  id SERIAL PRIMARY KEY,
  kurs_id INTEGER REFERENCES kurse(id) ON DELETE CASCADE,
  erstellt_von INTEGER REFERENCES anmeldungen(id),
  richtung VARCHAR(20) NOT NULL,    -- hin, rueck, beides
  abfahrtsort VARCHAR(500) NOT NULL,
  abfahrtszeit TIMESTAMP,
  plaetze_gesamt INTEGER DEFAULT 4,
  beschreibung TEXT,
  kontakt_name VARCHAR(255),
  kontakt_telefon VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fahrgemeinschaft_mitglieder (
  id SERIAL PRIMARY KEY,
  fahrgemeinschaft_id INTEGER REFERENCES fahrgemeinschaften(id) ON DELETE CASCADE,
  anmeldung_id INTEGER REFERENCES anmeldungen(id),
  name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'angefragt', -- angefragt, bestaetigt, abgelehnt
  created_at TIMESTAMP DEFAULT NOW()
);

-- Kurs-Varianten (Szenarien für Planung)
CREATE TABLE IF NOT EXISTS varianten (
  id SERIAL PRIMARY KEY,
  kurs_id INTEGER REFERENCES kurse(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,         -- z.B. "Burg Schwaneck, 25 TN"
  beschreibung TEXT,
  ist_aktiv BOOLEAN DEFAULT false,    -- Gewählte Variante
  tn_anzahl INTEGER DEFAULT 25,
  teamende_anzahl INTEGER DEFAULT 6,
  naechte INTEGER DEFAULT 7,
  team_vorlauf INTEGER DEFAULT 1,
  haus_id VARCHAR(100),
  verpflegung VARCHAR(20) DEFAULT 'vp',
  ue_pro_nacht NUMERIC(10,2) DEFAULT 0,
  vp_pro_tag NUMERIC(10,2) DEFAULT 0,
  farbe VARCHAR(20) DEFAULT '#003056', -- Für Vergleichsansicht
  sortierung INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Kalkulation / Budget
CREATE TABLE IF NOT EXISTS kalkulation (
  id SERIAL PRIMARY KEY,
  kurs_id INTEGER REFERENCES kurse(id) ON DELETE CASCADE,
  variante_id INTEGER REFERENCES varianten(id) ON DELETE CASCADE,
  version INTEGER DEFAULT 1,
  ist_aktiv BOOLEAN DEFAULT true,
  ue_pro_nacht NUMERIC(10,2) DEFAULT 0,
  vp_pro_tag NUMERIC(10,2) DEFAULT 0,
  tn_beitrag NUMERIC(10,2) DEFAULT 0,
  auto_calc_beitrag BOOLEAN DEFAULT true,
  notizen TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kalkulation_posten (
  id SERIAL PRIMARY KEY,
  kalkulation_id INTEGER REFERENCES kalkulation(id) ON DELETE CASCADE,
  typ VARCHAR(20) NOT NULL,         -- ausgabe, einnahme
  kategorie VARCHAR(100) NOT NULL,
  bezeichnung VARCHAR(500) NOT NULL,
  betrag NUMERIC(10,2) DEFAULT 0,
  ist_auto BOOLEAN DEFAULT false,   -- automatisch berechnet (ÜN/VP)
  auto_typ VARCHAR(20),             -- ue, vp
  sortierung INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Häuser-Datenbank
CREATE TABLE IF NOT EXISTS haeuser (
  id SERIAL PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  region VARCHAR(255),
  adresse TEXT,
  url TEXT,
  uebernachtung NUMERIC(10,2) DEFAULT 0,
  vollpension NUMERIC(10,2) DEFAULT 0,
  halbpension NUMERIC(10,2) DEFAULT 0,
  selbstversorger NUMERIC(10,2) DEFAULT 0,
  max_personen INTEGER,
  notizen TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Räume (pro Haus)
CREATE TABLE IF NOT EXISTS raeume (
  id SERIAL PRIMARY KEY,
  haus_id INTEGER REFERENCES haeuser(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  kapazitaet INTEGER,
  ausstattung TEXT,                  -- Beamer, Flipchart, Tische, etc.
  stockwerk VARCHAR(50),
  notizen TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tagesplan / Programmablauf
CREATE TABLE IF NOT EXISTS programm (
  id SERIAL PRIMARY KEY,
  kurs_id INTEGER REFERENCES kurse(id) ON DELETE CASCADE,
  variante_id INTEGER REFERENCES varianten(id) ON DELETE CASCADE,
  tag_nummer INTEGER NOT NULL,       -- Tag 1, 2, 3...
  tag_titel VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS programm_block (
  id SERIAL PRIMARY KEY,
  programm_id INTEGER REFERENCES programm(id) ON DELETE CASCADE,
  start_zeit TIME NOT NULL,
  end_zeit TIME NOT NULL,
  titel VARCHAR(500) NOT NULL,
  beschreibung TEXT,
  raum VARCHAR(255),
  verantwortlich VARCHAR(255),
  typ VARCHAR(50) DEFAULT 'programm', -- programm, pause, essen, freizeit, plenum
  farbe VARCHAR(20),
  sortierung INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Anmeldungen
CREATE TABLE IF NOT EXISTS anmeldungen (
  id SERIAL PRIMARY KEY,
  kurs_id INTEGER REFERENCES kurse(id) ON DELETE CASCADE,
  vorname VARCHAR(255) NOT NULL,
  nachname VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  telefon VARCHAR(100),
  geburtsdatum DATE,
  stamm VARCHAR(255),               -- DPSG-Stamm
  bezirk VARCHAR(255),
  dioezese VARCHAR(255),
  bundesland VARCHAR(100),            -- Für KJP-Listen
  strasse VARCHAR(500),
  plz VARCHAR(10),
  ort VARCHAR(255),
  ernaehrung VARCHAR(100),           -- normal, vegetarisch, vegan, halal, koscher
  allergien TEXT,
  unvertraeglichkeiten TEXT,
  efz_vorhanden BOOLEAN DEFAULT false,
  efz_datum DATE,
  agb_akzeptiert BOOLEAN DEFAULT false,
  datenschutz_akzeptiert BOOLEAN DEFAULT false,
  foto_erlaubnis BOOLEAN DEFAULT false,
  anmerkungen TEXT,
  funktion VARCHAR(255),              -- Für KJP-Listen (Aufgabe/Funktion)
  status VARCHAR(50) DEFAULT 'eingegangen', -- eingegangen, bestaetigt, warteliste, storniert
  bezahlt BOOLEAN DEFAULT false,
  bezahlt_am TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Aufgaben-Buckets (anpassbare Spalten)
CREATE TABLE IF NOT EXISTS buckets (
  id SERIAL PRIMARY KEY,
  kurs_id INTEGER REFERENCES kurse(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  farbe VARCHAR(20) DEFAULT '#003056',
  sortierung INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Aufgaben
CREATE TABLE IF NOT EXISTS aufgaben (
  id SERIAL PRIMARY KEY,
  kurs_id INTEGER REFERENCES kurse(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES aufgaben(id) ON DELETE CASCADE,
  titel VARCHAR(500) NOT NULL,
  beschreibung TEXT,
  zugewiesen_an INTEGER REFERENCES users(id),
  zugewiesen_name VARCHAR(255),      -- Falls kein User-Account
  status VARCHAR(50) DEFAULT 'offen', -- offen, in_bearbeitung, erledigt
  prioritaet VARCHAR(20) DEFAULT 'mittel', -- niedrig, mittel, hoch, dringend
  deadline DATE,
  phase VARCHAR(50),                 -- vorbereitung, waehrend, nachbereitung
  todoist_id VARCHAR(100),           -- Todoist-Sync
  sortierung INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Dateien
CREATE TABLE IF NOT EXISTS dateien (
  id SERIAL PRIMARY KEY,
  kurs_id INTEGER REFERENCES kurse(id) ON DELETE CASCADE,
  name VARCHAR(500) NOT NULL,
  pfad TEXT NOT NULL,
  mime_type VARCHAR(100),
  groesse INTEGER,
  kategorie VARCHAR(100),            -- konzept, genehmigung, versicherung, foto, sonstiges
  hochgeladen_von INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  aktion VARCHAR(100) NOT NULL,
  tabelle VARCHAR(100),
  datensatz_id INTEGER,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_varianten_kurs ON varianten(kurs_id);
CREATE INDEX IF NOT EXISTS idx_kurse_status ON kurse(status);
CREATE INDEX IF NOT EXISTS idx_anmeldungen_kurs ON anmeldungen(kurs_id);
CREATE INDEX IF NOT EXISTS idx_aufgaben_kurs ON aufgaben(kurs_id);
CREATE INDEX IF NOT EXISTS idx_aufgaben_status ON aufgaben(status);
CREATE INDEX IF NOT EXISTS idx_kalkulation_kurs ON kalkulation(kurs_id);
CREATE INDEX IF NOT EXISTS idx_programm_kurs ON programm(kurs_id);
CREATE INDEX IF NOT EXISTS idx_tn_tokens_token ON tn_tokens(token);
CREATE INDEX IF NOT EXISTS idx_fahrgemeinschaften_kurs ON fahrgemeinschaften(kurs_id);

-- Seed: Häuser
INSERT INTO haeuser (name, region, adresse, url, uebernachtung, vollpension, halbpension, selbstversorger, max_personen, notizen) VALUES
  -- Bayern (bestehend)
  ('Burg Schwaneck', 'Oberbayern', NULL, NULL, 18, 38, 28, 12, 80, NULL),
  ('Max-Mannheimer-Haus', 'Oberbayern', NULL, NULL, 22, 42, 32, 14, 60, NULL),
  ('Jugendsiedlung Hochland', 'Oberbayern', NULL, NULL, 16, 35, 25, 10, 120, NULL),
  ('Haus am Sudelfeld', 'Oberbayern', NULL, NULL, 20, 40, 30, 15, 45, NULL),
  ('Jugendhaus Josefstal', 'Oberbayern', NULL, NULL, 24, 45, 35, 16, 70, NULL),
  ('Don Bosco Haus', 'München', NULL, NULL, 15, 32, 22, 9, 40, NULL),
  ('Haus Königsdorf', 'Oberbayern', NULL, NULL, 19, 36, 26, 11, 90, NULL),
  ('Aktionszentrum Benediktbeuern', 'Oberbayern', NULL, NULL, 21, 39, 29, 13, 100, NULL),
  -- Neue Häuser
  ('Forsthaus Eggerode', 'Harz (Sachsen-Anhalt)', '38889 Wienrode', 'https://www.forsthaus-eggerode.de', 18.50, 38, 0, 18.50, 41, 'DPSG-Haus, DV Magdeburg. 15% Rabatt für DPSG. Forsthaus 17 Betten + 4 Gruppenhäuser je 6 Betten. Seminarraum 35€/Nacht. Zeltplatz 5.50€/Nacht. Preise gültig bis 31.12.2026.'),
  ('Das Kreuzle', 'Baden-Württemberg', 'Bretzfelderstraße 31, 71543 Wüstenrot', 'https://www.daskreuzle.de', 16, 0, 0, 16, 43, 'Privates Selbstverpflegerhaus. 43 Betten, 5 Gruppenräume, Gastroküche. Nur komplett buchbar, min. 25 Personen. WE min. 2 Nächte. Kontakt: info@daskreuzle.de'),
  -- Aus Häuser-Liste (Preise manuell nachtragen)
  ('Epscheider Mühle', 'NRW', NULL, 'https://www.epscheidermuehle.de', 0, 0, 0, 0, 0, 'Kontakt: info@epscheidermuehle.de'),
  ('Hasenheide', 'Brandenburg', NULL, 'https://hasenheide-freizeit.de', 0, 0, 0, 0, 0, NULL),
  ('Nibelungenturm', 'Hessen', NULL, 'https://nibelungenturm.de', 0, 0, 0, 0, 0, NULL),
  ('Jugendhaus Windrad', 'NRW', NULL, 'https://www.jugendhaus-windrad.de', 0, 0, 0, 0, 0, NULL),
  ('Georgshütte Haltern', 'NRW', NULL, NULL, 0, 0, 0, 0, 0, 'Halle + Weberei/Teamerwohnung. Kontakt: info@gilwell-st-ludger.de'),
  ('Bundeszentrum Westernohe', 'Rheinland-Pfalz', NULL, NULL, 0, 0, 0, 0, 0, 'Zeltplatz + Trupphaus + Mehrzweckhalle. Kontakt: tobias.schmidt@dpsg.de'),
  ('Tagungshaus Güby', 'Schleswig-Holstein', NULL, NULL, 0, 0, 0, 0, 0, 'Weit weg — nicht Prio 1. Kontakt: tagungshaus.gueby@web.de'),
  ('Sirksfelder Schule', 'NRW', NULL, NULL, 0, 0, 0, 0, 0, 'Kontakt: info@sirksfelder-schule.de'),
  ('Forsthaus Haidberg', 'Bayern', NULL, NULL, 0, 0, 0, 0, 0, 'Kontakt: info@forsthaus-haidberg.de'),
  ('EKI Hornberg', 'Baden-Württemberg', NULL, NULL, 0, 0, 0, 0, 0, 'Kontakt: hornberg@kbz.ekiba.de'),
  ('VCP Schachen', 'Baden-Württemberg', NULL, 'https://www.vcp-schachen.de', 0, 0, 0, 0, 0, 'Kontakt: vcp@wuerttemberg.vcp.de'),
  ('Kloster Jakobsberg', 'Rheinland-Pfalz', NULL, 'https://bistummainz.de/einrichtungen/kloster-jakobsberg/jugendhaus/', 0, 0, 0, 0, 0, NULL),
  ('Freizeitheim UHU', 'Hessen', NULL, 'https://uhu.evangelisch-hochtaunus.de', 0, 0, 0, 0, 0, NULL),
  ('Donnerskopf', 'Hessen', NULL, 'https://donnerskopf.de', 0, 0, 0, 0, 0, NULL),
  ('JGH Lütjensee', 'Schleswig-Holstein', NULL, 'https://www.jgh-luetjensee.de', 0, 0, 0, 0, 0, 'Selbstverpflegung'),
  ('Burg Wilenstein', 'Rheinland-Pfalz', NULL, 'https://www.burgwilenstein.de', 0, 0, 0, 0, 0, NULL),
  ('Naturerlebniszentrum Wappenschmiede', 'Rheinland-Pfalz', NULL, 'http://www.wappenschmiede.de', 0, 0, 0, 0, 0, NULL),
  ('Burg Steinegg', 'Baden-Württemberg', NULL, 'https://www.evkirche-pf.de/angebote-einrichtungen/burg-steinegg/', 0, 0, 0, 0, 0, NULL),
  ('Wasserschloss Wülmersen', 'Hessen', NULL, 'https://www.wasserschloss-wuelmersen.de', 0, 0, 0, 0, 0, NULL),
  ('Bahnhof Garbeck', 'NRW', NULL, NULL, 0, 0, 0, 0, 0, 'Kontakt: info@bahnhof-garbeck.de'),
  ('VCP Westfalen', 'NRW', NULL, NULL, 0, 0, 0, 0, 0, 'Beide Häuser. Kontakt: verwaltung@vcp-westfalen.de'),
  ('Heinrich-Rabbich-Haus', 'NRW', NULL, NULL, 0, 0, 0, 0, 0, 'Kontakt: info@heinrich-rabbich-haus.de'),
  ('Raumünzach', 'Baden-Württemberg', NULL, 'https://www.raumuenzach.de', 0, 0, 0, 0, 0, NULL)
ON CONFLICT DO NOTHING;
