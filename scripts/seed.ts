import bcrypt from "bcryptjs";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const pin = process.argv[2] || "1300";
  const email = process.argv[3] || "admin@dpsg1300.de";
  const name = process.argv[4] || "Admin";

  const hash = await bcrypt.hash(pin, 10);
  await pool.query(
    `INSERT INTO users (email, pin_hash, name, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE SET pin_hash = $2, name = $3`,
    [email.toLowerCase(), hash, name]
  );
  console.log(`✓ User ${email} angelegt mit PIN ${pin}`);
  await pool.end();
}

seed().catch(e => { console.error(e); process.exit(1); });
