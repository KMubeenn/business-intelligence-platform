const mysql = require('mysql2/promise');

async function run() {
  console.log("🍔 Starting Restaurant Simulation Setup...");
  
  // Connect to the MySQL server (not a specific database yet)
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    port: 3306
  });

  // 1. Bob's Burgers
  console.log("Setting up Bob's Burgers...");
  await connection.query('CREATE DATABASE IF NOT EXISTS bobs_burgers');
  await connection.query('USE bobs_burgers');
  await connection.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_name VARCHAR(255),
      burger_cost DECIMAL(10,2),
      date DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Insert dummy data
  await connection.query('TRUNCATE TABLE orders');
  await connection.query(`
    INSERT INTO orders (customer_name, burger_cost) VALUES 
    ('Teddy', 8.50),
    ('Mort', 9.00),
    ('Mr. Fischoeder', 12.00)
  `);

  // 2. Pizza Planet
  console.log("Setting up Pizza Planet...");
  await connection.query('CREATE DATABASE IF NOT EXISTS pizza_planet');
  await connection.query('USE pizza_planet');
  await connection.query(`
    CREATE TABLE IF NOT EXISTS orders (
      order_id INT AUTO_INCREMENT PRIMARY KEY,
      buyer VARCHAR(255),
      amount DECIMAL(10,2),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Insert dummy data
  await connection.query('TRUNCATE TABLE orders');
  await connection.query(`
    INSERT INTO orders (buyer, amount) VALUES 
    ('Andy', 15.99),
    ('Sid', 18.50),
    ('Woody', 22.00)
  `);

  // 3. Sushi Station
  console.log("Setting up Sushi Station...");
  await connection.query('CREATE DATABASE IF NOT EXISTS sushi_station');
  await connection.query('USE sushi_station');
  await connection.query(`
    CREATE TABLE IF NOT EXISTS orders (
      uid INT AUTO_INCREMENT PRIMARY KEY,
      client_name VARCHAR(255),
      total_price DECIMAL(10,2),
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Insert dummy data
  await connection.query('TRUNCATE TABLE orders');
  await connection.query(`
    INSERT INTO orders (client_name, total_price) VALUES 
    ('Miyagi', 45.00),
    ('Daniel', 32.50),
    ('Johnny', 55.00)
  `);

  console.log("✅ Simulation setup complete!");
  console.log("You now have 3 distinct databases with 3 completely different schemas for an 'order'.");
  process.exit(0);
}

run().catch(console.error);
