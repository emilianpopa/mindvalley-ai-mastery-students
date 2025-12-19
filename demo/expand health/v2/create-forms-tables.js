require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createFormsTables() {
  const client = await pool.connect();

  try {
    console.log('🔄 Creating forms tables...\n');

    // Drop existing tables (cascade will handle dependencies)
    await client.query(`
      DROP TABLE IF EXISTS form_submissions CASCADE;
      DROP TABLE IF EXISTS form_templates CASCADE;
    `);
    console.log('✅ Dropped existing tables\n');

    // Create form_templates table
    await client.query(`
      CREATE TABLE form_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        status VARCHAR(50) DEFAULT 'draft',
        fields JSONB NOT NULL DEFAULT '[]',
        settings JSONB DEFAULT '{}',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_updated TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Created form_templates table');

    // Create form_submissions table
    await client.query(`
      CREATE TABLE form_submissions (
        id SERIAL PRIMARY KEY,
        form_id INTEGER NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
        client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
        responses JSONB NOT NULL DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'pending',
        submitted_at TIMESTAMP DEFAULT NOW(),
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Created form_submissions table\n');

    // Add indexes
    await client.query(`
      CREATE INDEX idx_form_templates_category ON form_templates(category);
      CREATE INDEX idx_form_templates_status ON form_templates(status);
      CREATE INDEX idx_form_submissions_form_id ON form_submissions(form_id);
      CREATE INDEX idx_form_submissions_client_id ON form_submissions(client_id);
      CREATE INDEX idx_form_submissions_status ON form_submissions(status);
    `);
    console.log('✅ Created indexes\n');

    // Insert sample form templates
    const sampleForms = [
      {
        name: 'PHQ-9 Mental Health Questionnaire',
        description: 'Questionnaire used to screen & diagnose depression and monitor treatment progress',
        category: 'Mental Health',
        status: 'published',
        fields: [
          {
            id: 'q1',
            type: 'radio',
            label: 'Little interest or pleasure in doing things',
            required: true,
            options: [
              { value: '0', label: 'Not at all' },
              { value: '1', label: 'Several days' },
              { value: '2', label: 'More than half the days' },
              { value: '3', label: 'Nearly every day' }
            ]
          },
          {
            id: 'q2',
            type: 'radio',
            label: 'Feeling down, depressed, or hopeless',
            required: true,
            options: [
              { value: '0', label: 'Not at all' },
              { value: '1', label: 'Several days' },
              { value: '2', label: 'More than half the days' },
              { value: '3', label: 'Nearly every day' }
            ]
          },
          {
            id: 'q3',
            type: 'radio',
            label: 'Trouble falling or staying asleep, or sleeping too much',
            required: true,
            options: [
              { value: '0', label: 'Not at all' },
              { value: '1', label: 'Several days' },
              { value: '2', label: 'More than half the days' },
              { value: '3', label: 'Nearly every day' }
            ]
          },
          {
            id: 'q4',
            type: 'radio',
            label: 'Feeling tired or having little energy',
            required: true,
            options: [
              { value: '0', label: 'Not at all' },
              { value: '1', label: 'Several days' },
              { value: '2', label: 'More than half the days' },
              { value: '3', label: 'Nearly every day' }
            ]
          },
          {
            id: 'notes',
            type: 'textarea',
            label: 'Additional notes or concerns',
            required: false,
            placeholder: 'Please share any additional details...'
          }
        ],
        settings: {
          allowMultipleSubmissions: true,
          showProgressBar: true,
          requireLogin: true
        }
      },
      {
        name: 'Onboarding Form (Male)',
        description: "Expand's Onboarding Form, sent to all male clients",
        category: 'Onboarding',
        status: 'published',
        fields: [
          {
            id: 'fullName',
            type: 'text',
            label: 'Full Name',
            required: true
          },
          {
            id: 'dateOfBirth',
            type: 'date',
            label: 'Date of Birth',
            required: true
          },
          {
            id: 'email',
            type: 'email',
            label: 'Email Address',
            required: true
          },
          {
            id: 'phone',
            type: 'tel',
            label: 'Phone Number',
            required: true
          },
          {
            id: 'emergencyContact',
            type: 'text',
            label: 'Emergency Contact Name & Number',
            required: true
          },
          {
            id: 'medicalHistory',
            type: 'textarea',
            label: 'Past Medical History',
            required: true,
            placeholder: 'Please list any previous diagnoses, surgeries, or major health events...'
          },
          {
            id: 'currentMedications',
            type: 'textarea',
            label: 'Current Medications & Supplements',
            required: true,
            placeholder: 'List all medications and supplements you currently take...'
          },
          {
            id: 'allergies',
            type: 'textarea',
            label: 'Allergies',
            required: false,
            placeholder: 'Food, medication, or environmental allergies...'
          },
          {
            id: 'primaryConcern',
            type: 'textarea',
            label: 'What is your primary health concern?',
            required: true,
            placeholder: 'What would you most like help with?'
          },
          {
            id: 'healthGoals',
            type: 'checkbox',
            label: 'Health Goals (select all that apply)',
            required: true,
            options: [
              { value: 'energy', label: 'Increase energy levels' },
              { value: 'sleep', label: 'Improve sleep quality' },
              { value: 'weight', label: 'Weight management' },
              { value: 'hormones', label: 'Hormone balance' },
              { value: 'digestion', label: 'Better digestion' },
              { value: 'mental', label: 'Mental clarity & focus' },
              { value: 'stress', label: 'Stress management' },
              { value: 'athletic', label: 'Athletic performance' }
            ]
          }
        ],
        settings: {
          allowMultipleSubmissions: false,
          showProgressBar: true,
          requireLogin: true,
          sendConfirmationEmail: true
        }
      },
      {
        name: 'Onboarding Form (Female)',
        description: "Expand's Onboarding Form, sent to all female clients",
        category: 'Onboarding',
        status: 'published',
        fields: [
          {
            id: 'fullName',
            type: 'text',
            label: 'Full Name',
            required: true
          },
          {
            id: 'dateOfBirth',
            type: 'date',
            label: 'Date of Birth',
            required: true
          },
          {
            id: 'email',
            type: 'email',
            label: 'Email Address',
            required: true
          },
          {
            id: 'phone',
            type: 'tel',
            label: 'Phone Number',
            required: true
          },
          {
            id: 'emergencyContact',
            type: 'text',
            label: 'Emergency Contact Name & Number',
            required: true
          },
          {
            id: 'menstrualHistory',
            type: 'textarea',
            label: 'Menstrual History',
            required: true,
            placeholder: 'Age of first period, cycle regularity, PMS symptoms, etc.'
          },
          {
            id: 'pregnancyHistory',
            type: 'textarea',
            label: 'Pregnancy & Birth History',
            required: false,
            placeholder: 'Number of pregnancies, births, complications, etc.'
          },
          {
            id: 'medicalHistory',
            type: 'textarea',
            label: 'Past Medical History',
            required: true,
            placeholder: 'Please list any previous diagnoses, surgeries, or major health events...'
          },
          {
            id: 'currentMedications',
            type: 'textarea',
            label: 'Current Medications & Supplements',
            required: true,
            placeholder: 'List all medications and supplements you currently take...'
          },
          {
            id: 'allergies',
            type: 'textarea',
            label: 'Allergies',
            required: false,
            placeholder: 'Food, medication, or environmental allergies...'
          },
          {
            id: 'primaryConcern',
            type: 'textarea',
            label: 'What is your primary health concern?',
            required: true,
            placeholder: 'What would you most like help with?'
          },
          {
            id: 'healthGoals',
            type: 'checkbox',
            label: 'Health Goals (select all that apply)',
            required: true,
            options: [
              { value: 'energy', label: 'Increase energy levels' },
              { value: 'sleep', label: 'Improve sleep quality' },
              { value: 'weight', label: 'Weight management' },
              { value: 'hormones', label: 'Hormone balance' },
              { value: 'digestion', label: 'Better digestion' },
              { value: 'mental', label: 'Mental clarity & focus' },
              { value: 'stress', label: 'Stress management' },
              { value: 'fertility', label: 'Fertility support' }
            ]
          }
        ],
        settings: {
          allowMultipleSubmissions: false,
          showProgressBar: true,
          requireLogin: true,
          sendConfirmationEmail: true
        }
      },
      {
        name: 'Wellbeing Form',
        description: "Expand's Wellbeing Form, sent to all clients",
        category: 'Check-in',
        status: 'published',
        fields: [
          {
            id: 'energyLevel',
            type: 'range',
            label: 'Energy Level (1-10)',
            required: true,
            min: 1,
            max: 10,
            step: 1
          },
          {
            id: 'sleepQuality',
            type: 'range',
            label: 'Sleep Quality (1-10)',
            required: true,
            min: 1,
            max: 10,
            step: 1
          },
          {
            id: 'stressLevel',
            type: 'range',
            label: 'Stress Level (1-10)',
            required: true,
            min: 1,
            max: 10,
            step: 1
          },
          {
            id: 'moodRating',
            type: 'range',
            label: 'Overall Mood (1-10)',
            required: true,
            min: 1,
            max: 10,
            step: 1
          },
          {
            id: 'digestion',
            type: 'radio',
            label: 'How has your digestion been?',
            required: true,
            options: [
              { value: 'excellent', label: 'Excellent - no issues' },
              { value: 'good', label: 'Good - minor occasional issues' },
              { value: 'fair', label: 'Fair - some regular issues' },
              { value: 'poor', label: 'Poor - frequent problems' }
            ]
          },
          {
            id: 'exercise',
            type: 'radio',
            label: 'Exercise frequency this week',
            required: true,
            options: [
              { value: '0', label: 'None' },
              { value: '1-2', label: '1-2 days' },
              { value: '3-4', label: '3-4 days' },
              { value: '5+', label: '5+ days' }
            ]
          },
          {
            id: 'supplements',
            type: 'radio',
            label: 'Supplement compliance',
            required: true,
            options: [
              { value: '100', label: '100% - took all as directed' },
              { value: '75', label: '75% - missed a few doses' },
              { value: '50', label: '50% - inconsistent' },
              { value: '25', label: '25% - rarely took them' }
            ]
          },
          {
            id: 'notes',
            type: 'textarea',
            label: 'Additional notes or concerns',
            required: false,
            placeholder: 'Anything else you want to share with your practitioner?'
          }
        ],
        settings: {
          allowMultipleSubmissions: true,
          showProgressBar: false,
          requireLogin: true
        }
      },
      {
        name: 'Symptoms Form',
        description: "Expand's Symptoms Form",
        category: 'Assessment',
        status: 'published',
        fields: [
          {
            id: 'currentSymptoms',
            type: 'checkbox',
            label: 'Current symptoms (select all that apply)',
            required: true,
            options: [
              { value: 'fatigue', label: 'Fatigue or low energy' },
              { value: 'brain-fog', label: 'Brain fog or difficulty concentrating' },
              { value: 'headaches', label: 'Headaches or migraines' },
              { value: 'insomnia', label: 'Insomnia or poor sleep' },
              { value: 'anxiety', label: 'Anxiety or nervousness' },
              { value: 'depression', label: 'Depression or low mood' },
              { value: 'weight-gain', label: 'Weight gain or difficulty losing weight' },
              { value: 'weight-loss', label: 'Unexplained weight loss' },
              { value: 'bloating', label: 'Bloating or gas' },
              { value: 'constipation', label: 'Constipation' },
              { value: 'diarrhea', label: 'Diarrhea or loose stools' },
              { value: 'acid-reflux', label: 'Acid reflux or heartburn' },
              { value: 'joint-pain', label: 'Joint pain or stiffness' },
              { value: 'muscle-pain', label: 'Muscle pain or weakness' },
              { value: 'hair-loss', label: 'Hair loss or thinning' },
              { value: 'skin-issues', label: 'Skin issues (acne, rashes, etc.)' },
              { value: 'palpitations', label: 'Heart palpitations' },
              { value: 'shortness-breath', label: 'Shortness of breath' }
            ]
          },
          {
            id: 'symptomSeverity',
            type: 'radio',
            label: 'Overall symptom severity',
            required: true,
            options: [
              { value: 'mild', label: 'Mild - minor inconvenience' },
              { value: 'moderate', label: 'Moderate - affects daily activities' },
              { value: 'severe', label: 'Severe - significantly impacts quality of life' }
            ]
          },
          {
            id: 'symptomDuration',
            type: 'text',
            label: 'How long have these symptoms been present?',
            required: true,
            placeholder: 'e.g., 3 months, 2 years, etc.'
          },
          {
            id: 'worseningFactors',
            type: 'textarea',
            label: 'What makes your symptoms worse?',
            required: false,
            placeholder: 'Stress, certain foods, time of day, etc.'
          },
          {
            id: 'improvingFactors',
            type: 'textarea',
            label: 'What makes your symptoms better?',
            required: false,
            placeholder: 'Rest, exercise, certain foods, medications, etc.'
          },
          {
            id: 'additionalDetails',
            type: 'textarea',
            label: 'Additional details',
            required: false,
            placeholder: 'Anything else you think might be relevant?'
          }
        ],
        settings: {
          allowMultipleSubmissions: true,
          showProgressBar: true,
          requireLogin: true
        }
      }
    ];

    for (const form of sampleForms) {
      await client.query(
        `INSERT INTO form_templates (name, description, category, status, fields, settings)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [form.name, form.description, form.category, form.status, JSON.stringify(form.fields), JSON.stringify(form.settings)]
      );
    }
    console.log('✅ Inserted sample form templates\n');

    // Verify
    const result = await client.query('SELECT * FROM form_templates');
    console.log(`📊 Total forms: ${result.rows.length}`);
    result.rows.forEach(form => {
      console.log(`   - ${form.name} (${form.category})`);
    });

    console.log('\n✅ Forms tables created successfully!');

  } catch (error) {
    console.error('❌ Error creating forms tables:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createFormsTables();
