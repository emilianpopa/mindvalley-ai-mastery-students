/**
 * Seed Demo Clients for ExpandHealth V2
 * Run: node seed-demo-clients.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const demoClients = [
  {
    first_name: 'Sarah',
    last_name: 'Chen',
    email: 'sarah.chen@example.com',
    phone: '+1-415-555-0101',
    date_of_birth: '1987-03-15',
    gender: 'female',
    address: '456 Market Street',
    city: 'San Francisco',
    state: 'CA',
    zip_code: '94102',
    medical_history: 'Hypothyroidism (Hashimoto\'s, diagnosed 5 years ago), PCOS (diagnosed in 20s), Anxiety disorder (managed with therapy)',
    current_medications: 'Levothyroxine 75 mcg daily, Vitamin D 2000 IU daily, Magnesium glycinate 400 mg, B-complex vitamin',
    allergies: 'None known',
    status: 'active'
  },
  {
    first_name: 'Michael',
    last_name: 'Rodriguez',
    email: 'michael.rodriguez@example.com',
    phone: '+1-305-555-0202',
    date_of_birth: '1973-07-22',
    gender: 'male',
    address: '789 Brickell Avenue',
    city: 'Miami',
    state: 'FL',
    zip_code: '33131',
    medical_history: 'Myocardial infarction 8 months ago (LAD stent), Hypertension (10 years), Type 2 Diabetes (5 years), Hyperlipidemia, Family history: Father died of MI at 58',
    current_medications: 'Aspirin 81 mg daily, Atorvastatin 40 mg daily, Metoprolol 50 mg BID, Lisinopril 20 mg daily, Metformin 1000 mg BID, Clopidogrel 75 mg daily',
    allergies: 'None known',
    status: 'active'
  },
  {
    first_name: 'Jennifer',
    last_name: 'Walsh',
    email: 'jennifer.walsh@example.com',
    phone: '+1-602-555-0303',
    date_of_birth: '1970-11-08',
    gender: 'female',
    address: '321 Camelback Road',
    city: 'Phoenix',
    state: 'AZ',
    zip_code: '85016',
    medical_history: 'Menopause (age 51, no HRT currently), Osteopenia (diagnosed 2 years ago), Mother had breast cancer at 62 - patient is BRCA negative, Mild hypertension (controlled with lifestyle)',
    current_medications: 'Calcium 1200 mg + Vitamin D3 2000 IU daily, Fish oil 1000 mg daily, Collagen peptides 10g daily, CoQ10 100 mg daily, Magnesium citrate 400 mg daily',
    allergies: 'Sulfa drugs',
    status: 'active'
  },
  {
    first_name: 'David',
    last_name: 'Kim',
    email: 'david.kim@example.com',
    phone: '+1-206-555-0404',
    date_of_birth: '1978-05-30',
    gender: 'male',
    address: '555 Pike Street',
    city: 'Seattle',
    state: 'WA',
    zip_code: '98101',
    medical_history: 'No significant medical history, Rotator cuff tendinitis (resolved), Knee tendinopathy (ongoing management), Competitive amateur cyclist - possible overtraining syndrome',
    current_medications: 'Whey protein 25g post-workout, Creatine monohydrate 5g daily, Beta-alanine 3.2g daily, Multivitamin, Vitamin D 2000 IU daily, Fish oil 2g daily',
    allergies: 'None known',
    status: 'active'
  }
];

async function seedClients() {
  console.log('🌱 Seeding demo clients...\n');

  for (const client of demoClients) {
    try {
      // Check if client already exists
      const existing = await pool.query(
        'SELECT id FROM clients WHERE email = $1',
        [client.email]
      );

      if (existing.rows.length > 0) {
        console.log(`⏭️  ${client.first_name} ${client.last_name} already exists, skipping...`);
        continue;
      }

      // Insert client
      const result = await pool.query(
        `INSERT INTO clients (
          first_name, last_name, email, phone, date_of_birth, gender,
          address, city, state, zip_code,
          medical_history, current_medications, allergies, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id, first_name, last_name`,
        [
          client.first_name, client.last_name, client.email, client.phone,
          client.date_of_birth, client.gender, client.address, client.city,
          client.state, client.zip_code, client.medical_history,
          client.current_medications, client.allergies, client.status
        ]
      );

      console.log(`✅ Created: ${result.rows[0].first_name} ${result.rows[0].last_name} (ID: ${result.rows[0].id})`);
    } catch (error) {
      console.error(`❌ Error creating ${client.first_name} ${client.last_name}:`, error.message);
    }
  }

  console.log('\n🎉 Done seeding demo clients!');
  await pool.end();
}

seedClients().catch(console.error);
