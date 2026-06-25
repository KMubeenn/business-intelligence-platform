import { RestApiConnector } from './src/connectors/implementations/rest-api.connector';

async function main() {
  const connector = new RestApiConnector({
    baseUrl: 'http://localhost:3001/external-api/mock-store',
    endpoints: [
      {
        name: 'users',
        path: '/users',
        method: 'GET',
        pagination: { type: 'page', paramName: 'page' },
      },
    ],
  });

  console.log('Testing connection...');
  const test = await connector.testConnection();
  console.log(`Connection test: ${test}`);

  console.log('Syncing users...');
  const rows = await connector.sync('users', null, null);
  console.log(`Synced ${rows.length} rows`);
  if (rows.length > 0) {
    console.log('First row:', rows[0]);
  }
}

main().catch(console.error);
