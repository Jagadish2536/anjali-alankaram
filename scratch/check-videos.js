const { Client } = require('pg');

async function main() {
  const connectionString = 'postgresql://postgres:AnjaliAlankaram2026Secure@anjali-alankaram-db-wiped.c9ww8iywy18f.ap-south-2.rds.amazonaws.com:5432/anjali_alankaram';
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected to database!');
    
    const res = await client.query('SELECT id, name, "videoUrl", "instagramReelUrl" FROM "Product" WHERE "videoUrl" IS NOT NULL OR "instagramReelUrl" IS NOT NULL;');
    console.log('Products with video/reel:', JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
