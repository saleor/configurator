import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const excelFile = path.join(process.cwd(), 'act50 product tracker for Mario.xlsx');
const workbook = XLSX.readFile(excelFile);

console.log('Sheet names:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
  console.log(`\n=== Sheet: ${sheetName} ===\n`);
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  
  // Print in a readable format
  jsonData.forEach((row: any, index: number) => {
    if (Array.isArray(row) && row.some(cell => cell !== '')) {
      console.log(`Row ${index + 1}:`, row);
    }
  });
});