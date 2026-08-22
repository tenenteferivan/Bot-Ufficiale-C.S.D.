const sqlite3 = require('sqlite3');
const path = require('path');
const dbPath = path.join(process.cwd(), 'data', 'avvertimenti.sqlite');
console.log('DB path:', dbPath);
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) { console.error('open err', err); process.exit(1); }
  db.all("PRAGMA table_info('automod_whitelist')", (schemaErr, rows) => {
    if (schemaErr) { console.error('schema err', schemaErr); process.exit(1); }
    console.log('schema rows:', rows);
    db.all('SELECT rowid, * FROM automod_whitelist', (err2, rows2) => {
      if (err2) { console.error('select err', err2); }
      else console.log('all rows data:', rows2);
      db.close();
    });
  });
});
