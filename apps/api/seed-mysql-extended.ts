import * as mysql from 'mysql2/promise';

const restaurants = [
  { db: 'bobs_burgers', prefix: 'BB' },
  { db: 'pizza_planet', prefix: 'PP' },
  { db: 'sushi_station', prefix: 'SS' }
];

const firstNames = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
const productTypes = ['Apparel', 'Food', 'Merchandise', 'GiftCard'];

function randomString(length: number) {
  return Math.random().toString(36).substring(2, 2 + length);
}

async function seedExtendedData(dbName: string, prefix: string) {
  console.log(`\nConnecting to ${dbName}...`);
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: dbName
  });

  console.log(`Creating chaotic tables in ${dbName}...`);

  let createUsersTable = '';
  let insertUsersQuery = '';
  let createInvTable = '';
  let insertInvQuery = '';

  if (dbName === 'bobs_burgers') {
    createUsersTable = `
      CREATE TABLE IF NOT EXISTS bb_users (
        id VARCHAR(50) PRIMARY KEY,
        user_first_name VARCHAR(255),
        email_address VARCHAR(255),
        account_status VARCHAR(50),
        joined_date DATETIME
      )
    `;
    insertUsersQuery = `INSERT INTO bb_users (id, user_first_name, email_address, account_status, joined_date) VALUES (?, ?, ?, ?, ?)`;

    createInvTable = `
      CREATE TABLE IF NOT EXISTS bb_inventory (
        item_sku VARCHAR(50) PRIMARY KEY,
        item_name VARCHAR(255),
        cat VARCHAR(100),
        stock INT,
        unit_price DECIMAL(10, 2)
      )
    `;
    insertInvQuery = `INSERT INTO bb_inventory (item_sku, item_name, cat, stock, unit_price) VALUES (?, ?, ?, ?, ?)`;
  } else if (dbName === 'pizza_planet') {
    createUsersTable = `
      CREATE TABLE IF NOT EXISTS pizza_users (
        uid VARCHAR(50) PRIMARY KEY,
        f_name VARCHAR(255),
        email VARCHAR(255),
        is_active VARCHAR(50),
        sign_up DATETIME
      )
    `;
    insertUsersQuery = `INSERT INTO pizza_users (uid, f_name, email, is_active, sign_up) VALUES (?, ?, ?, ?, ?)`;

    createInvTable = `
      CREATE TABLE IF NOT EXISTS pizza_inventory (
        pizza_sku VARCHAR(50) PRIMARY KEY,
        \`desc\` VARCHAR(255),
        p_cat VARCHAR(100),
        qty INT,
        cost DECIMAL(10, 2)
      )
    `;
    insertInvQuery = `INSERT INTO pizza_inventory (pizza_sku, \`desc\`, p_cat, qty, cost) VALUES (?, ?, ?, ?, ?)`;
  } else if (dbName === 'sushi_station') {
    createUsersTable = `
      CREATE TABLE IF NOT EXISTS sushi_users (
        customer_id VARCHAR(50) PRIMARY KEY,
        first_name VARCHAR(255),
        email_id VARCHAR(255),
        state VARCHAR(50),
        created_at DATETIME
      )
    `;
    insertUsersQuery = `INSERT INTO sushi_users (customer_id, first_name, email_id, state, created_at) VALUES (?, ?, ?, ?, ?)`;

    createInvTable = `
      CREATE TABLE IF NOT EXISTS sushi_inventory (
        sku_id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255),
        type VARCHAR(100),
        count INT,
        val DECIMAL(10, 2)
      )
    `;
    insertInvQuery = `INSERT INTO sushi_inventory (sku_id, name, type, count, val) VALUES (?, ?, ?, ?, ?)`;
  }

  // Drop tables to recreate cleanly
  if (dbName === 'bobs_burgers') {
    await connection.query('DROP TABLE IF EXISTS bb_users');
    await connection.query('DROP TABLE IF EXISTS bb_inventory');
  } else if (dbName === 'pizza_planet') {
    await connection.query('DROP TABLE IF EXISTS pizza_users');
    await connection.query('DROP TABLE IF EXISTS pizza_inventory');
  } else if (dbName === 'sushi_station') {
    await connection.query('DROP TABLE IF EXISTS sushi_users');
    await connection.query('DROP TABLE IF EXISTS sushi_inventory');
  }

  await connection.query(createUsersTable);
  await connection.query(createInvTable);

  console.log(`Seeding ~500 users and ~100 inventory items...`);
  
  // Seed Users
  const userPromises: any[] = [];
  for (let i = 0; i < 500; i++) {
    const id = `${prefix}-USR-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];
    const email = `${first.toLowerCase()}.${last.toLowerCase()}@example.com`;
    const status = Math.random() > 0.1 ? 'active' : 'inactive';
    const dateStr = new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 19).replace('T', ' ');

    userPromises.push(connection.query(insertUsersQuery, [id, first, email, status, dateStr]));
  }
  await Promise.all(userPromises);

  // Seed Inventory
  const invPromises: any[] = [];
  for (let i = 0; i < 100; i++) {
    const sku = `${prefix}-SKU-${randomString(6).toUpperCase()}`;
    const name = `Awesome Product ${i}`;
    const cat = productTypes[Math.floor(Math.random() * productTypes.length)];
    const stock = Math.floor(Math.random() * 500);
    const price = (Math.random() * 100 + 5).toFixed(2);

    invPromises.push(connection.query(insertInvQuery, [sku, name, cat, stock, price]));
  }
  await Promise.all(invPromises);

  console.log(`Successfully seeded ${dbName} extended tables.`);
  await connection.end();
}

async function main() {
  for (const rest of restaurants) {
    try {
      await seedExtendedData(rest.db, rest.prefix);
    } catch (err) {
      console.error(`Error seeding ${rest.db}:`, err);
    }
  }
  console.log("\nAll done! Heterogeneous tables are ready for mapping.");
}

main();
