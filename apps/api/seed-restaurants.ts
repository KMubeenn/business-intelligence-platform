import * as mysql from 'mysql2/promise';

const restaurants = [
  { db: 'bobs_burgers', prefix: 'BB' },
  { db: 'pizza_planet', prefix: 'PP' },
  { db: 'sushi_station', prefix: 'SS' }
];

const customerFirstNames = ['John', 'Jane', 'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Heidi'];
const customerLastNames = ['Smith', 'Doe', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez'];

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomCustomer() {
  const first = customerFirstNames[Math.floor(Math.random() * customerFirstNames.length)];
  const last = customerLastNames[Math.floor(Math.random() * customerLastNames.length)];
  return `${first} ${last}`;
}

async function seedDatabase(dbName: string, prefix: string) {
  console.log(`Connecting to ${dbName}...`);
  // Ensure the database exists
  const connectionAdmin = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password'
  });
  await connectionAdmin.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
  await connectionAdmin.end();

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: dbName
  });

  console.log(`Creating tables in ${dbName}...`);
  await connection.query(`DROP TABLE IF EXISTS orders`);
  
  let createTableQuery = '';
  let insertQuery = '';
  
  if (dbName === 'bobs_burgers') {
    createTableQuery = `
      CREATE TABLE orders (
        id VARCHAR(50) PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255),
        burger_cost DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL,
        created_at DATETIME NOT NULL
      )
    `;
    insertQuery = `INSERT INTO orders (id, customer_name, customer_email, burger_cost, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`;
  } else if (dbName === 'pizza_planet') {
    createTableQuery = `
      CREATE TABLE orders (
        order_id VARCHAR(50) PRIMARY KEY,
        buyer VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL,
        date DATETIME NOT NULL
      )
    `;
    insertQuery = `INSERT INTO orders (order_id, buyer, email, amount, status, date) VALUES (?, ?, ?, ?, ?, ?)`;
  } else if (dbName === 'sushi_station') {
    createTableQuery = `
      CREATE TABLE orders (
        uid VARCHAR(50) PRIMARY KEY,
        client_name VARCHAR(255) NOT NULL,
        client_email VARCHAR(255),
        total_price DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL,
        timestamp DATETIME NOT NULL
      )
    `;
    insertQuery = `INSERT INTO orders (uid, client_name, client_email, total_price, status, timestamp) VALUES (?, ?, ?, ?, ?, ?)`;
  }

  await connection.query(createTableQuery);

  console.log(`Seeding 500 orders for ${dbName}...`);
  const statuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'CANCELLED', 'REFUNDED'];
  
  const insertPromises: any[] = [];
  for (let i = 0; i < 500; i++) {
    const id = `${prefix}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
    const name = randomCustomer();
    const email = `${name.toLowerCase().replace(' ', '.')}@example.com`;
    const amount = (Math.random() * 100 + 10).toFixed(2);
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    // Generate a random date within the last 6 months
    const pastDate = new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 180);
    const dateStr = pastDate.toISOString().slice(0, 19).replace('T', ' ');

    insertPromises.push(
      connection.query(insertQuery, [id, name, email, amount, status, dateStr])
    );
  }
  
  await Promise.all(insertPromises);

  console.log(`Successfully seeded ${dbName}.`);
  await connection.end();
}

async function main() {
  for (const rest of restaurants) {
    try {
      await seedDatabase(rest.db, rest.prefix);
    } catch (err) {
      console.error(`Error seeding ${rest.db}:`, err);
    }
  }
  console.log("All done!");
}

main();
