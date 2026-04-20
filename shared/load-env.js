const path = require('path');
const fs = require('fs');

// Find root .env (works from any service subdirectory)
const locations = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env'),
  path.resolve(process.cwd(), '..', '..', '.env'),
  path.resolve(__dirname, '..', '..', '.env'),
];

for (const loc of locations) {
  if (fs.existsSync(loc)) {
    // Use dotenv directly (not dotenvx)
    const dotenv = require('dotenv');
    dotenv.config({ path: loc });
    break;
  }
}
