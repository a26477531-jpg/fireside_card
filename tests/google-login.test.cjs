const test = require('node:test');
const assert = require('node:assert/strict');
const { database } = require('./helpers/d1.cjs');
test('Google login, linking and callback security', async () => {
 const start = await import('../functions/api/google/start.js');
 const callback = await import('../functions/api/google/callback.js');
 const status = await import('../functions/api/google/status.js');
 const { DB, sqlite } = database();
 const env = { DB, GOOGLE_CLIENT_ID:'client', GOOGLE_CLIENT_SECRET:'secret', GOOGLE_AUTH_ORIGIN:'https://cards.test' };
 let identity = {sub:'new-google',email:'new@example.test',email_verified:true};
 let exchanges=0;
 const original=global.fetch;
 global.fetch=async(url,options)=>{
  if(url==='https://oauth2.googleapis.com/token'){
   exchanges++;
   assert.equal(options.body.get('client_secret'),'secret');
   assert.equal(options.body.get('code_verifier').length,43);
   return Response.json({access_token:'server-token'});
  }
  assert.equal(url,'https://openidconnect.googleapis.com/v1/userinfo');
  assert.equal(options.headers.Authorization,'Bearer server-token');
  return Response.json(identity);
 };
 const begin=(intent='login',session='',origin='https://cards.test')=>start.onRequestPost({env,request:new Request('https://cards.test/api/google/start',{method:'POST',headers:{Origin:origin,Cookie:`fireside_session=${session}`},body:JSON.stringify({intent})})});
 async function stateOf(response){
  assert.equal(response.status,200);
  const url=new URL((await response.json()).url);
  assert.equal(url.searchParams.get('code_challenge_method'),'S256');
  return url.searchParams.get('state');
 }
 async function end(state,session='',extra='',cookie=state){
  const response=await callback.onRequestGet({env,request:new Request(`https://cards.test/api/google/callback?state=${state}&code=test${extra}`,{headers:{Cookie:`fireside_google_state=${cookie}; fireside_session=${session}`}})});
  if(response.headers.get('location').includes('signed-in'))assert.ok(response.headers.get('set-cookie').includes('fireside_session='));
  return new URL(response.headers.get('location'),'https://cards.test').searchParams.get('google');
 }
 try{
  assert.equal((await begin('link')).status,409);
  assert.equal((await begin('login','user-session')).status,409);
  assert.equal((await begin('link','user-session','https://evil.test')).status,403);
  const state=await stateOf(await begin());
  assert.equal(await end(state,'','','bad-cookie'),'failed');assert.equal(exchanges,0);
  assert.equal(await end(state),'signed-in');
  assert.equal(sqlite.prepare("SELECT coin_balance FROM users WHERE email='new@example.test'").get().coin_balance,60);
  assert.equal(await end(state),'failed');assert.equal(exchanges,1);
  assert.equal(await end(await stateOf(await begin())),'signed-in');
  assert.equal(sqlite.prepare('SELECT count(*) n FROM users').get().n,3);
  identity={sub:'member-google',email:'MEMBER@example.test',email_verified:true};
  assert.equal(await end(await stateOf(await begin())),'existing-account');
  sqlite.exec("INSERT INTO favorites(user_id,card_id) VALUES (2,'01'); UPDATE users SET coin_balance=123 WHERE id=2;");
  assert.equal(await end(await stateOf(await begin('link','user-session')),'user-session'),'linked');
  assert.equal(sqlite.prepare('SELECT coin_balance FROM users WHERE id=2').get().coin_balance,123);
  assert.equal(sqlite.prepare('SELECT count(*) n FROM favorites WHERE user_id=2').get().n,1);
  const linked=await status.onRequestGet({env,request:new Request('https://cards.test/api/google/status',{headers:{Cookie:'fireside_session=user-session'}})});
  assert.equal((await linked.json()).linkedEmail,identity.email);
  assert.equal(await end(await stateOf(await begin('link','admin-session')),'admin-session'),'conflict');
  identity.sub='another-google';
  assert.equal(await end(await stateOf(await begin('link','user-session')),'user-session'),'conflict');
  assert.equal(await end(await stateOf(await begin('link','user-session')),'admin-session'),'session-changed');
  const expired=await stateOf(await begin());
  sqlite.prepare('UPDATE google_oauth_states SET expires_at=? WHERE state=?').run('2000-01-01T00:00:00.000Z',expired);
  assert.equal(await end(expired),'failed');
  assert.equal(await end(await stateOf(await begin()),'','&error=access_denied'),'cancelled');
  identity.email_verified=false;
  assert.equal(await end(await stateOf(await begin())),'failed');
  const unavailable=await status.onRequestGet({env:{DB},request:new Request('https://cards.test/api/google/status')});
  assert.deepEqual(await unavailable.json(),{ok:true,enabled:false,linkedEmail:null});
 }finally{global.fetch=original;sqlite.close();}
});
