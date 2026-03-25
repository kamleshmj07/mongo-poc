require('dotenv').config({ path: '../.env' });
const { MongoClient } = require('mongodb');
const companies               = require('./data/companies');
const generateCompanyProfile  = require('./generators/companyProfileGenerator');
const generateOnboard         = require('./generators/onboardGenerator');
const generateOffboard        = require('./generators/offboardGenerator');

const EMPLOYEE_COUNT = parseInt(process.argv[2]) || 1000;
const BATCH_SIZE     = 200;

async function seed() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db(process.env.MONGO_DB);
  console.log(`Connected. Seeding ${EMPLOYEE_COUNT} onboards (~${Math.round(EMPLOYEE_COUNT * 0.3)} offboards)...\n`);

  // ── Company Profiles ────────────────────────────────────────────────────────
  console.log('Dropping existing collections...');
  await Promise.all([
    db.collection('companyprofiles').drop().catch(() => {}),
    db.collection('onboards').drop().catch(() => {}),
    db.collection('offboards').drop().catch(() => {}),
  ]);

  console.log('Seeding companyprofiles...');
  const profiles = companies.map(c => generateCompanyProfile(c));
  // Strip internal helper fields before inserting
  const profileDocs = profiles.map(({ _roleEmailMap, _domain, ...doc }) => doc);
  await db.collection('companyprofiles').insertMany(profileDocs);
  console.log(`  Inserted ${profileDocs.length} company profiles`);

  // ── Onboards ────────────────────────────────────────────────────────────────
  console.log(`\nSeeding onboards (${EMPLOYEE_COUNT} docs)...`);
  let onboardCount = 0;
  const start = Date.now();

  for (let i = 0; i < EMPLOYEE_COUNT; i += BATCH_SIZE) {
    const batch = [];
    const batchEnd = Math.min(i + BATCH_SIZE, EMPLOYEE_COUNT);

    for (let j = i; j < batchEnd; j++) {
      const profile = profiles[j % profiles.length];
      const company = companies[j % companies.length];
      batch.push(generateOnboard(company, profile));
    }

    await db.collection('onboards').insertMany(batch);
    onboardCount += batch.length;
    process.stdout.write(`\r  ${onboardCount}/${EMPLOYEE_COUNT} inserted`);
  }
  console.log(`\n  Done in ${((Date.now() - start) / 1000).toFixed(1)}s`);

  // ── Offboards ────────────────────────────────────────────────────────────────
  const offboardCount = Math.round(EMPLOYEE_COUNT * 0.3);
  console.log(`\nSeeding offboards (~${offboardCount} docs)...`);
  let offCount  = 0;
  const start2  = Date.now();

  for (let i = 0; i < offboardCount; i += BATCH_SIZE) {
    const batch = [];
    const batchEnd = Math.min(i + BATCH_SIZE, offboardCount);

    for (let j = i; j < batchEnd; j++) {
      const profile = profiles[j % profiles.length];
      const company = companies[j % companies.length];
      batch.push(generateOffboard(company, profile));
    }

    await db.collection('offboards').insertMany(batch);
    offCount += batch.length;
    process.stdout.write(`\r  ${offCount}/${offboardCount} inserted`);
  }
  console.log(`\n  Done in ${((Date.now() - start2) / 1000).toFixed(1)}s`);

  // ── Indexes ──────────────────────────────────────────────────────────────────
  console.log('\nCreating indexes...');
  await Promise.all([
    db.collection('onboards').createIndex({ 'onboard.upn': 1 }),
    db.collection('onboards').createIndex({ 'onboard.department': 1 }),
    db.collection('onboards').createIndex({ 'workflow.Status': 1 }),
    db.collection('onboards').createIndex({ unit: 1 }),
    db.collection('onboards').createIndex({ createdAt: -1 }),
    db.collection('offboards').createIndex({ 'offboard.employee.userPrincipalName': 1 }),
    db.collection('offboards').createIndex({ 'offboard.employee.Department': 1 }),
    db.collection('offboards').createIndex({ 'workflow.Status': 1 }),
    db.collection('offboards').createIndex({ unit: 1 }),
    db.collection('offboards').createIndex({ createdAt: -1 }),
    db.collection('companyprofiles').createIndex({ unit: 1 }),
  ]);
  console.log('  Indexes created');

  const totalMs = Date.now() - start;
  console.log(`\nSeed complete in ${(totalMs / 1000).toFixed(1)}s`);
  console.log(`  companyprofiles : ${profileDocs.length}`);
  console.log(`  onboards        : ${onboardCount}`);
  console.log(`  offboards       : ${offCount}`);

  await client.close();
}

seed().catch(err => { console.error(err); process.exit(1); });
