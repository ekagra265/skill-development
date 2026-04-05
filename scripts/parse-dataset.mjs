import { readFileSync } from 'fs';

const csv = readFileSync('/vercel/share/v0-project/backend/DATASET/Agriculture_price_dataset.csv', 'utf8');
const lines = csv.trim().split('\n');
const header = lines[0].split(',');

console.log('Total rows:', lines.length - 1);
console.log('Columns:', header);

const states = new Set();
const commodities = new Set();
const markets = new Set();

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(',');
  if (cols.length >= 10) {
    states.add(cols[0].trim());
    commodities.add(cols[3].trim());
    markets.add(cols[2].trim());
  }
}

console.log('\nUnique States:', [...states].sort().join(', '));
console.log('\nUnique Commodities:', [...commodities].sort().join(', '));
console.log('\nUnique Markets (first 40):', [...markets].sort().slice(0, 40).join(', '));
console.log('\nTotal unique markets:', markets.size);
