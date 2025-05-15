/**
 * Script to execute the user table unification
 * This script will run the SQL migration to unify all user-related tables
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Get database connection string from environment variables
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('Error: DATABASE_URL or POSTGRES_URL environment variable is required');
  process.exit(1);
}

// Create a new PostgreSQL connection pool
const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function executeUnification() {
  console.log('Starting user table unification...');
  
  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'unify-user-tables.sql');
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Connect to the database
    const client = await pool.connect();
    console.log('Connected to the database');
    
    try {
      // Start a transaction
      await client.query('BEGIN');
      console.log('Transaction started');
      
      // Execute the SQL script
      console.log('Executing SQL migration script...');
      await client.query(sqlScript);
      
      // Commit the transaction
      await client.query('COMMIT');
      console.log('Transaction committed successfully');
      
      // Verify the migration
      const { rows: userCount } = await client.query('SELECT COUNT(*) FROM users_unified');
      console.log(`Migration completed. Total users in unified table: ${userCount[0].count}`);
      
      // Check if views were created
      const { rows: viewsCount } = await client.query(`
        SELECT COUNT(*) FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name IN ('users_view', 'authorized_users_view', 'user_permissions_view')
      `);
      console.log(`Compatibility views created: ${viewsCount[0].count} of 3`);
      
    } catch (error) {
      // Rollback the transaction on error
      await client.query('ROLLBACK');
      console.error('Error during migration, transaction rolled back:', error);
      throw error;
    } finally {
      // Release the client back to the pool
      client.release();
      console.log('Database connection released');
    }
  } catch (error) {
    console.error('Failed to execute user table unification:', error);
    process.exit(1);
  } finally {
    // Close the pool
    await pool.end();
    console.log('Connection pool closed');
  }
}

// Execute the unification
executeUnification().then(() => {
  console.log('User table unification completed successfully');
}).catch(error => {
  console.error('User table unification failed:', error);
  process.exit(1);
});
