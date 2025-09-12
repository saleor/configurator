import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

interface ExcelProduct {
  productId: string;
  type2: string;
  productionCountry: string;
  eligibleGeographies: string;
  technology: string;
  displayedTech: string;
  vintage: number;
  platformProductName: string;
  approvalStatus: string;
  inPlatform: string;
}

interface ConfigProduct {
  name: string;
  slug: string;
  description: string;
  productType: string;
  category: string;
  attributes: {
    'External ID': string;
    'Country of Production'?: string;
    'Region of Production'?: string;
    'Technology'?: string;
    'Price Type'?: string;
  };
  variants: Array<{
    name: string;
    sku: string;
    attributes: {};
    channelListings: Array<{
      channel: string;
      price: number;
    }>;
  }>;
  channelListings: Array<{
    channel: string;
    isPublished: boolean;
    publishedAt: string;
    visibleInListings: boolean;
  }>;
}

// Read Excel file
const excelFile = path.join(process.cwd(), 'act50 product tracker for Mario.xlsx');
const workbook = XLSX.readFile(excelFile);
const worksheet = workbook.Sheets['Products on Omnia'];
const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

// Find the header row (row 6 in the Excel, index 5 in array)
const headerRow = jsonData[5] as string[];
const productIdIndex = headerRow.indexOf('Product ID');
const type2Index = headerRow.indexOf('Type2');
const productionCountryIndex = headerRow.indexOf('Production Country');
const eligibleGeographiesIndex = headerRow.indexOf('RE100 Eligible Consumption Market');
const displayedTechIndex = headerRow.indexOf('Displayed Tech (in platform)');
const vintageIndex = headerRow.indexOf('Vintage');
const platformProductNameIndex = headerRow.indexOf('Platform Product Name');
const approvalStatusIndex = headerRow.indexOf('Approval Status');
const inPlatformIndex = headerRow.indexOf('In platform as of Last Updated date?');

// Extract products (starting from row 7, index 6)
const products: ExcelProduct[] = [];
for (let i = 6; i < jsonData.length; i++) {
  const row = jsonData[i] as any[];
  if (!row[productIdIndex] || row[productIdIndex] === '') continue;
  
  products.push({
    productId: row[productIdIndex],
    type2: row[type2Index],
    productionCountry: row[productionCountryIndex],
    eligibleGeographies: row[eligibleGeographiesIndex],
    technology: row[displayedTechIndex],
    displayedTech: row[displayedTechIndex],
    vintage: parseInt(row[vintageIndex]) || 0,
    platformProductName: row[platformProductNameIndex],
    approvalStatus: row[approvalStatusIndex],
    inPlatform: row[inPlatformIndex]
  });
}

// Filter only approved products that are in platform
const approvedProducts = products.filter(p => 
  p.approvalStatus === 'Approved' && 
  p.inPlatform === 'Yes' &&
  p.platformProductName && p.platformProductName !== ''
);

console.log(`Found ${approvedProducts.length} approved products in platform`);

// Map production country to standardized names
const countryMapping: { [key: string]: string } = {
  'United States': 'United States',
  'United Kingdom': 'United Kingdom',
  'United Arab Emirates': 'United Arab Emirates',
  'Viet Nam': 'Vietnam',
  'Turkey': 'Turkey',
  'Thailand': 'Thailand',
  'Taiwan': 'Taiwan',
  'Switzerland': 'Switzerland',
  'Sweden': 'Sweden',
  'Suriname': 'Suriname',
  'Sri Lanka': 'Sri Lanka',
  'Spain': 'Spain',
  'South Africa': 'South Africa',
  'Slovenia': 'Slovenia',
  'Slovakia': 'Slovakia',
  'Singapore': 'Singapore',
  'Serbia': 'Serbia',
  'Saudi Arabia': 'Saudi Arabia',
  'Portugal': 'Portugal',
  'Poland': 'Poland',
  'Peru': 'Peru',
  'Panama': 'Panama',
  'Pakistan': 'Pakistan',
  'Oman': 'Oman',
  'Norway': 'Norway',
  'New Zealand': 'New Zealand',
  'Netherlands': 'Netherlands',
  'Morocco': 'Morocco',
  'Mexico': 'Mexico',
  'Mauritius': 'Mauritius',
  'Mauritania': 'Mauritania',
  'Malaysia': 'Malaysia',
  'Luxembourg': 'Luxembourg',
  'Lithuania': 'Lithuania',
  'Latvia': 'Latvia',
  'Japan': 'Japan',
  'Jordan': 'Jordan',
  'Italy': 'Italy',
  'Ireland': 'Ireland',
  'Indonesia': 'Indonesia',
  'India': 'India',
  'Iceland': 'Iceland',
  'Hungary': 'Hungary',
  'Honduras': 'Honduras',
  'Guatemala': 'Guatemala',
  'Greece': 'Greece',
  'Germany': 'Germany',
  'Georgia': 'Georgia',
  'France': 'France',
  'Finland': 'Finland',
  'Estonia': 'Estonia',
  'Egypt': 'Egypt',
  'Ecuador': 'Ecuador',
  'Dominican Republic': 'Dominican Republic',
  'Denmark': 'Denmark',
  'Czech Republic': 'Czech Republic',
  'Cyprus': 'Cyprus',
  'Croatia': 'Croatia',
  'Costa Rica': 'Costa Rica',
  'Colombia': 'Colombia',
  'China': 'China',
  'Chile': 'Chile',
  'Canada': 'Canada',
  'Bulgaria': 'Bulgaria',
  'Brazil': 'Brazil',
  'Bosnia and Herzegovina': 'Bosnia and Herzegovina',
  'Belgium': 'Belgium',
  'Austria': 'Austria',
  'Australia': 'Australia',
  'Argentina': 'Argentina',
  'Albania': 'Albania',
  'Uganda': 'Uganda'
};

// Map region based on country
const getRegion = (country: string): string | undefined => {
  const regions: { [key: string]: string } = {
    // Europe
    'United Kingdom': 'Europe',
    'Switzerland': 'Europe',
    'Sweden': 'Europe',
    'Spain': 'Europe',
    'Slovenia': 'Europe',
    'Slovakia': 'Europe',
    'Serbia': 'Europe',
    'Portugal': 'Europe',
    'Poland': 'Europe',
    'Norway': 'Europe',
    'Netherlands': 'Europe',
    'Luxembourg': 'Europe',
    'Lithuania': 'Europe',
    'Latvia': 'Europe',
    'Italy': 'Europe',
    'Ireland': 'Europe',
    'Iceland': 'Europe',
    'Hungary': 'Europe',
    'Greece': 'Europe',
    'Germany': 'Europe',
    'France': 'Europe',
    'Finland': 'Europe',
    'Estonia': 'Europe',
    'Denmark': 'Europe',
    'Czech Republic': 'Europe',
    'Cyprus': 'Europe',
    'Croatia': 'Europe',
    'Bulgaria': 'Europe',
    'Bosnia and Herzegovina': 'Europe',
    'Belgium': 'Europe',
    'Austria': 'Europe',
    'Albania': 'Europe',
    // North America
    'United States': 'North America',
    'Canada': 'North America',
    'Mexico': 'North America',
    // South America
    'Brazil': 'South America',
    'Argentina': 'South America',
    'Chile': 'South America',
    'Colombia': 'South America',
    'Costa Rica': 'South America',
    'Dominican Republic': 'South America',
    'Ecuador': 'South America',
    'Guatemala': 'South America',
    'Honduras': 'South America',
    'Panama': 'South America',
    'Peru': 'South America',
    'Suriname': 'South America',
    // APAC
    'Australia': 'APAC',
    'China': 'APAC',
    'India': 'APAC',
    'Indonesia': 'APAC',
    'Japan': 'APAC',
    'Malaysia': 'APAC',
    'New Zealand': 'APAC',
    'Pakistan': 'APAC',
    'Singapore': 'APAC',
    'Sri Lanka': 'APAC',
    'Taiwan': 'APAC',
    'Thailand': 'APAC',
    'Vietnam': 'APAC',
    // Africa
    'Egypt': 'Africa',
    'Mauritania': 'Africa',
    'Mauritius': 'Africa',
    'Morocco': 'Africa',
    'South Africa': 'Africa',
    'Uganda': 'Africa',
    // Middle East (treating as APAC)
    'Jordan': 'APAC',
    'Oman': 'APAC',
    'Saudi Arabia': 'APAC',
    'Turkey': 'APAC',
    'United Arab Emirates': 'APAC'
  };
  return regions[country];
};

// Generate a slug from product name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// Generate a unique variant name/SKU
let variantCounter = 500; // Starting from a high number to avoid conflicts

// Convert to config format
const configProducts: ConfigProduct[] = approvedProducts.map(product => {
  const variantId = `UHJvZHVjdFZhcmlhbnQ6${variantCounter++}`;
  
  const attributes: any = {
    'External ID': product.productId
  };
  
  if (product.productionCountry) {
    attributes['Country of Production'] = countryMapping[product.productionCountry] || product.productionCountry;
  }
  
  const region = getRegion(product.productionCountry);
  if (region) {
    attributes['Region of Production'] = region;
  }
  
  if (product.technology && product.technology !== '') {
    attributes['Technology'] = product.technology;
  }
  
  attributes['Price Type'] = 'ask'; // Default value
  
  // Map categories
  const categoryMap: { [key: string]: string } = {
    'I-REC': 'i-rec',
    'GOO': 'goo',
    'REC': 'rec',
    'REGO': 'rego',
    'TIGR': 'tigr',
    'NZEC': 'nzec'
  };
  
  const category = categoryMap[product.type2] || product.type2.toLowerCase();
  
  return {
    name: product.platformProductName,
    slug: generateSlug(product.platformProductName),
    description: JSON.stringify({
      time: Date.now(),
      blocks: [{
        id: Math.random().toString(36).substr(2, 9),
        data: { text: product.platformProductName },
        type: "paragraph"
      }],
      version: "2.30.7"
    }),
    productType: 'Environmental Attribute Certificates (EACs)',
    category: category,
    attributes: attributes,
    variants: [{
      name: variantId,
      sku: variantId,
      attributes: {},
      channelListings: [{
        channel: 'act-product-portfolio-channel',
        price: 1.0 // Default price, should be updated based on actual pricing
      }]
    }],
    channelListings: [{
      channel: 'act-product-portfolio-channel',
      isPublished: true,
      publishedAt: new Date().toISOString(),
      visibleInListings: true
    }]
  };
});

// Read existing config
const configPath = path.join(process.cwd(), 'config.yml');
const configContent = fs.readFileSync(configPath, 'utf8');
const config = yaml.parse(configContent);

// Get existing products to avoid duplicates
const existingProductIds = new Set(
  config.products?.map((p: any) => p.attributes?.['External ID']).filter(Boolean) || []
);

// Filter out products that already exist
const newProducts = configProducts.filter(p => 
  !existingProductIds.has(p.attributes['External ID'])
);

console.log(`\nNew products to add: ${newProducts.length}`);

// Identify missing categories
const existingCategories = new Set(config.categories?.map((c: any) => c.slug) || []);
const requiredCategories = new Set(newProducts.map(p => p.category));
const missingCategories = Array.from(requiredCategories).filter(c => !existingCategories.has(c));

console.log('\nMissing categories:', missingCategories);

// Group products by category for summary
const productsByCategory: { [key: string]: string[] } = {};
newProducts.forEach(p => {
  if (!productsByCategory[p.category]) {
    productsByCategory[p.category] = [];
  }
  productsByCategory[p.category].push(p.name);
});

console.log('\nProducts by category:');
Object.entries(productsByCategory).forEach(([category, products]) => {
  console.log(`\n${category.toUpperCase()} (${products.length} products):`);
  products.forEach(p => console.log(`  - ${p}`));
});

// Save the new products to a separate file for review
const outputPath = path.join(process.cwd(), 'new-products.yml');
fs.writeFileSync(outputPath, yaml.stringify({ 
  missingCategories: missingCategories.map(c => ({ name: c.toUpperCase(), slug: c })),
  products: newProducts 
}, { lineWidth: 0 }));

console.log(`\nNew products saved to: ${outputPath}`);
console.log('Review the file and then append to config.yml');