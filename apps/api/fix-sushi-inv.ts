import * as mysql from 'mysql2/promise';

function randomString(length: number) {
  return Math.random().toString(36).substring(2, 2 + length);
}
const productTypes = ['Apparel', 'Food', 'Merchandise', 'GiftCard'];

async function main() {
  console.log('Connecting to sushi_station...');
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'sushi_station'
  });

  const insertInvQuery = `INSERT INTO sushi_inventory (sku_id, name, type, count, val) VALUES (?, ?, ?, ?, ?)`;

  const invPromises: any[] = [];
  for (let i = 0; i < 100; i++) {
    const sku = `SS-SKU-${randomString(6).toUpperCase()}`;
    const name = `Awesome Product ${i}`;
    const cat = productTypes[Math.floor(Math.random() * productTypes.length)];
    const stock = Math.floor(Math.random() * 500);
    const price = (Math.random() * 100 + 5).toFixed(2);

    invPromises.push(connection.query(insertInvQuery, [sku, name, cat, stock, price]));
  }
  await Promise.all(invPromises);

  console.log('Successfully seeded 100 missing Sushi Station inventory items!');
  await connection.end();
}

main().catch(console.error);
