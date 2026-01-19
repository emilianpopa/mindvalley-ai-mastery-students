const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkDuplicates() {
  // Get all services
  const result = await pool.query(`
    SELECT id, name, price, duration_minutes
    FROM service_types
    WHERE tenant_id = 2
    ORDER BY name, id
  `);

  console.log('All services with HBOT:');
  result.rows.filter(r => r.name.toLowerCase().includes('hbot')).forEach(r => {
    console.log(`id: ${r.id} | name: "${r.name}" | price: ${r.price} | duration: ${r.duration_minutes}`);
  });

  // Find duplicates by normalized name
  const byName = {};
  result.rows.forEach(row => {
    const key = row.name.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!byName[key]) byName[key] = [];
    byName[key].push(row);
  });

  console.log('\n--- Duplicates found: ---');
  const toDelete = [];
  for (const [name, rows] of Object.entries(byName)) {
    if (rows.length > 1) {
      console.log(`\nDUPLICATE: "${name}"`);
      // Keep the one with correct Momence price (higher price usually)
      rows.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
      rows.forEach((r, i) => {
        const status = i === 0 ? 'KEEP' : 'DELETE';
        console.log(`  ${status}: id=${r.id}, price=${r.price}, name="${r.name}"`);
        if (i > 0) toDelete.push(r.id);
      });
    }
  }

  console.log('\n--- IDs to delete: ---');
  console.log(toDelete);

  await pool.end();
}

checkDuplicates();
