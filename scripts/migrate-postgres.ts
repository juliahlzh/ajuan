import { ensureDatabase, sql } from '../src/lib/db';

async function main() {
  await ensureDatabase();
  await sql.end();
  console.log('Migrasi schema Postgres selesai.');
}

main().catch(async (error) => {
  console.error('Migrasi gagal:', error);
  await sql.end();
  process.exit(1);
});
