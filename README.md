# DPSG Kursmanagement

Kursplanung, Kalkulation, Anmeldung und Organisation für DPSG-Kurse und Großveranstaltungen.

## Features

- **Kalkulation & Budget** — Automatische Berechnung mit Häuser-Datenbank, Kostenverteilung, TN-Beitrag
- **Kursorganisation** — Tagesplan, Wochenübersicht, Zeitblöcke
- **Anmeldung** — Öffentliches Formular mit Ernährung, eFZ, AGB-Bestätigung
- **Aufgabenmanagement** — Gantt-Diagramm, Deadlines, Todoist-Anbindung
- **Teamverwaltung** — Rollen, Kontaktdaten, Awareness-Team
- **Dateiablage** — Dokumente pro Kurs

## Tech Stack

- Next.js 15, React 19, TypeScript
- Tailwind CSS v4 (DPSG Design System)
- PostgreSQL 16
- Docker + Traefik
- Dual Auth: Azure AD SSO + E-Mail/PIN

## Setup

```bash
cp .env.example .env
# .env bearbeiten: DB_PASSWORD, AUTH_SECRET, Azure AD Credentials

docker compose up -d --build

# Admin-User anlegen
docker compose exec app node -e "
const b=require('bcryptjs'),{Pool}=require('pg');
const p=new Pool({connectionString:process.env.DATABASE_URL});
b.hash('1300',10).then(h=>p.query(\"INSERT INTO users(email,pin_hash,name,role) VALUES(\\$1,\\$2,'Admin','admin') ON CONFLICT(email) DO UPDATE SET pin_hash=\\$2\",['admin@dpsg1300.de',h]).then(()=>{console.log('OK');p.end()}))
"
```

## Lizenz

Intern — DPSG Diözesanverband München und Freising
