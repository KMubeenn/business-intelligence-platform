import * as mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'sushi_station'
  });

  const [rows] = await connection.execute('SHOW TABLES');
  console.log(rows);
  
  const [invRows] = await connection.execute('SELECT COUNT(*) as c FROM sushi_inventory');
  console.log('sushi_inventory count:', invRows);

  const [usrRows] = await connection.execute('SELECT COUNT(*) as c FROM sushi_users');
  console.log('sushi_users count:', usrRows);

  await connection.end();
}

main().catch(console.error);
