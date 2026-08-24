const { getItemsGroupedByCategory } = require('../lib/portfolio');

async function main() {
  const groups = await getItemsGroupedByCategory();
  for (const cat in groups) {
    console.log(`Category: ${cat}, Count: ${groups[cat].length}`);
    console.log(groups[cat]);
  }
}

main();
