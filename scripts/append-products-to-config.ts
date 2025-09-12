import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

// Read the new products file
const newProductsPath = path.join(process.cwd(), 'new-products.yml');
const newProductsContent = fs.readFileSync(newProductsPath, 'utf8');
const newProductsData = yaml.parse(newProductsContent);

// Read existing config
const configPath = path.join(process.cwd(), 'config.yml');
const configContent = fs.readFileSync(configPath, 'utf8');
const config = yaml.parse(configContent);

// Ensure products array exists
if (!config.products) {
  config.products = [];
}

// Add new products
config.products.push(...newProductsData.products);

console.log(`Added ${newProductsData.products.length} new products to config`);
console.log(`Total products now: ${config.products.length}`);

// Write back to config.yml
const updatedYaml = yaml.stringify(config, {
  lineWidth: 0,
  defaultStringType: 'PLAIN',
  defaultKeyType: 'PLAIN'
});

fs.writeFileSync(configPath, updatedYaml);

console.log('Config.yml has been updated with new products!');

// Cleanup - remove the temporary new-products.yml file
fs.unlinkSync(newProductsPath);
console.log('Temporary new-products.yml file removed.');