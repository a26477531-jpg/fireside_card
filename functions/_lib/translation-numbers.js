// Compare common written quantities without treating 一般／一致 as numbers.
const digits={'零':0,'〇':0,'一':1,'二':2,'兩':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9};
const units={'十':10,'百':100,'千':1000,'萬':10000,'万':10000,'億':100000000,'亿':100000000};
function chineseNumber(value){
  if(!/[十百千萬万億亿]/.test(value))return Number([...value].map(c=>digits[c]).join(''));
  let total=0,section=0,digit=0;
  for(const c of value){
    if(c in digits){digit=digits[c];continue;}
    const unit=units[c];
    if(unit<10000){section+=(digit||1)*unit;digit=0;}
    else{section+=digit;total=unit===10000?total+section*unit:(total+section)*unit;section=0;digit=0;}
  }
  return total+section+digit;
}
const words={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
const koreanCounts={'한':1,'두':2,'세':3,'네':4,'다섯':5,'여섯':6,'일곱':7,'여덟':8,'아홉':9,'열':10};
export function numericSignature(text, writtenEnglish=true){
  let normalized=text.normalize('NFKC');
  // Native Korean numbers precede counters (e.g. 카드 한 장 = one card).
  normalized=normalized.replace(/(^|[^가-힣])(한|두|세|네|다섯|여섯|일곱|여덟|아홉|열)(?=\s*(?:장|개|명|마리|번|턴|점|초|배))/g,(_,prefix,n)=>prefix+koreanCounts[n]);
  normalized=normalized.replace(/[零〇一二兩两三四五六七八九十百千萬万億亿]+(?=\s*(?:點|点|張|张|個|个|次|回合|倍|層|层|名|隻|只|頭|头|枚|体|體|秒|分鐘|分钟|%|攻擊|攻击|生命|法力|傷害|伤害))/g,v=>String(chineseNumber(v)));
  normalized=normalized.replace(/^[零〇一二兩两三四五六七八九十百千萬万億亿]+$/,v=>String(chineseNumber(v)));
  // English commonly spells out small quantities or uses an indefinite article.
  if(writtenEnglish){
  normalized=normalized.replace(/\b(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[ -](?:one|two|three|four|five|six|seven|eight|nine)\b/gi,v=>String(v.toLowerCase().split(/[ -]/).reduce((sum,w)=>sum+words[w],0)));
  normalized=normalized.replace(new RegExp('\\b('+Object.keys(words).join('|')+')\\b','gi'),v=>String(words[v.toLowerCase()]));
  normalized=normalized.replace(/\b(?:a|an)(?=\s+(?:card|point|turn|target|creature|enemy|minion|ally|shield|token)\b)/gi,'1');
  }
  return (normalized.match(/\d+(?:[.,]\d+)?/g)||[]).sort().join('|');
}
