const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function deleteDuplicates() {
  const idsToDelete = [117, 110, 139, 144, 143];

  console.log('Deleting duplicate services with IDs:', idsToDelete);

  const result = await pool.query(
    'DELETE FROM service_types WHERE id = ANY($1) RETURNING id, name, price',
    [idsToDelete]
  );

  console.log('\nDeleted:');
  result.rows.forEach(r => {
    console.log(`  - id=${r.id}: "${r.name}" (ZAR ${r.price})`);
  });

  console.log(`\nTotal deleted: ${result.rowCount}`);

  await pool.end();
}

deleteDuplicates();
