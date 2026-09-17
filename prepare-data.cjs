// The maintained source is now cards-data.js. Validate without overwriting it.
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({window:{}});
vm.runInContext(fs.readFileSync('cards-data.js','utf8'),context);
const cards = context.window.CARDS;
const ids = new Set();
for(const card of cards){
  if(ids.has(card.id))throw Error(`Duplicate id: ${card.id}`);
  ids.add(card.id);
  if(!fs.existsSync(card.image))throw Error(`Missing image: ${card.image}`);
  if(!card.rulesText || !card.abilities.length)throw Error(`Missing rules: ${card.id}`);
  for(const ability of card.abilities){
    if(!card.rulesText.includes(ability.title)||!card.rulesText.includes(ability.text))throw Error(`Incomplete rules: ${card.id}`);
  }
}
console.log(`Validated ${cards.length} cards, unique IDs, local images and complete rules. No files changed.`);
