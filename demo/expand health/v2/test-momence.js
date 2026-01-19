/**
 * Debug script to test Momence API response format
 * Run with: node test-momence.js
 */

require('dotenv').config();
const db = require('./database/db');

async function testMomenceAPI() {
  try {
    // Get the Momence integration from database
    const result = await db.query(`
      SELECT * FROM integrations WHERE platform = 'momence' LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('No Momence integration found in database');
      process.exit(1);
    }

    const integration = result.rows[0];
    console.log('Found integration:');
    console.log('  Host ID:', integration.platform_host_id);
    console.log('  Status:', integration.status);
    console.log('  Last sync:', integration.last_sync_at);
    console.log('');

    // Build the API URL
    const baseUrl = 'https://momence.com/_api/primary/api/v1';
    const customersUrl = `${baseUrl}/Customers?hostId=${integration.platform_host_id}&token=${integration.access_token}&page=1&pageSize=10`;

    console.log('Testing /Customers endpoint...');
    console.log('URL:', customersUrl.replace(integration.access_token, '****'));
    console.log('');

    const response = await fetch(customersUrl);
    console.log('Response status:', response.status, response.statusText);
    console.log('');

    const data = await response.json();

    console.log('Response structure:');
    console.log('  Type:', typeof data);
    console.log('  Is Array:', Array.isArray(data));
    console.log('  Keys:', Object.keys(data));
    console.log('');

    if (data.payload) {
      console.log('  payload type:', typeof data.payload);
      console.log('  payload is array:', Array.isArray(data.payload));
      console.log('  payload length:', data.payload?.length);
    }

    if (data.pagination) {
      console.log('  pagination:', data.pagination);
    }

    // Show first customer if available
    const customers = data.payload || data;
    if (Array.isArray(customers) && customers.length > 0) {
      console.log('');
      console.log('First customer sample:');
      console.log(JSON.stringify(customers[0], null, 2));
    } else if (customers.length === 0) {
      console.log('');
      console.log('No customers returned from API!');
    }

    // Also test Events endpoint
    console.log('\n\nTesting /Events endpoint...');
    const eventsUrl = `${baseUrl}/Events?hostId=${integration.platform_host_id}&token=${integration.access_token}`;

    const eventsResponse = await fetch(eventsUrl);
    console.log('Response status:', eventsResponse.status, eventsResponse.statusText);

    const eventsData = await eventsResponse.json();
    console.log('Events structure:');
    console.log('  Type:', typeof eventsData);
    console.log('  Is Array:', Array.isArray(eventsData));
    if (Array.isArray(eventsData)) {
      console.log('  Length:', eventsData.length);
    } else {
      console.log('  Keys:', Object.keys(eventsData));
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await db.end();
  }
}

testMomenceAPI();
