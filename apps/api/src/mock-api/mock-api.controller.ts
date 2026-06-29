import { Controller, Get, Query } from '@nestjs/common';

@Controller('external-api/mock-store')
export class MockApiController {
  
  @Get('users')
  getUsers(@Query('page') page: string = '1') {
    const pageNum = parseInt(page, 10);
    // Limit to 5 pages
    if (pageNum > 5) return [];

    const users = Array.from({ length: 100 }).map((_, i) => {
      const id = (pageNum - 1) * 100 + i + 1;
      return {
        id: `usr_${id}`,
        first_name: `User${id}`,
        last_name: `Test${id}`,
        email: `user${id}@example.com`,
        registered_at: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
        status: id % 10 === 0 ? 'inactive' : 'active',
      };
    });

    // Wrapped in a 'data' array to simulate a common REST API payload structure
    return {
      data: users,
      meta: {
        page: pageNum,
        totalPages: 5,
      }
    };
  }

  @Get('inventory')
  getInventory(@Query('page') page: string = '1') {
    const pageNum = parseInt(page, 10);
    // Limit to 3 pages
    if (pageNum > 3) return [];

    const categories = ['Electronics', 'Apparel', 'Home', 'Toys'];
    
    const inventory = Array.from({ length: 50 }).map((_, i) => {
      const id = (pageNum - 1) * 50 + i + 1;
      return {
        sku: `SKU-88210-${id}`, // Fixed, deterministic SKU
        product_name: `Awesome Product ${id}`,
        stock_count: (id * 17) % 500, // Deterministic pseudo-random stock
        category: categories[id % categories.length],
        price: (10 + (id * 5.5) % 100).toFixed(2),
        last_restocked: '2026-06-20T10:00:00.000Z',
      };
    });

    return inventory; // Return as flat array to simulate a different REST API structure
  }
}
