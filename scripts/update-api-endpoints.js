/**
 * Script to update API endpoints to use the new unified user table
 * This script will scan all API files and update references to the old tables
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);

// Define the API directory
const apiDir = path.join(__dirname, '..', 'src', 'app', 'api');

// Define the replacements to make
const replacements = [
  {
    from: /\.from\(['"]User['"]\)/g,
    to: '.from(\'users_unified\')'
  },
  {
    from: /\.from\(['"]users['"]\)/g,
    to: '.from(\'users_unified\')'
  },
  {
    from: /\.from\(['"]authorized_users['"]\)/g,
    to: '.from(\'users_unified\').eq(\'is_authorized\', true)'
  },
  {
    from: /\.from\(['"]AuthorizedUser['"]\)/g,
    to: '.from(\'users_unified\').eq(\'is_authorized\', true)'
  },
  {
    from: /\.from\(['"]user_permissions['"]\)/g,
    to: '.from(\'users_unified\')'
  },
  {
    from: /phoneNumber/g,
    to: 'phone_number'
  },
  {
    from: /firstName/g,
    to: 'first_name'
  },
  {
    from: /lastName/g,
    to: 'last_name'
  },
  {
    from: /verificationCode/g,
    to: 'verification_code'
  },
  {
    from: /verificationCodeExpires/g,
    to: 'verification_code_expires'
  },
  {
    from: /passwordLastChanged/g,
    to: 'password_last_changed'
  },
  {
    from: /inviteCode/g,
    to: 'invite_code'
  },
  {
    from: /inviteSent/g,
    to: 'invite_sent'
  },
  {
    from: /inviteSentAt/g,
    to: 'invite_sent_at'
  },
  {
    from: /inviteAccepted/g,
    to: 'invite_accepted'
  },
  {
    from: /inviteAcceptedAt/g,
    to: 'invite_accepted_at'
  },
  {
    from: /accessPermissions/g,
    to: 'access_permissions'
  },
  {
    from: /accessHistory/g,
    to: 'access_history'
  },
  {
    from: /createdAt/g,
    to: 'created_at'
  },
  {
    from: /updatedAt/g,
    to: 'updated_at'
  }
];

// Function to recursively scan directories
async function scanDirectory(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      await scanDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      await processFile(fullPath);
    }
  }
}

// Function to process a file
async function processFile(filePath) {
  console.log(`Processing file: ${filePath}`);
  
  try {
    let content = await readFile(filePath, 'utf8');
    let modified = false;
    
    // Apply all replacements
    for (const replacement of replacements) {
      const originalContent = content;
      content = content.replace(replacement.from, replacement.to);
      
      if (content !== originalContent) {
        modified = true;
      }
    }
    
    // Save the file if it was modified
    if (modified) {
      await writeFile(filePath, content, 'utf8');
      console.log(`Updated file: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

// Main function
async function main() {
  console.log('Starting API endpoint update...');
  
  try {
    await scanDirectory(apiDir);
    console.log('API endpoint update completed successfully');
  } catch (error) {
    console.error('Error updating API endpoints:', error);
  }
}

// Execute the main function
main().catch(console.error);
