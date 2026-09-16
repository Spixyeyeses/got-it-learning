const ACCOUNT_SYNC_FIELDS=['totalSolved','totalCorrect','todaySolved','lastDate','streak','mastery','knowledgeMastery','reviewSchedule','lessonRewards','dailyLessons','lastCourse','wrongBook','quizCount','perfectQuizzes','unlockedAchievements','achievementUnlockedAt','seenAchievementReveals','equippedTitle','points','lifetimePointsEarned','pointHistory'];
const ACCOUNT_GUEST_KEY='wuming_guest_data_v1',ACCOUNT_CACHE_PREFIX='wuming_account_data_v1:';
let accountAuthMode='',leaderboardPeriod='day',leaderboardRequestId=0,accountBusy=false,accountApplyingRemote=false,accountSyncTimer=0;
const leaderboardCache=new Map();
function accountSnapshot(){return Object.fromEntries(ACCOUNT_SYNC_FIELDS.map(key=>[key,clone(user[key])]))}
const EMPTY_ACCOUNT_SNAPSHOT=accountSnapshot();
function cacheAccountData(username,data=accountSnapshot()){if(username)localStorage.setItem(ACCOUNT_CACHE_PREFIX+username,JSON.stringify(data))}
function saveGuestData(data=accountSnapshot()){localStorage.setItem(ACCOUNT_GUEST_KEY,JSON.stringify(data))}
function readStoredAccountData(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}catch{return fallback}}
function applyRemoteSnapshot(data){
  if(!data||typeof data!=='object')return;
  leaderboardCache.clear();
  const preservedHistory=Array.isArray(data.pointHistory)?data.pointHistory:[];
  user={...user,...Object.fromEntries(ACCOUNT_SYNC_FIELDS.filter(key=>key in data).map(key=>[key,clone(data[key])])),mastery:{...user.mastery,...(data.mastery||{})},knowledgeMastery:{...user.knowledgeMastery,...(data.knowledgeMastery||{})},reviewSchedule:{...user.reviewSchedule,...(data.reviewSchedule||{})},lessonRewards:{...user.lessonRewards,...(data.lessonRewards||{})},dailyLessons:{...user.dailyLessons,...(data.dailyLessons||{})},wrongBook:Array.isArray(data.wrongBook)?data.wrongBook:user.wrongBook,unlockedAchievements:Array.isArray(data.unlockedAchievements)?data.unlockedAchievements:user.unlockedAchievements,achievementUnlockedAt:data.achievementUnlockedAt&&typeof data.achievementUnlockedAt==='object'?data.achievementUnlockedAt:user.achievementUnlockedAt,seenAchievementReveals:Array.isArray(data.seenAchievementReveals)?data.seenAchievementReveals:user.seenAchievementReveals,pointHistory:preservedHistory};
  user.points=Math.min(adminSettings.pointCap,Math.max(0,Math.floor(Number(user.points)||0)));
  user.lifetimePointsEarned=Math.max(0,Math.floor(Number(user.lifetimePointsEarned)||0));
  accountApplyingRemote=true;saveUser();accountApplyingRemote=false;const auth=WumingRemote.loadAuth();if(auth?.username)cacheAccountData(auth.username);updateDash()
}
function scheduleAccountSync(){
  if(accountApplyingRemote||!WumingRemote.loadAuth())return;
  clearTimeout(accountSyncTimer);accountSyncTimer=setTimeout(async()=>{try{const result=await WumingRemote.sync(accountSnapshot());if(result.conflict)applyRemoteSnapshot(result.user.data);else cacheAccountData(result.user.username,result.user.data);renderAccountButton()}catch{}},1800)
}
function accountMessage(text,ok=false){accountStatus.textContent=text;accountStatus.className=`account-status ${ok?'ok':''}`}
function openAccount(){if(!WumingRemote.loadAuth())accountAuthMode='';accountModal.hidden=false;document.body.style.overflow='hidden';renderAccount()}
function closeAccount(){accountModal.hidden=true;document.body.style.overflow=''}
async function accountLogout(){
  const auth=WumingRemote.loadAuth();if(auth?.username){clearTimeout(accountSyncTimer);cacheAccountData(auth.username);try{await WumingRemote.sync(accountSnapshot())}catch{}}
  WumingRemote.logout();applyRemoteSnapshot(readStoredAccountData(ACCOUNT_GUEST_KEY,EMPTY_ACCOUNT_SNAPSHOT));accountMessage('');renderAccount();renderAccountButton()
}
function renderAccountButton(){
  const auth=WumingRemote.loadAuth(),configured=WumingRemote.configured();
  const allowed=typeof remoteLearningAllowedV3!=='function'||remoteLearningAllowedV3();
  accountButton.textContent=!allowed?'☁ 需监护确认':auth?`☁ ${auth.username}`:configured?'☁ 登录':'☁ 未配置';
  friendsButton.hidden=!auth;leaderboardButton.hidden=!auth;syncButton.hidden=false;syncButton.disabled=accountBusy;
  syncButton.title=lang==='zh'?'同步存档、题库和游戏':'Sync save, question banks, and games';
  syncButton.setAttribute('aria-label',syncButton.title)
}
function renderAccount(){
  const auth=WumingRemote.loadAuth(),configured=WumingRemote.configured(),demo=window.REMOTE_SERVER_DEMO===true;
  accountConfigNotice.hidden=configured&&!demo;
  accountConfigNotice.textContent=demo?(lang==='zh'?`演示服务：${window.REMOTE_SERVER_HOST}:${window.REMOTE_SERVER_PORT}。若无法连接，请先运行 node server/index.js。`:`Demo service: ${window.REMOTE_SERVER_HOST}:${window.REMOTE_SERVER_PORT}. Run node server/index.js if it is unavailable.`):(lang==='zh'?'远程服务器地址尚未配置。请在 src/config/remote.js 填写服务器地址。':'Remote server is not configured. Set the server address in src/config/remote.js.');
  accountAuthView.hidden=!!auth;
  accountAuthChoice.hidden=!!accountAuthMode;
  accountLoginForm.hidden=accountAuthMode!=='login';
  accountRegisterForm.hidden=accountAuthMode!=='register';
  accountSignedView.hidden=!auth;
  if(auth){accountUsername.textContent=auth.username;accountRevision.textContent=`云端版本 ${auth.revision||0}`}
  renderAccountButton()
}
function showAccountAuthForm(mode){accountAuthMode=['login','register'].includes(mode)?mode:'';accountMessage('');renderAccount()}
async function submitAccount(event,kind){
  event.preventDefault();if(accountBusy)return;
  if(typeof remoteLearningAllowedV3==='function'&&!remoteLearningAllowedV3()){accountMessage(lang==='zh'?'未满 14 周岁需要监护人确认后才能使用云端账号。':'Guardian confirmation is required before cloud use.');return}
  const form=event.currentTarget,username=form.querySelector('[name="username"]').value.trim(),password=form.querySelector('[name="password"]').value;
  accountBusy=true;accountMessage(lang==='zh'?'正在连接服务器…':'Connecting…');
  try{
    saveGuestData();
    const result=kind==='register'?await WumingRemote.register(username,password,accountSnapshot()):await WumingRemote.login(username,password);
    if(result.user.data)applyRemoteSnapshot(result.user.data);
    cacheAccountData(result.user.username,result.user.data||accountSnapshot());
    accountMessage(lang==='zh'?'登录并同步成功！':'Signed in and synced!',true);form.reset();renderAccount()
  }catch(error){accountMessage(accountError(error))}
  finally{accountBusy=false}
}
function accountError(error){
  const map={REMOTE_NOT_CONFIGURED:'远程服务器尚未配置。',AUTH_REQUIRED:'请先登录。',USERNAME_TAKEN:'账户名已被使用。',INVALID_CREDENTIALS:'账户名或密码错误。',INVALID_USERNAME:'账户名需为 3–24 位字母、数字、下划线或中文。',WEAK_PASSWORD:'密码至少 8 位。',FRIEND_NOT_FOUND:'没有找到该账户。',CANNOT_FRIEND_SELF:'不能添加自己。'};
  if(error instanceof TypeError||/fetch|network/i.test(error.message))return lang==='zh'?'无法连接演示服务，请确认服务器已启动且 8787 端口可访问。':'Cannot reach the demo service. Check that the server is running and port 8787 is reachable.';
  return lang==='zh'?(map[error.message]||`操作失败：${error.message}`):`Request failed: ${error.message}`
}
async function manualRemoteSync(){
  if(accountBusy)return;if(typeof remoteLearningAllowedV3==='function'&&!remoteLearningAllowedV3()){openPrivacyCenterV3();suiteMessageV3(lang==='zh'?'需要监护人确认后才能使用云端同步。':'Guardian confirmation is required for cloud sync.');return}accountBusy=true;let synced=false;syncButton.disabled=true;syncButton.textContent='…';accountMessage(lang==='zh'?'正在同步存档、题库和游戏…':'Syncing save, question banks, and games…');
  try{
    const auth=WumingRemote.loadAuth(),configured=WumingRemote.configured();
    let conflict=false;
    if(auth&&configured){const result=await WumingRemote.sync(accountSnapshot());applyRemoteSnapshot(result.user.data);conflict=result.conflict}
    const content=await refreshLearningContent({refreshGameAssets:true});
    const message=lang==='zh'?`${conflict?'已采用服务器上的新存档；':''}题库与 ${content.gameCount} 款游戏已同步。`:`${conflict?'The newer server save was applied; ':''}question banks and ${content.gameCount} games are up to date.`;
    accountMessage(message,true);renderAccount();if(accountModal.hidden){syncButton.title=message;syncButton.setAttribute('aria-label',message)}synced=true
  }
  catch(error){accountMessage(accountError(error));if(accountModal.hidden)openAccount()}
  finally{accountBusy=false;syncButton.disabled=false;syncButton.textContent=synced?'✓':'↻';if(synced)setTimeout(()=>{syncButton.textContent='↻';renderAccountButton()},1200)}
}
async function addFriend(event){
  event.preventDefault();const input=event.currentTarget.elements.username;
  try{await WumingRemote.addFriend(input.value.trim());leaderboardCache.clear();input.value='';friendsStatus.textContent=lang==='zh'?'好友已添加。':'Friend added.';friendsStatus.className='account-status ok';loadFriends()}
  catch(error){friendsStatus.textContent=accountError(error);friendsStatus.className='account-status'}
}
function openFriends(){if(!WumingRemote.loadAuth())return;friendsModal.hidden=false;document.body.style.overflow='hidden';friendsStatus.textContent='';loadFriends()}
function closeFriends(){friendsModal.hidden=true;document.body.style.overflow=''}
async function loadFriends(){
  friendsContent.innerHTML='<p class="account-loading">正在加载好友…</p>';
  try{const result=await WumingRemote.friends();friendsContent.innerHTML=`<form class="friend-form" onsubmit="addFriend(event)"><input name="username" required placeholder="输入对方账户名"><button type="submit">添加好友</button></form><div class="friend-list">${result.friends.length?result.friends.map(friend=>`<div><strong>${esc(friend.username)}</strong><span>累计 ${friend.lifetimePointsEarned||0} 分</span></div>`).join(''):'<p class="account-empty">还没有好友。</p>'}</div>`}
  catch(error){friendsContent.innerHTML=`<p class="account-empty">${esc(accountError(error))}</p>`}
}
function setLeaderboardPeriod(period){if(!['day','week','month'].includes(period))return;leaderboardPeriod=period;renderLeaderboardTabs();const cached=leaderboardCache.get(period);if(cached)renderLeaderboardRows(cached);else loadLeaderboard()}
function renderLeaderboardTabs(){leaderboardTabs.querySelectorAll('[data-leaderboard-period]').forEach(button=>{const active=button.dataset.leaderboardPeriod===leaderboardPeriod;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))})}
function renderLeaderboardRows(entries){leaderboardList.innerHTML=`<ol class="leaderboard">${entries.length?entries.map((entry,index)=>`<li><span class="rank">${index+1}</span><strong>${esc(entry.username)}</strong><span>${entry.points} 分</span></li>`).join(''):'<li class="account-empty">这个周期还没有积分记录</li>'}</ol>`}
function openLeaderboard(){if(!WumingRemote.loadAuth())return;leaderboardModal.hidden=false;document.body.style.overflow='hidden';renderLeaderboardTabs();const cached=leaderboardCache.get(leaderboardPeriod);if(cached)renderLeaderboardRows(cached);else loadLeaderboard()}
function closeLeaderboard(){leaderboardModal.hidden=true;document.body.style.overflow=''}
async function loadLeaderboard(){
  const period=leaderboardPeriod,requestId=++leaderboardRequestId,isInitialLoad=!leaderboardList.firstElementChild;
  leaderboardList.setAttribute('aria-busy','true');
  if(isInitialLoad){leaderboardList.classList.add('is-loading');leaderboardList.innerHTML='<p class="account-loading">正在加载排行榜…</p>'}
  try{const result=await WumingRemote.leaderboard(period);leaderboardCache.set(period,result.entries);if(requestId===leaderboardRequestId&&period===leaderboardPeriod)renderLeaderboardRows(result.entries)}
  catch(error){if(requestId===leaderboardRequestId&&period===leaderboardPeriod)leaderboardList.innerHTML=`<p class="account-empty">${esc(accountError(error))}</p>`}
  finally{if(requestId===leaderboardRequestId)leaderboardList.removeAttribute('aria-busy');if(isInitialLoad)leaderboardList.classList.remove('is-loading')}
}
