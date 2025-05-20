/**
 * Script to fix useLayoutEffect warnings in components
 * This script adds a wrapper to components using useLayoutEffect to prevent SSR warnings
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

// Directories to scan for React components
const dirsToScan = [
  'src/components',
  'src/app',
];

// Patterns to look for
const useLayoutEffectPattern = /useLayoutEffect/g;
const clientDirectivePattern = /'use client'/;

// Function to scan a file for useLayoutEffect
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if the file contains useLayoutEffect
    if (useLayoutEffectPattern.test(content)) {
      console.log(`${colors.yellow}Found useLayoutEffect in: ${filePath}${colors.reset}`);
      
      // Check if the file already has 'use client' directive
      const hasClientDirective = clientDirectivePattern.test(content);
      
      if (!hasClientDirective) {
        console.log(`${colors.red}Missing 'use client' directive in: ${filePath}${colors.reset}`);
        
        // Add 'use client' directive to the file
        const updatedContent = `'use client';\n\n${content}`;
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`${colors.green}Added 'use client' directive to: ${filePath}${colors.reset}`);
      }
      
      // Check if the file imports useSafeLayoutEffect
      if (!content.includes('useSafeLayoutEffect') && !content.includes('ClientSideOnly')) {
        console.log(`${colors.yellow}Consider replacing useLayoutEffect with useSafeLayoutEffect in: ${filePath}${colors.reset}`);
        console.log(`${colors.cyan}Add: import { useSafeLayoutEffect } from '@/components/ClientSideOnly';${colors.reset}`);
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`${colors.red}Error scanning file ${filePath}:${colors.reset}`, error.message);
    return false;
  }
}

// Function to recursively scan directories for React component files
function scanDirectory(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let count = 0;
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and .next directories
        if (entry.name !== 'node_modules' && entry.name !== '.next') {
          count += scanDirectory(fullPath);
        }
      } else if (entry.isFile() && 
                (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx'))) {
        // Scan React component files
        if (scanFile(fullPath)) {
          count++;
        }
      }
    }
    
    return count;
  } catch (error) {
    console.error(`${colors.red}Error scanning directory ${dir}:${colors.reset}`, error.message);
    return 0;
  }
}

// Main function
function fixUseLayoutEffect() {
  console.log(`${colors.bright}${colors.blue}=== Fixing useLayoutEffect warnings ===${colors.reset}\n`);
  
  let totalCount = 0;
  
  // Scan each directory
  for (const dir of dirsToScan) {
    console.log(`${colors.cyan}Scanning directory: ${dir}${colors.reset}`);
    const count = scanDirectory(path.resolve(dir));
    console.log(`${colors.green}Found ${count} files with useLayoutEffect in ${dir}${colors.reset}`);
    totalCount += count;
  }
  
  console.log(`\n${colors.bright}${colors.green}=== Scan complete! ===${colors.reset}`);
  console.log(`${colors.cyan}Found ${totalCount} files with useLayoutEffect${colors.reset}`);
  
  if (totalCount > 0) {
    console.log(`\n${colors.yellow}Next steps:${colors.reset}`);
    console.log(`${colors.yellow}1. Replace useLayoutEffect with useSafeLayoutEffect from '@/components/ClientSideOnly'${colors.reset}`);
    console.log(`${colors.yellow}2. Or wrap components using useLayoutEffect with <ClientSideOnly>${colors.reset}`);
    console.log(`${colors.yellow}3. Restart the development server${colors.reset}`);
  }
}

// Execute the main function
fixUseLayoutEffect();
