const GAME_SESSION_KEY='gongxing_arcade_session_v1',GAME_POINT_COST=2,LEGACY_GAME_POINT_COST=5;let redemptionInProgress=false;
function importArcadeReturn(){
  if(location.protocol!=='file:')return false;
  let payload=null;
  try{
    const encoded=new URLSearchParams(location.hash.slice(1)).get('arcadeReturn');
    if(encoded)payload=JSON.parse(encoded);
    else if(window.name){
      const named=JSON.parse(window.name);
      if(named?.channel==='wuming-arcade-return')payload=named
    }
  }catch{}
  if(payload?.channel!=='wuming-arcade-return'||payload.version!==1)return false;
  mergeReturnedPlayUsage(payload.playUsageMs);
  if(payload.expired===true){
    localStorage.removeItem(GAME_SESSION_KEY);
    window.name='';
    if(location.hash)try{history.replaceState({},'',location.pathname+location.search)}catch{}
    return true
  }
  if(!payload.session)return false;
  const session=payload.session,total=Number(session.minutes)*60000,rate=session.rate===GAME_POINT_COST?GAME_POINT_COST:LEGACY_GAME_POINT_COST,validCost=session.free===true?session.cost===0:session.cost===session.minutes*rate;
  if(session.version!==2||!Number.isInteger(session.minutes)||session.minutes<1||session.minutes>MAX_GAME_MINUTES||!Number.isFinite(session.remainingMs)||session.remainingMs<=0||session.remainingMs>total+1500||!validCost)return false;
  localStorage.setItem(GAME_SESSION_KEY,JSON.stringify({...session,activeSince:null,expiresAt:null}));
  window.name='';
  if(location.hash)try{history.replaceState({},'',location.pathname+location.search)}catch{}
  return true
}
function mergeReturnedPlayUsage(value){const playMs=Math.max(0,Number(value)||0);if(!playMs)return;try{const log=readUsage(),day=localDay(),bucket=log.days[day]||{studyMs:0,playMs:0};bucket.playMs=Math.max(Number(bucket.playMs)||0,playMs);log.days[day]=bucket;writeUsage(log)}catch{}}
function freeGameMode(){return adminSettings.freeGames===true}
function gameMinuteCap(){return Math.max(1,Math.min(MAX_GAME_MINUTES,Number(adminSettings.gameMinutesCap)||DEFAULT_GAME_MINUTES))}
function dailyPlayMinuteCap(){return Math.max(5,Math.min(MAX_GAME_MINUTES,Number(adminSettings.dailyPlayMinutesCap)||DEFAULT_DAILY_PLAY_MINUTES))}
function dailyPlayUsedMs(){try{return Math.max(0,Number(readUsage().days?.[localDay()]?.playMs)||0)}catch{return 0}}
function dailyPlayRemainingMs(session=null){return Math.max(0,dailyPlayMinuteCap()*60000-dailyPlayUsedMs()-(session?.remainingMs||0))}
function readGameSession(){try{const s=JSON.parse(localStorage.getItem(GAME_SESSION_KEY)||'null'),now=Date.now(),rate=s?.rate===GAME_POINT_COST?GAME_POINT_COST:LEGACY_GAME_POINT_COST,validCost=s?.free===true?freeGameMode()&&s.cost===0:s?.cost===s?.minutes*rate;if(!s||!Number.isInteger(s.minutes)||s.minutes<1||s.minutes>MAX_GAME_MINUTES||!validCost){localStorage.removeItem(GAME_SESSION_KEY);return null}const total=s.minutes*60000,remaining=s.version===1&&Number.isFinite(s.expiresAt)?s.expiresAt-now:s.version===2&&Number.isFinite(s.remainingMs)?s.remainingMs-(Number.isFinite(s.activeSince)?Math.max(0,now-s.activeSince):0):0,allowed=Math.max(0,dailyPlayMinuteCap()*60000-dailyPlayUsedMs());if(remaining<=0||remaining>total+1500||allowed<=0){localStorage.removeItem(GAME_SESSION_KEY);return null}const paused={...s,version:2,remainingMs:Math.min(total,remaining,allowed),activeSince:null,expiresAt:null};localStorage.setItem(GAME_SESSION_KEY,JSON.stringify(paused));return paused}catch{localStorage.removeItem(GAME_SESSION_KEY);return null}}
function gameTimeCapacity(session){const overall=MAX_GAME_MINUTES*60000-(session?.remainingMs||0),daily=dailyPlayRemainingMs(session);return Math.max(0,Math.floor(Math.min(overall,daily)/60000))}
function paidGameSession(session,addedMinutes,now=Date.now()){const remainingMs=(session?.remainingMs||0)+addedMinutes*60000,minutes=Math.ceil(remainingMs/60000);return{version:2,issuedAt:session?.issuedAt||now,remainingMs,activeSince:null,expiresAt:null,minutes,cost:minutes*GAME_POINT_COST,rate:GAME_POINT_COST,free:false,nonce:crypto.randomUUID?.()||String(now)+Math.random()}}
function formatGameTime(ms){const seconds=Math.max(0,Math.ceil(ms/1000)),m=Math.floor(seconds/60),s=seconds%60;return `${m}:${String(s).padStart(2,'0')}`}
function arcadeHref(session){
  if(location.protocol!=='file:'||!session)return'games.html';
  const handoff={
    version:1,
    session,
    settings:{
      freeGames:freeGameMode(),
      gameMinutesCap:gameMinuteCap(),
      dailyPlayMinutesCap:dailyPlayMinuteCap(),
      dailyPlayUsedMs:dailyPlayUsedMs()
    }
  };
  return`games.html#handoff=${encodeURIComponent(JSON.stringify(handoff))}`
}
function enterArcade(session=readGameSession()){
  if(!session){redemptionInProgress=false;renderExchange();return}
  location.href=arcadeHref(session)
}
function refreshPointBalance(){try{const latest=JSON.parse(localStorage.getItem('gongxing_academy_data')||'{}');if(Number.isFinite(Number(latest.points)))user.points=Math.min(adminSettings.pointCap,Math.max(0,Math.floor(Number(latest.points))))}catch{}if(typeof gamePointBalance!=='undefined')gamePointBalance.textContent=user.points}
function openExchange(){refreshPointBalance();renderExchange();exchangeModal.hidden=false;document.body.style.overflow='hidden'}
function closeExchange(){exchangeModal.hidden=true;document.body.style.overflow=''}
function renderExchange(){
  refreshPointBalance();const zhMode=lang==='zh',session=readGameSession(),free=freeGameMode(),cap=gameMinuteCap(),dailyCap=dailyPlayMinuteCap(),dailyRemaining=Math.floor(dailyPlayRemainingMs(session)/60000);
  exchangeTitle.textContent=free?(zhMode?'免积分使用休息区':'Free Break Access'):session?(zhMode?'继续或增加休息时间':'Continue or Add Break Time'):(zhMode?'安排休息时间':'Arrange a Focus Break');exchangeCopy.textContent=free?(zhMode?`管理员已开启免积分休息模式，无需消耗学习积分。每次进入最多使用 ${cap} 分钟。`:`The administrator enabled free break access. Each entry grants up to ${cap} minutes without points.`):session?(zhMode?`当前剩余 ${formatGameTime(session.remainingMs)}。可以直接继续，也可以用积分增加时间；单次最多兑换 ${cap} 分钟。`:`You have ${formatGameTime(session.remainingMs)} left. Continue now or add time with points, up to ${cap} minutes per redemption.`):(zhMode?`每 ${GAME_POINT_COST} 积分兑换 1 分钟。完成并掌握一节微课通常可获得 6–7 积分。`:`Redeem 1 minute for ${GAME_POINT_COST} points. A newly mastered lesson usually earns 6–7 points.`);exchangeBalanceLabel.textContent=zhMode?'当前积分':'Point balance';exchangePointUnit.textContent=zhMode?'积分':'points';exchangeMinutesLabel.textContent=zhMode?'休息时长':'Break time';exchangeCostUnit.textContent=zhMode?'积分':'points';exchangeAction.textContent=free?(zhMode?'进入休息区':'Enter Break Area'):session?(zhMode?'兑换并增加时间':'Redeem & Add Time'):(zhMode?'兑换并进入休息区':'Redeem & Enter');exchangeNote.textContent=free?(zhMode?'免积分选项会持续生效，只有管理员手动关闭后才恢复积分兑换。':'Free access stays active until an administrator manually disables it.'):(zhMode?'积分奖励来自课程完成、首次掌握和明显进步，而不是机械重复刷题。':'Points reward completion, first mastery, and meaningful improvement—not mechanical repetition.');exchangePoints.textContent=user.points;
  exchangeNote.textContent+=zhMode?` 每日休息区上限 ${dailyCap} 分钟，今日还可新增 ${dailyRemaining} 分钟。`:` Daily break-area limit: ${dailyCap} minutes; ${dailyRemaining} minutes can still be added today.`;
  exchangeActive.hidden=!session;if(session)exchangeActive.innerHTML=`${zhMode?'当前剩余休息时间：':'Current break time: '}<strong>${formatGameTime(session.remainingMs)}</strong><br><button class="exchange-action" style="margin-top:12px" onclick="enterArcade()">${zhMode?'继续休息':'Continue Break'}</button>`;
  exchangePurchase.hidden=free&&!!session;exchangePicker.hidden=free;if(free){exchangeAction.disabled=gameTimeCapacity(session)===0&&!session;if(exchangeAction.disabled)exchangeAction.textContent=zhMode?'今日休息时间已用完':'Daily break limit reached';return}const max=Math.min(cap,Math.floor(user.points/GAME_POINT_COST),gameTimeCapacity(session));exchangeMinutes.innerHTML=max?Array.from({length:max},(_,i)=>`<option value="${i+1}">${i+1} ${zhMode?'分钟':i===0?'minute':'minutes'}</option>`).join(''):`<option value="0">${zhMode?'积分不足或今日时间已达上限':'Not enough points or daily time is full'}</option>`;exchangeAction.disabled=max===0;updateExchangeCost()
}
function updateExchangeCost(){exchangeCost.textContent=(Number(exchangeMinutes.value)||0)*GAME_POINT_COST}
async function redeemGameTime(){
  if(redemptionInProgress)return;redemptionInProgress=true;exchangeAction.disabled=true;
  const perform=()=>{const existing=readGameSession(),now=Date.now(),cap=gameMinuteCap();if(freeGameMode()){if(existing){enterArcade(existing);return}const minutes=Math.min(cap,gameTimeCapacity(null));if(minutes<1){redemptionInProgress=false;renderExchange();return}const session={version:2,issuedAt:now,remainingMs:minutes*60000,activeSince:null,expiresAt:null,minutes,cost:0,free:true,nonce:crypto.randomUUID?.()||String(now)+Math.random()};localStorage.setItem(GAME_SESSION_KEY,JSON.stringify(session));enterArcade(session);return}const minutes=Number(exchangeMinutes.value);if(!Number.isInteger(minutes)||minutes<1||minutes>cap||minutes>gameTimeCapacity(existing)){redemptionInProgress=false;renderExchange();return}const cost=minutes*GAME_POINT_COST;let latest;try{latest=JSON.parse(localStorage.getItem('gongxing_academy_data')||'{}')}catch{redemptionInProgress=false;renderExchange();return}const balance=Math.max(0,Math.floor(Number(latest.points)||0));if(balance<cost){user.points=balance;redemptionInProgress=false;renderExchange();return}latest.points=balance-cost;localStorage.setItem('gongxing_academy_data',JSON.stringify(latest));user.points=latest.points;const session=paidGameSession(existing,minutes,now);localStorage.setItem(GAME_SESSION_KEY,JSON.stringify(session));enterArcade(session)};
  if(navigator.locks)await navigator.locks.request('gongxing-points',perform);else perform()
}
