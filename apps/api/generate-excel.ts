import * as xlsx from 'xlsx';

// 1. Create mock data
const data = [
  { OrderID: 101, Product: 'Gaming Mouse', Category: 'Electronics', Price: 50, Quantity: 2 },
  { OrderID: 102, Product: 'Office Chair', Category: 'Furniture', Price: 150, Quantity: 1 },
  { OrderID: 103, Product: 'Mechanical Keyboard', Category: 'Electronics', Price: 120, Quantity: 5 },
  { OrderID: 104, Product: 'Coffee Beans', Category: 'Groceries', Price: 20, Quantity: 10 }
];

// 2. Convert to an Excel Worksheet
const worksheet = xlsx.utils.json_to_sheet(data);

// 3. Create a Workbook and add the Worksheet
const workbook = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(workbook, worksheet, 'Q3_Sales');

// 4. Save to disk
const filePath = './test-data.xlsx';
xlsx.writeFile(workbook, filePath);

console.log('✅ Successfully created test-data.xlsx in the apps/api folder!');
console.log('You can now use this file to test the upload API.');
