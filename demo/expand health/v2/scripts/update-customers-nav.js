/**
 * Script to update all views with the Customers dropdown navigation
 */

const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, '..', 'views');

const newNav = `<div class="nav-dropdown">
            <div class="nav-dropdown-trigger">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              <span>Customers</span>
              <svg class="nav-dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
            <div class="nav-dropdown-menu">
              <div class="nav-dropdown-header">CUSTOMERS</div>
              <div class="nav-dropdown-section">CRM</div>
              <a href="/customers" class="nav-dropdown-item">Customer list</a>
              <div class="nav-dropdown-section">ORGANIZATION</div>
              <a href="/customers/custom-fields" class="nav-dropdown-item">Custom info fields</a>
              <a href="/customers/tags" class="nav-dropdown-item">Tags</a>
              <a href="/customers/notes" class="nav-dropdown-item">Notes</a>
              <a href="/forms" class="nav-dropdown-item">Intake forms</a>
              <div class="nav-dropdown-section">SET-UP</div>
              <a href="/customers/payment-plans" class="nav-dropdown-item">Payment plans</a>
            </div>
          </div>`;

// Regex to match the Customers nav item with flexible whitespace
const oldNavRegex = /<a href="\/customers" class="nav-item">\s*<svg[^>]*>.*?<\/svg>\s*<span>Customers<\/span>\s*<\/a>/gs;

// Get all HTML files in views directory
const files = fs.readdirSync(viewsDir).filter(f => f.endsWith('.html'));

let updated = 0;
let skipped = 0;

files.forEach(file => {
  // Skip customers.html as it already has the dropdown
  if (file === 'customers.html' || file === 'customer-tags.html' ||
      file === 'customer-custom-fields.html' || file === 'customer-notes.html' ||
      file === 'customer-payment-plans.html') {
    skipped++;
    return;
  }

  const filePath = path.join(viewsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  if (oldNavRegex.test(content)) {
    // Reset regex lastIndex
    oldNavRegex.lastIndex = 0;
    content = content.replace(oldNavRegex, newNav);
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated: ${file}`);
    updated++;
  } else if (content.includes('href="/customers"') && !content.includes('nav-dropdown-item">Customer list')) {
    console.log(`⚠️  Has customers link but different format: ${file}`);
    skipped++;
  } else {
    // Already updated or doesn't have customers nav
    skipped++;
  }
});

console.log(`\n📊 Summary: ${updated} files updated, ${skipped} skipped`);
