require('dotenv').config();
const { Pool } = require('pg');

// Use production database URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const practitioners = [
  { first_name: 'Avela', last_name: 'Jafta', email: 'avela.jafta@expandhealth.co.za', title: 'Practitioner' },
  { first_name: 'Fred', last_name: 'van der Riet', email: 'fredvanderriet0@gmail.com', title: 'Practitioner' },
  { first_name: 'Jack', last_name: 'Harland', email: 'jack@expand.health', title: 'Practitioner' },
  { first_name: 'Jean', last_name: 'Theron', email: 'jean.theron@expandhealth.co.za', title: 'Practitioner' },
  { first_name: 'Karrin', last_name: 'Bamber', email: 'karrin.bamber@expandhealth.co.za', title: 'Practitioner' },
  { first_name: 'Maryke', last_name: 'Gallagher', email: 'maryke.gallagher@expandhealth.co.za', title: 'Practitioner' },
  { first_name: 'Maryke', last_name: 'Korsten', email: 'maryke.korsten@expandhealth.co.za', title: 'Practitioner' },
  { first_name: 'Melody', last_name: 'Fourie', email: 'melody@nourishedwellbeing.co.za', title: 'Practitioner' },
  { first_name: 'Savanah', last_name: 'Abramovitz', email: 'savanah.abramovitz@expandhealth.co.za', title: 'Practitioner' },
  { first_name: 'Sebastian', last_name: 'Hitchcock', email: 'sebastian.hitchcock@expandhealth.co.za', title: 'Practitioner' },
  { first_name: 'Shehaam', last_name: 'Jacobs', email: 'shehaam.jacobs@expand.health', title: 'Practitioner' },
  { first_name: 'Sasha-Lee', last_name: 'Rocher', email: 'sasha.roscher@expandhealth.co.za', title: 'Practitioner' },
  { first_name: 'Kristal', last_name: 'Kellock', email: 'kristal.kellock@expandhealth.co.za', title: 'Practitioner' },
  { first_name: 'Anesu', last_name: 'Mbizvo', email: 'dranesu.mbizvo@expandhealth.co.za', title: 'Practitioner' },
  { first_name: 'Carmen', last_name: 'Heunis', email: 'carmen.heunis@expandhealth.co.za', title: 'Practitioner' }
];

function generateColor() {
  const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6'];
  return colors[Math.floor(Math.random() * colors.length)];
}

async function addPractitioners() {
  console.log('Connecting to database...');
  
  // First check if any exist
  const existing = await pool.query('SELECT email FROM staff WHERE email = ANY($1)', 
    [practitioners.map(p => p.email)]);
  const existingEmails = existing.rows.map(r => r.email);
  console.log('Existing practitioners:', existingEmails.length);
  
  for (const p of practitioners) {
    if (existingEmails.includes(p.email)) {
      console.log('Skipping (exists):', p.first_name, p.last_name);
      continue;
    }
    
    try {
      const result = await pool.query(`
        INSERT INTO staff (first_name, last_name, email, title, is_active, accepts_bookings, color)
        VALUES ($1, $2, $3, $4, true, true, $5)
        RETURNING id, first_name, last_name
      `, [p.first_name, p.last_name, p.email, p.title, generateColor()]);
      
      console.log('Added:', result.rows[0].first_name, result.rows[0].last_name);
    } catch (error) {
      console.error('Error adding', p.first_name, p.last_name, ':', error.message);
    }
  }
  
  await pool.end();
  console.log('Done!');
}

addPractitioners();
