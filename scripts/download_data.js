import fs from 'node:fs';

if (fs.existsSync('./static/data')) {
  console.log('✓ static/data verified.');
} else {
  console.warn('⚠ static/data directory not found.');
}
