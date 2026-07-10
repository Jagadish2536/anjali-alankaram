const { Client } = require('pg');

async function checkDatabase(dbName) {
  const connectionString = `postgresql://postgres:AnjaliAlankaram2026Secure@anjali-alankaram-db-wiped.c9ww8iywy18f.ap-south-2.rds.amazonaws.com:5432/${dbName}`;
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log(`\n=================== Database: ${dbName} ===================`);
    
    // Get all tables and their row counts
    const resTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    const tables = resTables.rows.map(r => r.table_name);
    console.log('Tables found:', tables);
    
    for (const table of tables) {
      try {
        const resCount = await client.query(`SELECT COUNT(*) FROM "${table}";`);
        console.log(`  Table: ${table} | Count: ${resCount.rows[0].count}`);
        if (resCount.rows[0].count > 0 && table.toLowerCase() === 'product') {
          const sample = await client.query(`SELECT id, name, price FROM "${table}" LIMIT 1;`);
          console.log(`    Sample:`, sample.rows[0]);
        }
      } catch (err) {
        console.error(`  Error counting ${table}:`, err.message);
      }
    }
  } catch (err) {
    console.error(`❌ Error connecting to database ${dbName}:`, err.message);
  } finally {
    await client.end();
  }
}

async function main() {
  // First connect to default 'postgres' database to list all databases
  const client = new Client({
    connectionString: 'postgresql://postgres:AnjaliAlankaram2026Secure@anjali-alankaram-db-wiped.c9ww8iywy18f.ap-south-2.rds.amazonaws.com:5432/postgres'
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to PG Default instance!');
    
    const resDbs = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
    const dbs = resDbs.rows.map(r => r.datname);
    console.log('Databases list in PG instance:', dbs);
    
    await client.end();
    
    for (const db of dbs) {
      await checkDatabase(db);
    }
  } catch (err) {
    console.error('❌ Default connection failed:', err.message);
    try { await client.end(); } catch (_) {}
  }
}

main();
