import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

const path = process.argv[2] || 'act50 product tracker for Mario.xlsx';
const wb = XLSX.readFile(path);
const sheetName = wb.SheetNames[0];
const ws = wb.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

// Print headers and first 5 rows for inspection
const headers: string[] = [];
const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
const headerRow = range.s.r; // first row
for (let c = range.s.c; c <= range.e.c; c++) {
  const cell = ws[XLSX.utils.encode_cell({ r: headerRow, c })];
  headers.push(cell ? String(cell.v) : `col_${c}`);
}

console.log(JSON.stringify({ sheetName, headers, sample: (data as any[]).slice(0, 10) }, null, 2));
