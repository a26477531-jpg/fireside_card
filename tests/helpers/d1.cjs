// Execute the same SQL as production against SQLite, including transactional D1 batches.
const {DatabaseSync}=require('node:sqlite');
const fs=require('node:fs');
const path=require('node:path');
function database() {
  const sqlite=new DatabaseSync(':memory:');
  for(const file of fs.readdirSync(path.join(__dirname,'../../migrations')).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync(path.join(__dirname,'../../migrations',file),'utf8'));
  const DB={prepare(sql){let args=[];const stmt={bind(...values){args=values;return stmt;},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};},execute(){const s=sqlite.prepare(sql);if(s.columns().length)return {results:s.all(...args)};const r=s.run(...args);return {meta:{changes:Number(r.changes)}};}};return stmt;},async batch(statements){sqlite.exec('BEGIN');try{const result=statements.map(s=>s.execute());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
  sqlite.exec("INSERT INTO users(id,email,username,password_hash,role) VALUES (1,'admin@example.test','administrator','test','admin'),(2,'member@example.test','member','test','user'); INSERT INTO sessions(token,user_id,expires_at) VALUES ('admin-session',1,'2099-01-01T00:00:00.000Z'),('user-session',2,'2099-01-01T00:00:00.000Z');");
  return {DB,sqlite};
}
async function invoke(handlers,DB,{url='https://cards.test/api/admin/cards',method='GET',body,token='admin-session',origin}={}) {
  const headers={};if(token)headers.Cookie='fireside_session='+token;if(origin)headers.Origin=origin;
  const request=new Request(url,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  const context={request,env:{DB},data:{},next:()=>handlers[++index](context)};let index=0;
  return handlers[0](context);
}
module.exports={database,invoke};
