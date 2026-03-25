require('dotenv').config({ path: '../.env' });
const { connectDB } = require('./config/db');
const app           = require('./app');

const PORT = process.env.API_PORT || 3000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\nStaffing POC API running on http://localhost:${PORT}`);
      console.log('\nRoutes:');
      console.log('  GET /health');
      console.log('  GET /api/v1/:collection          (js-flatten → JSON)');
      console.log('  GET /api/v2/:collection          (mongodb-pipeline → JSON)');
      console.log('  GET /api/v3/:collection          (json2csv → CSV)');
      console.log('  GET /api/compare/:collection     (all three side-by-side metrics)');
      console.log('  GET /api/split/onboards/summary');
      console.log('  GET /api/split/onboards/services');
      console.log('  GET /api/split/onboards/workflow-steps');
      console.log('  GET /api/split/offboards/summary');
      console.log('  GET /api/split/offboards/services');
      console.log('  GET /api/split/offboards/workflow-steps');
      console.log('  GET /api/split/companyprofiles/summary');
      console.log('  GET /api/split/companyprofiles/acls');
      console.log('  GET /api/split/companyprofiles/wf-roles');
      console.log('\n  :collection = onboards | offboards | companyprofiles');
      console.log('  All routes except /health require: Authorization: Bearer <token>\n');
    });
  })
  .catch(err => { console.error('Failed to connect to MongoDB:', err); process.exit(1); });
