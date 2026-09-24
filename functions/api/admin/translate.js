import { json } from '../../_lib/http.js';
import { authenticate, requirePermission } from '../../_lib/middleware.js';
import { locales, translation } from '../../_lib/catalog.js';
import { content } from '../../../translation-workflow.js';

// Only text fields reach Google; IDs, artwork and card stats stay untouched.
const numbers = text => (text.match(/\d+(?:[.,]\d+)?/g)||[]).sort().join('|');
const tokens = text => (text.match(/\{[^{}]+\}|\[\[[^\]]+\]\]|%[sd]|[+%×÷=<>]/g)||[]).sort().join('|');
const preserved = (a,b) => numbers(a)===numbers(b) && tokens(a)===tokens(b);
function failure(code){const error=new Error(code);error.code=code;return error;}
function providerFailure(status,payload){
  // Inspect provider text only for classification. Never expose it or credentials.
  const info=JSON.stringify(payload||{});
  if(/API_KEY_INVALID|API key not valid/i.test(info))return 'translation-key-invalid';
  if(/BILLING_DISABLED|billing.*(disabled|enabled)|billingNotActive/i.test(info))return 'translation-billing';
  if(/SERVICE_DISABLED|accessNotConfigured|has not been used|is disabled/i.test(info))return 'translation-api-disabled';
  if(/API_KEY_.*BLOCKED|referer|referrer|ipRefererBlocked/i.test(info))return 'translation-key-restricted';
  if(status===429||/QUOTA_EXCEEDED|RATE_LIMIT_EXCEEDED|dailyLimitExceeded|userRateLimitExceeded/i.test(info))return 'translation-quota';
  if(status===401||status===403)return 'translation-access-denied';
  return 'translation-provider-error';
}
export async function translate({request,env}, fetchTranslation=fetch) {
  if (request.headers.get('Origin') && request.headers.get('Origin') !== new URL(request.url).origin) return json({ok:false,error:'forbidden'},{status:403});
  let body;
  try {const raw=await request.text();if(raw.length>60000)throw Error();body=JSON.parse(raw);} catch {return json({ok:false,error:'invalid-body'},{status:400});}
  if (!body || !locales.includes(body.sourceLanguage) || !translation(body.source) || !Array.isArray(body.targets) || !body.targets.length || body.targets.length>3 || new Set(body.targets).size!==body.targets.length || !body.targets.every(l=>locales.includes(l)&&l!==body.sourceLanguage)) return json({ok:false,error:'validation-failed'},{status:400});
  if (typeof env.GOOGLE_TRANSLATE_API_KEY !== 'string' || !env.GOOGLE_TRANSLATE_API_KEY.trim()) return json({ok:false,error:'translation-unavailable'},{status:503});
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),45000);
  try {
    // Omit blank optional fields, preserve field positions, and send all text
    // in bounded batches per target. No generated JSON or prompts needed.
    const fields=[body.source.name,body.source.subtitle,...body.source.abilities.flatMap(a=>[a.title,a.text])];
    const positions=fields.map((text,index)=>text.trim()?index:-1).filter(index=>index>=0);
    const batches=[];
    let batch=[],length=0;
    for(const index of positions){
      if(length+fields[index].length>5000 && batch.length){batches.push(batch);batch=[];length=0;}
      batch.push(index);length+=fields[index].length;
    }
    if(batch.length)batches.push(batch);
    const entries=await Promise.all(body.targets.map(async lang=>{
      const translated=fields.map(()=> '');
      for(const batch of batches){
      const response=await fetchTranslation('https://translation.googleapis.com/language/translate/v2',{
        method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':env.GOOGLE_TRANSLATE_API_KEY.trim()},
        body:JSON.stringify({q:batch.map(i=>fields[i]),source:body.sourceLanguage,target:lang,format:'text',model:'nmt'}),
        signal:controller.signal
      });
      if(!response.ok){let payload;try{payload=await response.json();}catch{}throw failure(providerFailure(response.status,payload));}
      const rows=(await response.json())?.data?.translations;
      if(!Array.isArray(rows)||rows.length!==batch.length||rows.some(r=>typeof r?.translatedText!=='string'))throw Error('invalid-response');
      rows.forEach((row,i)=>{translated[batch[i]]=row.translatedText;});
      }
      const value={name:translated[0],subtitle:translated[1],abilities:body.source.abilities.map((_,i)=>({title:translated[2+i*2],text:translated[3+i*2]}))};
      if(!translation(value)||translated.some((text,i)=>!preserved(text,fields[i])))throw Error('invalid-translation');
      return [lang,content(value)];
    }));
    const translations=Object.fromEntries(entries);
    return json({ok:true,translations});
  }catch(error){
    const code=error.code || (controller.signal.aborted?'translation-timeout':error instanceof TypeError?'translation-network':'translation-failed');
    controller.abort();
    // A failed dependency is a handled API response, not an edge gateway failure.
    return json({ok:false,error:code},{status:424});
  }
  finally{clearTimeout(timer);}
}
export const onRequestPost=[authenticate,requirePermission('card.edit'),context=>translate(context)];
