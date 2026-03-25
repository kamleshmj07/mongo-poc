require('dotenv').config({ path: '../.env' });
const jwt = require('jsonwebtoken');

const token = jwt.sign({ app: 'staffing-poc' }, process.env.JWT_SECRET, { expiresIn: '180d' });
const payload = jwt.decode(token);
const expires = new Date(payload.exp * 1000).toDateString();

console.log('\nBearer token (valid 6 months):');
console.log(token);
console.log(`\nExpires: ${expires}\n`);
