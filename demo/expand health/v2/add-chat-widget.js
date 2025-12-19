/**
 * Add Chat Widget to All Pages
 * This script adds chat widget CSS and JS to all authenticated pages
 */

const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'views');
const cssLine = '  <link rel="stylesheet" href="/css/chat-widget.css">';
const jsLine = '  <script src="/js/chat-widget.js"></script>';

// Pages to skip (login and chat-test already handled separately)
const skipPages = ['login.html', 'chat-test.html'];

// Files to update
const htmlFiles = fs.readdirSync(viewsDir)
  .filter(file => file.endsWith('.html') && !skipPages.includes(file));

console.log('📝 Adding chat widget to pages...\n');

htmlFiles.forEach(file => {
  const filePath = path.join(viewsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  let modified = false;

  // Add CSS link if not present
  if (!content.includes('chat-widget.css')) {
    // Find </head> and add CSS before it
    if (content.includes('</head>')) {
      content = content.replace('</head>', `${cssLine}\n</head>`);
      modified = true;
      console.log(`  ✅ Added CSS to ${file}`);
    }
  }

  // Add JS script if not present
  if (!content.includes('chat-widget.js')) {
    // Find </body> and add JS before it
    if (content.includes('</body>')) {
      content = content.replace('</body>', `${jsLine}\n</body>`);
      modified = true;
      console.log(`  ✅ Added JS to ${file}`);
    }
  }

  // Update "Ask AI" button if present
  if (content.includes('class="ask-ai-btn"') && !content.includes('chatWidget.toggleChat')) {
    content = content.replace(
      /<button class="ask-ai-btn">/,
      '<button class="ask-ai-btn" onclick="window.chatWidget && window.chatWidget.toggleChat()">'
    );
    modified = true;
    console.log(`  ✅ Updated Ask AI button in ${file}`);
  }

  // Write back if modified
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
  } else {
    console.log(`  ⏭️  Skipped ${file} (already has chat widget)`);
  }
});

console.log('\n✨ Chat widget integration complete!');
console.log('\n🎯 Test the widget:');
console.log('   1. Navigate to any page (dashboard, clients, labs, protocols)');
console.log('   2. Click the "Ask AI" button in the sidebar');
console.log('   3. Or click the floating 💬 button in the bottom-right corner');
