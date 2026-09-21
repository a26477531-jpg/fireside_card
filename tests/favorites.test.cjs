const test = require('node:test');
const assert = require('node:assert/strict');
test('favorites require authentication and scope all operations to session user', async()=>{
  const api = await import('../functions/api/favorites.js');
  const calls=[];
  const DB={prepare(sql){return {bind(...args){calls.push({sql,args});return {all:async()=>({results:[{card_id:'01'}]}),run:async()=>({success:true})};}};}};
  const denied=await api.onRequestGet[0]({request:new Request('https://cards.test/api/favorites'),env:{DB},data:{}});
  assert.equal(denied.status,401); assert.equal(calls.length,0);
  const context={env:{DB},data:{user:{id:7}},request:new Request('https://cards.test/api/favorites',{method:'PUT',headers:{Origin:'https://cards.test'},body:JSON.stringify({cardId:'01',userId:99})})};
  assert.equal((await api.onRequestPut[1](context)).status,200);
  assert.deepEqual(calls.at(-1).args,[7,'01']);
  assert.match(calls.at(-1).sql,/ON CONFLICT.*DO NOTHING/);
  const listed=await api.onRequestGet[1](context); assert.deepEqual((await listed.json()).cardIds,['01']); assert.deepEqual(calls.at(-1).args,[7]);
  context.request=new Request('https://cards.test/api/favorites',{method:'DELETE',body:JSON.stringify({cardId:'01'})});
  assert.equal((await api.onRequestDelete[1](context)).status,200);assert.deepEqual(calls.at(-1).args,[7,'01']);assert.match(calls.at(-1).sql,/WHERE user_id = \?1 AND card_id = \?2/);
  for(const body of ['null','{','{"cardId":"invalid"}']){context.request=new Request('https://cards.test/api/favorites',{method:'PUT',body});assert.equal((await api.onRequestPut[1](context)).status,400);}
  context.request=new Request('https://cards.test/api/favorites',{method:'PUT',headers:{Origin:'https://other.test'},body:'{"cardId":"01"}'});assert.equal((await api.onRequestPut[1](context)).status,403);
});
