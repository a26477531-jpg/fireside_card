const test=require('node:test');
const assert=require('node:assert/strict');
const {database}=require('./helpers/d1.cjs');
test('password recovery: email, cooldown, expiry, atomic reuse and revoked sessions',async()=>{
 const forgot=await import('../functions/api/forgot-password.js');
 const reset=await import('../functions/api/reset-password.js');
 const {digest}=await import('../functions/_lib/password-reset.js');
 const {verifyPassword}=await import('../functions/_lib/crypto.js');
 const {DB,sqlite}=database();
 const env={DB,RESEND_API_KEY:'test',PASSWORD_RESET_FROM:'cards@example.test',PASSWORD_RESET_ORIGIN:'https://cards.test'};
 const call=(api,body,ip='1',origin='https://cards.test')=>api.onRequestPost({env,request:new Request('https://cards.test/api/recovery',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':ip},body:JSON.stringify(body)})});
 const original=global.fetch;const emails=[];
 global.fetch=async(url,opts)=>{assert.equal(url,'https://api.resend.com/emails');emails.push(JSON.parse(opts.body));return new Response('{}');};
 try{
  assert.equal((await call(forgot,null)).status,400);
  assert.equal((await call(forgot,{email:'member@example.test'},'1','https://evil.test')).status,403);
  const known=await(await call(forgot,{email:'MEMBER@example.test'})).json();
  const unknown=await(await call(forgot,{email:'unknown@example.test'},'2')).json();
  assert.deepEqual(known,unknown);assert.equal(emails.length,1);
  await call(forgot,{email:'member@example.test'},'3');assert.equal(emails.length,1);
  const link=new URL(emails[0].text.split('\n').at(-1));
  const token=new URLSearchParams(link.hash.slice(1)).get('token');
  assert.equal(sqlite.prepare('SELECT token_hash FROM password_resets').get().token_hash,await digest(token));
  assert.equal((await call(reset,{token,password:'weak'})).status,400);
  const responses=await Promise.all([call(reset,{token,password:'NewPassword123'}),call(reset,{token,password:'NewPassword123'})]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,400]);
  assert.ok(await verifyPassword('NewPassword123',sqlite.prepare('SELECT password_hash FROM users WHERE id=2').get().password_hash));
  assert.equal(sqlite.prepare('SELECT count(*) n FROM sessions WHERE user_id=2').get().n,0);
  assert.equal(sqlite.prepare('SELECT count(*) n FROM sessions WHERE user_id=1').get().n,1);
  assert.equal((await call(reset,{token,password:'Another123'})).status,400);
  sqlite.prepare('INSERT INTO password_resets(token_hash,user_id,expires_at) VALUES (?,2,?)').run(await digest(token),'2000-01-01T00:00:00.000Z');
  assert.equal((await call(reset,{token,password:'Another123'})).status,400);
  sqlite.exec('DELETE FROM password_reset_limits');global.fetch=async()=>new Response('{}',{status:500});
  assert.deepEqual(await(await call(forgot,{email:'member@example.test'})).json(),{ok:true});
  assert.equal(sqlite.prepare('SELECT count(*) n FROM password_resets').get().n,0);
 }finally{global.fetch=original;sqlite.close();}
});
