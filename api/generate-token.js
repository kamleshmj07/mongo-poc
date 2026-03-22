require('dotenv').config({ path: '../.env' });
const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET;
if (!secret) {
  console.error('ERROR: JWT_SECRET not set in .env');
  process.exit(1);
}

const token = jwt.sign(
  { client: 'mongo-poc', scope: 'read' },
  secret,
  { expiresIn: '180d' }
);

const expiry = new Date();
expiry.setDate(expiry.getDate() + 180);

console.log('\n========== BEARER TOKEN ==========');
console.log(token);
console.log('===================================');
console.log(`Expires: ${expiry.toDateString()}`);
console.log('\nUsage:');
console.log('  Authorization: Bearer <token above>');
console.log('\nPower BI Web Connector Header:');
console.log('  Authorization = Bearer <token above>\n');
