const { getItemsGroupedByCategory } = require('../lib/portfolio');

const groups = getItemsGroupedByCategory();
for (const cat in groups) {
  console.log(`Category: ${cat}, Count: ${groups[cat].length}`);
  console.log(groups[cat]);
}
