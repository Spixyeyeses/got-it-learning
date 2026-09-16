function initStickSetup(){
  canvas.hidden=true;dom.hidden=false;directControls(L('选择模式与魔法后开始对战','Choose a mode and magic, then start'));$('#helpText').textContent='';setStatus(L('选择光之魔法或暗之魔法','Choose Light or Dark Magic'));
  const settingsStore='gongxing_stick_settings_v1';
  let saved={mode:'ai',level:'normal',magic1:'light',magic2:'dark'};
  try{const value=JSON.parse(localStorage.getItem(settingsStore)||'null');if(['pvp','ai'].includes(value?.mode))saved.mode=value.mode;if(['easy','normal','hard'].includes(value?.level))saved.level=value.level;if(['light','dark'].includes(value?.magic1))saved.magic1=value.magic1;if(['light','dark'].includes(value?.magic2))saved.magic2=value.magic2}catch{}
  const magicOptions=`<option value="light">${L('☀ 光之魔法','☀ Light Magic')}</option><option value="dark">${L('☾ 暗之魔法','☾ Dark Magic')}</option>`;
  dom.innerHTML=`<div class="mode-panel"><h3>${L('⚔️ 火柴人格斗 · 光暗对决','⚔️ Stick Fighter · Light vs Dark')}</h3><p>${L('暗系移动拳高速穿透并附加流血，可通过连续命中触发独立连招。','The Dark moving punch phases through and inflicts bleeding, enabling unique combos through consecutive hits.')}</p><div class="setup-grid"><label class="setup-field">${L('对战模式','Battle mode')}<select id="stickSetupMode"><option value="ai">${L('对战 AI','Vs AI')}</option><option value="pvp">${L('本地真人双人','Local PVP')}</option>${onlineOption(L('在线实时对战','Online realtime match'))}</select></label><label class="setup-field" id="stickSetupDifficultyField">${L('AI 难度','AI difficulty')}<select id="stickSetupDifficulty"><option value="easy">${L('简单','Easy')}</option><option value="normal">${L('普通','Normal')}</option><option value="hard">${L('困难','Hard')}</option></select></label><label class="setup-field">${L('玩家 1 魔法','Player 1 Magic')}<select id="stickSetupMagic1">${magicOptions}</select></label><label class="setup-field"><span id="stickSetupMagic2Label">${L('AI 魔法','AI Magic')}</span><select id="stickSetupMagic2">${magicOptions}</select></label></div><button class="setup-start" id="stickSetupStart">${L('开始对战','Start Battle')}</button><p class="setup-online-note">${onlineStatusCopy()}</p></div>`;
  const mode=$('#stickSetupMode'),difficulty=$('#stickSetupDifficulty'),field=$('#stickSetupDifficultyField'),magic1=$('#stickSetupMagic1'),magic2=$('#stickSetupMagic2'),magic2Label=$('#stickSetupMagic2Label');
  mode.value=saved.mode;difficulty.value=saved.level;magic1.value=saved.magic1;magic2.value=saved.magic2;
  const syncFields=()=>{field.hidden=mode.value!=='ai';magic2Label.textContent=mode.value==='pvp'?L('玩家 2 魔法','Player 2 Magic'):L('AI 魔法','AI Magic')};syncFields();mode.onchange=syncFields;
  $('#stickSetupStart').onclick=async()=>{const chosen={mode:mode.value,level:difficulty.value,magic1:magic1.value,magic2:magic2.value};localStorage.setItem(settingsStore,JSON.stringify(chosen));if(mode.value!=='online')return launchStickMatch();dom.innerHTML=`<div class="mode-panel"><h3>${L('正在寻找格斗对手…','Finding a fighter…')}</h3><p>${L('匹配成功后将自动进入擂台。','The arena opens automatically when matched.')}</p></div>`;try{await beginOnlineMatch('stick',{found:(_,player)=>{localStorage.setItem(settingsStore,JSON.stringify({...chosen,mode:'online',onlinePlayer:player}));launchStickMatch()},event:event=>game?.remoteEvent?.(event),closed:()=>finish(L('对手已离开','Opponent left'))})}catch{startGame()}};
  return{score:0,loop:false,destroy(){}}
}

function initStickPvp(){
  canvas.width=900;canvas.height=540;canvas.className='stick-pvp';controls([]);$('#helpText').textContent='';
  const ground=438,gravity=1550,maxHealth=200,thunderDuration=3.35,keyStore='gongxing_stick_keys_v1',settingsStore='gongxing_stick_settings_v1',actions=['left','right','jump','sweep','punch','block'],defaults={1:{left:'a',right:'d',jump:'w',sweep:'s',punch:'f',block:'g'},2:{left:'ArrowLeft',right:'ArrowRight',jump:'ArrowUp',sweep:'ArrowDown',punch:'j',block:'k'}};
  const normalizeKey=key=>key.length===1?key.toLowerCase():key,keyName=key=>({ArrowLeft:'←',ArrowRight:'→',ArrowUp:'↑',ArrowDown:'↓',' ':'Space',__air__:L('跳+拳','JUMP+PUNCH')}[key]||key.toUpperCase());
  const loadKeys=()=>{try{const saved=JSON.parse(localStorage.getItem(keyStore)||'null'),values=saved&&[1,2].flatMap(id=>actions.map(a=>saved[id]?.[a]));if(values&&values.every(x=>typeof x==='string')&&new Set(values).size===values.length)return saved}catch{}return JSON.parse(JSON.stringify(defaults))};
  const loadSettings=()=>{try{const saved=JSON.parse(localStorage.getItem(settingsStore)||'null');return{mode:saved?.mode==='pvp'?'pvp':'ai',level:['easy','normal','hard'].includes(saved?.level)?saved.level:'normal',onlinePlayer:1,magic1:['light','dark'].includes(saved?.magic1)?saved.magic1:'light',magic2:['light','dark'].includes(saved?.magic2)?saved.magic2:'dark'}}catch{return{mode:'ai',level:'normal',onlinePlayer:1,magic1:'light',magic2:'dark'}}};
  let keybinds=loadKeys();
  keybinds[1].fly=keybinds[2].fly='__air__';
  const stickSettings=loadSettings();
  const matchedPlayer=onlinePlayerNumber();
  const player=(id,x,color,accent,magic)=>({id,x,y:ground,vx:0,vy:0,color:magic==='dark'?'#390d19':color,accent:magic==='dark'?'#ff273f':accent,magic,health:maxHealth,rounds:0,facing:id===1?1:-1,grounded:true,held:{left:false,right:false,jump:false,block:false},blockGrace:0,blockPressed:0,guard:100,state:'idle',stateTime:0,cooldown:0,hitStun:0,guardBreak:0,attackHits:0,damageDone:0,flash:0,comboWindow:0,launcherWindow:0,phantomWindow:0,cometWindow:0,airWindow:0,counterWindow:0,bloodComboWindow:0,bloodDrainWindow:0,darkPunchWindow:0,darkPunchCount:0,clawWindow:0,darkSweepWindow:0,bloodBurstWindow:0,batDiveWindow:0,bloodCounterWindow:0,missWindow:0,wallChainWindow:0,wallFinishWindow:0,bloodMoonWindow:0,moonFinishWindow:0,bloodMoonUsed:false,bloodOriginX:x,bloodOriginY:ground,bloodTarget:0,queuedTriple:false,queuedSkybreaker:false,queuedSpecial:'',comboHits:0,comboTimer:0,escape:0,techAvailable:true,invuln:0,lungeRecovery:0,wakeProtect:0,knockdown:false,slamPending:false,trailTimer:0,trails:[],wallHits:0,wallTimer:0,bleedTime:0,bleedTick:0,bleedOwner:0,blink:null,barrageHidden:false,triplePin:null,thunderTarget:null,thunderTakeoffX:x,executionLock:0,lockX:x,lockY:ground,scriptedMotion:null});
  const g={score:0,players:[player(1,250,'#49d9ff','#c8f7ff',stickSettings.magic1),player(2,650,'#ff4f81','#ffd0de',stickSettings.magic2)],round:1,time:45,intro:2.4,roundPause:0,matchWinner:null,configOpen:false,listening:null,configNote:'',aiMode:stickSettings.mode==='ai',onlineMode:stickSettings.mode==='online',onlinePlayer:[1,2].includes(matchedPlayer)?matchedPlayer:stickSettings.onlinePlayer,aiLevel:stickSettings.level,aiThink:.3,aiPendingPunch:0,particles:[],rings:[],texts:[],teleports:[],barrages:[],lightning:[],bloodFx:[],burnPaths:[],shake:0,hitStop:0,ko:null,cameraZoom:1,cameraX:0,cameraY:0,screenFlash:0,screenTint:'225,248,255',cinematic:0,wallFlash:0,wallCracks:[0,0],netInputSeq:0,netInputNext:{1:1,2:1},netInputBuffer:{1:{},2:{}},netSnapshotSeq:0,netLastSnapshot:0,netSnapshotTimer:0,netSnapshotPending:false};
  const P=id=>g.players[id-1],opponent=p=>g.players[1-(p.id-1)],label=p=>p.id===2&&g.aiMode?L('AI 对手','AI OPPONENT'):L(`玩家 ${p.id}`,`PLAYER ${p.id}`);
  const spark=(x,y,color,count=13)=>{for(let i=0;i<count;i++)g.particles.push({x,y,vx:(Math.random()-.5)*300,vy:(Math.random()-.65)*260,t:0,life:.25+Math.random()*.38,color,r:2+Math.random()*4})};
  const text=(x,y,value,color)=>g.texts.push({x,y,value,color,t:0});
  const impact=(x,y,color,power=1)=>{g.rings.push({x,y,r:8,t:0,life:.3+.12*power,color,power});g.cameraZoom=Math.max(g.cameraZoom,1+.045*power);g.cameraX=(450-x)*.045*power;g.cameraY=(270-y)*.035*power;g.screenTint='225,248,255';g.screenFlash=Math.max(g.screenFlash,.08+.08*power);g.shake=Math.max(g.shake,.12+.1*power);spark(x,y,color,Math.round(12+12*power))};
  const distanceToSegment=(px,py,ax,ay,bx,by)=>{const dx=bx-ax,dy=by-ay,len=dx*dx+dy*dy||1,q=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/len)),x=ax+dx*q,y=ay+dy*q;return Math.hypot(px-x,py-y)};
  const burnPath=(p)=>{const path={owner:p.id,points:[{x:p.x,y:p.y-55}],life:1.1,total:1.1,tick:0};g.burnPaths.push(path);p.burnPath=path;return path};
  const lockTarget=(p,x=p.x,y=p.y,duration=.3)=>{p.executionLock=Math.max(p.executionLock,duration);p.lockX=x;p.lockY=y;p.x=x;p.y=y;p.vx=p.vy=0;p.grounded=y>=ground;p.held={left:false,right:false,jump:false,block:false};p.blockGrace=p.blockPressed=0;p.scriptedMotion=null};
  const scriptTarget=(p,x,y,duration=.3,impactType='')=>{const sx=p.x,sy=p.y;p.executionLock=Math.max(p.executionLock,duration+.1);p.lockX=x;p.lockY=y;p.vx=p.vy=0;p.grounded=false;p.held={left:false,right:false,jump:false,block:false};p.blockGrace=p.blockPressed=0;p.scriptedMotion={sx,sy,ex:x,ey:y,t:0,duration,impactType}};
  const blinkStyles={
    sky:{color:'#b96cff',core:'#ffffff',curve:-105,label:L('裂空瞬身','SKY RIFT')},
    phantom:{color:'#9f5cff',core:'#eadbff',curve:-58,label:L('幻影穿梭','PHANTOM SHIFT')},
    comet:{color:'#ff7438',core:'#fff0a8',curve:-138,label:L('彗星跃迁','COMET WARP')},
    air:{color:'#57e9ff',core:'#f3ffff',curve:-48,label:L('空闪','AIR BLINK')},
    counter:{color:'#ff3b62',core:'#fff7a8',curve:8,label:L('零帧瞬杀','ZERO SHIFT')},
    counterSky:{color:'#ffe06d',core:'#ffffff',curve:-165,label:L('天幕跃迁','SKY WARP')},
    tech:{color:'#38f4e4',core:'#ffffff',curve:-92,label:L('破阵瞬身','BREAKOUT SHIFT')},
    barrage:{color:'#dbefff',core:'#ffffff',curve:12,label:L('残像突进','AFTERIMAGE RUSH')},
    barrageFinal:{color:'#fff3c4',core:'#ffffff',curve:-18,label:L('本体现身','TRUE FORM')},
    thunder:{color:'#38bfff',core:'#f4fdff',curve:-38,label:L('雷瞬','THUNDER SHIFT')},
    thunderDive:{color:'#54d8ff',core:'#ffffff',curve:0,label:L('雷切俯冲','LIGHTNING DIVE')},
    bloodReturn:{color:'#e31335',core:'#ffd6dc',curve:8,label:L('血闪归鞘','BLOOD RETURN')},
    bloodRush:{color:'#ff1638',core:'#fff0f2',curve:-24,label:L('猩红猎袭','CRIMSON HUNT')},
    bloodReverse:{color:'#ff0b32',core:'#ffffff',curve:18,label:L('逆血回闪','BLOOD REVERSAL')}
  };
  const blinkTo=(p,x,y,styleName,options={})=>{
    const style=blinkStyles[styleName],duration=options.duration||.11,sx=p.x,sy=p.y,ex=Math.max(48,Math.min(852,x)),ey=Math.max(105,Math.min(ground,y)),bend=(style.curve||0)*(options.curveScale||1),cx=(sx+ex)/2+(options.sideCurve||0),cy=(sy+ey)/2+bend;
    const fx={owner:p.id,sx,sy,ex,ey,cx,cy,facing:p.facing,endFacing:options.facing??p.facing,style:styleName,color:style.color,core:style.core,t:0,duration,life:.5,arrived:false,burst:false,pose:p.state};
    g.teleports.push(fx);p.blink={fx,t:0,duration,sx,sy,ex,ey,cx,cy,endFacing:fx.endFacing,options};p.vx=p.vy=0;p.grounded=false;
    g.hitStop=Math.max(g.hitStop,.035);g.cinematic=Math.max(g.cinematic,.34);g.cameraZoom=Math.max(g.cameraZoom,1.075);g.cameraX=(450-cx)*.055;g.cameraY=(270-cy)*.045;spark(sx,sy-62,style.color,24);text(sx,sy-142,style.label,style.core);sfx('whoosh',1.55);
  };
  const updateBlink=(p,dt)=>{
    const b=p.blink;if(!b)return false;b.t=Math.min(b.duration,b.t+dt);const q=b.t/b.duration,e=q<.5?2*q*q:1-Math.pow(-2*q+2,2)/2,u=1-e;
    p.x=u*u*b.sx+2*u*e*b.cx+e*e*b.ex;p.y=u*u*b.sy+2*u*e*b.cy+e*e*b.ey;p.vx=p.vy=0;p.grounded=false;b.fx.t=b.t;
    if(q<1)return true;
    p.x=b.ex;p.y=b.ey;p.facing=b.endFacing;p.blink=null;b.fx.arrived=true;const o=b.options,style=blinkStyles[b.fx.style];spark(p.x,p.y-62,style.core,30);impact(p.x,p.y-66,style.color,o.burstPower||.72);g.screenFlash=Math.max(g.screenFlash,.13);sfx('whoosh',1.15);
    p.vx=o.vx||0;p.vy=o.vy||0;p.grounded=p.y>=ground;if(o.reveal)p.barrageHidden=false;if(o.hit)tryAttackHit(p,o.hit,o.reach,o.height);if(o.clearPin)p.triplePin=null;return false;
  };
  let audio=null,audioNoise={};
  const sfx=(kind,power=1)=>{try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume?.();const now=audio.currentTime,profiles={block:['triangle',820,280,.1],whoosh:['sawtooth',260,45,.14],blade:['triangle',1320,210,.18],slice:['sawtooth',720,95,.13],sheathe:['triangle',980,160,.24],rupture:['square',105,34,.28],hit:['square',150,45,.13]},profile=profiles[kind]||profiles.hit,[wave,start,end,duration]=profile,osc=audio.createOscillator(),gain=audio.createGain();osc.type=wave;osc.frequency.setValueAtTime(start*power,now);osc.frequency.exponentialRampToValueAtTime(end,now+duration+.04*power);gain.gain.setValueAtTime(Math.min(.2,.05*power+((kind==='blade'||kind==='sheathe')?.035:0)),now);gain.gain.exponentialRampToValueAtTime(.001,now+duration+.07*power);osc.connect(gain).connect(audio.destination);osc.start(now);osc.stop(now+duration+.09*power);if(power>1.3||kind==='slice'||kind==='rupture'){const noiseKey=kind==='rupture'?'rupture':'impact',seconds=kind==='rupture'?.2:.13,length=Math.floor(audio.sampleRate*seconds);let buffer=audioNoise[noiseKey];if(!buffer){buffer=audio.createBuffer(1,length,audio.sampleRate);const data=buffer.getChannelData(0);for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);audioNoise[noiseKey]=buffer}const noise=audio.createBufferSource(),ng=audio.createGain();noise.buffer=buffer;ng.gain.setValueAtTime((kind==='rupture'?.11:.06)*power,now);ng.gain.exponentialRampToValueAtTime(.001,now+seconds);noise.connect(ng).connect(audio.destination);noise.start(now)}}catch{}};
  const faceEachOther=()=>{const [a,b]=g.players;if(Math.abs(a.x-b.x)>8){a.facing=a.x<b.x?1:-1;b.facing=-a.facing}};
  const canAct=p=>g.intro<=0&&!g.roundPause&&p.executionLock<=0&&p.hitStun<=0&&p.guardBreak<=0&&p.cooldown<=0&&p.lungeRecovery<=0&&(p.state==='idle'||p.state==='run');
  const jump=p=>{if(canAct(p)&&p.grounded){p.grounded=false;p.vy=-660;p.state='jump'}};
  const startSpecial=(p,type)=>{
    if(g.intro>0||g.roundPause||p.hitStun>0||p.guardBreak>0)return;
    const duration={phantom:.78,comet:.9,airrush:.88,counterPunch:.62,counterKick:.82,thunderExecution:thunderDuration}[type];p.wakeProtect=0;p.held.block=false;p.state=type;p.stateTime=duration;p.cooldown=type==='thunderExecution'?duration-.08:duration*.72;p.attackHits=0;p.queuedSpecial='';p.phantomWindow=p.cometWindow=p.airWindow=p.counterWindow=0;g.cinematic=Math.max(g.cinematic,.35);
    const names={phantom:L('幻影穿梭！','PHANTOM RUSH!'),comet:L('彗星追击！','COMET CHASE!'),airrush:L('空坠乱打！','AERIAL RUSH!'),counterPunch:L('零帧反击！','ZERO-FRAME COUNTER!'),counterKick:L('天幕反击！','SKY COUNTER!'),thunderExecution:L('雷葬·草薙！','THUNDER BURIAL!')};
    text(p.x,p.y-155,names[type],'#fff09a');impact(p.x,p.y-70,p.accent,1.15);sfx('whoosh',1.25);
    if(type==='comet'||type==='counterKick'){p.grounded=false;p.vy=-620;p.vx=p.facing*360}
    if(type==='thunderExecution'){const o=opponent(p),takeoffX=p.x,anchor=o.lockX;p.thunderTarget=o;p.thunderTakeoffX=takeoffX;p.launcherWindow=0;p.vx=p.vy=0;p.grounded=true;p.trails=[];lockTarget(o,anchor,ground,thunderDuration+.2);g.rings.push({x:p.x,y:ground-8,r:16,t:0,life:.42,color:'#55dfff',power:1.15});spark(p.x,ground-22,'#8eeaff',34);g.screenFlash=Math.max(g.screenFlash,.2);text(takeoffX,ground-170,L('雷霆追刑！','THUNDER PURSUIT!'),'#dffaff')}
  };
  const startDarkSpecial=(p,type)=>{
    const o=P(p.bloodTarget)||opponent(p);
    if(!o||o.health<=0||g.roundPause)return;
    p.wakeProtect=0;p.held={left:false,right:false,jump:false,block:false};p.attackHits=0;p.vx=p.vy=0;p.grounded=true;p.blink=null;p.burnPath=null;
    if(type==='bloodIaido'){
      p.bloodComboWindow=0;p.bloodDrainWindow=0;p.state=type;p.stateTime=1.36;p.cooldown=1.26;p.facing=Math.sign(o.x-p.x)||p.facing;
      lockTarget(o,o.x,ground,1.48);o.hitStun=Math.max(o.hitStun,1.48);o.escape=Math.min(o.escape,80);
      text(p.x,p.y-154,L('血刃 · 归闪','BLOOD EDGE · RETURN'),'#ffd6dc');g.cinematic=Math.max(g.cinematic,.48);sfx('whoosh',1.5)
    }else if(type==='bloodDrain'){
      p.bloodDrainWindow=0;p.state=type;p.stateTime=2.5;p.cooldown=2.4;p.facing=Math.sign(o.x-p.x)||p.facing;
      lockTarget(o,o.x,ground,2.62);o.hitStun=Math.max(o.hitStun,2.62);o.escape=Math.min(o.escape,70);
      g.bloodFx.push({kind:'pull',x:o.x,y:o.y-68,t:0,life:.72,total:.72});
      text(o.x,o.y-164,L('万象血引','CRIMSON ATTRACTION'),'#ffd6dc');g.cinematic=Math.max(g.cinematic,.8);g.cameraZoom=Math.max(g.cameraZoom,1.12);sfx('whoosh',1.35)
    }else{
      const duration={bloodClaw:1.06,bloodHunt:.9,bloodCounter:1.08,batDive:1.24,bleedBurst:.74,moonBlade:.78,bloodPrison:.94,bloodPrisonFinish:1.24,bloodMoonPrepare:.9,bloodMoonFeast:2.82}[type],lock={bloodClaw:1.16,bloodHunt:1,bloodCounter:1.18,batDive:1.34,bleedBurst:.84,moonBlade:.76,bloodPrison:1.04,bloodPrisonFinish:1.36,bloodMoonPrepare:1,bloodMoonFeast:2.96}[type];
      if(!duration)return;
      p.clawWindow=p.darkSweepWindow=p.bloodBurstWindow=p.batDiveWindow=p.bloodCounterWindow=p.missWindow=p.wallChainWindow=p.wallFinishWindow=p.bloodMoonWindow=p.moonFinishWindow=0;
      p.state=type;p.stateTime=duration;p.cooldown=duration-.08;p.facing=Math.sign(o.x-p.x)||p.facing;p.bloodTarget=o.id;
      lockTarget(o,o.x,o.y,lock);o.hitStun=Math.max(o.hitStun,lock);o.escape=Math.min(o.escape,78);
      const names={bloodClaw:L('血爪升击','BLOOD CLAW RISE'),bloodHunt:L('血遁追猎','BLOOD PHASE HUNT'),bloodCounter:L('猩红处刑','CRIMSON EXECUTION'),batDive:L('蝠群坠杀','BAT SWARM DIVE'),bleedBurst:L('血爆掌','BLEED DETONATION'),moonBlade:L('回身月刃','REVERSAL MOON BLADE'),bloodPrison:L('血牢绞杀','BLOOD PRISON'),bloodPrisonFinish:L('血牢破壁','BLOOD PRISON BREAK'),bloodMoonPrepare:L('血月降临','BLOOD MOON RISES'),bloodMoonFeast:L('血月盛宴','BLOOD MOON FEAST')};
      text((p.x+o.x)/2,Math.min(p.y,o.y)-166,names[type],'#fff0f2');g.cinematic=Math.max(g.cinematic,type==='bloodMoonFeast'?.95:.55);g.cameraZoom=Math.max(g.cameraZoom,type==='bloodMoonFeast'?1.2:1.1);sfx('whoosh',type==='bloodMoonFeast'?1.8:1.35);
      if(type==='bloodMoonFeast')p.bloodMoonUsed=true;
    }
  };
  const attack=(p,type)=>{
    if(type==='punch'&&!p.grounded&&p.state==='jump')type='fly';
    const movingPunch=type==='punch'&&(p.held.left||p.held.right||Math.abs(p.vx)>45),oppositeSweep=type==='sweep'&&(p.dashDir>0?p.held.left:p.held.right);
    if(p.magic==='dark'&&type==='punch'&&p.moonFinishWindow>0&&p.state!=='bloodMoonPrepare')return startDarkSpecial(p,'bloodMoonFeast');
    if(p.magic==='dark'&&type==='punch'&&p.wallFinishWindow>0&&p.state!=='bloodPrison')return startDarkSpecial(p,'bloodPrisonFinish');
    if(p.magic==='dark'&&type==='sweep'&&p.bloodMoonWindow>0&&!p.bloodMoonUsed)return startDarkSpecial(p,'bloodMoonPrepare');
    if(p.magic==='dark'&&type==='punch'&&p.bloodCounterWindow>0)return startDarkSpecial(p,'bloodCounter');
    if(p.magic==='dark'&&type==='sweep'&&p.batDiveWindow>0)return startDarkSpecial(p,'batDive');
    if(p.magic==='dark'&&type==='sweep'&&p.bloodBurstWindow>0)return startDarkSpecial(p,'bleedBurst');
    if(p.magic==='dark'&&type==='sweep'&&p.clawWindow>0)return startDarkSpecial(p,'bloodClaw');
    if(p.magic==='dark'&&type==='punch'&&p.wallChainWindow>0)return startDarkSpecial(p,'bloodPrison');
    if(p.magic==='dark'&&movingPunch&&p.darkSweepWindow>0)return startDarkSpecial(p,'bloodHunt');
    if(p.magic==='dark'&&oppositeSweep&&p.missWindow>0)return startDarkSpecial(p,'moonBlade');
    if(p.magic==='dark'&&type==='sweep'&&p.bloodDrainWindow>0&&!['bloodIaido','bloodDrain'].includes(p.state))return startDarkSpecial(p,'bloodDrain');
    if(p.magic==='dark'&&type==='sweep'&&p.bloodComboWindow>0)return startDarkSpecial(p,'bloodIaido');
    if(p.magic==='light'&&type==='sweep'&&p.comboWindow>0&&p.state==='punch'){p.queuedTriple=true;return}
    if(p.magic==='light'&&type==='punch'&&p.launcherWindow>0&&p.state==='sweep'){p.queuedSpecial='thunderExecution';return}
    if(p.magic==='light'&&type==='punch'&&p.counterWindow>0)return startSpecial(p,'counterPunch');
    if(p.magic==='light'&&type==='fly'&&p.counterWindow>0)return startSpecial(p,'counterKick');
    if(p.magic==='light'&&type==='punch'&&p.airWindow>0)return startSpecial(p,'airrush');
    if(p.magic==='light'&&type==='punch'&&p.phantomWindow>0){if(p.state==='lunge'){p.queuedSpecial='phantom';return}return startSpecial(p,'phantom')}
    if(p.magic==='light'&&type==='fly'&&p.cometWindow>0){if(p.state==='lunge'){p.queuedSpecial='comet';return}return startSpecial(p,'comet')}
    if(type==='fly'){if(g.intro>0||g.roundPause||p.grounded||p.state!=='jump'||p.hitStun>0||p.guardBreak>0||p.cooldown>0)return}
    else if(!canAct(p)||!p.grounded)return;
    if(p.magic==='light'&&type==='punch'&&p.launcherWindow>0)return startSpecial(p,'thunderExecution');
    if(p.magic==='light'&&type==='sweep'&&p.comboWindow>0)type='triple';
    if(movingPunch)type='lunge';
    p.wakeProtect=0;p.held.block=false;p.state=type;p.stateTime={punch:.19,lunge:.22,sweep:.42,fly:.42,triple:1.25,skybreaker:.98}[type];p.cooldown={punch:.1,lunge:.24,sweep:.27,fly:.26,triple:.86,skybreaker:.62}[type];p.attackHits=0;
    if(type==='lunge'){if(p.magic==='dark'){p.stateTime=.16;p.cooldown=.48;p.dashDir=p.facing;p.bloodOriginX=p.x;p.bloodOriginY=p.y;p.bloodTarget=0;p.bloodComboWindow=p.bloodDrainWindow=0;p.vx=p.dashDir*1750;p.invuln=Math.max(p.invuln,.2);burnPath(p);g.bloodFx.push({kind:'dash',x:p.x,y:p.y-65,dir:p.facing,t:0,life:.32,total:.32});g.rings.push({x:p.x+p.facing*24,y:p.y-65,r:8,t:0,life:.22,color:'#ff334a',power:.62});g.screenFlash=Math.max(g.screenFlash,.07);spark(p.x,p.y-65,'#ff334a',18);text(p.x,p.y-138,L('血遁','BLOOD PHASE'),'#ffb0b7');sfx('whoosh',1.55)}else{p.vx=p.facing*820;spark(p.x,p.y-72,p.accent,9)}}
    if(type==='fly'){p.vx=p.facing*650;p.vy=Math.max(p.vy,210);spark(p.x,p.y-62,p.accent,10)}
    if(type==='triple'){p.comboWindow=0;p.vx=0;p.barrageHidden=false;p.triplePin=null;text(p.x,p.y-135,L('残像连拳！','AFTERIMAGE BARRAGE!'),'#eef8ff')}
    if(type==='skybreaker'){p.launcherWindow=0;p.vx=p.facing*210;text(p.x,p.y-145,L('升龙闪击！','SKYBREAKER!'),'#d7a8ff')}
  };
  const blockFacing=(defender,attacker)=>(defender.held.block||defender.blockGrace>0)&&defender.grounded&&defender.facing===Math.sign(attacker.x-defender.x);
  const registerHit=(attacker,defender,type)=>{
    if(defender.invuln>0||defender.wakeProtect>0){spark(defender.x,defender.y-70,'#ffffff88',7);return}
    const blocked=attacker.magic==='dark'&&type==='lunge'?false:blockFacing(defender,attacker),perfect=blocked&&defender.blockPressed>0,dir=attacker.facing,corner=defender.x<72||defender.x>828;
    if(perfect){attacker.vx=-dir*430;attacker.hitStun=.38;defender.guard=Math.min(100,defender.guard+16);defender.counterWindow=.52;if(defender.magic==='dark'){defender.bloodCounterWindow=.62;if(defender.health<maxHealth*.25&&!defender.bloodMoonUsed){defender.bloodMoonWindow=.82;text(defender.x,defender.y-178,L('血月觉醒 · 扫腿','BLOOD MOON · SWEEP'),'#ff6075')}}defender.bloodTarget=attacker.id;defender.flash=.22;g.hitStop=.11;g.cinematic=.28;impact(defender.x,defender.y-72,'#fff7a8',1.7);sfx('block',1.5);text(defender.x,defender.y-142,L('完美格挡！','PERFECT BLOCK!'),'#fff7a8');return}
    const guardCost={punch:12,lunge:25,sweep:42,fly:30,triple1:10,triple2:14,triple3:36,uppercut:24,slam:40,phantom1:18,phantom2:32,cometKnee:20,cometKick:38,air1:10,air2:12,air3:35,counterPunch:38,counterKick:45,thunderPin:45,thunderLift:30,thunderBeam:55}[type]||12;
    if(blocked&&type!=='sweep'){
      defender.guard=Math.max(0,defender.guard-guardCost);attacker.vx=-dir*(type==='lunge'||type==='triple3'?220:125);attacker.hitStun=.11;defender.flash=.14;g.hitStop=.045;spark(defender.x+defender.facing*20,defender.y-68,'#8df6ff',10);
      if(defender.guard>0){text(defender.x,defender.y-125,L('格挡','BLOCK'),'#8df6ff');return}
    }
    if((type==='sweep'||defender.guard<=0)&&blocked){defender.held.block=false;defender.guard=0;defender.guardBreak=.78;defender.hitStun=.5;type='guardBreak';text(defender.x,defender.y-120,L('破防！','GUARD BREAK!'),'#ffe06d');spark(defender.x,defender.y-28,'#ffe06d',18)}
    defender.comboHits=defender.comboTimer>0?defender.comboHits+1:1;defender.comboTimer=.9;
    const normalScale=[1,.85,.7,.55][Math.min(3,defender.comboHits-1)],cornerScale=[1,.75,.5,.4][Math.min(3,defender.comboHits-1)],scale=corner?cornerScale:normalScale;
    const baseDamage=attacker.magic==='dark'&&type==='lunge'?9:{punch:10,lunge:15,sweep:12,fly:24,triple1:3,triple2:2,triple3:16,uppercut:7,slam:16,phantom1:6,phantom2:14,cometKnee:8,cometKick:17,air1:3,air2:4,air3:13,counterPunch:19,counterKick:23,thunderPin:4,thunderLift:5,thunderBeam:17,guardBreak:8}[type],damage=Math.max(1,Math.round(baseDamage*scale));
    const power=attacker.magic==='dark'&&type==='punch'?110:attacker.magic==='dark'&&type==='lunge'?45:{punch:270,lunge:460,sweep:360,fly:620,triple1:85,triple2:95,triple3:720,uppercut:105,slam:90,phantom1:170,phantom2:650,cometKnee:100,cometKick:680,air1:80,air2:95,air3:120,counterPunch:720,counterKick:150,thunderPin:0,thunderLift:0,thunderBeam:0,guardBreak:220}[type],stun=attacker.magic==='dark'&&type==='lunge'?0:{punch:.24,lunge:.4,sweep:.56,fly:.76,triple1:.18,triple2:.19,triple3:.82,uppercut:.86,slam:.94,phantom1:.24,phantom2:.72,cometKnee:.34,cometKick:.82,air1:.16,air2:.18,air3:.86,counterPunch:.8,counterKick:.92,thunderPin:3.2,thunderLift:2.7,thunderBeam:1.1,guardBreak:.5}[type];
    const finisher=defender.health<=maxHealth*.15&&damage>=defender.health&&['lunge','fly','triple3','slam','phantom2','cometKick','air3','counterPunch','counterKick','thunderBeam'].includes(type);
    defender.health-=damage;defender.hitStun=stun;defender.held.block=false;defender.vx=dir*power;defender.vy=type==='uppercut'?-760:type==='cometKnee'?-570:type==='air1'?-170:type==='air2'?-110:type==='slam'||type==='air3'||type==='counterKick'?880:type==='cometKick'?410:type==='fly'?-280:type==='sweep'||type==='triple3'?-180:-80;defender.grounded=false;if(attacker.magic==='dark'&&type==='lunge'){defender.vy=0;defender.grounded=true}
    if(type==='sweep'){const wallX=dir>0?828:72;attacker.thunderTarget=defender;attacker.vx=-dir*55;defender.executionLock=Math.max(defender.executionLock,1.05);defender.hitStun=Math.max(defender.hitStun,1.05);defender.escape=Math.min(defender.escape,99);scriptTarget(defender,wallX,ground,.28,'wall');g.shake=Math.max(g.shake,.14);text(defender.x,defender.y-150,L('扫堂击壁！','WALL SWEEP!'),'#dffaff')}
    if(['slam','air3','counterKick'].includes(type)){defender.slamPending=true;defender.knockdown=true}
    const escapeGain={triple1:5,triple2:6,triple3:26,uppercut:12,slam:18,phantom1:12,phantom2:20,cometKnee:12,cometKick:20,air1:8,air2:8,air3:16,counterPunch:22,counterKick:22,thunderPin:0,thunderLift:0,thunderBeam:0}[type]??34;defender.escape=Math.min(100,defender.escape+escapeGain);
    if(attacker.magic==='light'&&type==='punch')attacker.comboWindow=.35;
    if(attacker.magic==='light'&&type==='sweep')attacker.launcherWindow=.42;
    if(attacker.magic==='light'&&type==='lunge'){attacker.phantomWindow=.42;attacker.cometWindow=.42}
    if(attacker.magic==='dark'&&type==='punch'&&defender.health>0){attacker.darkPunchCount=attacker.darkPunchWindow>0?attacker.darkPunchCount+1:1;attacker.darkPunchWindow=.52;attacker.bloodTarget=defender.id;if(defender.bleedTime>0)attacker.bloodBurstWindow=.56;if(attacker.darkPunchCount>=2){attacker.clawWindow=.62;attacker.darkPunchCount=0;text(attacker.x,attacker.y-148,L('血爪衔接 · 扫腿','BLOOD CLAW · SWEEP'),'#ff9aaa')}}
    if(attacker.magic==='dark'&&type==='sweep'&&defender.health>0){attacker.darkSweepWindow=.62;attacker.bloodTarget=defender.id;if(corner){attacker.wallChainWindow=.68;text(defender.x,defender.y-182,L('血牢衔接 · 拳拳','BLOOD PRISON · PUNCH PUNCH'),'#ff9aaa')}}
    if(attacker.magic==='dark'&&type==='lunge'&&defender.health>0){attacker.bloodComboWindow=.82;attacker.bloodTarget=defender.id;defender.bleedTime=3;defender.bleedTick=1;defender.bleedOwner=attacker.id;text(defender.x,defender.y-158,L('流血 · 扫腿追击','BLEED · SWEEP FOLLOW-UP'),'#ff6673')}
    if(attacker.magic==='dark'&&type==='fly'&&defender.health>0){attacker.batDiveWindow=.64;attacker.bloodTarget=defender.id;text(attacker.x,attacker.y-158,L('蝠群追击 · 扫腿','BAT DIVE · SWEEP'),'#ff9aaa')}
    if(attacker.magic==='light'&&type==='fly')attacker.airWindow=.4;
    text(defender.x,defender.y-125,`-${damage}`,type==='fly'||type==='lunge'||type==='triple3'||type==='slam'?'#ffe06d':'#fff');spark(defender.x,defender.y-(type==='sweep'||type==='triple3'||type==='slam'?25:75),attacker.accent,type==='fly'||type==='triple3'||type==='slam'?24:type==='sweep'?22:type==='lunge'||type==='uppercut'?19:12);
    const heavy=['fly','triple3','slam','phantom2','cometKick','air3','counterPunch','counterKick','thunderBeam'].includes(type),medium=['lunge','sweep','uppercut','cometKnee','phantom1','thunderPin','thunderLift'].includes(type),darkBasic=attacker.magic==='dark'&&['punch','lunge','sweep'].includes(type),bloodLunge=attacker.magic==='dark'&&type==='lunge';g.hitStop=darkBasic?0:(heavy?.12:medium?.085:.05);if(bloodLunge){g.rings.push({x:defender.x,y:defender.y-65,r:9,t:0,life:.34,color:'#ff1838',power:1.45},{x:defender.x-dir*20,y:defender.y-65,r:5,t:0,life:.22,color:'#ffd5da',power:.9});g.shake=Math.max(g.shake,.18);g.cameraZoom=Math.max(g.cameraZoom,1.09);g.cameraX=(450-defender.x)*.08;g.screenFlash=Math.max(g.screenFlash,.14);spark(defender.x,defender.y-65,'#ff1838',34)}else if(darkBasic){g.rings.push({x:defender.x,y:defender.y-65,r:7,t:0,life:.2,color:'#ff334a',power:.5});g.shake=Math.max(g.shake,.05)}else impact(defender.x,defender.y-65,type.startsWith('thunder')?'#dffaff':heavy?'#fff09a':attacker.accent,heavy?1.8:medium?1.2:.72);sfx('hit',bloodLunge?1.75:heavy?1.9:medium?1.35:.9);
    if(corner&&!type.startsWith('thunder')){attacker.vx=-dir*power*.68;defender.wallHits=defender.wallTimer>0?defender.wallHits+1:1;defender.wallTimer=1.2;const side=defender.x<450?0:1;g.wallCracks[side]=Math.min(3,g.wallCracks[side]+1);text(defender.x,defender.y-158,L('墙角反推','CORNER PUSH'),'#b8edff');if(defender.wallHits>=3){defender.wallHits=0;defender.knockdown=true;defender.vx=defender.x<450?620:-620;defender.vy=-260;attacker.vx=-defender.vx*.55;g.wallFlash=.45;g.wallCracks[side]=3;text(defender.x,defender.y-190,L('破壁重击！','WALL BREAK!'),'#ffcf70');impact(defender.x,defender.y-70,'#ff8a42',2.6)}}
    if(defender.escape>=100&&!finisher&&!['uppercut','slam'].includes(type)&&!type.startsWith('thunder')){defender.escape=0;defender.knockdown=true;defender.hitStun=.72;defender.vx=corner?0:dir*560;defender.vy=-230;attacker.vx=-dir*(corner?470:260);text(defender.x,defender.y-168,L('强制脱身！','COMBO BREAK!'),'#7ef8ff');spark(defender.x,defender.y-70,'#7ef8ff',25)}
    defender.health=Math.max(0,defender.health);attacker.damageDone+=damage;g.score=Math.max(...g.players.map(x=>x.damageDone));setScore(g.score);if(defender.health<=0)endRound(attacker,{finisher:true});
  };
  const bloodDamage=(attacker,defender,damage,heal=0,final=false)=>{
    if(g.roundPause||defender.health<=0)return;
    defender.health=Math.max(0,Math.round((defender.health-damage)*10)/10);attacker.health=Math.min(maxHealth,Math.round((attacker.health+heal)*10)/10);attacker.damageDone+=damage;g.score=Math.max(g.score,attacker.damageDone);setScore(g.score);
    defender.flash=.16;text(defender.x,defender.y-132,`-${damage}`,'#ff9aa8');spark(defender.x,defender.y-66,final?'#fff0f2':'#ff2445',final?46:18);
    if(final){defender.executionLock=0;defender.scriptedMotion=null;defender.hitStun=1.05;defender.vx=attacker.facing*760;defender.vy=-240;defender.grounded=false;defender.knockdown=true;impact(defender.x,defender.y-68,'#ff1838',2.7);g.screenFlash=Math.max(g.screenFlash,.65);g.shake=Math.max(g.shake,.68);sfx('hit',2.15)}
    else{sfx('hit',1.05);g.shake=Math.max(g.shake,.08)}
    if(defender.health<=0)endRound(attacker,{finisher:true})
  };
  const tryAttackHit=(p,type,reach,height=85)=>{const o=opponent(p),dx=o.x-p.x,dy=Math.abs(o.y-p.y);if(Math.sign(dx||p.facing)===p.facing&&Math.abs(dx)<=reach&&dy<height){registerHit(p,o,type);return true}return false};
  const attackWindow=p=>{
    if(p.state==='bloodIaido'){
      const elapsed=1.36-p.stateTime,o=P(p.bloodTarget)||opponent(p),windows=[.08,.22,.4,.56,.68,.8,1,1.18];
      if(o.health<=0)return;
      while(p.attackHits<windows.length&&elapsed>=windows[p.attackHits]){
        p.attackHits++;
        if(p.attackHits===1){g.bloodFx.push({kind:'draw',x:p.x,y:p.y-70,dir:p.facing,t:0,life:.54,total:.54});spark(p.x,p.y-62,'#bd62ff',34);g.screenFlash=Math.max(g.screenFlash,.1);sfx('blade',1.15)}
        else if(p.attackHits===2){bloodDamage(p,o,2);lockTarget(o,o.x,ground,1.12);g.bloodFx.push({kind:'cut',x:o.x,y:o.y-66,dir:-p.facing,t:0,life:.58,total:.58});g.bloodFx.push({kind:'bladeRift',x:o.x,y:o.y-66,dir:p.facing,index:1,t:0,life:.98,total:.98});spark(o.x,o.y-66,'#b956ff',28);g.screenTint='226,190,255';g.screenFlash=Math.max(g.screenFlash,.2);g.cameraX=-p.facing*16;text(o.x,o.y-170,L('拔刀','DRAW'),'#f3d8ff');sfx('slice',1.25)}
        else if(p.attackHits===3){const fromX=p.x;g.bloodFx.push({kind:'returnLine',x1:fromX,x2:p.bloodOriginX,y:ground-64,t:0,life:.7,total:.7});g.bloodFx.push({kind:'bladeGhosts',x1:fromX,x2:p.bloodOriginX,y:ground,dir:p.facing,t:0,life:.72,total:.72});blinkTo(p,p.bloodOriginX,p.bloodOriginY,'bloodReturn',{duration:.095,facing:p.facing,burstPower:.72});sfx('whoosh',1.65)}
        else if(p.attackHits===4){g.bloodFx.push({kind:'slashPath',x1:p.bloodOriginX,x2:o.x,y:ground-66,t:0,life:.88,total:.88});g.cinematic=Math.max(g.cinematic,.62);g.cameraZoom=Math.max(g.cameraZoom,1.16);sfx('slice',1.7)}
        else if(p.attackHits===5||p.attackHits===6){bloodDamage(p,o,2);if(o.health>0)lockTarget(o,o.x,ground,.58);g.bloodFx.push({kind:'cut',x:o.x,y:o.y-66+(p.attackHits===5?-18:18),dir:p.attackHits===5?p.facing:-p.facing,t:0,life:.44,total:.44});g.bloodFx.push({kind:'bladeRift',x:o.x,y:o.y-66,dir:p.attackHits===5?p.facing:-p.facing,index:p.attackHits-3,t:0,life:.82,total:.82});spark(o.x,o.y-66,'#b956ff',24);g.screenTint='226,190,255';g.screenFlash=Math.max(g.screenFlash,.16);g.cameraX=(p.attackHits===5?-1:1)*p.facing*13;sfx('slice',1.35)}
        else if(p.attackHits===7){bloodDamage(p,o,6);if(o.health>0){lockTarget(o,o.x,ground,.38);o.hitStun=Math.max(o.hitStun,.38)}g.bloodFx.push({kind:'riftBurst',x:o.x,y:o.y-66,dir:p.facing,t:0,life:.9,total:.9});spark(o.x,o.y-66,'#ff2949',54);spark(o.x,o.y-66,'#bd62ff',42);g.screenTint='255,180,235';g.screenFlash=Math.max(g.screenFlash,.58);g.shake=Math.max(g.shake,.58);g.cameraZoom=Math.max(g.cameraZoom,1.2);text(o.x,o.y-174,L('血刃引爆！','BLOOD EDGE DETONATION!'),'#ffffff');sfx('rupture',1.75)}
        else{p.bloodDrainWindow=1.05;g.bloodFx.push({kind:'sheathe',x:p.x,y:p.y-68,dir:p.facing,t:0,life:.58,total:.58});text(p.x,p.y-148,L('收刀 · 再按扫腿','SHEATHE · SWEEP AGAIN'),'#e5b9ff');sfx('sheathe',1.05)}
      }
      return
    }
    if(p.state==='bloodDrain'){
      const elapsed=2.5-p.stateTime,o=P(p.bloodTarget)||opponent(p),windows=[.12,.46,.7,.94,1.18,1.42,1.66,2.08];
      if(o.health<=0)return;
      if(elapsed<.46){const q=Math.max(0,Math.min(1,elapsed/.46)),target=p.x+p.facing*92;o.lockX=o.x+(target-o.x)*(.06+.16*q);o.x=o.lockX;o.y=ground;o.lockY=ground;g.cameraX=(450-(p.x+o.x)/2)*.08}
      while(p.attackHits<windows.length&&elapsed>=windows[p.attackHits]){
        p.attackHits++;
        if(p.attackHits===1){g.bloodFx.push({kind:'pull',x:o.x,y:o.y-66,t:0,life:.74,total:.74});g.rings.push({x:o.x,y:o.y-66,r:145,t:0,life:.52,color:'#8e0920',power:-.38});g.screenFlash=Math.max(g.screenFlash,.12);sfx('whoosh',1.25)}
        else if(p.attackHits===2){const face=Math.sign(o.x-p.x)||p.facing;p.facing=face;blinkTo(p,o.x-face*58,ground,'bloodRush',{duration:.11,facing:face,burstPower:1.25});g.cinematic=Math.max(g.cinematic,.82)}
        else if(p.attackHits===3&&!p.blink){p.x=o.x-p.facing*45;p.y=ground;p.vx=p.vy=0;lockTarget(o,o.x,ground,1.88);o.hitStun=Math.max(o.hitStun,1.88);g.bloodFx.push({kind:'bats',x:o.x,y:o.y-70,t:0,life:1.42,total:1.42});text(o.x,o.y-176,L('Bloodbane Drain','BLOODBANE DRAIN'),'#fff0f2');g.cameraZoom=Math.max(g.cameraZoom,1.25);g.cameraX=(450-o.x)*.14;g.cameraY=-22}
        else if(p.attackHits>=4&&p.attackHits<=7){bloodDamage(p,o,3,2);if(o.health>0){lockTarget(o,o.x,ground,2.02-elapsed);o.hitStun=Math.max(o.hitStun,2.02-elapsed)}g.bloodFx.push({kind:'bite',x:o.x,y:o.y-68,index:p.attackHits,t:0,life:.44,total:.44});g.cinematic=Math.max(g.cinematic,.38)}
        else{bloodDamage(p,o,14,4,true);g.bloodFx.push({kind:'drainBurst',x:o.x,y:o.y-68,dir:p.facing,t:0,life:.9,total:.9});text(o.x,o.y-182,L('血宴冲击！','VAMPIRIC IMPACT!'),'#ffffff');p.bloodTarget=0}
      }
      return
    }
    if(['bloodClaw','bloodHunt','bloodCounter','batDive','bleedBurst','moonBlade','bloodPrison','bloodPrisonFinish','bloodMoonPrepare','bloodMoonFeast'].includes(p.state)){
      const o=P(p.bloodTarget)||opponent(p),durations={bloodClaw:1.06,bloodHunt:.9,bloodCounter:1.08,batDive:1.24,bleedBurst:.74,moonBlade:.78,bloodPrison:.94,bloodPrisonFinish:1.24,bloodMoonPrepare:.9,bloodMoonFeast:2.82},elapsed=durations[p.state]-p.stateTime;
      if(o.health<=0)return;
      const keep=(time=.45)=>{if(o.health>0){lockTarget(o,o.x,o.y,time);o.hitStun=Math.max(o.hitStun,time)}};
      if(p.state==='bloodClaw'){
        const windows=[.1,.3,.5,.72];while(p.attackHits<windows.length&&elapsed>=windows[p.attackHits]){p.attackHits++;
          if(p.attackHits===1)blinkTo(p,o.x-p.facing*62,ground,'bloodRush',{duration:.085,facing:p.facing,burstPower:.72});
          else if(p.attackHits<4){bloodDamage(p,o,p.attackHits===2?4:5);keep(.64);g.bloodFx.push({kind:'claw',x:o.x,y:o.y-68,dir:p.facing,index:p.attackHits,t:0,life:.46,total:.46})}
          else{bloodDamage(p,o,11);o.executionLock=0;o.vx=p.facing*190;o.vy=-720;o.grounded=false;o.hitStun=.92;g.bloodFx.push({kind:'clawRise',x:o.x,y:o.y-55,dir:p.facing,t:0,life:.74,total:.74});impact(o.x,o.y-62,'#ff2445',1.8);text(o.x,o.y-175,L('血爪升空！','BLOOD CLAW LAUNCH!'),'#ffffff')}
        }return
      }
      if(p.state==='bloodHunt'){
        const windows=[.08,.24,.38,.5,.64,.76];while(p.attackHits<windows.length&&elapsed>=windows[p.attackHits]){p.attackHits++;
          if(p.attackHits===1){const face=Math.sign(o.x-p.x)||p.facing;p.facing=face;blinkTo(p,o.x-face*92,ground,'bloodRush',{duration:.09,facing:face,burstPower:1});g.bloodFx.push({kind:'hunt',x1:p.x,x2:o.x,y:ground-64,t:0,life:.7,total:.7})}
          else if(p.attackHits===2||p.attackHits===3||p.attackHits===5){bloodDamage(p,o,3);keep(.68-(p.attackHits-2)*.1);g.bloodFx.push({kind:'claw',x:o.x,y:o.y-70,dir:p.attackHits%2?p.facing:-p.facing,index:p.attackHits,t:0,life:.42,total:.42})}
          else if(p.attackHits===4){g.bloodFx.push({kind:'cross',x:o.x,y:o.y-66,t:0,life:.58,total:.58});keep(.48)}
          else{bloodDamage(p,o,9,0,true);g.bloodFx.push({kind:'explode',x:o.x,y:o.y-66,t:0,life:.78,total:.78})}
        }return
      }
      if(p.state==='bloodCounter'){
        const windows=[.08,.26,.44,.62,.82];while(p.attackHits<windows.length&&elapsed>=windows[p.attackHits]){p.attackHits++;
          if(p.attackHits===1){const face=Math.sign(o.x-p.x)||p.facing;blinkTo(p,o.x+face*62,ground,'bloodReturn',{duration:.09,facing:-face,burstPower:1.05})}
          else if(p.attackHits===2){p.facing=Math.sign(o.x-p.x)||p.facing;keep(.76);g.bloodFx.push({kind:'grab',x:o.x,y:o.y-66,dir:p.facing,t:0,life:.62,total:.62})}
          else if(p.attackHits===3||p.attackHits===4){bloodDamage(p,o,4,2);keep(.56-(p.attackHits-3)*.12);g.bloodFx.push({kind:p.attackHits===3?'bite':'claw',x:o.x,y:o.y-70,dir:p.facing,index:p.attackHits,t:0,life:.5,total:.5})}
          else{bloodDamage(p,o,13,2,true);o.vy=520;o.slamPending=true;g.bloodFx.push({kind:'drainBurst',x:o.x,y:o.y-50,dir:p.facing,t:0,life:.8,total:.8})}
        }return
      }
      if(p.state==='batDive'){
        const windows=[.08,.28,.42,.56,.7,.9];while(p.attackHits<windows.length&&elapsed>=windows[p.attackHits]){p.attackHits++;
          if(p.attackHits===1)blinkTo(p,o.x-p.facing*54,Math.max(135,o.y-175),'bloodRush',{duration:.12,facing:p.facing,curveScale:1.4,burstPower:1.1});
          else if(p.attackHits===2){g.bloodFx.push({kind:'bats',x:o.x,y:o.y-105,t:0,life:.9,total:.9});keep(.82)}
          else if(p.attackHits>=3&&p.attackHits<=5){bloodDamage(p,o,p.attackHits===5?4:3,p.attackHits===4?1:0);keep(.62-(p.attackHits-3)*.12);g.bloodFx.push({kind:'bite',x:o.x,y:o.y-84,index:p.attackHits,t:0,life:.42,total:.42});if(p.attackHits===5){p.vy=720;p.vx=p.facing*180}}
          else{bloodDamage(p,o,14,3,true);o.vy=760;o.slamPending=true;o.knockdown=true;g.bloodFx.push({kind:'drainBurst',x:o.x,y:ground-20,dir:p.facing,t:0,life:.9,total:.9})}
        }return
      }
      if(p.state==='bleedBurst'){
        const windows=[.08,.2,.32,.44,.58];while(p.attackHits<windows.length&&elapsed>=windows[p.attackHits]){p.attackHits++;
          if(p.attackHits===1){p.x=o.x-p.facing*66;p.y=ground;g.bloodFx.push({kind:'palm',x:o.x,y:o.y-68,dir:p.facing,t:0,life:.54,total:.54});keep(.6)}
          else if(p.attackHits===2){const stored=Math.round(o.bleedTime*1.5*10)/10;o.bleedTime=o.bleedTick=0;p.storedBleed=stored;g.bloodFx.push({kind:'vortex',x:o.x,y:o.y-68,t:0,life:.62,total:.62});keep(.4)}
          else if(p.attackHits===3||p.attackHits===4){bloodDamage(p,o,2);keep(.34);g.bloodFx.push({kind:'bite',x:o.x,y:o.y-68,index:p.attackHits,t:0,life:.36,total:.36})}
          else{bloodDamage(p,o,4+(p.storedBleed||0),0,true);p.storedBleed=0;g.bloodFx.push({kind:'explode',x:o.x,y:o.y-68,t:0,life:.82,total:.82})}
        }return
      }
      if(p.state==='moonBlade'){
        const windows=[.08,.24,.4,.58];while(p.attackHits<windows.length&&elapsed>=windows[p.attackHits]){p.attackHits++;
          if(p.attackHits===1){p.facing=-p.dashDir;const sx=p.x,tx=Math.max(48,Math.min(852,o.x-p.facing*86));g.bloodFx.push({kind:'moonBlade',x:sx,y:p.y-48,dir:p.facing,t:0,life:.78,total:.78});g.bloodFx.push({kind:'reverseRush',x1:sx,x2:tx,y:ground-62,dir:p.facing,t:0,life:.62,total:.62});blinkTo(p,tx,ground,'bloodReverse',{duration:.115,facing:p.facing,sideCurve:-p.facing*22,burstPower:.86});g.cameraZoom=Math.max(g.cameraZoom,1.12);sfx('whoosh',1.9)}
          else if(p.attackHits===2){p.x=Math.max(48,Math.min(852,o.x-p.facing*86));bloodDamage(p,o,4);keep(.5);g.bloodFx.push({kind:'moonCut',x:o.x,y:o.y-70,dir:p.facing,index:1,t:0,life:.5,total:.5})}
          else if(p.attackHits===3){bloodDamage(p,o,4);keep(.34);g.bloodFx.push({kind:'moonCut',x:o.x,y:o.y-48,dir:-p.facing,index:2,t:0,life:.5,total:.5})}
          else{bloodDamage(p,o,7,0,true);g.bloodFx.push({kind:'moonCrossBurst',x:o.x,y:o.y-65,dir:p.facing,t:0,life:.82,total:.82});g.screenFlash=Math.max(g.screenFlash,.34);g.shake=Math.max(g.shake,.46)}
        }return
      }
      if(p.state==='bloodPrison'){
        const windows=[.08,.26,.48,.72];while(p.attackHits<windows.length&&elapsed>=windows[p.attackHits]){p.attackHits++;
          if(p.attackHits===1){g.bloodFx.push({kind:'chains',x:o.x,y:o.y-65,t:0,life:1,total:1});keep(.92)}
          else if(p.attackHits===2||p.attackHits===3){bloodDamage(p,o,p.attackHits===2?3:4);keep(.5);g.bloodFx.push({kind:'claw',x:o.x,y:o.y-66,dir:p.facing,index:p.attackHits,t:0,life:.42,total:.42})}
          else{p.wallFinishWindow=.72;keep(.34);text(p.x,p.y-164,L('血牢破壁 · 再按拳','PRISON BREAK · PUNCH'),'#ffb0bc')}
        }return
      }
      if(p.state==='bloodPrisonFinish'){
        const windows=[.08,.26,.46,.68,.96];while(p.attackHits<windows.length&&elapsed>=windows[p.attackHits]){p.attackHits++;
          if(p.attackHits===1){g.bloodFx.push({kind:'chains',x:o.x,y:o.y-65,t:0,life:1.02,total:1.02});keep(1)}
          else if(p.attackHits<5){bloodDamage(p,o,3+p.attackHits%2);keep(.5);g.bloodFx.push({kind:'claw',x:o.x,y:o.y-66,dir:p.attackHits%2?p.facing:-p.facing,index:p.attackHits,t:0,life:.4,total:.4})}
          else{p.facing=o.x<450?1:-1;bloodDamage(p,o,16,0,true);g.bloodFx.push({kind:'prisonBreak',x:o.x,y:o.y-64,dir:p.facing,t:0,life:.92,total:.92});g.wallFlash=Math.max(g.wallFlash,.6)}
        }return
      }
      if(p.state==='bloodMoonPrepare'){
        const windows=[.06,.24,.5,.72];while(p.attackHits<windows.length&&elapsed>=windows[p.attackHits]){p.attackHits++;
          if(p.attackHits===1){g.bloodFx.push({kind:'domain',x:450,y:285,t:0,life:3.7,total:3.7});g.screenFlash=Math.max(g.screenFlash,.35)}
          else if(p.attackHits===2){bloodDamage(p,o,1);g.bloodFx.push({kind:'pull',x:o.x,y:o.y-68,t:0,life:.72,total:.72});keep(.7)}
          else if(p.attackHits===3){const tx=450+p.facing*48;o.x+=(tx-o.x)*.8;o.lockX=o.x;bloodDamage(p,o,2,1);keep(.46)}
          else{bloodDamage(p,o,1,1);p.moonFinishWindow=.76;keep(.28);text(p.x,p.y-176,L('血月盛宴 · 按拳','BLOOD MOON FEAST · PUNCH'),'#ffffff')}
        }return
      }
      if(p.state==='bloodMoonFeast'){
        const windows=[.06,.28,.52,.76,1,1.24,1.48,1.76,2.04,2.46];while(p.attackHits<windows.length&&elapsed>=windows[p.attackHits]){p.attackHits++;
          if(p.attackHits===1){p.x=450-p.facing*72;o.x=450+p.facing*28;o.y=ground;p.y=ground;g.bloodFx.push({kind:'domain',x:450,y:285,t:0,life:3,total:3});g.bloodFx.push({kind:'bats',x:o.x,y:o.y-72,t:0,life:2.2,total:2.2});keep(2.7)}
          else if(p.attackHits<10){bloodDamage(p,o,p.attackHits%3===0?4:3,2);keep(2.58-elapsed);g.bloodFx.push({kind:p.attackHits%2?'bite':'claw',x:o.x,y:o.y-68,dir:p.attackHits%2?p.facing:-p.facing,index:p.attackHits,t:0,life:.46,total:.46});g.cinematic=Math.max(g.cinematic,.52)}
          else{bloodDamage(p,o,22,6,true);g.bloodFx.push({kind:'moonBurst',x:o.x,y:o.y-68,dir:p.facing,t:0,life:1.1,total:1.1});g.screenFlash=Math.max(g.screenFlash,1.05);text(o.x,o.y-190,L('血月终葬！','BLOOD MOON FINALE!'),'#ffffff')}
        }return
      }
    }
    if(p.state==='thunderExecution'){
      const elapsed=thunderDuration-p.stateTime,o=p.thunderTarget||opponent(p),windows=[.38,.92,1.42,1.58,1.96,2.28,2.55,3.02];
      const anchor=o.lockX,takeoffX=p.thunderTakeoffX;
      if(elapsed<.38){const q=elapsed/.38;p.x=takeoffX;p.y=ground-(1-Math.pow(1-q,3))*650;p.vx=p.vy=0;p.grounded=false}
      else if(elapsed<.62){p.x=takeoffX+(anchor-takeoffX)*((elapsed-.38)/.24);p.y=-212;p.vx=p.vy=0;p.grounded=false}
      else if(elapsed<.9){const q=(elapsed-.62)/.28,previousY=p.y;p.x=anchor;p.y=-212+(ground+212)*(q*q);p.vx=p.vy=0;p.grounded=false;if(p.y>previousY+1&&p.trailTimer<=0){p.trailTimer=.025;p.trails.push({x:p.x,y:p.y,facing:p.facing,state:'thunderDive',life:.24})}}
      while(p.attackHits<windows.length&&elapsed>=windows[p.attackHits]){
        p.attackHits++;
        if(p.attackHits===1){g.screenFlash=Math.max(g.screenFlash,.12);sfx('whoosh',1.4)}
        else if(p.attackHits===2){p.x=anchor;p.y=ground;p.grounded=true;lockTarget(o,anchor,ground-18,2.48);registerHit(p,o,'thunderPin');lockTarget(o,anchor,ground-18,2.48);g.lightning.push({kind:'ground',x:anchor,y:ground-5,dir:p.facing,t:0,life:.58});g.cameraZoom=Math.max(g.cameraZoom,1.27);g.cameraX=(450-anchor)*.16;g.cameraY=-34;g.cinematic=Math.max(g.cinematic,.9);g.hitStop=Math.max(g.hitStop,.1);text(anchor,ground-180,L('踏雷镇压！','THUNDER STOMP!'),'#ffffff')}
        else if(p.attackHits===3){const inward=anchor<450?1:-1;p.facing=inward;p.x=Math.max(48,Math.min(852,anchor-inward*52));const sx=p.x+inward*112,sy=p.y-112,rise=170,hx=sx+inward*rise,hy=sy-rise;registerHit(p,o,'thunderLift');scriptTarget(o,hx,hy+88,.28);o.executionLock=Math.max(o.executionLock,1.95);g.lightning.push({kind:'slash',x:p.x+inward*48,y:ground-75,dir:inward,t:0,life:.58});text(o.x,o.y-155,L('向中场斜挑！','CENTERWARD LAUNCH!'),'#bcefff')}
        else if(p.attackHits===4){lockTarget(o,o.lockX,o.lockY,1.72)}
        else if(p.attackHits===5){const sx=p.x+p.facing*112,sy=p.y-112,hx=o.x,hy=o.y-88,dx=hx-sx,dy=hy-sy,len=Math.max(1,Math.hypot(dx,dy)),tx=hx+dx/len*430,ty=hy+dy/len*430;lockTarget(o,o.x,o.y,1.38);g.lightning.push({kind:'beam',x:sx,y:sy,hx,hy,tx,ty,dir:p.facing,t:0,life:.68});registerHit(p,o,'thunderBeam');lockTarget(o,hx,hy+88,1.38);g.cinematic=Math.max(g.cinematic,.9);g.screenFlash=Math.max(g.screenFlash,.48);text(hx,hy-76,L('雷枪·四十五度贯穿！','45° LIGHTNING SPEAR!'),'#ffffff')}
        else if(p.attackHits===6){const bx=o.x,by=o.y-88;g.lightning.push({kind:'burst',x:bx,y:by,dir:p.facing,t:0,life:.82});g.lightning.push({kind:'burst',x:bx,y:by,dir:-p.facing,t:-.08,life:.72});spark(bx,by,'#ffffff',72);spark(bx,by,'#42d4ff',58);impact(bx,by,'#ffffff',3.6);g.rings.push({x:bx,y:by,r:12,t:0,life:.68,color:'#6ee7ff',power:2.8});g.screenFlash=Math.max(g.screenFlash,1.15);g.shake=Math.max(g.shake,.82);lockTarget(o,o.x,o.y,.72)}
        else if(p.attackHits===7){text(p.x,p.y-150,L('雷息','THUNDER FADES'),'#8edfff')}
        else if(p.attackHits===8){sfx('block',.7)}
      }
      if(elapsed>=.9&&elapsed<1.42){p.x=anchor;p.y=ground;p.vx=p.vy=0;p.grounded=true;g.cameraZoom=Math.max(g.cameraZoom,1.16);g.cameraX=(450-anchor)*.09;g.cameraY=-20}
      return
    }
    if(p.state==='triple'){const elapsed=1.25-p.stateTime,windows=[.04,.18,.3,.4,.49,.58,.67,.76,.98],o=opponent(p);while(p.attackHits<windows.length&&elapsed>=windows[p.attackHits]){p.attackHits++;if(p.attackHits===1){const face=Math.sign(o.x-p.x)||p.facing;p.facing=face;blinkTo(p,o.x-face*76,o.y,'barrage',{duration:.1,facing:face,burstPower:.62})}else if(p.attackHits===2&&!p.blink){const before=o.health;tryAttackHit(p,'triple1',118,130);if(o.health<before){p.triplePin={x:o.x,y:Math.max(180,ground-96)};o.x=p.triplePin.x;o.y=p.triplePin.y;o.vx=o.vy=0;o.grounded=false;o.hitStun=Math.max(o.hitStun,1.05);text(o.x,o.y-125,L('浮空定身！','AERIAL LOCK!'),'#f5fbff')}}else if(p.attackHits===3&&p.triplePin){p.barrageHidden=true;p.vx=p.vy=0;spark(p.x,p.y-65,'#eef8ff',38);g.cinematic=Math.max(g.cinematic,.56);g.screenFlash=Math.max(g.screenFlash,.12);text(o.x,o.y-158,L('残像展开','AFTERIMAGES UNLEASHED'),'#ffffff')}else if(p.attackHits>=4&&p.attackHits<=8&&p.triplePin){const poses=[[-108,-12],[108,-20],[-72,-105],[116,32],[-118,26]],pose=poses[p.attackHits-4],face=pose[0]<0?1:-1;p.facing=face;g.barrages.push({x:p.triplePin.x+pose[0],y:p.triplePin.y+pose[1],targetX:p.triplePin.x,targetY:p.triplePin.y,facing:face,color:p.accent,t:0,life:.34,index:p.attackHits-4});registerHit(p,o,p.attackHits%2?'triple1':'triple2');if(o.health>0){o.x=p.triplePin.x;o.y=p.triplePin.y;o.vx=o.vy=0;o.grounded=false;o.hitStun=Math.max(o.hitStun,.48)}g.hitStop=Math.max(g.hitStop,.052);g.cinematic=Math.max(g.cinematic,.3)}else if(p.attackHits===9){const face=Math.sign(o.x-p.x)||p.facing;p.facing=face;g.cinematic=Math.max(g.cinematic,.62);g.screenFlash=Math.max(g.screenFlash,.16);text(o.x,o.y-172,L('终结拳！','FINAL FIST!'),'#fff3c4');blinkTo(p,o.x-face*82,o.y,'barrageFinal',{duration:.11,facing:face,hit:'triple3',reach:138,height:185,reveal:true,clearPin:true,burstPower:1.7})}}return}
    if(p.state==='skybreaker'){const elapsed=.98-p.stateTime,windows=[.12,.39,.59],o=opponent(p);while(p.attackHits<windows.length&&elapsed>=windows[p.attackHits]){p.attackHits++;if(p.attackHits===1){p.vx=p.facing*250;p.vy=-310;p.grounded=false;tryAttackHit(p,'uppercut',118,112)}else if(p.attackHits===2){const dir=p.facing;blinkTo(p,o.x+dir*76,Math.max(155,o.y-25),'sky',{duration:.13,facing:-dir,curveScale:1.15,burstPower:.9})}else{p.vx=p.facing*360;p.vy=470;tryAttackHit(p,'slam',124,165)}}return}
    if(p.state==='phantom'){const elapsed=.78-p.stateTime,windows=[.1,.24,.4,.54],o=opponent(p);while(p.attackHits<windows.length&&elapsed>=windows[p.attackHits]){p.attackHits++;if(p.attackHits===1||p.attackHits===3){const dir=p.facing;blinkTo(p,o.x+dir*94,o.y,'phantom',{duration:.09,facing:-dir,sideCurve:p.attackHits===1?42:-42,burstPower:.62})}else{p.vx=p.facing*(p.attackHits===4?920:720);tryAttackHit(p,p.attackHits===2?'phantom1':'phantom2',150,120)}}return}
    if(p.state==='comet'){const elapsed=.9-p.stateTime,windows=[.16,.54],o=opponent(p);while(p.attackHits<windows.length&&elapsed>=windows[p.attackHits]){p.attackHits++;if(p.attackHits===1)blinkTo(p,o.x-p.facing*70,Math.max(170,o.y+25),'comet',{duration:.12,vx:p.facing*420,vy:-360,hit:'cometKnee',reach:130,height:170,burstPower:.82});else blinkTo(p,o.x-p.facing*86,Math.max(120,o.y-105),'comet',{duration:.13,curveScale:1.25,vx:p.facing*780,vy:470,hit:'cometKick',reach:155,height:210,burstPower:1.05})}return}
    if(p.state==='airrush'){const elapsed=.88-p.stateTime,windows=[.08,.25,.42,.6],o=opponent(p);while(p.attackHits<windows.length&&elapsed>=windows[p.attackHits]){p.attackHits++;const final=p.attackHits===4;blinkTo(p,o.x-p.facing*(72+p.attackHits*4),Math.max(125,o.y-18),'air',{duration:.085,sideCurve:p.attackHits%2?34:-34,vx:0,vy:final?520:0,hit:final?'air3':p.attackHits===1?'air1':'air2',reach:final?145:130,height:final?210:180,burstPower:final?1:.55})}return}
    if(p.state==='counterPunch'){const elapsed=.62-p.stateTime,o=opponent(p);if(p.attackHits===0&&elapsed>=.12){p.attackHits=1;const dir=p.facing;blinkTo(p,o.x+dir*88,p.y,'counter',{duration:.1,facing:-dir,burstPower:1.15})}if(p.attackHits===1&&elapsed>=.29&&!p.blink){p.attackHits=2;p.vx=p.facing*980;tryAttackHit(p,'counterPunch',165,135)}return}
    if(p.state==='counterKick'){const elapsed=.82-p.stateTime,o=opponent(p);if(p.attackHits===0&&elapsed>=.16){p.attackHits=1;blinkTo(p,o.x-p.facing*55,Math.max(110,o.y-160),'counterSky',{duration:.14,curveScale:1.1,burstPower:1.1})}if(p.attackHits===1&&elapsed>=.48&&!p.blink){p.attackHits=2;p.vx=p.facing*220;p.vy=760;tryAttackHit(p,'counterKick',145,230)}return}
    if(!['punch','lunge','sweep','fly'].includes(p.state)||p.attackHits)return;const duration=p.state==='lunge'&&p.magic==='dark'?.16:{punch:.19,lunge:.22,sweep:.42,fly:.42}[p.state],elapsed=duration-p.stateTime,active=p.state==='punch'&&elapsed>.035&&elapsed<.145||p.state==='lunge'&&elapsed>.018&&elapsed<(p.magic==='dark'?.155:.2)||p.state==='sweep'&&elapsed>.075&&elapsed<.345||p.state==='fly'&&elapsed>.025&&elapsed<.39;if(!active)return;if(p.state==='lunge'&&p.magic==='dark'){if(tryAttackHit(p,p.state,145,85))p.attackHits=1;return}p.attackHits=1;tryAttackHit(p,p.state,{punch:104,lunge:132,sweep:126,fly:118}[p.state],p.state==='fly'?145:85)
  };
  const resetRound=()=>{g.players.forEach((p,i)=>{p.x=i?650:250;p.y=ground;p.vx=p.vy=0;p.health=maxHealth;p.facing=i?-1:1;p.grounded=true;p.held={left:false,right:false,jump:false,block:false};p.blockGrace=p.blockPressed=0;p.guard=100;p.state='idle';p.stateTime=p.cooldown=p.hitStun=p.guardBreak=p.flash=p.comboWindow=p.launcherWindow=p.phantomWindow=p.cometWindow=p.airWindow=p.counterWindow=p.bloodComboWindow=p.bloodDrainWindow=p.darkPunchWindow=p.clawWindow=p.darkSweepWindow=p.bloodBurstWindow=p.batDiveWindow=p.bloodCounterWindow=p.missWindow=p.wallChainWindow=p.wallFinishWindow=p.bloodMoonWindow=p.moonFinishWindow=p.comboTimer=p.escape=p.invuln=p.lungeRecovery=p.wakeProtect=p.wallTimer=p.executionLock=p.bleedTime=p.bleedTick=p.bleedOwner=0;p.comboHits=p.attackHits=p.wallHits=p.darkPunchCount=0;p.bloodMoonUsed=false;p.bloodOriginX=p.x;p.bloodOriginY=ground;p.bloodTarget=0;p.queuedTriple=p.queuedSkybreaker=p.slamPending=false;p.queuedSpecial='';p.trails=[];p.trailTimer=0;p.burnPath=null;p.techAvailable=true;p.knockdown=false;p.blink=null;p.barrageHidden=false;p.triplePin=null;p.thunderTarget=null;p.thunderTakeoffX=p.x;p.lockX=p.x;p.lockY=ground;p.scriptedMotion=null});g.time=45;g.intro=1.9;g.roundPause=0;g.aiThink=.3;g.aiPendingPunch=0;g.ko=null;g.hitStop=g.screenFlash=g.cinematic=g.wallFlash=0;g.screenTint='225,248,255';g.cameraZoom=1;g.cameraX=g.cameraY=0;g.rings=[];g.teleports=[];g.barrages=[];g.lightning=[];g.bloodFx=[];g.burnPaths=[];g.wallCracks=[0,0]};
  function endRound(winner,options={}){if(g.onlineMode&&g.onlinePlayer!==1||g.roundPause||ended)return;winner.rounds++;g.roundPause=winner.rounds>=2?3.05:3.25;g.shake=.42;g.ko={timer:2.45,duration:2.45,perfect:winner.health===maxHealth,finisher:!!options.finisher};text(450,230,L(`${label(winner)}赢得本回合`,`${label(winner)} WINS THE ROUND`),winner.accent);if(winner.rounds>=2){g.matchWinner=winner;g.score=1000+winner.health+winner.damageDone;setScore(g.score)}}
  const useTech=p=>{if(!p.techAvailable||p.executionLock>0||p.hitStun<=0||g.roundPause)return false;const o=opponent(p),corner=p.x<90||p.x>810;p.techAvailable=false;p.escape=0;p.hitStun=p.guardBreak=0;p.invuln=.58;p.knockdown=false;p.state='jump';p.grounded=false;p.vy=-360;if(corner){const side=p.x<450?1:-1,targetX=Math.max(65,Math.min(835,o.x+side*76));o.vx=-side*380;blinkTo(p,targetX,p.y,'tech',{duration:.11,vx:side*240,vy:-360,sideCurve:side*35,burstPower:.82});text(targetX,p.y-145,L('墙角受身！','WALL TECH!'),'#7ef8ff')}else{const away=Math.sign(p.x-o.x)||-p.facing;p.vx=away*450;o.vx=-away*300;text(p.x,p.y-145,L('受身脱离！','TECH ESCAPE!'),'#7ef8ff')}spark(p.x,p.y-70,'#7ef8ff',24);g.hitStop=Math.max(g.hitStop,.06);return true};
  const trigger=(p,action,on)=>{
    if(p.executionLock>0)return;
    if(action==='down'){if(on){if(!p.grounded)p.vy=Math.max(p.vy,420);else if(canAct(p))p.state='crouch'}else if(p.state==='crouch')p.state='idle';return}
    if(action==='left'||action==='right'){p.held[action]=on;if(on&&p.lungeRecovery<=0&&p.hitStun<=0&&p.guardBreak<=0&&!['fly','lunge','triple','skybreaker','phantom','comet','airrush','counterPunch','counterKick','thunderExecution','bloodIaido','bloodDrain','bloodClaw','bloodHunt','bloodCounter','batDive','bleedBurst','moonBlade','bloodPrison','bloodPrisonFinish','bloodMoonPrepare','bloodMoonFeast'].includes(p.state))p.vx=(action==='right'?1:-1)*270;return}
    if(action==='jump'){p.held.jump=on;if(on&&p.held.block&&useTech(p))return;if(on)jump(p);return}
    if(action==='block'){p.held.block=on;if(on){p.blockPressed=.12;if(p.held.jump&&useTech(p))return;if(canAct(p)&&p.grounded)p.blockGrace=.18}return}
    if(!on)return;attack(p,action)
  };
  const aiProfiles={
    easy:{delay:[.26,.4],engage:112,block:.12,sweep:.28,air:.12,tech:.05},
    normal:{delay:[.14,.25],engage:126,block:.3,sweep:.34,air:.2,tech:.28},
    hard:{delay:[.07,.14],engage:140,block:.52,sweep:.4,air:.27,tech:.68}
  };
  const releaseAi=()=>{const ai=P(2);trigger(ai,'left',false);trigger(ai,'right',false);trigger(ai,'block',false);ai.held.jump=false};
  const updateAi=dt=>{
    if(!g.aiMode)return;
    const ai=P(2),target=P(1),profile=aiProfiles[g.aiLevel];
    if(g.aiPendingPunch>0){g.aiPendingPunch-=dt;if(g.aiPendingPunch<=0)trigger(ai,'punch',true)}
    g.aiThink-=dt;if(g.aiThink>0)return;
    g.aiThink=profile.delay[0]+Math.random()*(profile.delay[1]-profile.delay[0]);
    releaseAi();
    if(g.intro>0||g.roundPause||ai.executionLock>0)return;
    if(ai.hitStun>0||ai.guardBreak>0){
      if(ai.techAvailable&&ai.executionLock<=0&&Math.random()<profile.tech){ai.held.block=true;trigger(ai,'jump',true);ai.held.block=false}
      return
    }
    const dx=target.x-ai.x,dist=Math.abs(dx),toward=dx>0?'right':'left',away=dx>0?'left':'right';
    const targetAttacking=['punch','lunge','sweep','fly','triple','phantom','comet','airrush','counterPunch','counterKick','thunderExecution','bloodIaido','bloodDrain'].includes(target.state);
    if(targetAttacking&&dist<165&&Math.random()<profile.block){trigger(ai,'block',true);return}
    if(dist>profile.engage){trigger(ai,toward,true);if(dist>245&&ai.grounded&&Math.random()<profile.air*.35){trigger(ai,'jump',true);trigger(ai,'jump',false)}return}
    if(dist<54&&Math.random()<.28){trigger(ai,away,true);return}
    const roll=Math.random();
    if(roll<profile.sweep)trigger(ai,'sweep',true);
    else if(roll<profile.sweep+profile.air&&ai.grounded){trigger(ai,'jump',true);trigger(ai,'jump',false);g.aiPendingPunch=.075}
    else trigger(ai,'punch',true)
  };
  const actionName=action=>({left:L('左移','Left'),right:L('右移','Right'),jump:L('跳跃 / 受身','Jump / Tech'),sweep:L('扫堂腿 / 残像连拳','Sweep / Afterimage barrage'),punch:L('出拳 / 空中飞踢 / 雷葬草薙','Punch / Air kick / Thunder Burial'),block:L('格挡 / 受身','Block / Tech')}[action]);
  const snapshotPlayerFields=['x','y','vx','vy','color','accent','magic','health','rounds','facing','grounded','blockGrace','blockPressed','guard','state','stateTime','cooldown','hitStun','guardBreak','attackHits','damageDone','flash','comboWindow','launcherWindow','phantomWindow','cometWindow','airWindow','counterWindow','bloodComboWindow','bloodDrainWindow','darkPunchWindow','darkPunchCount','clawWindow','darkSweepWindow','bloodBurstWindow','batDiveWindow','bloodCounterWindow','missWindow','wallChainWindow','wallFinishWindow','bloodMoonWindow','moonFinishWindow','bloodMoonUsed','bloodOriginX','bloodOriginY','bloodTarget','queuedTriple','queuedSkybreaker','queuedSpecial','comboHits','comboTimer','escape','techAvailable','invuln','lungeRecovery','wakeProtect','knockdown','slamPending','wallHits','wallTimer','bleedTime','bleedTick','bleedOwner','barrageHidden','thunderTakeoffX','executionLock','lockX','lockY','dashDir','storedBleed'];
  const playerSnapshot=p=>{const state={};for(const field of snapshotPlayerFields)if(p[field]!==undefined)state[field]=p[field];state.held={...p.held};state.scriptedMotion=p.scriptedMotion?{...p.scriptedMotion}:null;state.triplePin=p.triplePin?{...p.triplePin}:null;return state};
  const authoritativeSnapshot=()=>({round:g.round,time:g.time,intro:g.intro,roundPause:g.roundPause,hitStop:g.hitStop,score:g.score,matchWinner:g.matchWinner?.id||0,ko:g.ko?{...g.ko}:null,wallCracks:[...g.wallCracks],players:g.players.map(playerSnapshot)});
  const applyAuthoritativeSnapshot=state=>{
    if(!state||!Array.isArray(state.players)||state.players.length!==2)return;
    const roundChanged=Number(state.round)!==g.round;
    for(const key of ['round','time','intro','roundPause','hitStop','score'])if(Number.isFinite(state[key]))g[key]=state[key];
    g.ko=state.ko&&typeof state.ko==='object'?{...state.ko}:null;
    if(Array.isArray(state.wallCracks)&&state.wallCracks.length===2)g.wallCracks=state.wallCracks.map(value=>Math.max(0,Math.min(3,Number(value)||0)));
    state.players.forEach((source,index)=>{if(!source||typeof source!=='object')return;const target=P(index+1),localHeld=index+1===g.onlinePlayer?{...target.held}:null;for(const field of snapshotPlayerFields)if(source[field]!==undefined)target[field]=source[field];target.held=source.held&&typeof source.held==='object'?{...source.held}:target.held;if(localHeld)target.held=localHeld;target.scriptedMotion=source.scriptedMotion?{...source.scriptedMotion}:null;target.triplePin=source.triplePin?{...source.triplePin}:null;target.blink=null;target.burnPath=null;target.thunderTarget=null});
    g.matchWinner=[1,2].includes(state.matchWinner)?P(state.matchWinner):null;
    if(roundChanged){g.teleports=[];g.barrages=[];g.lightning=[];g.bloodFx=[];g.burnPaths=[]}
    setScore(g.score)
  };
  const syncAuthoritativeState=dt=>{
    if(!g.onlineMode||g.onlinePlayer!==1)return;
    g.netSnapshotTimer-=dt;
    if(g.netSnapshotTimer>0||g.netSnapshotPending)return;
    g.netSnapshotTimer=.08;g.netSnapshotPending=true;
    sendOnlineEvent('stick-state',{seq:++g.netSnapshotSeq,state:authoritativeSnapshot()}).catch(()=>{}).finally(()=>{g.netSnapshotPending=false})
  };
  g.action=(action,on,playerId=1)=>{if(g.onlineMode){playerId=g.onlinePlayer;const payload={action,on,seq:++g.netInputSeq},relay=()=>sendOnlineEvent('input',payload);relay().catch(relay).catch(()=>{})}trigger(P(playerId),action,on)};
  g.remoteEvent=event=>{
    const remotePlayer=onlineEventPlayer(event);
    if(event.type==='stick-state'){
      const seq=Number(event.payload?.seq);
      if(!g.onlineMode||g.onlinePlayer===1||remotePlayer!==1||!Number.isInteger(seq)||seq<=g.netLastSnapshot)return;
      g.netLastSnapshot=seq;applyAuthoritativeSnapshot(event.payload?.state);return
    }
    const action=String(event.payload?.action),seq=Number(event.payload?.seq);
    if(event.type!=='input'||!g.onlineMode||remotePlayer===g.onlinePlayer||![1,2].includes(remotePlayer)||![...actions,'down'].includes(action))return;
    if(Number.isInteger(seq)){if(seq<g.netInputNext[remotePlayer])return;g.netInputBuffer[remotePlayer][seq]={action,on:event.payload?.on===true};while(g.netInputBuffer[remotePlayer][g.netInputNext[remotePlayer]]){const buffered=g.netInputBuffer[remotePlayer][g.netInputNext[remotePlayer]++];delete g.netInputBuffer[remotePlayer][g.netInputNext[remotePlayer]-1];trigger(P(remotePlayer),buffered.action,buffered.on)}return}
    trigger(P(remotePlayer),action,event.payload?.on===true)
  };
  const renderConfig=()=>{
    const playerIds=g.aiMode||g.onlineMode?[1]:[1,2],columns=playerIds.map(id=>`<section class="keybind-player"><h4>${g.onlineMode?L('我的按键（P1 键位）','My controls (P1 layout)'):L(`玩家 ${id}`,`Player ${id}`)}</h4><div class="keybind-grid">${actions.map(action=>`<span>${actionName(action)}</span><button class="keybind-key ${g.listening?.[0]===id&&g.listening?.[1]===action?'listening':''}" data-bind-player="${id}" data-bind-action="${action}">${g.listening?.[0]===id&&g.listening?.[1]===action?L('请按键…','Press a key…'):keyName(keybinds[id][action])}</button>`).join('')}</div></section>`).join('');
    const defaultNote=g.onlineMode?L('联网双方都使用 P1 键位；匹配槽位只决定你控制蓝方还是红方。','Both online players use the P1 key layout; the match slot only selects the blue or red fighter.'):L('跳跃后按“拳”就是飞踢；不再需要单独的飞踢键。','Press Punch after jumping to flying-kick; no separate kick key is needed.');
    dom.innerHTML=`<div class="keybind-panel"><h3>${L('⌨ 自定义按键','⌨ Custom controls')}</h3><p class="keybind-note">${g.configNote||defaultNote}</p><div class="keybind-columns ${g.aiMode?'single-player':''}">${columns}</div><div class="keybind-actions"><button class="mini-btn" id="keybindReset">${L('恢复默认','Reset defaults')}</button><button class="setup-start" id="keybindDone">${L('完成','Done')}</button></div></div>`;
    dom.querySelectorAll('[data-bind-player]').forEach(button=>button.onclick=()=>{g.listening=[+button.dataset.bindPlayer,button.dataset.bindAction];g.configNote=L('等待按键输入…','Waiting for a key…');renderConfig()});
    $('#keybindReset').onclick=()=>{keybinds=JSON.parse(JSON.stringify(defaults));localStorage.setItem(keyStore,JSON.stringify(keybinds));g.listening=null;g.configNote=L('已恢复默认按键。','Default controls restored.');renderConfig()};
    $('#keybindDone').onclick=closeConfig
  };
  const ruleKeys=(id,...names)=>`<span class="rule-keys">${names.map(name=>`<span class="rule-key">${keyName(keybinds[id][name])}</span>`).join('')}</span>`;
  const renderRules=()=>{
    const playerControls=id=>`<div class="rule-row"><span>${L('移动','Move')}</span>${ruleKeys(id,'left','right')}</div><div class="rule-row"><span>${L('跳跃','Jump')}</span>${ruleKeys(id,'jump')}</div><div class="rule-row"><span>${L('扫堂腿','Sweep')}</span>${ruleKeys(id,'sweep')}</div><div class="rule-row"><span>${L('出拳','Punch')}</span>${ruleKeys(id,'punch')}</div><div class="rule-row"><span>${L('格挡','Block')}</span>${ruleKeys(id,'block')}</div>`;
    const combos=[
      [L('飞踢','Flying Kick'),L('跳跃后按拳','Press Punch after jumping')],
      [L('突刺拳','Lunge Punch'),L('跑动时按拳','Press Punch while running')],
      [L('残像连拳','Afterimage Barrage'),L('拳命中后立刻按扫堂腿','After Punch connects, immediately press Sweep')],
      [L('雷葬·草薙','Thunder Burial'),L('扫堂腿命中后立刻按拳','After Sweep connects, immediately press Punch')],
      [L('幻影穿梭','Phantom Rush'),L('突刺拳命中后立刻再按拳','After Lunge Punch connects, immediately press Punch again')],
      [L('彗星追击','Comet Chase'),L('突刺拳命中后立刻跳跃并按拳','After Lunge Punch connects, immediately Jump + Punch')],
      [L('空坠乱打','Aerial Rush'),L('飞踢命中后立刻再按拳','After Flying Kick connects, immediately press Punch again')],
      [L('血刃 · 归闪','Blood Edge Return'),L('暗系突刺命中后立刻按扫堂腿','After a Dark lunge connects, immediately press Sweep')],
      [L('Bloodbane Drain','Bloodbane Drain'),L('血刃爆破收刀后再次按扫堂腿','After Blood Edge detonates and sheaths, press Sweep again')],
      [L('血爪升击','Blood Claw Rise'),L('暗系拳命中两次后按扫堂腿','After two Dark punches connect, press Sweep')],
      [L('血遁追猎','Blood Phase Hunt'),L('暗系扫堂腿命中后移动＋拳','After a Dark Sweep connects, press Move + Punch')],
      [L('猩红处刑','Crimson Execution'),L('暗系完美格挡后按拳','After a Dark Perfect Block, press Punch')],
      [L('蝠群坠杀','Bat Swarm Dive'),L('暗系空中拳命中后按扫堂腿','After a Dark aerial Punch connects, press Sweep')],
      [L('血爆掌','Bleed Detonation'),L('流血目标被暗系拳命中后按扫堂腿','Punch a bleeding target, then press Sweep')],
      [L('回身月刃','Reversal Moon Blade'),L('暗系突刺落空后按反方向＋扫堂腿','After a Dark lunge misses, press the opposite direction + Sweep')],
      [L('血牢绞杀','Blood Prison'),L('墙角扫堂腿命中后按拳，提示出现后再按拳','Land a corner Sweep, press Punch, then Punch again on the prompt')],
      [L('血月盛宴','Blood Moon Feast'),L('生命低于 25% 时完美格挡→扫堂腿→拳；每回合一次','Below 25% health: Perfect Block → Sweep → Punch; once per round')],
      [L('零帧反击','Zero-frame Counter'),L('完美格挡成功后立刻按拳','After a Perfect Block, immediately press Punch')],
      [L('天幕反击','Sky Counter'),L('完美格挡成功后立刻跳跃并按拳','After a Perfect Block, immediately Jump + Punch')],
      [L('受身','Tech Escape'),L('受击或击飞时同时按跳跃＋格挡（每回合一次）','While hit or launched, press Jump + Block together (once per round)')]
    ];
    dom.innerHTML=`<div class="rules-panel"><h3>${L('📖 游戏规则','📖 Game Rules')}</h3><p class="rules-lead">${L('连招必须在上一击命中后的短暂窗口内输入；“完美格挡”需要在攻击接触的瞬间按下格挡。','Combo inputs must be entered during the short window after the previous hit connects. Perfect Block requires pressing Block at the instant an attack lands.')}</p><div class="rules-grid"><section class="rules-section"><h4>${L('玩家 1 按键','Player 1 Controls')}</h4><div class="rule-list">${playerControls(1)}</div></section><section class="rules-section"><h4>${L('玩家 2 按键','Player 2 Controls')}</h4><div class="rule-list">${playerControls(2)}</div></section><section class="rules-section"><h4>${L('状态条','Meters')}</h4><div class="rule-list"><div class="rule-row"><span class="rule-meter"><i class="meter-swatch blue"></i>${L('蓝条','Blue')}</span><strong>${L('防御值：格挡消耗，松开后恢复；耗尽会破防','Guard: blocking drains it; releasing Block restores it; empty means guard break')}</strong></div><div class="rule-row"><span class="rule-meter"><i class="meter-swatch yellow"></i>${L('黄条','Yellow')}</span><strong>${L('脱身值：连续受击时积累，蓄满会强制脱离连招','Escape: builds while being comboed; full meter breaks the combo')}</strong></div><div class="rule-row"><span class="rule-meter"><i class="meter-swatch tech"></i>${L('受身','Tech')}</span><strong>${L('“受身 READY”表示本回合仍可使用一次','“TECH READY” means one Tech is still available this round')}</strong></div></div></section><section class="rules-section"><h4>${L('战斗提示','Battle Notes')}</h4><div class="rule-list"><div class="rule-row"><span>${L('完美格挡','Perfect Block')}</span><strong>${L('攻击命中前一瞬按格挡','Tap Block just before impact')}</strong></div><div class="rule-row"><span>${L('本地双人','Local PVP')}</span><strong>${L('玩家 2 的按键仅在真人双人模式生效','Player 2 controls only work in Local PVP')}</strong></div><div class="rule-row"><span>${L('胜利条件','Victory')}</span><strong>${L('生命归零即输掉本回合，先赢两回合获胜','Reduce health to zero; first to two rounds wins')}</strong></div></div></section><section class="rules-section wide"><h4>${L('全部连招触发方式','All Combo Triggers')}</h4><div class="combo-list">${combos.map(([name,trigger])=>`<div class="combo-item"><strong>${name}</strong>${trigger}</div>`).join('')}</div></section></div><div class="rules-actions"><button class="setup-start" id="rulesDone">${L('返回游戏','Back to Game')}</button></div></div>`;
    $('#rulesDone').onclick=closeConfig
  };
  const openConfig=()=>{g.configOpen=true;g.listening=null;g.configNote='';g.players.forEach(p=>p.held={left:false,right:false,jump:false,block:false});canvas.hidden=true;dom.hidden=false;renderConfig()};
  const openRules=()=>{g.configOpen=true;g.listening=null;g.players.forEach(p=>p.held={left:false,right:false,jump:false,block:false});canvas.hidden=true;dom.hidden=false;renderRules()};
  function closeConfig(){g.configOpen=false;g.listening=null;dom.hidden=true;canvas.hidden=false;g.intro=Math.max(g.intro,.65)}
  g.closeConfig=closeConfig;
  const touchItems=[
    {label:'▲',ariaLabel:L('向上跳跃','Jump up'),action:'jump',slot:'up',className:'fighter-direction'},
    {label:'◀',ariaLabel:L('向左移动','Move left'),action:'left',slot:'left',className:'fighter-direction'},
    {label:'▼',ariaLabel:L('下蹲或空中快速下降','Crouch or fast fall'),action:'down',slot:'down',className:'fighter-direction'},
    {label:'▶',ariaLabel:L('向右移动','Move right'),action:'right',slot:'right',className:'fighter-direction'},
    {label:'踢',image:'assets/stick-controls/kick.png',ariaLabel:L('踢腿或扫堂腿','Kick or sweep'),action:'sweep',slot:'kick',className:'fighter-action fighter-kick'},
    {label:'攻',image:'assets/stick-controls/attack.png',ariaLabel:L('攻击、出拳或飞踢','Attack, punch, or flying kick'),action:'punch',slot:'attack',className:'fighter-action fighter-attack'},
    {label:'挡',image:'assets/stick-controls/block.png',ariaLabel:L('格挡或受身','Block or tech'),action:'block',slot:'block',className:'fighter-action fighter-block'}
  ];
  controls([],{layout:'fighter',groups:(g.aiMode||g.onlineMode?[1]:[1,2]).map(playerId=>({
    label:g.aiMode||g.onlineMode?L('玩家','PLAYER'):`P${playerId}`,
    player:g.onlineMode?g.onlinePlayer:playerId,
    items:touchItems
  }))});
  const rulesButton=document.createElement('button');rulesButton.className='mini-btn';rulesButton.textContent=L('📖 游戏规则','📖 Game Rules');rulesButton.onclick=openRules;$('#touchControls').appendChild(rulesButton);
  const configButton=document.createElement('button');configButton.className='mini-btn';configButton.textContent=L('⌨ 自定义按键','⌨ Controls');configButton.onclick=openConfig;$('#touchControls').appendChild(configButton);
  g.key=(key,on)=>{
    const normalized=normalizeKey(key);
    if(g.configOpen){
      if(on&&g.listening){
        const [id,action]=g.listening,conflict=[1,2].flatMap(playerId=>actions.map(name=>[playerId,name,keybinds[playerId][name]])).find(([,name,bound])=>normalizeKey(bound)===normalized&&!(id===g.listening[0]&&name===action));
        if(conflict)g.configNote=L(`该按键已用于玩家 ${conflict[0]}的${actionName(conflict[1])}。`,`That key is already used by Player ${conflict[0]}: ${actionName(conflict[1])}.`);
        else{keybinds[id][action]=normalized;localStorage.setItem(keyStore,JSON.stringify(keybinds));g.configNote=L(`${actionName(action)}已设为 ${keyName(normalized)}。`,`${actionName(action)} is now ${keyName(normalized)}.`);g.listening=null}
        renderConfig()
      }
      return
    }
    for(const id of g.aiMode||g.onlineMode?[1]:[1,2])for(const action of actions)if(normalizeKey(keybinds[id][action])===normalized)return g.action(action,on,g.onlineMode?g.onlinePlayer:id)
  };
  const updatePlayer=(p,dt)=>{
    p.cooldown=Math.max(0,p.cooldown-dt);p.hitStun=Math.max(0,p.hitStun-dt);p.guardBreak=Math.max(0,p.guardBreak-dt);p.flash=Math.max(0,p.flash-dt);p.blockGrace=Math.max(0,p.blockGrace-dt);p.blockPressed=Math.max(0,p.blockPressed-dt);p.comboWindow=Math.max(0,p.comboWindow-dt);p.launcherWindow=Math.max(0,p.launcherWindow-dt);p.phantomWindow=Math.max(0,p.phantomWindow-dt);p.cometWindow=Math.max(0,p.cometWindow-dt);p.airWindow=Math.max(0,p.airWindow-dt);p.counterWindow=Math.max(0,p.counterWindow-dt);p.bloodComboWindow=Math.max(0,p.bloodComboWindow-dt);p.bloodDrainWindow=Math.max(0,p.bloodDrainWindow-dt);p.darkPunchWindow=Math.max(0,p.darkPunchWindow-dt);p.clawWindow=Math.max(0,p.clawWindow-dt);p.darkSweepWindow=Math.max(0,p.darkSweepWindow-dt);p.bloodBurstWindow=Math.max(0,p.bloodBurstWindow-dt);p.batDiveWindow=Math.max(0,p.batDiveWindow-dt);p.bloodCounterWindow=Math.max(0,p.bloodCounterWindow-dt);p.missWindow=Math.max(0,p.missWindow-dt);p.wallChainWindow=Math.max(0,p.wallChainWindow-dt);p.wallFinishWindow=Math.max(0,p.wallFinishWindow-dt);p.bloodMoonWindow=Math.max(0,p.bloodMoonWindow-dt);p.moonFinishWindow=Math.max(0,p.moonFinishWindow-dt);p.comboTimer=Math.max(0,p.comboTimer-dt);p.invuln=Math.max(0,p.invuln-dt);p.lungeRecovery=Math.max(0,p.lungeRecovery-dt);p.wakeProtect=Math.max(0,p.wakeProtect-dt);p.wallTimer=Math.max(0,p.wallTimer-dt);p.executionLock=Math.max(0,p.executionLock-dt);if(p.wallTimer<=0)p.wallHits=0;if(p.darkPunchWindow<=0)p.darkPunchCount=0;
    if(p.comboTimer<=0){p.comboHits=0;p.escape=Math.max(0,p.escape-28*dt)}
    if(p.stateTime>0){p.stateTime-=dt;if(p.stateTime<=0&&p.state!=='jump'){if(p.magic==='dark'&&p.state==='lunge'){p.vx=0;p.lungeRecovery=.32;p.burnPath=null;if(!p.attackHits){p.missWindow=.58;g.bloodFx.push({kind:'whiffTurn',x:p.x,y:p.y-62,dir:p.dashDir,t:0,life:.68,total:.68});g.rings.push({x:p.x,y:p.y-62,r:12,t:0,life:.3,color:'#ff2445',power:.52});spark(p.x-p.dashDir*16,p.y-62,'#ff2949',22);g.cameraX=-p.dashDir*12;g.cameraZoom=Math.max(g.cameraZoom,1.055);text(p.x,p.y-142,L('落空 · 反向扫腿','WHIFF · REVERSE SWEEP'),'#ff9aaa')}}p.state=p.grounded?'idle':'jump';p.barrageHidden=false;p.triplePin=null}}
    if(p.executionLock>0){
      if(p.scriptedMotion){
        const m=p.scriptedMotion;m.t=Math.min(m.duration,m.t+dt);const q=m.t/m.duration,e=1-Math.pow(1-q,3);
        p.x=m.sx+(m.ex-m.sx)*e;p.y=m.sy+(m.ey-m.sy)*e-Math.sin(q*Math.PI)*46;p.grounded=false;
        if(q>=1){
          p.x=m.ex;p.y=m.ey;p.lockX=m.ex;p.lockY=m.ey;p.scriptedMotion=null;p.grounded=p.y>=ground;
          if(m.impactType==='wall'){const side=p.x<450?0:1;g.wallCracks[side]=Math.min(3,g.wallCracks[side]+1);g.wallFlash=Math.max(g.wallFlash,.28);impact(p.x,p.y-68,'#dffaff',1.75);spark(p.x,p.y-68,'#ffffff',28);text(p.x,p.y-160,L('撞壁！','WALL IMPACT!'),'#ffffff')}
        }
      }else{p.x=p.lockX;p.y=p.lockY;p.grounded=p.y>=ground}
      p.vx=p.vy=0;p.held={left:false,right:false,jump:false,block:false};p.blockGrace=p.blockPressed=0;p.trails.forEach(t=>t.life-=dt);p.trails=p.trails.filter(t=>t.life>0);return
    }
    if(p.queuedTriple&&p.stateTime<=0&&p.cooldown<=0&&p.hitStun<=0&&p.guardBreak<=0){p.queuedTriple=false;attack(p,'sweep')}
    if(p.queuedSkybreaker&&p.stateTime<=0&&p.cooldown<=0&&p.hitStun<=0&&p.guardBreak<=0){p.queuedSkybreaker=false;attack(p,'punch')}
    if(p.queuedSpecial&&p.stateTime<=0&&p.cooldown<=0&&p.hitStun<=0&&p.guardBreak<=0)startSpecial(p,p.queuedSpecial);
    if(updateBlink(p,dt)){p.trailTimer-=dt;if(p.trailTimer<=0){p.trailTimer=.025;p.trails.push({x:p.x,y:p.y,facing:p.facing,state:p.state,life:.34})}p.trails.forEach(t=>t.life-=dt);p.trails=p.trails.filter(t=>t.life>0);attackWindow(p);return}
    const blocking=(p.held.block||p.blockGrace>0)&&p.grounded&&p.hitStun<=0&&p.guardBreak<=0&&(p.state==='idle'||p.state==='run'||p.state==='block');if(blocking)p.state='block';else if(p.state==='block')p.state='idle';
    if(blocking){p.guard=Math.max(0,p.guard-9*dt);if(p.guard<=0){p.held.block=false;p.guardBreak=.72;p.hitStun=.35;text(p.x,p.y-128,L('防御耗尽！','GUARD EMPTY!'),'#ffe06d')}}else if(p.guardBreak<=0)p.guard=Math.min(100,p.guard+20*dt);
    if(p.lungeRecovery<=0&&p.hitStun<=0&&p.guardBreak<=0&&!['fly','lunge','triple','skybreaker','phantom','comet','airrush','counterPunch','counterKick','thunderExecution','bloodIaido','bloodDrain','bloodClaw','bloodHunt','bloodCounter','batDive','bleedBurst','moonBlade','bloodPrison','bloodPrisonFinish','bloodMoonPrepare','bloodMoonFeast'].includes(p.state)){const move=(p.held.right?1:0)-(p.held.left?1:0),speed=blocking?80:270;if(move)p.vx=move*speed;if(move&&p.grounded&&p.state==='idle')p.state='run';else if(!move&&p.grounded&&p.state==='run')p.state='idle'}
    const trailState=['lunge','fly','triple','skybreaker','phantom','comet','airrush','counterPunch','counterKick','bloodIaido','bloodDrain','bloodClaw','bloodHunt','bloodCounter','batDive','bleedBurst','moonBlade','bloodPrison','bloodPrisonFinish','bloodMoonPrepare','bloodMoonFeast'].includes(p.state)&&!(p.magic==='dark'&&p.state==='lunge');p.trailTimer-=dt;if(trailState&&p.trailTimer<=0){p.trailTimer=.035;p.trails.push({x:p.x,y:p.y,facing:p.facing,state:p.state,life:.28})}p.trails.forEach(t=>t.life-=dt);p.trails=p.trails.filter(t=>t.life>0);
    const wasGrounded=p.grounded;p.vy+=gravity*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(p.grounded?.0008:.16,dt);if(p.magic==='dark'&&p.state==='lunge'){p.facing=p.dashDir;p.vx=p.dashDir*1750}if(p.y>=ground){p.y=ground;p.vy=0;p.grounded=true;if(!wasGrounded&&p.slamPending){p.slamPending=false;g.shake=.48;spark(p.x,ground-8,'#ffb04a',32);text(p.x,ground-145,L('砸地！','GROUND SLAM!'),'#ffe06d')}if(!wasGrounded&&p.knockdown){p.knockdown=false;p.wakeProtect=.5;text(p.x,p.y-128,L('起身保护','WAKE PROTECTION'),'#b8edff')}if(p.state==='jump'||p.state==='fly')p.state='idle'}else p.grounded=false;p.x=Math.max(38,Math.min(862,p.x));if(p.magic==='dark'&&p.state==='lunge'&&p.burnPath){const last=p.burnPath.points.at(-1),next={x:p.x,y:p.y-55};if(Math.hypot(next.x-last.x,next.y-last.y)>13)p.burnPath.points.push(next)}attackWindow(p)
  };
  g.update=dt=>{if(g.configOpen)return;
    if(g.hitStop>0){g.hitStop=Math.max(0,g.hitStop-dt);syncAuthoritativeState(dt);return}
    if(g.ko)g.ko.timer=Math.max(0,g.ko.timer-dt);
    if(g.intro>0)g.intro-=dt;else if(!g.roundPause){g.time-=dt;if(g.time<=0&&(!g.onlineMode||g.onlinePlayer===1)){const [a,b]=g.players;if(a.health===b.health){g.round++;resetRound()}else endRound(a.health>b.health?a:b)}}
    if(g.roundPause>0){g.roundPause-=dt;if(g.roundPause<=0&&!ended){if(g.matchWinner)finish(L(`${label(g.matchWinner)}赢得对决`,`${label(g.matchWinner)} WINS THE MATCH`));else if(!g.onlineMode||g.onlinePlayer===1){g.round++;resetRound()}else g.roundPause=0}}
    updateAi(dt);faceEachOther();g.players.forEach(p=>updatePlayer(p,dt));for(const p of g.players)if(p.triplePin&&p.state==='triple'&&p.barrageHidden){const o=opponent(p);o.x=p.triplePin.x;o.y=p.triplePin.y;o.vx=o.vy=0;o.grounded=false}for(const p of g.players)if(p.bleedTime>0&&!g.roundPause){p.bleedTime=Math.max(0,p.bleedTime-dt);p.bleedTick-=dt;if(p.bleedTick<=0){p.bleedTick+=1;p.health=Math.max(0,Math.round((p.health-1.5)*10)/10);p.flash=.12;const owner=P(p.bleedOwner);if(owner){owner.damageDone+=1.5;g.score=Math.max(g.score,owner.damageDone);setScore(g.score)}text(p.x,p.y-138,'-1.5','#ff334a');spark(p.x,p.y-62,'#ff1838',8);if(p.health<=0&&owner)endRound(owner,{finisher:true})}}const [a,b]=g.players,overlap=58-Math.abs(a.x-b.x),darkExecution=p=>p.state.startsWith('blood')||['batDive','bleedBurst','moonBlade'].includes(p.state),executing=a.state==='thunderExecution'||b.state==='thunderExecution'||darkExecution(a)||darkExecution(b)||a.executionLock>0||b.executionLock>0,phasing=[a,b].some(p=>p.magic==='dark'&&p.state==='lunge');if(overlap>0&&!executing&&!phasing&&!a.blink&&!b.blink){const dir=a.x<b.x?-1:1;a.x+=dir*overlap/2;b.x-=dir*overlap/2}
    for(const p of g.particles){p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=540*dt}g.particles=g.particles.filter(p=>p.t<p.life);for(const r of g.rings){r.t+=dt;r.r+=620*dt*r.power}g.rings=g.rings.filter(r=>r.t<r.life);for(const t of g.texts){t.t+=dt;t.y-=28*dt}g.texts=g.texts.filter(t=>t.t<1.05);for(const fx of g.teleports){fx.life-=dt;if(fx.arrived&&!fx.burst){fx.burst=true;fx.burstAge=0}else if(fx.burst)fx.burstAge+=dt}g.teleports=g.teleports.filter(fx=>fx.life>0);for(const fx of g.barrages){fx.t+=dt;fx.life-=dt}g.barrages=g.barrages.filter(fx=>fx.life>0);for(const fx of g.lightning){fx.t+=dt;fx.life-=dt}g.lightning=g.lightning.filter(fx=>fx.life>0);for(const fx of g.bloodFx){fx.t+=dt;fx.life-=dt}g.bloodFx=g.bloodFx.filter(fx=>fx.life>0);for(const path of g.burnPaths){path.life-=dt;path.tick-=dt;if(path.tick<=0&&path.points.length>1&&!g.roundPause){const owner=P(path.owner),victim=opponent(owner),hit=path.points.slice(1).some((point,i)=>distanceToSegment(victim.x,victim.y-55,path.points[i].x,path.points[i].y,point.x,point.y)<38);if(hit&&victim.invuln<=0&&victim.wakeProtect<=0){path.tick=.18;victim.health=Math.max(0,victim.health-2);victim.flash=.08;victim.hitStun=Math.max(victim.hitStun,.06);owner.damageDone+=2;g.score=Math.max(g.score,owner.damageDone);setScore(g.score);spark(victim.x,victim.y-60,'#ff334a',4);if(victim.health<=0)endRound(owner,{finisher:true})}}}g.burnPaths=g.burnPaths.filter(path=>path.life>0);g.shake=Math.max(0,g.shake-dt);g.cameraZoom+=(1-g.cameraZoom)*(1-Math.pow(.02,dt));g.cameraX*=Math.pow(.015,dt);g.cameraY*=Math.pow(.015,dt);g.screenFlash=Math.max(0,g.screenFlash-dt*1.8);g.cinematic=Math.max(0,g.cinematic-dt);g.wallFlash=Math.max(0,g.wallFlash-dt);syncAuthoritativeState(dt);setStatus(L(`第 ${g.round} 回合 · ${Math.max(0,Math.ceil(g.time))} 秒 · ${P(1).rounds}:${P(2).rounds}`,`Round ${g.round} · ${Math.max(0,Math.ceil(g.time))}s · ${P(1).rounds}:${P(2).rounds}`));
  };
  const healthBar=(p,x,alignRight)=>{
    ctx.fillStyle='#111827cc';ctx.beginPath();ctx.roundRect(x,30,310,28,14);ctx.fill();
    const w=300*p.health/maxHealth,grad=ctx.createLinearGradient(x,0,x+310,0),fighterName=p.id===2&&g.aiMode?'AI':`P${p.id}`;grad.addColorStop(0,p.color);grad.addColorStop(1,p.accent);
    ctx.fillStyle=grad;ctx.beginPath();ctx.roundRect(alignRight?x+5+300-w:x+5,35,w,18,9);ctx.fill();ctx.fillStyle='#fff';ctx.font='900 16px sans-serif';ctx.textAlign=alignRight?'right':'left';ctx.fillText(`${fighterName}  ${p.health}`,alignRight?x+300:x+10,21);
    ctx.fillStyle='#101827';ctx.fillRect(x+5,63,220,5);ctx.fillStyle=p.guard<25?'#ff5968':'#68d9ff';ctx.fillRect(alignRight?x+225-220*p.guard/100:x+5,63,220*p.guard/100,5);ctx.fillStyle='#101827';ctx.fillRect(x+5,72,220,4);ctx.fillStyle='#ffe06d';ctx.fillRect(alignRight?x+225-220*p.escape/100:x+5,72,220*p.escape/100,4);
    for(let i=0;i<2;i++){ctx.fillStyle=i<p.rounds?p.accent:'#ffffff22';ctx.beginPath();ctx.arc(alignRight?x+22+i*18:x+288-i*18,93,6,0,7);ctx.fill()}
    const tech=p.techAvailable?L('受身 READY','TECH READY'):L('受身已用','TECH USED'),techX=alignRight?x+300:x+10;ctx.font='900 12px sans-serif';ctx.textAlign=alignRight?'right':'left';const techW=ctx.measureText(tech).width+16,techBoxX=alignRight?techX-techW:techX;ctx.fillStyle='#050b14e8';ctx.beginPath();ctx.roundRect(techBoxX,82,techW,20,8);ctx.fill();ctx.strokeStyle=p.techAvailable?'#7ef8ff':'#ffffff38';ctx.lineWidth=1.4;ctx.stroke();ctx.fillStyle=p.techAvailable?'#bfffff':'#ffffff66';ctx.fillText(tech,techX,97);
  };
  const drawThunderFighter=p=>{
    const e=thunderDuration-p.stateTime,dive=e<.92,kneel=e>=.92&&e<1.42,lift=e>=1.42&&e<1.72,charge=e>=1.72&&e<1.96,fire=e>=1.96&&e<2.42,sheathe=e>=2.55&&e<3.15,armed=e<3.15,lean=dive?.08:kneel?.18:fire?.1:0;
    ctx.save();ctx.translate(p.x,p.y-90);ctx.scale(p.facing,1);ctx.rotate(lean);ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=p.flash>0?'#fff':p.color;ctx.lineWidth=10;glow('#49d9ff',20);
    ctx.beginPath();ctx.arc(dive?12:0,-43,18,0,7);ctx.stroke();ctx.beginPath();ctx.moveTo(0,-24);ctx.lineTo(kneel?12:0,kneel?27:34);ctx.stroke();
    ctx.beginPath();
    if(dive){ctx.moveTo(0,-10);ctx.lineTo(70,-17);ctx.moveTo(0,1);ctx.lineTo(52,8)}
    else if(kneel){ctx.moveTo(2,-8);ctx.lineTo(35,14);ctx.moveTo(0,2);ctx.lineTo(27,20)}
    else if(lift){ctx.moveTo(0,-9);ctx.lineTo(48,-57);ctx.moveTo(0,1);ctx.lineTo(30,-20)}
    else if(charge){ctx.moveTo(0,-8);ctx.lineTo(25,-13);ctx.moveTo(0,2);ctx.lineTo(47,-18)}
    else if(fire){ctx.moveTo(0,-8);ctx.lineTo(112,-22);ctx.moveTo(0,2);ctx.lineTo(-30,12)}
    else if(sheathe){const q=(e-2.55)/.6;ctx.moveTo(0,-8);ctx.lineTo(35-q*25,0+q*20);ctx.moveTo(0,2);ctx.lineTo(24,20)}
    else{ctx.moveTo(0,-8);ctx.lineTo(31,-4);ctx.moveTo(0,2);ctx.lineTo(-28,11)}
    ctx.stroke();ctx.beginPath();
    if(dive){ctx.moveTo(8,34);ctx.lineTo(-55,69);ctx.moveTo(8,34);ctx.lineTo(-72,48)}
    else if(kneel){ctx.moveTo(12,27);ctx.lineTo(48,76);ctx.moveTo(12,27);ctx.lineTo(-63,72)}
    else{ctx.moveTo(0,34);ctx.lineTo(34,78);ctx.moveTo(0,34);ctx.lineTo(-38,77)}
    ctx.stroke();resetGlow();
    if(armed){
      ctx.strokeStyle='#26384d';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(-9,23);ctx.lineTo(-64,70);ctx.stroke();ctx.strokeStyle='#8ba4bb';ctx.lineWidth=2;ctx.stroke();
      let hx=35,hy=-7,tx=118,ty=-31;
      if(dive){hx=35;hy=-7;tx=112;ty=-31}else if(kneel){hx=34;hy=14;tx=34;ty=101}else if(lift){hx=45;hy=-55;tx=112;ty=-126}else if(charge||fire){hx=-4;hy=18;tx=-59;ty=69}else if(sheathe){const q=Math.min(1,(e-2.55)/.5);hx=33-q*42;hy=0+q*23;tx=105-q*165;ty=-25+q*94}
      ctx.strokeStyle='#e9fbff';ctx.lineWidth=7;glow('#58d9ff',charge?34:22);ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(tx,ty);ctx.stroke();ctx.strokeStyle='#65cfff';ctx.lineWidth=2;ctx.stroke();resetGlow();ctx.fillStyle='#9bdfff';ctx.fillRect(hx-8,hy-3,18,6);
    }
    if(charge){ctx.globalCompositeOperation='lighter';for(let i=0;i<8;i++){const a=i*.79+performance.now()/120,r=18+(i%3)*8;ctx.strokeStyle=i%2?'#ffffff':'#43cfff';ctx.lineWidth=2+i%3;ctx.beginPath();ctx.moveTo(48,-18);ctx.lineTo(48+Math.cos(a)*r,-18+Math.sin(a)*r);ctx.stroke()}ctx.fillStyle='#eaffff';glow('#4bd8ff',32);ctx.beginPath();ctx.arc(48,-18,8+Math.sin(performance.now()/55)*3,0,7);ctx.fill();resetGlow()}
    ctx.restore()
  };
  const drawAbyssBloodBlade=(hx,hy,tx,ty,ghost=false)=>{
    const dx=tx-hx,dy=ty-hy,len=Math.max(108,Math.hypot(dx,dy)),angle=Math.atan2(dy,dx),blade=len-12;
    ctx.save();ctx.translate(hx,hy);ctx.rotate(angle);ctx.globalCompositeOperation='lighter';if(ghost)ctx.shadowBlur=0;else glow('#8c35ff',26);
    ctx.fillStyle='#0b0713';ctx.strokeStyle='#050208';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(22,-13);ctx.lineTo(35,-8);ctx.lineTo(49,-17);ctx.lineTo(61,-10);ctx.lineTo(79,-20);ctx.lineTo(92,-11);ctx.lineTo(112,-19);ctx.lineTo(blade,-4);ctx.lineTo(blade+17,0);ctx.lineTo(blade,6);ctx.lineTo(112,13);ctx.lineTo(98,8);ctx.lineTo(82,17);ctx.lineTo(68,9);ctx.lineTo(51,15);ctx.lineTo(38,7);ctx.lineTo(23,11);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle=ghost?'#8b35ca':'#6f25ad';ctx.beginPath();ctx.moveTo(18,-3);ctx.lineTo(38,-10);ctx.lineTo(58,-7);ctx.lineTo(78,-14);ctx.lineTo(101,-9);ctx.lineTo(blade+11,0);ctx.lineTo(100,7);ctx.lineTo(79,10);ctx.lineTo(58,5);ctx.lineTo(37,8);ctx.closePath();ctx.fill();
    if(!ghost){ctx.strokeStyle='#f1b8ff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(24,-2);ctx.lineTo(47,-7);ctx.lineTo(65,-3);ctx.lineTo(84,-9);ctx.lineTo(106,-5);ctx.lineTo(blade+8,0);ctx.stroke();ctx.fillStyle='#17101f';ctx.strokeStyle='#402259';ctx.lineWidth=2;for(const [x,side,size] of [[29,-1,13],[50,1,15],[72,-1,17],[94,1,14],[113,-1,11]]){ctx.beginPath();ctx.moveTo(x,-side*2);ctx.lineTo(x-8,side*size);ctx.lineTo(x+8,side*7);ctx.closePath();ctx.fill();ctx.stroke()}}
    ctx.fillStyle='#0b0712';ctx.strokeStyle='#7c32bd';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(13,-4);ctx.lineTo(0,-22);ctx.lineTo(25,-10);ctx.lineTo(31,-2);ctx.lineTo(10,5);ctx.lineTo(2,19);ctx.lineTo(-2,5);ctx.closePath();ctx.fill();ctx.stroke();
    if(!ghost)resetGlow();ctx.globalCompositeOperation='source-over';ctx.strokeStyle='#211827';ctx.lineWidth=11;ctx.beginPath();ctx.moveTo(7,1);ctx.lineTo(-31,2);ctx.stroke();ctx.strokeStyle='#5d3a70';ctx.lineWidth=3;for(let x=-27;x<5;x+=8){ctx.beginPath();ctx.moveTo(x,-4);ctx.lineTo(x+6,7);ctx.stroke()}
    ctx.fillStyle='#160d20';ctx.strokeStyle='#9f42ef';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-31,-5);ctx.lineTo(-43,-8);ctx.lineTo(-49,1);ctx.lineTo(-41,10);ctx.lineTo(-30,7);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#bd58ff';ctx.fillRect(-44,-3,8,8);
    ctx.restore()
  };
  const drawFighter=p=>{
    if(p.barrageHidden)return;
    if(p.state==='thunderExecution'){drawThunderFighter(p);return}
    const now=performance.now(),running=p.state==='run',jumping=p.state==='jump'&&!p.grounded,walkPhase=now/118,run=running?Math.sin(walkPhase):0,step=running?Math.cos(walkPhase):0,runBob=running?Math.abs(step)*1.5:0;
    const jumpVelocity=Math.max(-660,Math.min(660,p.vy)),jumpQ=(jumpVelocity+660)/1320,jumpRise=jumping&&jumpVelocity<-120,jumpFall=jumping&&jumpVelocity>160;
    const block=p.state==='block',punch=p.state==='punch',lunge=p.state==='lunge',sweep=p.state==='sweep',fly=p.state==='fly',triple=p.state==='triple',sky=p.state==='skybreaker',phantom=p.state==='phantom',comet=p.state==='comet',airrush=p.state==='airrush',counterPunch=p.state==='counterPunch',counterKick=p.state==='counterKick',bloodIaido=p.state==='bloodIaido',bloodDrain=p.state==='bloodDrain',bloodSpecial=p.state.startsWith('blood')||['batDive','bleedBurst','moonBlade'].includes(p.state);
    const powerMove=lunge||fly||triple||sky||phantom||comet||airrush||counterPunch||counterKick||bloodSpecial,tripleElapsed=triple?1.25-p.stateTime:0,triplePhase=triple?(tripleElapsed<.28?1:tripleElapsed<.94?2:3):0,skyPhase=sky?Math.min(3,Math.floor((.98-p.stateTime)/.2)+1):0,bloodElapsed=bloodIaido?1.36-p.stateTime:bloodDrain?2.5-p.stateTime:0,bloodPose=bloodIaido?(bloodElapsed<.22?0:bloodElapsed<.56?1:bloodElapsed<1?2:3):0,hit=p.hitStun>0||p.guardBreak>0,blinkQ=p.blink?p.blink.t/p.blink.duration:0;
    const sweepQ=sweep?Math.max(0,Math.min(1,(.42-p.stateTime)/.42)):0,sweepKick=sweep?(sweepQ<.2?sweepQ/.2:sweepQ<.66?1:Math.max(0,(1-sweepQ)/.34)):0,sweepDrop=sweep?Math.sin(sweepQ*Math.PI)*9:0;
    ctx.save();ctx.translate(p.x,p.y-90-runBob+sweepDrop);ctx.scale(p.facing*(p.blink?1+Math.sin(blinkQ*Math.PI)*.45:1),1);
    if(p.blink)ctx.globalAlpha=.2+.8*Math.abs(blinkQ-.5)*2;if((p.invuln>0||p.wakeProtect>0)&&Math.floor(now/65)%2)ctx.globalAlpha*=.35;
    if(fly||counterKick)ctx.rotate(.68);else if(lunge||phantom||counterPunch)ctx.rotate(.2);else if(bloodDrain)ctx.rotate(bloodElapsed<.7?-.12:.18);else if(bloodIaido)ctx.rotate([-.1,.08,-.16,.04][bloodPose]);else if(bloodSpecial)ctx.rotate(.16);else if(comet)ctx.rotate(-.32);else if(airrush)ctx.rotate(.28);else if(triple)ctx.rotate(triplePhase===1?.48:triplePhase===3?.12:-.12);else if(sweep)ctx.rotate(-.1+.2*sweepKick);else if(sky)ctx.rotate(skyPhase===1?-.22:skyPhase===3?.58:0);else if(hit)ctx.rotate(-.18);else if(jumping)ctx.rotate(jumpFall?.13:.05);
    ctx.strokeStyle=p.flash>0?'#fff':p.color;ctx.fillStyle=p.color;ctx.lineWidth=powerMove?11:8;ctx.lineCap='round';ctx.lineJoin='round';glow(bloodSpecial?'#ff1738':sky||phantom||counterPunch||counterKick?'#d7a8ff':p.color,powerMove?24:13);
    ctx.beginPath();ctx.arc(0,-42,powerMove?18:16,0,7);ctx.stroke();ctx.beginPath();ctx.moveTo(0,-24);ctx.lineTo(0,34);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,-10);
    if(block){ctx.lineTo(25,-31);ctx.lineTo(36,-3);ctx.moveTo(0,2);ctx.lineTo(29,18)}
    else if(sky&&skyPhase===1){ctx.lineTo(34,-88);ctx.moveTo(0,0);ctx.lineTo(-30,20)}
    else if(triple&&triplePhase===3){ctx.lineTo(126,-18);ctx.moveTo(0,0);ctx.lineTo(-44,18)}
    else if(bloodDrain){ctx.lineTo(bloodElapsed<.7?78:48,bloodElapsed<.7?-44:-15);ctx.moveTo(0,0);ctx.lineTo(bloodElapsed<.7?52:86,bloodElapsed<.7?22:-3)}
    else if(bloodIaido){const arms=[[[-44,18],[-58,34]],[[82,-23],[-28,18]],[[72,12],[-23,-2]],[[-32,25],[-61,39]]][bloodPose];ctx.lineTo(arms[0][0],arms[0][1]);ctx.moveTo(0,0);ctx.lineTo(arms[1][0],arms[1][1])}
    else if(bloodSpecial){ctx.lineTo(92,-28);ctx.moveTo(0,0);ctx.lineTo(68,24)}
    else if(counterPunch||phantom||airrush||punch||lunge){ctx.lineTo(counterPunch||phantom||airrush?112:lunge?106:88,-13);ctx.moveTo(0,0);ctx.lineTo(-34,14)}
    else if(comet){ctx.lineTo(-48,-28);ctx.moveTo(0,0);ctx.lineTo(-38,23)}
    else if(sweep){ctx.lineTo(-25-18*sweepKick,-5);ctx.moveTo(0,0);ctx.lineTo(29+22*sweepKick,13)}
    else if(jumping){
      if(jumpRise){ctx.lineTo(28,-36);ctx.lineTo(52,-69);ctx.moveTo(0,0);ctx.lineTo(-37,-21);ctx.lineTo(-61,-10)}
      else if(jumpFall){ctx.lineTo(32,7);ctx.lineTo(48,30);ctx.moveTo(0,0);ctx.lineTo(-27,15);ctx.lineTo(-43,36)}
      else{ctx.lineTo(30,-43);ctx.lineTo(51,-74);ctx.moveTo(0,0);ctx.lineTo(-45,-10);ctx.lineTo(-69,-13)}
    }
    else if(running){ctx.lineTo(31*run,8);ctx.moveTo(0,0);ctx.lineTo(-31*run,18)}
    else{ctx.lineTo(25,29);ctx.moveTo(0,0);ctx.lineTo(-25,29)}
    ctx.stroke();ctx.beginPath();
    if(fly||counterKick){ctx.moveTo(0,34);ctx.lineTo(counterKick?112:104,counterKick?82:52);ctx.moveTo(0,34);ctx.lineTo(-42,50)}
    else if(comet){ctx.moveTo(0,34);ctx.lineTo(74,-4);ctx.lineTo(106,18);ctx.moveTo(0,34);ctx.lineTo(-45,62)}
    else if(airrush){ctx.moveTo(0,34);ctx.lineTo(94,82);ctx.moveTo(0,34);ctx.lineTo(-38,58)}
    else if(sky&&skyPhase===3){ctx.moveTo(0,34);ctx.lineTo(92,92);ctx.moveTo(0,34);ctx.lineTo(-42,56)}
    else if(triple){ctx.moveTo(0,34);ctx.lineTo(triplePhase===1?84:58,triplePhase===1?48:72);ctx.moveTo(0,34);ctx.lineTo(triplePhase===1?-70:-42,triplePhase===1?45:70)}
    else if(sweep){ctx.moveTo(0,34);ctx.lineTo(38+70*sweepKick,67-10*sweepKick);ctx.moveTo(0,34);ctx.lineTo(-38,70)}
    else if(lunge||phantom||counterPunch||bloodDrain){ctx.moveTo(0,34);ctx.lineTo(66,72);ctx.moveTo(0,34);ctx.lineTo(-52,76)}
    else if(bloodIaido){ctx.moveTo(0,34);ctx.lineTo(42,76);ctx.moveTo(0,34);ctx.lineTo(-56,72)}
    else if(bloodSpecial){ctx.moveTo(0,34);ctx.lineTo(66,72);ctx.moveTo(0,34);ctx.lineTo(-52,76)}
    else if(jumping){
      if(jumpRise){ctx.moveTo(0,34);ctx.lineTo(34,49);ctx.lineTo(55,29);ctx.moveTo(0,34);ctx.lineTo(-32,54);ctx.lineTo(-57,43)}
      else if(jumpFall){ctx.moveTo(0,34);ctx.lineTo(30,57);ctx.lineTo(51,76);ctx.moveTo(0,34);ctx.lineTo(-27,58);ctx.lineTo(-47,78)}
      else{const tuck=1-Math.abs(jumpQ-.5)*2;ctx.moveTo(0,34);ctx.lineTo(34+8*tuck,51);ctx.lineTo(59,35+8*tuck);ctx.moveTo(0,34);ctx.lineTo(-34-6*tuck,54);ctx.lineTo(-57,43+7*tuck)}
    }
    else if(running){ctx.moveTo(0,34);ctx.lineTo(34*run,78-Math.max(0,step)*7);ctx.moveTo(0,34);ctx.lineTo(-34*run,78-Math.max(0,-step)*7)}
    else{ctx.moveTo(0,34);ctx.lineTo(30,78);ctx.moveTo(0,34);ctx.lineTo(-30,78)}
    ctx.stroke();resetGlow();
    if(bloodIaido){const drawn=bloodElapsed>.08&&bloodElapsed<1.18;ctx.strokeStyle='#24182b';ctx.lineWidth=11;ctx.beginPath();ctx.moveTo(-10,22);ctx.lineTo(-72,68);ctx.stroke();ctx.strokeStyle='#71339a';ctx.lineWidth=3;ctx.stroke();if(drawn){const blades=[[[-43,18],[-137,84]],[[57,-14],[174,-56]],[[52,7],[169,45]],[[-31,24],[-116,76]]],blade=blades[bloodPose];drawAbyssBloodBlade(blade[0][0],blade[0][1],blade[1][0],blade[1][1])}}
    if(bloodDrain&&bloodElapsed>.68){ctx.strokeStyle='#ff1738';ctx.lineWidth=7;glow('#ff1738',22);ctx.beginPath();ctx.arc(72,-8,24,-1.1,1.1);ctx.stroke();resetGlow()}
    if(sweep&&sweepKick>.84){ctx.save();ctx.globalAlpha=.25+.45*Math.sin(sweepQ*Math.PI);ctx.strokeStyle=p.accent;ctx.lineWidth=4;glow(p.accent,18);ctx.beginPath();ctx.arc(8,34,101,-.45,.48);ctx.stroke();resetGlow();ctx.restore()}
    if(block){ctx.strokeStyle='#baf6ff';ctx.lineWidth=6;ctx.beginPath();ctx.arc(38,0,39,-1.15,1.15);ctx.stroke()}
    if(powerMove){ctx.strokeStyle=sky||phantom||counterPunch||counterKick?'#d7a8ff':p.accent;ctx.lineWidth=4;for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(-95-i*18,-14+i*15);ctx.lineTo(-25-i*7,-14+i*15);ctx.stroke()}}
    if(p.guardBreak>0){ctx.fillStyle='#ffe06d';ctx.font='900 24px sans-serif';ctx.textAlign='center';ctx.fillText('✦',-25,-78);ctx.fillText('✦',23,-86)}
    if(p.bleedTime>0){ctx.fillStyle='#ff4054';ctx.font='900 16px sans-serif';ctx.textAlign='center';ctx.fillText(`${L('流血','BLEED')} ${Math.ceil(p.bleedTime)}s`,0,-82)}
    if(p.magic==='dark'&&p.health<maxHealth*.25&&!p.bloodMoonUsed){ctx.fillStyle='#ff6a80';ctx.font='900 14px sans-serif';ctx.textAlign='center';glow('#ff1738',16);ctx.fillText(L('血月 READY','BLOOD MOON READY'),0,-104);resetGlow()}
    ctx.restore()
  };
  const background=()=>{const bg=ctx.createLinearGradient(0,0,0,540);bg.addColorStop(0,'#11182c');bg.addColorStop(.7,'#1b2940');bg.addColorStop(1,'#080d16');ctx.fillStyle=bg;ctx.fillRect(0,0,900,540);ctx.strokeStyle='#263d5b';ctx.lineWidth=2;for(let x=0;x<=900;x+=75){ctx.beginPath();ctx.moveTo(450,145);ctx.lineTo(x,ground);ctx.stroke()}for(let y=180;y<ground;y+=55){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(900,y);ctx.stroke()}ctx.fillStyle='#08101c';ctx.fillRect(0,ground,900,102);ctx.fillStyle='#64748b';ctx.fillRect(0,ground,900,5);ctx.fillStyle='#40516b';for(let x=20;x<900;x+=65)ctx.fillRect(x,ground+36+(x%4)*8,32,3);ctx.fillStyle='#ffffff0a';ctx.font='900 120px sans-serif';ctx.textAlign='center';ctx.fillText('VS',450,330)};
  const drawTrails=()=>{for(const p of g.players)for(const t of p.trails){ctx.save();ctx.globalAlpha=Math.min(.8,t.life*3);ctx.translate(t.x,t.y-92);ctx.scale(t.facing,1);ctx.lineCap='round';if(t.state==='thunderDive'){ctx.globalCompositeOperation='lighter';ctx.strokeStyle='#51d9ff';ctx.lineWidth=18;glow('#48cfff',34);ctx.beginPath();ctx.moveTo(0,18);ctx.lineTo(-3,-72);ctx.stroke();ctx.strokeStyle='#f4ffff';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,22);ctx.lineTo(-2,-79);ctx.stroke();for(let i=0;i<4;i++){ctx.strokeStyle=i%2?'#fff':'#68ddff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-8-i*17);ctx.lineTo((i%2?1:-1)*(15+i*3),-20-i*18);ctx.stroke()}}else{ctx.strokeStyle=p.accent;ctx.lineWidth=12;glow(p.accent,24);ctx.beginPath();ctx.arc(0,-40,18,0,7);ctx.moveTo(0,-22);ctx.lineTo(0,36);ctx.moveTo(0,-8);ctx.lineTo(94,-14);ctx.moveTo(0,36);ctx.lineTo(78,73);ctx.moveTo(0,36);ctx.lineTo(-42,70);ctx.stroke()}resetGlow();ctx.restore()}};
  const drawBlinkPose=(x,y,facing,color,alpha,stretch=1)=>{ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y-90);ctx.scale(facing*stretch,1);ctx.strokeStyle=color;ctx.lineWidth=9;ctx.lineCap='round';glow(color,22);ctx.beginPath();ctx.arc(0,-42,17,0,7);ctx.moveTo(0,-24);ctx.lineTo(0,34);ctx.moveTo(0,-9);ctx.lineTo(86,-18);ctx.moveTo(0,1);ctx.lineTo(-32,17);ctx.moveTo(0,34);ctx.lineTo(75,72);ctx.moveTo(0,34);ctx.lineTo(-43,67);ctx.stroke();resetGlow();ctx.restore()};
  const drawBladeGhostPose=(x,y,facing,alpha,stretch=1)=>{ctx.save();ctx.shadowBlur=0;ctx.globalAlpha=alpha;ctx.translate(x,y-90);ctx.scale(facing*stretch,1);ctx.strokeStyle='#9e42e8';ctx.lineWidth=9;ctx.lineCap='round';ctx.beginPath();ctx.arc(0,-42,17,0,7);ctx.moveTo(0,-24);ctx.lineTo(0,34);ctx.moveTo(0,-9);ctx.lineTo(78,-23);ctx.moveTo(0,2);ctx.lineTo(-27,16);ctx.moveTo(0,34);ctx.lineTo(68,71);ctx.moveTo(0,34);ctx.lineTo(-42,67);ctx.stroke();ctx.restore()};
  const drawTeleports=()=>{for(const fx of g.teleports){const q=Math.min(1,fx.t/fx.duration),fade=Math.max(0,fx.life/.5),point=e=>{const u=1-e;return{x:u*u*fx.sx+2*u*e*fx.cx+e*e*fx.ex,y:u*u*fx.sy+2*u*e*fx.cy+e*e*fx.ey}};ctx.save();ctx.filter='none';ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.3+.55*fade;ctx.strokeStyle=fx.color;ctx.lineWidth=22*(1-q*.35);glow(fx.color,35);ctx.beginPath();ctx.moveTo(fx.sx,fx.sy-60);ctx.quadraticCurveTo(fx.cx,fx.cy-60,fx.ex,fx.ey-60);ctx.stroke();ctx.strokeStyle=fx.core;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(fx.sx,fx.sy-60);ctx.quadraticCurveTo(fx.cx,fx.cy-60,fx.ex,fx.ey-60);ctx.stroke();resetGlow();for(let i=0;i<5;i++){const e=Math.max(0,Math.min(q,i/4)),pt=point(e),a=Math.max(0,.42-Math.abs(q-e)*.38);drawBlinkPose(pt.x,pt.y,fx.facing,fx.color,a,1+(1-e)*.5)}for(let i=0;i<26;i++){const e=(i/25+q*.18)%1,pt=point(e),wave=Math.sin(i*7.13)*18;ctx.save();ctx.translate(pt.x+Math.sin(i*2.7)*12,pt.y-65+wave);ctx.rotate(i*.82+q*5);ctx.globalAlpha=.25+.6*Math.sin(Math.PI*e);ctx.fillStyle=i%3?fx.color:fx.core;ctx.fillRect(-2-i%2,-7,4+i%2*2,14);ctx.restore()}if(fx.arrived){const a=Math.max(0,1-(fx.burstAge||0)/.24),r=24+(fx.burstAge||0)*520;ctx.globalAlpha=a;ctx.strokeStyle=fx.core;ctx.lineWidth=9*a+2;ctx.beginPath();ctx.arc(fx.ex,fx.ey-62,r,0,7);ctx.stroke();ctx.beginPath();ctx.moveTo(fx.ex-r*1.5,fx.ey-62-r*.28);ctx.lineTo(fx.ex+r*1.5,fx.ey-62+r*.28);ctx.moveTo(fx.ex-r*.75,fx.ey-62+r);ctx.lineTo(fx.ex+r*.75,fx.ey-62-r);ctx.stroke()}ctx.restore()}};
  const drawBarrages=()=>{for(const fx of g.barrages){const a=Math.max(0,fx.life/.34),pulse=1+Math.sin(fx.t*55+fx.index)*.12;ctx.save();ctx.filter='none';ctx.globalCompositeOperation='lighter';drawBlinkPose(fx.x,fx.y,fx.facing,fx.color,.22+.52*a,pulse);ctx.globalAlpha=.25+.7*a;ctx.strokeStyle='#ffffff';ctx.lineWidth=2+5*a;glow('#ffffff',16);for(let i=-3;i<=3;i++){const spread=i*8,fromX=fx.x+fx.facing*(38-Math.abs(i)*6),fromY=fx.y-68+spread;ctx.beginPath();ctx.moveTo(fromX-fx.facing*(85+Math.abs(i)*13),fromY);ctx.lineTo(fx.targetX-fx.facing*9,fx.targetY-66+spread*.18);ctx.stroke()}ctx.globalAlpha=.18+.55*a;ctx.lineWidth=2+3*a;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(fx.targetX,fx.targetY-66,18+fx.t*150+i*14,-.65+i*.7,1.35+i*.7);ctx.stroke()}resetGlow();ctx.restore()}};
  const drawBurnPaths=()=>{for(const path of g.burnPaths){if(path.points.length<2)continue;const fade=Math.max(0,path.life/path.total),first=path.points[0],last=path.points.at(-1),dir=Math.sign(last.x-first.x)||1;ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';ctx.lineJoin='round';glow('#ff1738',22);for(const [color,width,alpha] of [['#070106',40,.52],['#570617',25,.76],['#c30d2b',13,.9],['#ff2847',6,1],['#fff0f3',2,.92]]){ctx.globalAlpha=fade*alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();path.points.forEach((point,i)=>i?ctx.lineTo(point.x,point.y):ctx.moveTo(point.x,point.y));ctx.stroke()}for(let i=2;i<path.points.length;i+=3){const point=path.points[i],stretch=22+(i%4)*7,side=i%2?1:-1;ctx.globalAlpha=fade*(.32+(i%2)*.18);ctx.fillStyle=i%2?'#ff2949':'#8d081f';ctx.beginPath();ctx.moveTo(point.x+dir*7,point.y);ctx.lineTo(point.x-dir*stretch,point.y+side*(10+(i%3)*3));ctx.lineTo(point.x-dir*(stretch-7),point.y-side*7);ctx.closePath();ctx.fill()}ctx.globalAlpha=fade;ctx.translate(last.x,last.y);ctx.scale(dir,1);for(const [color,width] of [['#560414',19],['#ff1738',8],['#fff1f4',2]]){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(-34,0);ctx.stroke()}resetGlow();ctx.restore()}};
  const drawBloodFx=()=>{for(const fx of g.bloodFx){const q=Math.max(0,Math.min(1,fx.t/fx.total)),fade=Math.max(0,fx.life/fx.total);ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=fade;ctx.lineCap='round';ctx.lineJoin='round';glow('#ff1838',28);
    if(fx.kind==='dash'){ctx.translate(fx.x,fx.y);ctx.scale(fx.dir,1);for(const [color,width,alpha] of [['#32030d',34,.64],['#8f081f',21,.78],['#ff1738',10,.94],['#fff0f2',2.5,1]]){ctx.globalAlpha=fade*alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(-8,0);ctx.quadraticCurveTo(-82-q*90,-8,-185-q*68,4);ctx.stroke()}for(let i=0;i<4;i++){ctx.globalAlpha=fade*(.25+i*.1);ctx.strokeStyle=i===3?'#ffffff':'#ff1738';ctx.lineWidth=2+i;ctx.beginPath();ctx.moveTo(-40-i*24,(i%2?1:-1)*9);ctx.lineTo(-100-i*28,(i%2?1:-1)*15);ctx.stroke()}}
    else if(fx.kind==='whiffTurn'){ctx.translate(fx.x,fx.y);ctx.scale(fx.dir||1,1);const spin=q*Math.PI*1.4;ctx.rotate(-spin*.12);for(let i=0;i<4;i++){const r=34+i*18+q*24;ctx.strokeStyle=i===2?'#fff0f2':i%2?'#ff1738':'#5b0617';ctx.lineWidth=i===2?3:13-i*2;ctx.beginPath();ctx.arc(-6,2,r,-.9+spin+i*.18,2.55+spin+i*.18);ctx.stroke()}for(let i=0;i<9;i++){const a=-1.9+i*.43+spin,r=42+(i%3)*20;ctx.fillStyle=i%3?'#ff1738':'#ffdce2';ctx.save();ctx.translate(Math.cos(a)*r,Math.sin(a)*r);ctx.rotate(a);ctx.fillRect(-18,-2,36,4);ctx.restore()}ctx.strokeStyle='#ffffff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(28,-37);ctx.lineTo(-18,0);ctx.lineTo(30,38);ctx.stroke()}
    else if(fx.kind==='reverseRush'){const w=fx.x2-fx.x1,dir=Math.sign(w)||fx.dir||1,grow=Math.min(1,q*2.8);ctx.translate(fx.x1,fx.y);for(const [color,width,alpha] of [['#3b020d',30,.62],['#9b0821',18,.78],['#ff1738',9,.94],['#fff5f6',2.5,1]]){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.globalAlpha=fade*alpha;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(w*.42,-dir*42,w*grow,0);ctx.stroke()}for(let i=0;i<5;i++){const e=Math.min(grow,(i+1)/6),x=w*e,y=-Math.sin(e*Math.PI)*dir*34;drawBlinkPose(fx.x1+x,fx.y+60+y,fx.dir||dir,i===4?'#fff0f2':'#ff1738',fade*(.12+i*.055),1.35-i*.08)}for(let i=0;i<12;i++){const e=(i+.5)/12;if(e>grow)continue;ctx.globalAlpha=fade*(.35+.5*(1-e));ctx.fillStyle=i%3?'#ff1738':'#ffffff';ctx.save();ctx.translate(w*e,-Math.sin(e*Math.PI)*dir*34+(i%2?9:-9));ctx.rotate((i%2?-.2:.2)*dir);ctx.fillRect(-18-i%3*5,-2,35+i%3*9,4);ctx.restore()}}
    else if(fx.kind==='draw'||fx.kind==='cut'||fx.kind==='sheathe'){ctx.translate(fx.x,fx.y);ctx.scale(fx.dir||1,1);const r=fx.kind==='cut'?124:88,turn=fx.kind==='sheathe'?1-q:q,start=-1.18,end=start+2.36*turn;for(const [color,width,alpha] of [['#2a020d',25,.72],['#ff1738',17,.82],['#7422b5',11,.95],['#c65cff',6,1],['#fff0ff',2.5,1]]){ctx.globalAlpha=fade*alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.arc(0,8,r,start,end);ctx.stroke()}ctx.fillStyle='#a739e9';for(let i=0;i<9;i++){const a=start+(end-start)*(i/8||0),rr=r+(i%2?8:-7);ctx.save();ctx.translate(Math.cos(a)*rr,8+Math.sin(a)*rr);ctx.rotate(a);ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(-9,-5);ctx.lineTo(-5,6);ctx.closePath();ctx.fill();ctx.restore()}}
    else if(fx.kind==='returnLine'||fx.kind==='slashPath'){const y=fx.y,w=Math.max(1,Math.abs(fx.x2-fx.x1)),dir=Math.sign(fx.x2-fx.x1)||1,start=dir>0?fx.x1:fx.x2;ctx.translate(start,y);const grow=Math.min(1,q*3.2);ctx.scale(grow,1);for(const [color,width,alpha] of [[fx.kind==='slashPath'?'#4d0315':'#1d061f',fx.kind==='slashPath'?38:26,.72],['#ff1738',fx.kind==='slashPath'?18:12,.82],['#7e2ac2',fx.kind==='slashPath'?11:7,.94],['#e8b2ff',3,1]]){ctx.globalAlpha=fade*alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(0,12);ctx.quadraticCurveTo(w*.44,-58,w,0);ctx.stroke()}if(fx.kind==='slashPath'){ctx.strokeStyle='#b51638';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(0,-18);ctx.quadraticCurveTo(w*.52,48,w,-16);ctx.stroke();ctx.strokeStyle='#a94dff';ctx.lineWidth=2;ctx.stroke()}}
    else if(fx.kind==='bladeGhosts'){const grow=Math.min(1,q*2.5),count=5;ctx.shadowBlur=0;for(let i=0;i<count;i++){const e=i/(count-1);if(e>grow+.08)continue;const x=fx.x1+(fx.x2-fx.x1)*e,y=fx.y-Math.sin(e*Math.PI)*18,a=fade*(.17+i*.055);drawBladeGhostPose(x,y,fx.dir,a,1.22-i*.05);ctx.globalAlpha=a;drawAbyssBloodBlade(x+fx.dir*20,y-104,x+fx.dir*126,y-133,true)}}
    else if(fx.kind==='bladeRift'){ctx.translate(fx.x,fx.y);ctx.scale(fx.dir||1,1);ctx.rotate((fx.index||1)*.38-.62);const grow=Math.min(1,q*4),pulse=.8+Math.sin(q*Math.PI)*.2;for(const [color,width] of [['#3b020f',22],['#ff1738',12],['#8c2fd0',7],['#f3c9ff',2.5]]){ctx.strokeStyle=color;ctx.lineWidth=width*pulse;ctx.beginPath();ctx.moveTo(-92*grow,-48);ctx.lineTo(-37*grow,-12);ctx.lineTo(-10*grow,-28);ctx.lineTo(21*grow,8);ctx.lineTo(58*grow,-4);ctx.lineTo(96*grow,46);ctx.stroke()}for(let i=0;i<8;i++){const x=-66+i*19;ctx.strokeStyle=i%2?'#c754ff':'#ff3150';ctx.lineWidth=2+i%3;ctx.beginPath();ctx.moveTo(x,(-22+i%3*15)*grow);ctx.lineTo(x+(i%2?18:-15),(-49+i%4*27)*grow);ctx.stroke()}}
    else if(fx.kind==='riftBurst'){ctx.translate(fx.x,fx.y);const burst=Math.min(1,q*3),r=22+q*220;ctx.rotate(q*.18);for(let slash=0;slash<3;slash++){ctx.save();ctx.rotate(slash*Math.PI/3);for(const [color,width] of [['#38020f',38],['#ff1738',20],['#8f35d8',11],['#ffffff',3]]){ctx.strokeStyle=color;ctx.lineWidth=width*fade;ctx.beginPath();ctx.moveTo(-150*burst,0);ctx.quadraticCurveTo(0,-58,150*burst,0);ctx.stroke()}ctx.restore()}for(let i=0;i<32;i++){const a=i*Math.PI*2/32+q*.7,len=r*(.7+(i%5)*.16);ctx.strokeStyle=i%4===0?'#ffffff':i%2?'#ff1738':'#b64cff';ctx.lineWidth=2+i%5;ctx.beginPath();ctx.moveTo(Math.cos(a)*18,Math.sin(a)*18);ctx.lineTo(Math.cos(a)*len,Math.sin(a)*len);ctx.stroke()}ctx.strokeStyle='#d06aff';ctx.lineWidth=8*fade+2;ctx.beginPath();ctx.arc(0,0,r*.68,0,7);ctx.stroke()}
    else if(fx.kind==='pull'){ctx.translate(fx.x,fx.y);for(let i=0;i<5;i++){const r=24+(1-q)*(150+i*24);ctx.strokeStyle=i%2?'#ff2445':'#74091d';ctx.lineWidth=3+i;ctx.beginPath();ctx.arc(0,0,r,i*.6+q*4,Math.PI*1.6+i*.6+q*4);ctx.stroke()}for(let i=0;i<18;i++){const a=i*.85+q*8,r=35+(i%6)*18;ctx.fillStyle=i%3?'#b50c29':'#ff6075';ctx.fillRect(Math.cos(a)*r-2,Math.sin(a)*r-6,4,12)}}
    else if(fx.kind==='bats'){ctx.translate(fx.x,fx.y);for(let i=0;i<13;i++){const a=i*.92+fx.t*7*(i%2?1:-1),r=34+(i%5)*17+Math.sin(fx.t*12+i)*10,x=Math.cos(a)*r,y=Math.sin(a)*r*.68;ctx.save();ctx.translate(x,y);ctx.rotate(a+.5);ctx.fillStyle=i%3?'#a40722':'#ff2949';ctx.beginPath();ctx.moveTo(0,2);ctx.quadraticCurveTo(-12,-12,-22,-2);ctx.quadraticCurveTo(-11,-1,0,8);ctx.quadraticCurveTo(11,-1,22,-2);ctx.quadraticCurveTo(12,-12,0,2);ctx.fill();ctx.restore()}ctx.strokeStyle='#ff2445';ctx.lineWidth=8;ctx.beginPath();ctx.arc(0,0,30+Math.sin(fx.t*18)*7,0,7);ctx.stroke()}
    else if(fx.kind==='claw'||fx.kind==='clawRise'){ctx.translate(fx.x,fx.y);ctx.scale(fx.dir||1,fx.kind==='clawRise'?1.3:1);ctx.rotate(fx.kind==='clawRise'?-1.05:(fx.index||0)*.45);for(let i=-1;i<=1;i++){ctx.strokeStyle=i?'#ff1738':'#fff0f2';ctx.lineWidth=i?9:4;ctx.beginPath();ctx.moveTo(-65,i*16+32);ctx.quadraticCurveTo(0,i*8-55,75,i*13-36);ctx.stroke()}}
    else if(fx.kind==='chains'){ctx.translate(fx.x,fx.y);for(let ring=0;ring<3;ring++){ctx.save();ctx.rotate(ring*1.05+q*2);ctx.strokeStyle=ring===1?'#ff4058':'#7d091e';ctx.lineWidth=8;for(let i=0;i<9;i++){const a=i*Math.PI*2/9,r=48+ring*22;ctx.beginPath();ctx.ellipse(Math.cos(a)*r,Math.sin(a)*r*.68,12,6,a,0,7);ctx.stroke()}ctx.restore()}ctx.strokeStyle='#fff0f2';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,35+(1-q)*55,0,7);ctx.stroke()}
    else if(fx.kind==='moonBlade'){ctx.translate(fx.x,fx.y);ctx.scale(fx.dir||1,1);const sweep=Math.min(1,q*2.4),start=-1.55,end=start+2.65*sweep;ctx.rotate(-.15+q*.18);for(let i=0;i<4;i++){const r=112+i*22;ctx.strokeStyle=i===2?'#fff3f5':i===1?'#ff1738':i===3?'#8f0820':'#250108';ctx.lineWidth=i===0?42:i===1?18:i===2?4:7;ctx.globalAlpha=fade*(i===0?.72:1);ctx.beginPath();ctx.arc(0,34,r,start+i*.035,end+i*.035);ctx.stroke()}ctx.globalAlpha=fade*.75;ctx.fillStyle='#ff1738';for(let i=0;i<11;i++){const a=start+(end-start)*(i/10),r=126+(i%3)*21;ctx.save();ctx.translate(Math.cos(a)*r,34+Math.sin(a)*r);ctx.rotate(a);ctx.beginPath();ctx.moveTo(25,0);ctx.lineTo(-15,-7);ctx.lineTo(-8,8);ctx.closePath();ctx.fill();ctx.restore()}ctx.strokeStyle='#ff536b';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-150,96);ctx.quadraticCurveTo(-10,68,164,88);ctx.stroke()}
    else if(fx.kind==='moonCut'){ctx.translate(fx.x,fx.y);ctx.scale(fx.dir||1,1);const grow=Math.min(1,q*3.5),tilt=(fx.index||1)%2?-.42:.42;ctx.rotate(tilt);for(let i=0;i<4;i++){ctx.strokeStyle=i===2?'#ffffff':i===1?'#ff1738':'#510414';ctx.lineWidth=i===0?28:i===1?12:i===2?3:5;ctx.beginPath();ctx.moveTo(-118,22+i*4);ctx.quadraticCurveTo(0,-70-i*9,(132+i*8)*grow,-12+i*3);ctx.stroke()}for(let i=0;i<7;i++){ctx.globalAlpha=fade*(.35+i*.07);ctx.strokeStyle=i%2?'#ff5b70':'#8c071f';ctx.lineWidth=2+i%3;ctx.beginPath();ctx.moveTo(-72+i*26,35);ctx.lineTo(-48+i*30,-52-(i%3)*13);ctx.stroke()}}
    else if(fx.kind==='moonCrossBurst'){ctx.translate(fx.x,fx.y);ctx.scale(fx.dir||1,1);const burst=Math.min(1,q*2.5),r=28+q*150;ctx.rotate(q*.16);for(let slash=0;slash<2;slash++){ctx.save();ctx.rotate(slash?1.5:-.22);for(let i=0;i<3;i++){ctx.strokeStyle=i===1?'#ff1738':i===2?'#ffffff':'#3c020d';ctx.lineWidth=i===0?36:i===1?15:3;ctx.beginPath();ctx.moveTo(-145*burst,0);ctx.quadraticCurveTo(0,-76,145*burst,0);ctx.stroke()}ctx.restore()}ctx.globalAlpha=fade*.9;ctx.strokeStyle='#ff3853';ctx.lineWidth=10;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#fff0f2';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,r*.72,0,Math.PI*2);ctx.stroke();for(let i=0;i<22;i++){const a=i*Math.PI*2/22+.25,len=r*(.8+(i%4)*.22);ctx.strokeStyle=i%4===0?'#ffffff':i%2?'#ff1738':'#7d071d';ctx.lineWidth=2+i%4;ctx.beginPath();ctx.moveTo(Math.cos(a)*25,Math.sin(a)*25);ctx.lineTo(Math.cos(a)*len,Math.sin(a)*len);ctx.stroke()}}
    else if(fx.kind==='domain'){ctx.translate(fx.x,fx.y);const pulse=1+Math.sin(fx.t*7)*.06;ctx.fillStyle='#260008';ctx.globalAlpha=.28*fade;ctx.beginPath();ctx.arc(0,0,420*pulse,0,7);ctx.fill();ctx.globalAlpha=fade;ctx.fillStyle='#a20722';ctx.beginPath();ctx.arc(0,-210,92*pulse,0,7);ctx.fill();ctx.fillStyle='#ff536c';ctx.beginPath();ctx.arc(-24,-234,18,0,7);ctx.fill();ctx.strokeStyle='#ff1738';ctx.lineWidth=8;for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(0,0,150+i*58+Math.sin(fx.t*5+i)*15,0,7);ctx.stroke()}}
    else if(fx.kind==='hunt'){const w=fx.x2-fx.x1;ctx.translate(fx.x1,fx.y);ctx.strokeStyle='#5d0618';ctx.lineWidth=28;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(w,0);ctx.stroke();ctx.strokeStyle='#ff1738';ctx.lineWidth=9;ctx.stroke();ctx.strokeStyle='#fff0f2';ctx.lineWidth=2;ctx.stroke()}
    else if(fx.kind==='cross'||fx.kind==='prisonBreak'){ctx.translate(fx.x,fx.y);ctx.scale(fx.dir||1,1);ctx.strokeStyle='#ff1738';ctx.lineWidth=fx.kind==='prisonBreak'?28:16;ctx.beginPath();ctx.moveTo(-105,-82);ctx.lineTo(112,88);ctx.moveTo(-94,92);ctx.lineTo(122,-86);ctx.stroke();ctx.strokeStyle='#fff0f2';ctx.lineWidth=4;ctx.stroke()}
    else if(fx.kind==='palm'||fx.kind==='grab'||fx.kind==='vortex'){ctx.translate(fx.x,fx.y);ctx.scale(fx.dir||1,1);for(let i=0;i<7;i++){const a=i*Math.PI*2/7+q*3,r=fx.kind==='vortex'?35+(1-q)*105:42;ctx.strokeStyle=i%2?'#ff1738':'#fff0f2';ctx.lineWidth=4+i%3;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);ctx.stroke()}ctx.strokeStyle='#ff1738';ctx.lineWidth=10;ctx.beginPath();ctx.arc(0,0,24+Math.sin(q*Math.PI)*18,0,7);ctx.stroke()}
    else if(fx.kind==='bite'){ctx.translate(fx.x,fx.y);ctx.rotate((fx.index||0)*.72);ctx.strokeStyle='#fff0f2';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-55,-22);ctx.lineTo(55,22);ctx.moveTo(-48,30);ctx.lineTo(48,-30);ctx.stroke();ctx.strokeStyle='#ff1738';ctx.lineWidth=16*(1-q);ctx.stroke()}
    else{ctx.translate(fx.x,fx.y);const r=18+q*(fx.kind==='moonBurst'?285:fx.kind==='drainBurst'?210:145);ctx.strokeStyle='#ff1738';ctx.lineWidth=22*fade+3;ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.stroke();ctx.strokeStyle='#fff0f2';ctx.lineWidth=5;ctx.stroke();for(let i=0;i<24;i++){const a=i*Math.PI*2/24+q*.4,len=r*(.72+(i%4)*.22);ctx.strokeStyle=i%3?'#9f0923':'#ff526b';ctx.lineWidth=3+i%4;ctx.beginPath();ctx.moveTo(Math.cos(a)*12,Math.sin(a)*12);ctx.lineTo(Math.cos(a)*len,Math.sin(a)*len);ctx.stroke()}}
    resetGlow();ctx.restore()}};
  const drawLightning=()=>{for(const fx of g.lightning){const a=Math.max(0,Math.min(1,fx.life/(fx.kind==='burst'?.72:fx.kind==='beam'?.62:.5)));ctx.save();ctx.filter='none';ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.25+.75*a;glow('#39cfff',36);
    if(fx.kind==='vertical'){const q=Math.min(1,fx.t/.38),returnQ=Math.max(0,Math.min(1,(fx.t-.62)/.28));ctx.strokeStyle='#52d6ff';ctx.lineWidth=18*a+5;ctx.beginPath();ctx.moveTo(fx.x,fx.y);ctx.lineTo(fx.x,fx.topY);ctx.moveTo(fx.landingX,fx.topY);ctx.lineTo(fx.landingX,fx.y);ctx.stroke();ctx.strokeStyle='#f3ffff';ctx.lineWidth=5;ctx.stroke();for(let i=0;i<7;i++){const rise=Math.min(1,q-i*.075),fall=Math.min(1,Math.max(0,returnQ-i*.075)),yy=fall>0?fx.topY+(fx.y-fx.topY)*fall:fx.y-(fx.y-fx.topY)*rise,xx=fall>0?fx.landingX:fx.x;ctx.globalAlpha=(.15+i*.07)*a;drawBlinkPose(xx,yy+62,fx.dir,'#9ae9ff',ctx.globalAlpha,.72)}}
    else if(fx.kind==='ground'){ctx.translate(fx.x,fx.y);ctx.strokeStyle='#eaffff';for(let i=0;i<18;i++){const ang=-Math.PI+i*Math.PI/17,r=35+(i%4)*13;ctx.lineWidth=i%3?2:5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(ang)*r,Math.sin(ang)*r*.35);ctx.stroke()}ctx.strokeStyle='#48ceff';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,20+fx.t*90,Math.PI,Math.PI*2);ctx.stroke()}
    else if(fx.kind==='slash'){ctx.translate(fx.x,fx.y);ctx.scale(fx.dir,1);ctx.strokeStyle='#eaffff';ctx.lineWidth=15*a+3;ctx.beginPath();ctx.arc(0,25,118,-1.2,.45);ctx.stroke();ctx.strokeStyle='#42caff';ctx.lineWidth=4;ctx.stroke()}
    else if(fx.kind==='beam'){const dx=fx.tx-fx.x,dy=fx.ty-fx.y,len=Math.hypot(dx,dy),ang=Math.atan2(dy,dx),hitDist=Math.hypot(fx.hx-fx.x,fx.hy-fx.y);ctx.translate(fx.x,fx.y);ctx.rotate(ang);const grow=Math.min(1,fx.t/.07);ctx.scale(grow,1);ctx.strokeStyle='#39cfff';ctx.lineWidth=34*a+12;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(len-26,0);ctx.stroke();ctx.strokeStyle='#f5ffff';ctx.lineWidth=13*a+5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(len-28,0);ctx.stroke();ctx.fillStyle='#ffffff';ctx.beginPath();ctx.moveTo(len,0);ctx.lineTo(len-45,-22);ctx.lineTo(len-45,22);ctx.closePath();ctx.fill();ctx.strokeStyle='#ffffff';ctx.lineWidth=8*a+2;ctx.beginPath();ctx.arc(hitDist,0,24+fx.t*38,0,7);ctx.stroke();for(let i=0;i<20;i++){const x=len*(i/20),side=i%2?1:-1,reach=12+(i%5)*7;ctx.strokeStyle=i%3?'#65ddff':'#ffffff';ctx.lineWidth=2+i%3;ctx.beginPath();ctx.moveTo(x,side*7);ctx.lineTo(x+12,side*reach);ctx.stroke()}}
    else{ctx.translate(fx.x,fx.y);const r=35+fx.t*260;ctx.strokeStyle='#ffffff';for(let i=0;i<28;i++){const ang=i*Math.PI*2/28+Math.sin(i*8.3)*.08,len=r*(.65+(i%5)*.13);ctx.lineWidth=i%4?3:8;ctx.beginPath();ctx.moveTo(Math.cos(ang)*12,Math.sin(ang)*12);ctx.lineTo(Math.cos(ang)*len,Math.sin(ang)*len);ctx.stroke()}ctx.strokeStyle='#4bd3ff';ctx.lineWidth=14*a+2;ctx.beginPath();ctx.arc(0,0,r*.65,0,7);ctx.stroke()}
    resetGlow();ctx.restore()}};
  const drawWallDamage=()=>{for(const side of [0,1]){const level=g.wallCracks[side];if(!level)continue;ctx.save();ctx.translate(side?895:5,255);ctx.scale(side?-1:1,1);ctx.strokeStyle=level===3?'#ff984f':'#6f88ae';ctx.lineWidth=2+level;glow(level===3?'#ff6b32':'#5c7caf',8+level*5);for(let i=0;i<level*4;i++){ctx.beginPath();ctx.moveTo(0,(i-level*2)*27);ctx.lineTo(22+level*15,(i-level*2)*27+(i%2?18:-18));ctx.lineTo(34+level*19,(i-level*2)*27+(i%3?35:-34));ctx.stroke()}ctx.restore();resetGlow()}};
  const drawImpactRings=()=>{for(const r of g.rings){const radius=Math.max(.1,r.r);ctx.save();ctx.globalAlpha=1-r.t/r.life;ctx.strokeStyle=r.color;ctx.lineWidth=10*(1-r.t/r.life)+2;glow(r.color,18);ctx.beginPath();ctx.arc(r.x,r.y,radius,0,7);ctx.stroke();ctx.beginPath();ctx.moveTo(r.x-radius*1.5,r.y);ctx.lineTo(r.x+radius*1.5,r.y);ctx.moveTo(r.x,r.y-radius*1.5);ctx.lineTo(r.x,r.y+radius*1.5);ctx.stroke();ctx.restore();resetGlow()}};
  const drawKo=()=>{if(!g.ko||g.ko.timer<=0)return;const age=g.ko.duration-g.ko.timer,scale=Math.min(1,age/.16),alpha=Math.min(1,age/.08)*Math.min(1,g.ko.timer/.28);ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#02030ab8';ctx.fillRect(0,0,900,540);ctx.translate(450,248);ctx.scale(.72+.28*Math.sin(scale*Math.PI/2),.72+.28*Math.sin(scale*Math.PI/2));ctx.transform(1,0,-.13,1,0,0);ctx.textAlign='center';ctx.lineJoin='round';ctx.font='italic 1000 154px Impact, Arial Black, sans-serif';ctx.lineWidth=22;ctx.strokeStyle='#160b08';ctx.strokeText('K.O.',0,0);const grad=ctx.createLinearGradient(0,-115,0,18);grad.addColorStop(0,'#ff9a26');grad.addColorStop(.45,'#f04a16');grad.addColorStop(1,'#a80f0a');ctx.fillStyle=grad;ctx.fillText('K.O.',0,0);ctx.lineWidth=5;ctx.strokeStyle='#ffe086';ctx.strokeText('K.O.',0,0);const sub=g.ko.perfect?'PERFECT':g.ko.finisher?L('终结一击','FINAL STRIKE'):L('击倒','KNOCK OUT');ctx.font='italic 1000 42px Impact, Arial Black, sans-serif';ctx.lineWidth=10;ctx.strokeStyle='#2a0d08';ctx.strokeText(sub,0,64);const subGrad=ctx.createLinearGradient(0,28,0,75);subGrad.addColorStop(0,'#fff09a');subGrad.addColorStop(1,'#f25717');ctx.fillStyle=subGrad;ctx.fillText(sub,0,64);ctx.restore()};
  g.draw=()=>{ctx.save();ctx.translate(450+g.cameraX,270+g.cameraY);ctx.scale(g.cameraZoom,g.cameraZoom);ctx.translate(-450,-270);if(g.shake>0)ctx.translate((Math.random()-.5)*(14+g.shake*34),(Math.random()-.5)*(10+g.shake*24));if(g.cinematic>0)ctx.filter='saturate(.55) contrast(1.28)';background();drawBurnPaths();drawBloodFx();drawWallDamage();if(g.cinematic>0){ctx.fillStyle=`rgba(0,0,12,${Math.min(.34,g.cinematic)})`;ctx.fillRect(0,0,900,540)}drawTrails();drawTeleports();drawBarrages();g.players.forEach(drawFighter);drawLightning();drawImpactRings();for(const p of g.particles){ctx.globalAlpha=1-p.t/p.life;ctx.fillStyle=p.color;const size=p.r*(1+p.t*2);if(size<6)ctx.fillRect(p.x-size,p.y-size,size*2,size*2);else{ctx.beginPath();ctx.arc(p.x,p.y,size,0,7);ctx.fill()}}ctx.globalAlpha=1;for(const t of g.texts){ctx.globalAlpha=1-t.t/1.05;ctx.fillStyle=t.color;ctx.strokeStyle='#0b1020';ctx.lineWidth=7;ctx.font='italic 1000 25px Impact,Arial Black,sans-serif';ctx.textAlign='center';ctx.strokeText(t.value,t.x,t.y);ctx.fillText(t.value,t.x,t.y)}ctx.globalAlpha=1;ctx.filter='none';ctx.restore();healthBar(P(1),24,false);healthBar(P(2),566,true);ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='900 34px sans-serif';ctx.fillText(Math.max(0,Math.ceil(g.time)),450,52);if(g.screenFlash>0){ctx.fillStyle=`rgba(${g.screenTint},${Math.min(.78,g.screenFlash*5)})`;ctx.fillRect(0,0,900,540)}if(g.wallFlash>0){ctx.strokeStyle=`rgba(255,110,45,${g.wallFlash*2})`;ctx.lineWidth=34;ctx.strokeRect(0,0,900,540)}if(g.intro>0){ctx.fillStyle='#0009';ctx.fillRect(0,0,900,540);ctx.fillStyle='#fff';ctx.font='900 48px sans-serif';ctx.textAlign='center';ctx.fillText(g.intro>.65?L(`第 ${g.round} 回合`,`ROUND ${g.round}`):L('开战！','FIGHT!'),450,260)}drawKo()};
  g.destroy=()=>{try{audio?.close()}catch{}if(g.onlineMode)endOnlineMatch()};setScore(0);setStatus(g.aiMode?L(`AI ${g.aiLevel==='easy'?'简单':g.aiLevel==='hard'?'困难':'普通'}模式`,`AI ${g.aiLevel.toUpperCase()} mode`):g.onlineMode?L(`在线玩家 ${g.onlinePlayer}`,`Online Player ${g.onlinePlayer}`):L('本地双人对决','Local PVP'));return g;
}
