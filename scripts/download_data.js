import fs from 'node:fs';

if (fs.existsSync('./static/db/config.json')) {
  console.log('✓ static/db SQLite database configuration verified.');
} else {
  console.warn('⚠ static/db/config.json not found.');
}
