const $=s=>document.querySelector(s), canvas=$('#gameCanvas'),ctx=canvas.getContext('2d'),arena=$('#arena'),stage=$('#stage'),dom=$('#domGame');
const GAME_SESSION_KEY='gongxing_arcade_session_v1',ADMIN_SETTINGS_KEY='wuming_admin_settings_v1',USAGE_KEY='wuming_usage_log_v1';
let gameSession=window.__gongxingGameSession,accessTimer=0,accessExpired=false,sessionPaused=false;
if(!gameSession)throw new Error('A valid redeemed game session is required.');
function gameRemainingMs(s,now=Date.now()){return s&&s.version===2&&Number.isFinite(s.remainingMs)?s.remainingMs-(Number.isFinite(s.activeSince)?Math.max(0,now-s.activeSince):0):0}
function freeGamesEnabled(){try{return JSON.parse(localStorage.getItem(ADMIN_SETTINGS_KEY)||'{}').freeGames===true}catch{return false}}
function validGameSession(s){const remaining=gameRemainingMs(s),rate=s?.rate===2?2:5,validCost=s?.free===true?freeGamesEnabled()&&s.cost===0:s?.cost===s?.minutes*rate;return !!(s&&s.version===2&&Number.isInteger(s.minutes)&&s.minutes>=1&&s.minutes<=60&&validCost&&Number.isFinite(s.activeSince)&&remaining>0&&remaining<=s.minutes*60000+1500)}
function formatPlayTime(ms){const seconds=Math.max(0,Math.ceil(ms/1000)),minutes=Math.floor(seconds/60);return `${minutes}:${String(seconds%60).padStart(2,'0')}`}
function currentPlayUsageMs(){try{return Math.max(0,Number(JSON.parse(localStorage.getItem(USAGE_KEY)||'{}').days?.[usageDay()]?.playMs)||0)}catch{return 0}}
function expireGameAccess(){if(accessExpired)return;accessExpired=true;flushPlayUsage(true);clearInterval(accessTimer);cancelAnimationFrame(raf);game?.destroy?.();localStorage.removeItem(GAME_SESSION_KEY);document.body.classList.add('access-expired');const payload={channel:'wuming-arcade-return',version:1,expired:true,playUsageMs:currentPlayUsageMs()};if(location.protocol==='file:'){window.name=JSON.stringify(payload);location.replace(`index.html?gameExpired=1#arcadeReturn=${encodeURIComponent(JSON.stringify(payload))}`)}else{window.name='';location.replace('index.html?gameExpired=1')}}
function updatePlayTimer(){if(sessionPaused)return;if(!validGameSession(gameSession))return expireGameAccess();const text=formatPlayTime(gameRemainingMs(gameSession));const top=$('#playTimeTop'),hud=$('#playTimeHud');if(top)top.textContent=text;if(hud)hud.textContent=text}
function recheckGameAccess(){try{const latest=JSON.parse(localStorage.getItem(GAME_SESSION_KEY)||'null');if(validGameSession(latest)){gameSession=latest;updatePlayTimer()}else expireGameAccess()}catch{expireGameAccess()}}
function pauseGameAccess(){if(accessExpired||sessionPaused||!gameSession)return;const remaining=gameRemainingMs(gameSession);if(remaining<=0)return expireGameAccess();gameSession={...gameSession,remainingMs:remaining,activeSince:null,expiresAt:null};localStorage.setItem(GAME_SESSION_KEY,JSON.stringify(gameSession));sessionPaused=true;clearInterval(accessTimer)}
function prepareArcadeReturn(){
  if(location.protocol!=='file:'||accessExpired)return null;
  if(!sessionPaused)pauseGameAccess();
  flushPlayUsage(true);
  if(accessExpired||!gameSession||!Number.isFinite(gameSession.remainingMs)||gameSession.remainingMs<=0)return null;
  const payload={channel:'wuming-arcade-return',version:1,session:{...gameSession,activeSince:null,expiresAt:null},playUsageMs:currentPlayUsageMs()};
  window.name=JSON.stringify(payload);
  return payload
}
function academyHref(){
  const payload=prepareArcadeReturn();
  return payload?`index.html#arcadeReturn=${encodeURIComponent(JSON.stringify(payload))}`:'index.html'
}
function resumeGameAccess(){if(accessExpired)return;try{const latest=JSON.parse(localStorage.getItem(GAME_SESSION_KEY)||'null'),now=Date.now(),remaining=latest?.version===2&&Number.isFinite(latest.remainingMs)?latest.remainingMs-(Number.isFinite(latest.activeSince)?Math.max(0,now-latest.activeSince):0):0,candidate={...latest,remainingMs:remaining,activeSince:now,expiresAt:now+remaining};if(!validGameSession(candidate))return expireGameAccess();gameSession=candidate;localStorage.setItem(GAME_SESSION_KEY,JSON.stringify(gameSession));sessionPaused=false;clearInterval(accessTimer);accessTimer=setInterval(updatePlayTimer,250);updatePlayTimer()}catch{expireGameAccess()}}
function usageDay(date=new Date()){const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');return `${y}-${m}-${d}`}
function addPlayUsage(ms){if(!Number.isFinite(ms)||ms<=0)return;try{const log=JSON.parse(localStorage.getItem(USAGE_KEY)||'{}'),day=usageDay(),days=log.days&&typeof log.days==='object'?log.days:{},bucket=days[day]||{studyMs:0,playMs:0};bucket.playMs=(Number(bucket.playMs)||0)+Math.min(ms,15000);days[day]=bucket;const cutoff=new Date();cutoff.setDate(cutoff.getDate()-91);const minDay=usageDay(cutoff);localStorage.setItem(USAGE_KEY,JSON.stringify({days:Object.fromEntries(Object.entries(days).filter(([key])=>key>=minDay)),events:Array.isArray(log.events)?log.events.filter(event=>event.day>=minDay).slice(-800):[]}))}catch{}}
let playUsageLast=Date.now();function flushPlayUsage(force=false){const now=Date.now();if(force||!document.hidden)addPlayUsage(now-playUsageLast);playUsageLast=now}
const scores=JSON.parse(localStorage.getItem('gongxing_arcade_scores')||'{}');
if(!localStorage.getItem('gongxing_pacman_score_reset_v1')){
  delete scores.blocks;
  delete scores.pacman;
  localStorage.setItem('gongxing_arcade_scores',JSON.stringify(scores));
  localStorage.setItem('gongxing_pacman_score_reset_v1','done');
}
if(!localStorage.getItem('gongxing_forest_score_reset_v1')){
  delete scores.orbit;
  delete scores.forest;
  localStorage.setItem('gongxing_arcade_scores',JSON.stringify(scores));
  localStorage.setItem('gongxing_forest_score_reset_v1','done');
}
let arcadeLang=localStorage.getItem('gongxing_lang')==='en'?'en':'zh';
const L=(zh,en)=>arcadeLang==='zh'?zh:en;
const arcadeGameCount=document.querySelectorAll('.game-card[data-game]').length;
const PAGE={zh:{brand:'学会啦 · 休息区',back:'← 返回学习',eyebrow:'受控休息区 · 每日有上限',headline:'选一种玩法，短暂放松。',intro:'休息时间由家长规则和倒计时共同控制。无需联网匹配，记录只保存在本机。',six:`🎮 ${arcadeGameCount} 款完整游戏`,modes:'🤖 电脑 + 本地双人',localBest:'🏆 本地最高分',score:'得分',status:'状态',best:'最高',timeLeft:'剩余时间',ready:'准备就绪',playAgain:'再玩一次',restart:'重新开始'},en:{brand:'Got It · Break Area',back:'← Back to Learning',eyebrow:'CONTROLLED BREAK · DAILY LIMIT',headline:'Choose one activity and take a short break.',intro:'Guardian rules and the countdown control break time. No online matchmaking; records stay on this device.',six:`🎮 ${arcadeGameCount} complete games`,modes:'🤖 AI + local play',localBest:'🏆 Local high scores',score:'SCORE',status:'STATUS',best:'BEST',timeLeft:'TIME LEFT',ready:'READY',playAgain:'Play again',restart:'Restart'}};
const meta={
  gomoku:{zh:['曜石五子棋','点击棋盘交叉点落子；先连成横、竖或斜线五子者获胜。','传统 15×15 金木棋盘，支持三档电脑对手与本地黑白双人对弈。','棋类 · 电脑 / 双人'],en:['Obsidian Gomoku','Click an intersection to place a stone. Connect five horizontally, vertically, or diagonally to win.','A polished 15×15 wood board with three AI levels and local black-versus-white play.','Board · AI / PVP']},
  rhythm:{zh:['反应堆节拍','按下四个对应字母键，或点击四个轨道键。','音符抵达底部判定线时击中，连击会放大得分。','节奏 · 反应'],en:['Reactor Rhythm','Use D, F, J, K or tap the four lane controls.','Catch pulses at the judgment line and keep your combo alive.','Rhythm · Reflex']},
  reaction:{zh:['反应力测试','点击开始后保持等待；只有界面变绿时才能点击。','等待画面变绿后立刻点击，用毫秒测量你的反应速度。','反应 · 单人'],en:['Reaction Time Test','Start a trial and wait. Click only after the panel turns green.','Wait for green, then click immediately to measure your reaction time in milliseconds.','Reflex · Solo']},
  pacman:{zh:['吃豆人 · 经典迷宫','使用方向键或触屏按钮穿过迷宫。吃光豆子并避开幽灵。','完整迷宫追逐体验：能量豆、四只幽灵、连吃奖励、生命与逐级提速。','迷宫 · 追逐'],en:['Pac-Man · Classic Maze','Use arrow keys or touch controls to clear the maze while avoiding ghosts.','A complete maze chase with power pellets, four ghosts, combo scoring, lives, and faster levels.','Maze · Chase']},
  snake:{zh:['霓虹贪吃蛇','使用方向键、WASD、滑动或触屏方向键转向。','平滑穿过霓虹网格，吃下能量果实并在逐渐加速的路线中继续成长。','经典 · 生存'],en:['Neon Snake','Turn with arrows, WASD, swipes, or the touch pad.','Glide across a neon grid, collect energy fruit, and keep growing as the pace increases.','Classic · Survival']},
  breakout:{zh:['棱镜打砖块','移动鼠标、拖动挡板或使用方向键；点击、空格或发射键开球。','控制挡板改变反弹角度，以连续击破和精准接球清空砖墙。','经典 · 反弹'],en:['Prism Breakout','Move the pointer, drag the paddle, or use arrows. Click, press Space, or tap Launch.','Shape each rebound with the paddle and clear the wall through accurate returns and combos.','Classic · Rebound']},
  blocks:{zh:['经典落块','方向键移动，↑ / X 旋转，空格直落，C 暂存；手机使用下方按钮。','旋转、暂存并快速落下方块，用连续消除保持棋盘清爽。','经典 · 消除'],en:['Classic Falling Blocks','Move with arrows, rotate with Up or X, hard-drop with Space, and hold with C.','Rotate, hold, and drop pieces quickly to keep the board clear through consecutive line clears.','Classic · Puzzle']},
  invaders:{zh:['像素太空防线','方向键或拖动飞船移动；空格、发射键或按住画面射击。','守住底线，击退整齐推进的像素舰队，并在短波次中保持连击。','经典 · 射击'],en:['Pixel Space Defense','Move with arrows or drag the ship. Fire with Space, the button, or by holding the playfield.','Hold the line against advancing pixel fleets and preserve your combo across short waves.','Classic · Shooter']},
  stick:{zh:['火柴人格斗 · 光暗对决','开战前选择光或暗。暗系拥有十套独立连招与高速穿透攻击。','选择光或暗的独立技能组，挑战三档 AI 或进行本地双人对决。','格斗 · 光 / 暗'],en:['Stick Fighter · Light vs Dark','Choose Light or Dark before battle. Dark Magic has ten distinct combos and a high-speed phase attack.','Choose an independent Light or Dark move set and battle three AI levels or local PVP.','Fighting · Light / Dark']},
  chess:{zh:['国际象棋 · 白棋对黑棋','点击棋子，再点击目标格。所有棋子都会沿棋盘滑动。','白棋对黑棋：选择三档电脑对手，或与朋友进行本地双人对弈。','棋类 · 电脑 / 双人'],en:['Classic Chess · White vs Black','Select a piece, then a destination. Every piece glides across the board.','Choose from three AI levels or play local multiplayer with a friend.','Board · AI / PVP']},
  battleship:{zh:['深空海战','先部署五艘不同战舰，再点击敌方海域发射。','命中可继续射击，只有打空后才会交换回合。支持电脑对战与本地双人。','推理 · 电脑 / 双人'],en:['Deep Space Battleship','Deploy five distinct ships, then fire on enemy waters.','Hits grant another shot; turns change only after a miss. Includes AI and private local multiplayer.','Strategy · AI / PVP']}
};
const englishExact=new Map(Object.entries({
  '选择模式':'Choose mode','准备就绪':'Ready','本局结束':'Game over','再玩一次':'Play again','重新开始':'Restart','模式设置':'Mode settings','对战模式':'Match type','电脑难度':'AI difficulty','对战电脑':'Play AI','本地双人':'Local PVP','轻松':'Casual','进阶':'Advanced','大师':'Master','入门':'Beginner','棋手':'Player','宗师':'Grandmaster','落子开局':'Start match','开始对弈':'Start match','开始部署':'Deploy fleet','黑棋 · 落子':'Black to move','白棋 · 落子':'White to move','电脑正在思考…':'AI is thinking…','黑棋由电脑思考中…':'Black AI is thinking…','棋盘已满 · 和棋':'Full board · Draw','和棋 · 无合法着法':'Draw · No legal moves','悔棋':'Undo','白棋行棋':'White to move','黑棋行棋':'Black to move','模式设置':'Mode settings','我方舰队':'Your fleet','敌方海域':'Enemy waters','你的舰队':'Your fleet','你的作战终端':'Your battle terminal','随机部署':'Randomize','清空':'Clear','等待部署':'Awaiting placement','已部署，点击可重放':'Deployed · Click to move','横向':'Horizontal','纵向':'Vertical','准备开战':'Prepare for battle','隐私交接':'Private handoff','你的回合':'Your turn','电脑连续射击':'AI firing again','电脑正在锁定目标…':'AI is locking a target…','电脑命中，继续射击':'AI hit · firing again','电脑打空，轮到你':'AI missed · your turn','敌方舰队全灭':'Enemy fleet destroyed','我方舰队失联':'Your fleet was destroyed','未命中，交换回合':'Miss · change turns','航空母舰':'Carrier','战列舰':'Battleship','巡洋舰':'Cruiser','驱逐舰':'Destroyer','巡逻艇':'Patrol boat','轨道一':'Lane 1','轨道二':'Lane 2','轨道三':'Lane 3','轨道四':'Lane 4','重置飞船':'Reset ship','直落':'Drop','关闭游戏':'Close game','曜石五子棋':'Obsidian Gomoku','⚫⚪ 曜石五子棋':'⚫⚪ Obsidian Gomoku','黑棋先行。电脑模式中你执黑棋；双人模式在同一设备轮流落子。':'Black moves first. You play black against AI; local mode alternates on one device.','建立棋局':'Create chess match','♞ 建立棋局':'♞ Create chess match','白方先行。电脑模式中你执白棋；双人模式在同一设备轮流操作。':'White moves first. You play white against AI; local mode alternates on one device.','建立舰队':'Build your fleet','⚓ 建立舰队':'⚓ Build your fleet','每位玩家亲自部署五艘战舰：5 格、4 格、3 格、3 格和 2 格。命中可以继续开火，打空才交换回合。':'Each player deploys five ships of lengths 5, 4, 3, 3, and 2. A hit grants another shot; a miss ends the turn.','侦察兵':'Scout','舰长':'Captain','海军上将':'Admiral','部署海域 · 点击格子放置':'Deployment waters · Click a cell to place','选择一艘船，再点击棋盘作为舰首位置。已部署的舰船可以点击后重新摆放。':'Choose a ship, then click a cell for its bow. Select a deployed ship to move it.','旋转：横向':'Rotate: Horizontal','旋转：纵向':'Rotate: Vertical','这里放不下，请换一个起点或旋转舰船。':'That ship does not fit. Choose another cell or rotate it.','已随机部署，可继续手动调整':'Fleet randomized. You may still adjust it.','舰队已清空':'Fleet cleared.','交给玩家 2':'Pass to Player 2','交给玩家 1':'Pass to Player 1','双方舰队均已锁定。请把设备交给玩家 1。':'Both fleets are locked. Pass the device to Player 1.','玩家 1 开始射击':'Player 1, begin firing','玩家 1 的舰队已经隐藏，请确认玩家 1 离开屏幕。':'Player 1’s fleet is hidden. Make sure Player 1 looks away.','开始部署玩家 2 舰队':'Deploy Player 2 fleet','上一位玩家打空，棋盘已经隐藏。':'The previous player missed. The boards are now hidden.','反应堆稳定':'Reactor stabilized','发射窗口关闭':'Launch window closed','游戏结束':'Game over','准备！':'READY!'
}));
function englishText(value){const raw=String(value),s=raw.trim();if(!s)return raw;let out=englishExact.get(s);if(!out){out=s.replace(/^(黑棋|白棋)连成五子$/,(_,c)=>`${c==='黑棋'?'Black':'White'} connects five`).replace(/^(黑棋|白棋)获胜$/,(_,c)=>`${c==='黑棋'?'Black':'White'} wins`).replace(/^(白方|黑方)将死获胜$/,(_,c)=>`${c==='白方'?'White':'Black'} wins by checkmate`).replace(/^(白棋|黑棋)( · 将军)?$/,(_,c,x)=>`${c==='白棋'?'White':'Black'}${x?' · Check':''}`).replace(/^(\d+) 秒 · 连击 (\d+)$/,(_,a,b)=>`${a}s · COMBO ${b}`).replace(/^消行 (\d+) · 等级 (\d+)$/,(_,a,b)=>`LINES ${a} · LEVEL ${b}`).replace(/^(\d+) 秒 · 发射 (\d+)$/,(_,a,b)=>`${a}s · LAUNCHES ${b}`).replace(/^玩家 (\d+) 回合$/,(_,n)=>`Player ${n}'s turn`).replace(/^玩家 (\d+) 获胜$/,(_,n)=>`Player ${n} wins`).replace(/^玩家 (\d+) 继续$/,(_,n)=>`Continue as Player ${n}`).replace(/^玩家 (\d+) 的$/,(_,n)=>`Player ${n}'s`).replace(/^玩家 (\d+) 的舰队$/,(_,n)=>`Player ${n}'s fleet`).replace(/^剩余战舰 (\d+) \/ 5$/,(_,n)=>`Ships remaining ${n} / 5`).replace(/^锁定舰队 (\d+)\/5$/,(_,n)=>`Lock fleet ${n}/5`).replace(/^得分 (\d+) · 最高 (\d+)$/,(_,a,b)=>`Score ${a} · Best ${b}`).replace(/^你执白棋 · 电脑执黑棋 · 难度：(.+)$/,(_,d)=>`You are White · AI is Black · Difficulty: ${englishExact.get(d)||d}`).replace(/^(.+)舰队部署 (\d+)\/5$/,(_,p,n)=>`${p==='你的'?'Your':englishText(p)} fleet ${n}/5`).replace(/^(.+)部署完成$/,(_,n)=>`${n} deployed`).replace(/^(\d+) 格 · (.+)$/,(_,n,s)=>`${n} cells · ${englishExact.get(s)||s}`).replace(/^命中！你继续射击$/,'Hit! Fire again').replace(/^命中！玩家 (\d+)继续射击$/,(_,n)=>`Hit! Player ${n} fires again`)}return raw.replace(s,out)}
function translateAdded(root){if(arcadeLang!=='en')return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(n=>n.nodeValue=englishText(n.nodeValue))}
let active='',game=null,raf=0,last=0,ended=false;
function renderLanguage(){document.documentElement.lang=arcadeLang==='zh'?'zh-CN':'en';document.title=arcadeLang==='zh'?'学会啦休息站':'Got It Break';document.querySelectorAll('[data-t]').forEach(e=>e.textContent=PAGE[arcadeLang][e.dataset.t]);for(const id of Object.keys(meta)){const m=meta[id][arcadeLang];$(`[data-game-title="${id}"]`).textContent=m[0];$(`[data-game-desc="${id}"]`).textContent=m[2];$(`[data-game-kind="${id}"]`).textContent=m[3]}$('#popularBadge').textContent=arcadeLang==='zh'?'🔥 人气超高！':'🔥 SUPER POPULAR!';$('#arcadeEn').textContent=arcadeLang==='zh'?'英文':'EN';$('#arcadeZh').textContent=arcadeLang==='zh'?'中文':'中文';$('#arcadeZh').className=arcadeLang==='zh'?'active':'';$('#arcadeEn').className=arcadeLang==='en'?'active':'';if(!active)$('#statusValue').textContent=PAGE[arcadeLang].ready;$('#closeGame').setAttribute('aria-label',L('关闭游戏','Close game'));syncScores()}
function setArcadeLang(next){if(next===arcadeLang)return;arcadeLang=next;localStorage.setItem('gongxing_lang',next);renderLanguage();if(active){const m=meta[active][arcadeLang];$('#arenaTitle').textContent=m[0];$('#arenaDesc').textContent=m[2];$('#helpText').textContent=m[1];startGame()}}
function syncScores(){document.querySelectorAll('[data-high]').forEach(e=>{if(e.dataset.high==='reaction'){const best=Number(localStorage.getItem('gongxing_reaction_best_ms'));e.textContent=Number.isFinite(best)&&best>0?L(`最佳 ${best} ms`,`Best ${best} ms`):L('最佳 —','Best —')}else e.textContent=L('最高 ','Best ')+(scores[e.dataset.high]||0)})}
function setScore(v){$('#scoreValue').textContent=Math.max(0,Math.round(v));if(game)game.score=v}
function setStatus(v){$('#statusValue').textContent=arcadeLang==='en'?englishText(v):v}
function finish(title=L('本局结束','Game over')){if(ended)return;ended=true;cancelAnimationFrame(raf);const score=Math.max(0,Math.round(game?.score||0));if(score>(scores[active]||0)){scores[active]=score;localStorage.setItem('gongxing_arcade_scores',JSON.stringify(scores));syncScores()}$('#bestValue').textContent=scores[active]||0;$('#resultTitle').textContent=arcadeLang==='en'?englishText(title):title;$('#resultText').textContent=L(`得分 ${score} · 最高 ${scores[active]||0}`,`Score ${score} · Best ${scores[active]||0}`);$('#result').hidden=false}
function releaseTouchControls(){
  document.querySelectorAll('#touchControls .is-pressed').forEach(button=>button._releaseTouch?.());
}
function controls(items=[],options={}){
  releaseTouchControls();
  const host=$('#touchControls');
  const hasItems=items.length>0||options.groups?.some(group=>group.items.length);
  host.replaceChildren();
  host.className=`touch-controls touch-layout-${options.layout||'row'}${options.groups?' has-groups':''}`;
  host.hidden=!hasItems;
  host.setAttribute('aria-label',options.label||L('触屏操作台','Touch controls'));
  const makeButton=raw=>{
    const item=Array.isArray(raw)?{label:raw[0],action:raw[1]}:raw;
    const button=document.createElement('button');
    button.type='button';
    button.className=`touch-btn${item.className?` ${item.className}`:''}`;
    if(item.image){const image=document.createElement('img');image.src=item.image;image.alt='';image.draggable=false;button.appendChild(image)}
    else button.textContent=arcadeLang==='en'?englishText(item.label):item.label;
    button.dataset.slot=item.slot||'';
    button.setAttribute('aria-label',arcadeLang==='en'?englishText(item.ariaLabel||item.label):item.ariaLabel||item.label);
    let pressed=false;
    const release=event=>{
      if(!pressed)return;
      event?.preventDefault();
      pressed=false;
      button.classList.remove('is-pressed');
      game?.action?.(item.action,false,item.player||1);
    };
    button._releaseTouch=release;
    button.onpointerdown=event=>{
      if(event.pointerType==='mouse'&&event.button!==0)return;
      event.preventDefault();
      if(pressed)return;
      pressed=true;
      button.classList.add('is-pressed');
      try{button.setPointerCapture(event.pointerId)}catch{}
      game?.action?.(item.action,true,item.player||1);
    };
    button.onpointerup=release;
    button.onpointercancel=release;
    button.onlostpointercapture=release;
    button.oncontextmenu=event=>event.preventDefault();
    return button;
  };
  if(options.groups){
    host.classList.add('has-groups');
    for(const group of options.groups){
      const section=document.createElement('section');
      section.className='touch-group';
      const title=document.createElement('strong');
      title.className='touch-group-title';
      title.textContent=group.label;
      const grid=document.createElement('div');
      grid.className='touch-button-grid';
      group.items.forEach(item=>grid.appendChild(makeButton({...item,player:group.player})));
      section.append(title,grid);
      host.appendChild(section);
    }
  }else{
    const grid=document.createElement('div');
    grid.className='touch-button-grid';
    items.forEach(item=>grid.appendChild(makeButton(item)));
    host.appendChild(grid);
  }
}
function directControls(label){
  releaseTouchControls();
  const host=$('#touchControls');
  host.replaceChildren();
  host.className='touch-controls touch-layout-direct';
  host.hidden=false;
  const hint=document.createElement('div');
  hint.className='touch-direct-hint';
  hint.textContent=`👆 ${label}`;
  host.appendChild(hint);
}
function openGame(id){if(!validGameSession(gameSession))return expireGameAccess();active=id;ended=false;arena.hidden=false;document.body.style.overflow='hidden';const m=meta[id][arcadeLang];$('#arenaTitle').textContent=m[0];$('#arenaDesc').textContent=m[2];$('#helpText').textContent=m[1];$('#bestValue').textContent=scores[id]||0;$('#result').hidden=true;startGame()}
function mountGame(factory){cancelAnimationFrame(raf);releaseTouchControls();game?.destroy?.();canvas.onpointerdown=canvas.onpointermove=canvas.onpointerup=canvas.onpointerleave=canvas.onpointercancel=null;canvas.className='';canvas.width=760;canvas.height=480;ended=false;$('#result').hidden=true;dom.hidden=true;canvas.hidden=false;dom.innerHTML='';ctx.clearRect(0,0,canvas.width,canvas.height);game=factory();setScore(game.score||0);last=performance.now();if(game.loop!==false)raf=requestAnimationFrame(loop)}
function startGame(){if(!validGameSession(gameSession))return expireGameAccess();mountGame(({gomoku:initGomoku,rhythm:initRhythm,reaction:initReaction,pacman:initPacman,snake:initSnake,breakout:initBreakout,blocks:initBlocks,invaders:initInvaders,stick:initStickSetup,chess:initChess,battleship:initBattleship}[active]))}
function launchStickMatch(){if(!validGameSession(gameSession))return expireGameAccess();mountGame(initStickPvp)}
function closeGame(){cancelAnimationFrame(raf);releaseTouchControls();game?.destroy?.();endOnlineMatch();game=null;arena.hidden=true;document.body.style.overflow='';active='';if(document.fullscreenElement===arena)document.exitFullscreen?.().catch(()=>{})}
function loop(t){
  if(!game||ended)return;
  let remaining=Math.min(.033,Math.max(0,(t-last)/1000));last=t;
  const maxStep=1/120;
  while(remaining>0&&!ended){const step=Math.min(maxStep,remaining);game.update?.(step);remaining-=step}
  game.draw?.();
  if(!ended)raf=requestAnimationFrame(loop)
}
document.querySelectorAll('[data-game]').forEach(b=>b.onclick=()=>openGame(b.dataset.game));$('#closeGame').onclick=closeGame;$('#fullscreenGame').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await arena.requestFullscreen()}catch{}};document.addEventListener('fullscreenchange',()=>{$('#fullscreenGame span').textContent=document.fullscreenElement?L('退出全屏','Exit fullscreen'):L('全屏','Fullscreen')});$('#restartGame').onclick=startGame;$('#resultRestart').onclick=startGame;$('#arcadeZh').onclick=()=>setArcadeLang('zh');$('#arcadeEn').onclick=()=>setArcadeLang('en');document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active){if(game?.configOpen&&game?.closeConfig)game.closeConfig();else if(!document.fullscreenElement)closeGame();return}if(!active)return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();game?.key?.(e.key,true)});document.addEventListener('keyup',e=>game?.key?.(e.key,false));
document.querySelectorAll('a[href="index.html"]').forEach(link=>link.addEventListener('click',event=>{if(location.protocol!=='file:')return;event.preventDefault();flushPlayUsage(true);location.href=academyHref()}));
window.addEventListener('blur',releaseTouchControls);
document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseTouchControls()});
new MutationObserver(records=>records.forEach(r=>r.addedNodes.forEach(n=>{if(n.nodeType===Node.ELEMENT_NODE)translateAdded(n);else if(n.nodeType===Node.TEXT_NODE&&arcadeLang==='en')n.nodeValue=englishText(n.nodeValue)}))).observe(dom,{childList:true,subtree:true});
let arcadeAudioContext=null;
function arcadeSfx(kind='tap',pitch=1){
  try{
    arcadeAudioContext??=new(window.AudioContext||window.webkitAudioContext)();arcadeAudioContext.resume?.();
    const profiles={tap:['sine',440,520,.045,.028],eat:['triangle',520,880,.09,.045],break:['square',290,150,.075,.038],line:['triangle',330,980,.16,.055],shoot:['square',650,260,.055,.028],hit:['sawtooth',170,70,.09,.04],lose:['sawtooth',180,55,.24,.045],win:['triangle',440,1100,.28,.052]},profile=profiles[kind]||profiles.tap,[wave,start,end,duration,volume]=profile,now=arcadeAudioContext.currentTime,oscillator=arcadeAudioContext.createOscillator(),gain=arcadeAudioContext.createGain();
    oscillator.type=wave;oscillator.frequency.setValueAtTime(Math.max(30,start*pitch),now);oscillator.frequency.exponentialRampToValueAtTime(Math.max(30,end*pitch),now+duration);gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration+.035);oscillator.connect(gain).connect(arcadeAudioContext.destination);oscillator.start(now);oscillator.stop(now+duration+.04)
  }catch{}
}
function glow(color,blur=18){ctx.shadowColor=color;ctx.shadowBlur=blur}function resetGlow(){ctx.shadowBlur=0}function bgGrid(){ctx.fillStyle='#070b13';ctx.fillRect(0,0,760,480);ctx.strokeStyle='#14213a';ctx.lineWidth=1;for(let x=0;x<760;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,480);ctx.stroke()}for(let y=0;y<480;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(760,y);ctx.stroke()}}
