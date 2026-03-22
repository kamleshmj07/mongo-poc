require('dotenv').config({ path: '../.env' });
const { MongoClient } = require('mongodb');
const { generateEmployee } = require('./generators/employeeGenerator');
const { generateOnboarding } = require('./generators/onboardingGenerator');
const { generateOffboarding } = require('./generators/offboardingGenerator');
const { generateServicesForEmployee } = require('./generators/serviceGenerator');
const { generateEventsForEmployee } = require('./generators/eventGenerator');

// Pass count as CLI arg: node seed.js 5000  (default 5000)
const EMPLOYEE_COUNT = parseInt(process.argv[2]) || 5000;
const OFFBOARDING_RATE = 0.3; // 30% of employees are offboarded
const BATCH_SIZE = 100;

async function insertInBatches(collection, docs, label) {
  let inserted = 0;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    await collection.insertMany(batch, { ordered: false });
    inserted += batch.length;
    process.stdout.write(`\r  ${label}: ${inserted}/${docs.length}`);
  }
  console.log(`\r  ${label}: ${docs.length}/${docs.length} ✓`);
}

async function createIndexes(db) {
  console.log('\nCreating indexes...');

  await db.collection('employees').createIndexes([
    { key: { employeeId: 1 }, unique: true },
    { key: { 'workInfo.department': 1 } },
    { key: { 'workInfo.employmentStatus': 1 } },
    { key: { status: 1 } },
  ]);

  await db.collection('onboarding').createIndexes([
    { key: { onboardingId: 1 }, unique: true },
    { key: { employeeId: 1 } },
    { key: { status: 1 } },
    { key: { onboardingBatch: 1 } },
  ]);

  await db.collection('offboarding').createIndexes([
    { key: { offboardingId: 1 }, unique: true },
    { key: { employeeId: 1 } },
    { key: { lastWorkingDay: 1 } },
    { key: { separationType: 1 } },
  ]);

  await db.collection('services').createIndexes([
    { key: { serviceId: 1 }, unique: true },
    { key: { employeeId: 1 } },
    { key: { 'application.category': 1 } },
    { key: { status: 1 } },
  ]);

  await db.collection('events').createIndexes([
    { key: { eventId: 1 }, unique: true },
    { key: { employeeId: 1 } },
    { key: { eventType: 1 } },
    { key: { occurredAt: -1 } },
    { key: { 'eventInfo.severity': 1 } },
    { key: { 'eventInfo.module': 1 } },
  ]);

  console.log('  Indexes created ✓');
}

async function run() {
  const uri = process.env.MONGO_URI;
  const dbName = process.env.MONGO_DB || 'hrpoc';

  if (!uri) {
    console.error('ERROR: MONGO_URI not set in .env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  const client = new MongoClient(uri);
  await client.connect();
  console.log('Connected ✓\n');

  const db = client.db(dbName);

  // Drop existing collections for a clean re-seed
  console.log('Dropping existing collections...');
  const collections = ['employees', 'onboarding', 'offboarding', 'services', 'events'];
  for (const col of collections) {
    await db.collection(col).drop().catch(() => {}); // ignore if not exists
  }
  console.log('Collections cleared ✓\n');

  // Generate all data
  console.log(`Generating ${EMPLOYEE_COUNT} employees...\n`);

  const employees = [];
  const onboardingDocs = [];
  const offboardingDocs = [];
  const serviceDocs = [];
  const eventDocs = [];

  let serviceIndex = 1;
  let eventIndex = 1;
  let offboardingIndex = 1;

  for (let i = 0; i < EMPLOYEE_COUNT; i++) {
    const employee = generateEmployee(i);
    employees.push(employee);

    // Every employee gets onboarding
    onboardingDocs.push(generateOnboarding(employee, i));

    // 30% get offboarding
    if (i % 10 < Math.round(OFFBOARDING_RATE * 10)) {
      const offboarding = generateOffboarding(employee, offboardingIndex - 1);
      // Mark the employee as inactive
      employee.status = 'Inactive';
      employee.workInfo.employmentStatus = 'Terminated';
      employee.workInfo.endDate = offboarding.lastWorkingDay;
      offboardingDocs.push(offboarding);
      offboardingIndex++;
    }

    // Services (5-8 per employee)
    const empServices = generateServicesForEmployee(employee, serviceIndex);
    serviceDocs.push(...empServices);
    serviceIndex += empServices.length;

    // Events (10-15 per employee)
    const empEvents = generateEventsForEmployee(employee, eventIndex);
    eventDocs.push(...empEvents);
    eventIndex += empEvents.length;
  }

  // Insert all collections
  console.log('Inserting documents:\n');
  await insertInBatches(db.collection('employees'), employees, 'employees   ');
  await insertInBatches(db.collection('onboarding'), onboardingDocs, 'onboarding  ');
  await insertInBatches(db.collection('offboarding'), offboardingDocs, 'offboarding ');
  await insertInBatches(db.collection('services'), serviceDocs, 'services    ');
  await insertInBatches(db.collection('events'), eventDocs, 'events      ');

  // Create indexes
  await createIndexes(db);

  // Summary
  console.log('\n========== SEED COMPLETE ==========');
  console.log(`  employees:   ${employees.length}`);
  console.log(`  onboarding:  ${onboardingDocs.length}`);
  console.log(`  offboarding: ${offboardingDocs.length}`);
  console.log(`  services:    ${serviceDocs.length}`);
  console.log(`  events:      ${eventDocs.length}`);
  console.log(`  total docs:  ${employees.length + onboardingDocs.length + offboardingDocs.length + serviceDocs.length + eventDocs.length}`);
  console.log('===================================\n');

  await client.close();
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
