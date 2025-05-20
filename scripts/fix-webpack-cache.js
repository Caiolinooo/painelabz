/**
 * Script to fix webpack cache issues
 * This script creates the necessary directories with proper permissions
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',

  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Directories to create
const dirsToCreate = [
  '.next',
  '.next/cache',
  '.next/cache/webpack',
  'node_modules/.cache',
  'node_modules/.cache/webpack',
];

// Function to create a directory with proper permissions
function createDirectory(dir) {
  const fullPath = path.resolve(dir);
  
  try {
    if (!fs.existsSync(fullPath)) {
      console.log(`${colors.cyan}Creating directory: ${fullPath}${colors.reset}`);
      fs.mkdirSync(fullPath, { recursive: true });
      
      // Set proper permissions (777 for full access)
      if (process.platform !== 'win32') {
        execSync(`chmod -R 777 "${fullPath}"`, { stdio: 'inherit' });
      }
      
      console.log(`${colors.green}Directory created successfully: ${fullPath}${colors.reset}`);
    } else {
      console.log(`${colors.yellow}Directory already exists: ${fullPath}${colors.reset}`);
      
      // Set proper permissions anyway
      if (process.platform !== 'win32') {
        execSync(`chmod -R 777 "${fullPath}"`, { stdio: 'inherit' });
      }
    }
    
    return true;
  } catch (error) {
    console.error(`${colors.red}Error creating directory ${fullPath}:${colors.reset}`, error.message);
    return false;
  }
}

// Function to create a .gitkeep file in a directory
function createGitKeep(dir) {
  const fullPath = path.resolve(dir);
  const gitKeepPath = path.join(fullPath, '.gitkeep');
  
  try {
    if (!fs.existsSync(gitKeepPath)) {
      console.log(`${colors.cyan}Creating .gitkeep file in: ${fullPath}${colors.reset}`);
      fs.writeFileSync(gitKeepPath, '', 'utf8');
      console.log(`${colors.green}.gitkeep file created successfully${colors.reset}`);
    }
    
    return true;
  } catch (error) {
    console.error(`${colors.red}Error creating .gitkeep file in ${fullPath}:${colors.reset}`, error.message);
    return false;
  }
}

// Main function
function fixWebpackCache() {
  console.log(`${colors.bright}${colors.blue}=== Fixing webpack cache issues ===${colors.reset}\n`);
  
  // Create each directory
  for (const dir of dirsToCreate) {
    if (createDirectory(dir)) {
      // Create a .gitkeep file to ensure the directory is tracked by git
      createGitKeep(dir);
    }
  }
  
  console.log(`\n${colors.bright}${colors.green}=== Webpack cache directories fixed! ===${colors.reset}`);
  console.log(`${colors.cyan}Now you can start the development server with 'npm run dev'${colors.reset}`);
}

// Execute the main function
fixWebpackCache();
