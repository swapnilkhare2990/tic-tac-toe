import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

// Helper to load env variables from file
function loadEnvFile(filePath) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex !== -1) {
        const key = trimmed.slice(0, eqIndex).trim();
        let val = trimmed.slice(eqIndex + 1).trim();
        // Strip outer quotes if any
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

// Load .env.local first, then .env
loadEnvFile(path.resolve(process.cwd(), '.env.local'));
loadEnvFile(path.resolve(process.cwd(), '.env'));

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'todos_db';

console.log('🔄 Running database migration...');
console.log(`📡 Connecting to MySQL at ${DB_HOST}:${DB_PORT} as '${DB_USER}'...`);

async function migrate() {
  let connection;
  try {
    // 1. Connect without database to ensure database exists
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      connectTimeout: 5000,
    });

    console.log(`🛠️ Ensuring database "${DB_NAME}" exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);

    // 2. Select database
    await connection.changeUser({ database: DB_NAME });

    // 3. Create table
    console.log('🛠️ Creating "todos" table if not exists...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
        category VARCHAR(50) NOT NULL DEFAULT 'General',
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        due_date VARCHAR(20) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('🛠️ Creating "games" table if not exists...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS games (
        id INT AUTO_INCREMENT PRIMARY KEY,
        winner ENUM('X', 'O') NULL,
        is_draw BOOLEAN NOT NULL DEFAULT FALSE,
        played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log(`✅ Migration completed successfully! Database: "${DB_NAME}", Table: "todos" is ready.`);
  } catch (error) {
    console.error('\n❌ Migration failed:');
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error(`  Access denied for user '${DB_USER}'@'${DB_HOST}'.`);
      console.error('  Please check your DB_PASSWORD in .env.local');
    } else if (error.code === 'ECONNREFUSED') {
      console.error(`  Could not connect to MySQL server at ${DB_HOST}:${DB_PORT}.`);
      console.error('  Please ensure that your MySQL service is running.');
    } else {
      console.error(`  ${error.message}`);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrate();
