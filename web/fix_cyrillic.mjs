import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  let list = fs.readdirSync(dir);
  list.forEach(function(file) {
    let p = path.resolve(dir, file);
    let stat = fs.statSync(p);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(p));
    } else {
      results.push(p);
    }
  });
  return results;
}

let results = walk('d:/ERP/web/src');
let count = 0;
results.filter(f => f.endsWith('.tsx') || f.endsWith('.ts')).forEach(file => {
  let c = fs.readFileSync(file, 'utf8');
  let original = c;
  
  // Replace corrupted characters
  c = c.replace(/Гі/g, 'ó');
  c = c.replace(/Е›/g, 'ś');
  c = c.replace(/Е‚/g, 'ł');
  c = c.replace(/Д‡/g, 'ć');
  c = c.replace(/Еј/g, 'ż');
  c = c.replace(/Еє/g, 'ź');
  c = c.replace(/Е„/g, 'ń');
  c = c.replace(/Д™/g, 'ę');
  c = c.replace(/Д…/g, 'ą');
  
  if (c !== original) {
    fs.writeFileSync(file, c, 'utf8');
    console.log('Fixed:', file);
    count++;
  }
});
console.log('Total fixed globally:', count);
