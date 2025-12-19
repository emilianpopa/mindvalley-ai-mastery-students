/**
 * Create Protocols Tables
 * Run this to set up protocol_templates and protocols tables
 */

require('dotenv').config();
const db = require('./db');

async function createTables() {
  try {
    console.log('🔧 Creating protocols tables...\n');

    // Drop existing tables
    console.log('Dropping existing tables if they exist...');
    await db.query(`DROP TABLE IF EXISTS protocols CASCADE`);
    await db.query(`DROP TABLE IF EXISTS protocol_templates CASCADE`);
    console.log('✅ Old tables dropped\n');

    // Create protocol_templates table
    console.log('Creating protocol_templates table...');
    await db.query(`
      CREATE TABLE protocol_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        duration_weeks INTEGER,
        modules JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ protocol_templates table created\n');

    // Create protocols table
    console.log('Creating protocols table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS protocols (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        template_id INTEGER NOT NULL REFERENCES protocol_templates(id) ON DELETE RESTRICT,
        start_date DATE NOT NULL,
        end_date DATE,
        status VARCHAR(50) DEFAULT 'active',
        modules JSONB NOT NULL DEFAULT '[]'::jsonb,
        notes TEXT,
        ai_recommendations TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ protocols table created\n');

    // Create indexes
    console.log('Creating indexes...');
    try {
      await db.query(`CREATE INDEX IF NOT EXISTS idx_protocol_templates_category ON protocol_templates(category)`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_protocols_client_id ON protocols(client_id)`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_protocols_template_id ON protocols(template_id)`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_protocols_status ON protocols(status)`);
      console.log('✅ Indexes created\n');
    } catch (indexError) {
      console.log('⚠️  Some indexes may already exist, continuing...\n');
    }

    // Insert sample protocol templates
    console.log('Inserting sample protocol templates...');

    const sampleTemplates = [
      {
        name: 'Hormone Balance Protocol',
        description: 'Comprehensive protocol for restoring hormonal balance through targeted nutrition, supplementation, and lifestyle modifications.',
        category: 'Hormone Health',
        duration_weeks: 12,
        modules: [
          { week: 1, title: 'Foundation Phase', description: 'Establish baseline labs and initial supplement protocol' },
          { week: 2, title: 'Detox Support', description: 'Liver support and elimination pathways' },
          { week: 4, title: 'Hormone Optimization', description: 'Targeted hormone support based on lab results' },
          { week: 8, title: 'Maintenance', description: 'Long-term hormone balance strategies' }
        ]
      },
      {
        name: 'Gut Healing Protocol',
        description: 'Science-based approach to healing leaky gut and restoring optimal digestive function.',
        category: 'Gut Health',
        duration_weeks: 8,
        modules: [
          { week: 1, title: 'Remove', description: 'Eliminate inflammatory foods and pathogens' },
          { week: 2, title: 'Replace', description: 'Digestive enzyme and HCl support' },
          { week: 4, title: 'Reinoculate', description: 'Probiotic and prebiotic therapy' },
          { week: 6, title: 'Repair', description: 'Gut lining restoration' }
        ]
      },
      {
        name: 'Detox & Cleanse',
        description: 'Gentle yet effective detoxification protocol supporting liver, kidneys, and lymphatic system.',
        category: 'Detox',
        duration_weeks: 4,
        modules: [
          { week: 1, title: 'Prep Phase', description: 'Reduce toxic load and prepare elimination pathways' },
          { week: 2, title: 'Active Detox', description: 'Support phase 1 and phase 2 liver detoxification' },
          { week: 3, title: 'Lymphatic Support', description: 'Drainage and circulation enhancement' },
          { week: 4, title: 'Reintegration', description: 'Gradual return to maintenance diet' }
        ]
      },
      {
        name: 'Energy Optimization',
        description: 'Boost energy levels through mitochondrial support, adrenal restoration, and thyroid optimization.',
        category: 'Energy & Vitality',
        duration_weeks: 10,
        modules: [
          { week: 1, title: 'Assessment', description: 'Energy baseline and contributing factors' },
          { week: 2, title: 'Mitochondrial Support', description: 'CoQ10, PQQ, and cellular energy production' },
          { week: 4, title: 'Adrenal Restoration', description: 'Adaptogenic herbs and stress management' },
          { week: 8, title: 'Thyroid Optimization', description: 'Thyroid support if indicated by labs' }
        ]
      },
      {
        name: 'Weight Management Protocol',
        description: 'Sustainable weight loss through metabolic optimization, hormone balance, and lifestyle coaching.',
        category: 'Weight Management',
        duration_weeks: 16,
        modules: [
          { week: 1, title: 'Metabolic Assessment', description: 'Baseline testing and personalized plan creation' },
          { week: 2, title: 'Insulin Optimization', description: 'Blood sugar stabilization strategies' },
          { week: 6, title: 'Hormone Balance', description: 'Cortisol, thyroid, and sex hormone optimization' },
          { week: 12, title: 'Maintenance Coaching', description: 'Long-term weight maintenance strategies' }
        ]
      }
    ];

    for (const template of sampleTemplates) {
      await db.query(
        `INSERT INTO protocol_templates (name, description, category, duration_weeks, modules)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [template.name, template.description, template.category, template.duration_weeks, JSON.stringify(template.modules)]
      );
      console.log(`   ✅ ${template.name}`);
    }

    console.log('\n✅ Sample templates inserted\n');

    // Verify tables
    console.log('📊 Verifying tables...');
    const templatesCount = await db.query('SELECT COUNT(*) FROM protocol_templates');
    const protocolsCount = await db.query('SELECT COUNT(*) FROM protocols');

    console.log(`   - protocol_templates: ${templatesCount.rows[0].count} records`);
    console.log(`   - protocols: ${protocolsCount.rows[0].count} records`);

    console.log('\n✅ All done! Protocols tables are ready.\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
}

createTables();
