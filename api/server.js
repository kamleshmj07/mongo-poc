require('dotenv').config({ path: '../.env' });
const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.API_PORT || 3000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API running on http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/health`);
      console.log(`Schema: http://localhost:${PORT}/api/schema`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });
