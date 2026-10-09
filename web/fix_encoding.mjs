import fs from 'fs';
import path from 'path';

function walk(dir, done) {
  let results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    let pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
}

walk('d:/ERP/web/src/features/projects', function(err, results) {
  if (err) throw err;
  let count = 0;
  results.filter(f => f.endsWith('.tsx') || f.endsWith('.ts')).forEach(file => {
    let c = fs.readFileSync(file, 'utf8');
    let original = c;
    c = c.replace(/WartoЕ›Д‡/g, 'Wartość');
    c = c.replace(/EtapГіw/g, 'Etapów');
    c = c.replace(/UdziaЕ‚u/g, 'Udziału');
    c = c.replace(/zostaЕ‚/g, 'został');
    c = c.replace(/Oczekiwanie na akceptacjД™/g, 'Oczekiwanie na akceptację');
    if (c !== original) {
      fs.writeFileSync(file, c, 'utf8');
      console.log('Fixed:', file);
      count++;
    }
  });
  console.log('Total fixed:', count);
});
