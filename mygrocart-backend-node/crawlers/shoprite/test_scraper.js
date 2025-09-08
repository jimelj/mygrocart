const { scrapeShopRite } = require('./index');

async function runTest() {
  console.log('Running ShopRite scraper test...');
  const products = await scrapeShopRite('07003', 'milk');
  if (products) {
    console.log('Scraping completed. Found products:', products);
  } else {
    console.log('Scraping failed or returned no products.');
  }
}

runTest();


