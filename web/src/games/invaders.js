const InvaderGameLogic=(()=>{
  const overlaps=(a,b)=>a.x-a.w/2<b.x+b.w/2&&a.x+a.w/2>b.x-b.w/2&&a.y-a.h/2<b.y+b.h/2&&a.y+a.h/2>b.y-b.h/2;
  const frontline=enemies=>{const byColumn=new Map();for(const enemy of enemies){const current=byColumn.get(enemy.column);if(!current||enemy.y>current.y)byColumn.set(enemy.column,enemy)}return[...byColumn.values()]};
  return{overlaps,frontline}
})();

function initInvaders(){
  canvas.width=760;canvas.height=540;canvas.className='classic-wide-game';
  controls([
    {label:'◀',ariaLabel:'飞船向左',action:'left'},
    {label:'发射',ariaLabel:'发射能量弹',action:'fire'},
    {label:'▶',ariaLabel:'飞船向右',action:'right'}
  ],{layout:'row',label:L('太空防线操作','Space defense controls')});
  const g={score:0,wave:1,lives:3,player:{x:380,target:380,y:493,w:42,h:24,vx:0,invulnerable:0},enemies:[],bullets:[],enemyBullets:[],shields:[],particles:[],stars:[],keys:{left:false,right:false,fire:false},enemyDirection:1,enemyStep:0,enemyShot:0,fireCooldown:0,combo:0,shake:0,flash:0,transition:0,pointer:false};
  for(let i=0;i<70;i+=1)g.stars.push({x:Math.random()*760,y:Math.random()*540,speed:18+Math.random()*48,size:.5+Math.random()*1.8,alpha:.25+Math.random()*.65});
  const makeShields=()=>{g.shields=[];for(const x of [155,305,455,605])for(let row=0;row<3;row+=1)for(let column=0;column<7;column+=1)if(!(row===2&&column>=2&&column<=4))g.shields.push({x:x+(column-3)*10,y:422+row*9,w:9,h:8,hp:3})};
  const buildWave=()=>{
    g.enemies=[];const rows=Math.min(5,3+Math.floor((g.wave-1)/2)),columns=9,startX=116,startY=78;
    for(let row=0;row<rows;row+=1)for(let column=0;column<columns;column+=1)g.enemies.push({x:startX+column*66,y:startY+row*43,w:32,h:22,row,column,phase:Math.random()*Math.PI*2,hit:0});
    g.enemyDirection=1;g.enemyStep=0;g.enemyShot=.8;g.combo=0;makeShields();setStatus(L(`第 ${g.wave} 波 · 舰体 ${g.lives}`,`WAVE ${g.wave} · HULL ${g.lives}`))
  };
  const pointerX=event=>{const rect=canvas.getBoundingClientRect();return Math.max(28,Math.min(732,(event.clientX-rect.left)*760/rect.width))};
  canvas.onpointerdown=event=>{event.preventDefault();g.pointer=true;g.player.target=pointerX(event);g.keys.fire=true;canvas.setPointerCapture?.(event.pointerId)};
  canvas.onpointermove=event=>{if(event.pointerType==='mouse'||g.pointer)g.player.target=pointerX(event)};
  canvas.onpointerup=canvas.onpointercancel=()=>{g.pointer=false;g.keys.fire=false};
  g.action=(action,on)=>{if(action==='left'||action==='right'||action==='fire')g.keys[action]=on};
  g.key=(key,on)=>{if(key==='ArrowLeft'||key==='a'||key==='A')g.keys.left=on;if(key==='ArrowRight'||key==='d'||key==='D')g.keys.right=on;if(key===' '||key==='ArrowUp'||key==='w'||key==='W')g.keys.fire=on};
  const burst=(x,y,color,count=14,speed=180)=>{for(let i=0;i<count;i+=1){const angle=Math.random()*Math.PI*2,power=speed*(.35+Math.random()*.65);g.particles.push({x,y,vx:Math.cos(angle)*power,vy:Math.sin(angle)*power,life:.35+Math.random()*.45,color,size:1.5+Math.random()*3.5})}};
  const shoot=()=>{if(g.fireCooldown>0||g.transition>0)return;g.fireCooldown=.16;g.bullets.push({x:g.player.x,y:g.player.y-20,w:4,h:15,vy:-620});arcadeSfx('shoot',1.2)};
  const enemyShoot=()=>{const shooters=InvaderGameLogic.frontline(g.enemies);if(!shooters.length)return;const enemy=shooters[Math.floor(Math.random()*shooters.length)];g.enemyBullets.push({x:enemy.x,y:enemy.y+16,w:5,h:14,vy:210+g.wave*18});arcadeSfx('shoot',.55)};
  const hitPlayer=()=>{if(g.player.invulnerable>0)return;g.lives-=1;g.player.invulnerable=1.65;g.combo=0;g.shake=11;g.flash=.8;burst(g.player.x,g.player.y,'#70dcff',28,260);arcadeSfx('lose');if(g.lives<=0)setTimeout(()=>{if(game===g)finish(L('防线失守','Defense breached'))},420)};
  const nextWave=()=>{g.transition=1.15;g.score+=500*g.wave;g.wave+=1;g.bullets=[];g.enemyBullets=[];arcadeSfx('win');setStatus(L('区域清空','SECTOR CLEAR'))};
  const removeBullet=(list,bullet)=>{const index=list.indexOf(bullet);if(index>=0)list.splice(index,1)};
  g.update=dt=>{
    for(const star of g.stars){star.y+=star.speed*dt;if(star.y>545){star.y=-5;star.x=Math.random()*760}}
    if(g.lives<=0)return;if(g.transition>0){g.transition-=dt;if(g.transition<=0)buildWave();return}
    g.player.invulnerable=Math.max(0,g.player.invulnerable-dt);g.fireCooldown=Math.max(0,g.fireCooldown-dt);const axis=(g.keys.right?1:0)-(g.keys.left?1:0);if(axis)g.player.target+=axis*500*dt;g.player.target=Math.max(28,Math.min(732,g.player.target));const desired=(g.player.target-g.player.x)*14;g.player.vx+=(desired-g.player.vx)*(1-Math.exp(-18*dt));g.player.x+=g.player.vx*dt;if(g.keys.fire)shoot();
    const aliveRatio=g.enemies.length/45,speed=28+g.wave*8+(1-aliveRatio)*78;let minX=Infinity,maxX=-Infinity;for(const enemy of g.enemies){enemy.x+=g.enemyDirection*speed*dt;minX=Math.min(minX,enemy.x-enemy.w/2);maxX=Math.max(maxX,enemy.x+enemy.w/2);enemy.hit=Math.max(0,enemy.hit-dt)}if((g.enemyDirection>0&&maxX>730)||(g.enemyDirection<0&&minX<30)){g.enemyDirection*=-1;for(const enemy of g.enemies)enemy.y+=14;g.shake=2}
    g.enemyShot-=dt;if(g.enemyShot<=0){enemyShoot();g.enemyShot=Math.max(.3,1.05-g.wave*.06)*(.72+Math.random()*.72)}
    for(const bullet of [...g.bullets]){bullet.y+=bullet.vy*dt;if(bullet.y<-20){removeBullet(g.bullets,bullet);continue}let consumed=false;for(const enemy of [...g.enemies])if(InvaderGameLogic.overlaps(bullet,enemy)){removeBullet(g.bullets,bullet);g.enemies.splice(g.enemies.indexOf(enemy),1);g.combo+=1;g.score+=50+Math.min(20,g.combo)*6;g.shake=Math.min(5,1+g.combo*.14);burst(enemy.x,enemy.y,['#64e7ff','#ffd362','#ff6d8c'][enemy.row%3],16,170);arcadeSfx('hit',.8+enemy.row*.1);consumed=true;break}if(consumed)continue;for(const shield of [...g.shields])if(shield.hp>0&&InvaderGameLogic.overlaps(bullet,shield)){shield.hp-=1;removeBullet(g.bullets,bullet);burst(shield.x,shield.y,'#67efb0',5,90);break}}
    for(const bullet of [...g.enemyBullets]){bullet.y+=bullet.vy*dt;if(bullet.y>560){removeBullet(g.enemyBullets,bullet);continue}let consumed=false;for(const shield of [...g.shields])if(shield.hp>0&&InvaderGameLogic.overlaps(bullet,shield)){shield.hp-=1;removeBullet(g.enemyBullets,bullet);burst(shield.x,shield.y,'#67efb0',5,90);consumed=true;break}if(!consumed&&InvaderGameLogic.overlaps(bullet,g.player)){removeBullet(g.enemyBullets,bullet);hitPlayer()}}
    if(g.enemies.some(enemy=>enemy.y+enemy.h/2>=g.player.y-30))hitPlayer();if(!g.enemies.length)nextWave();
    for(const particle of g.particles){particle.life-=dt;particle.x+=particle.vx*dt;particle.y+=particle.vy*dt;particle.vx*=Math.pow(.05,dt);particle.vy*=Math.pow(.05,dt)}g.particles=g.particles.filter(particle=>particle.life>0);g.shake*=Math.pow(.012,dt);g.flash=Math.max(0,g.flash-dt*2);setScore(g.score);setStatus(L(`第 ${g.wave} 波 · 舰体 ${g.lives} · 连击 ${g.combo}`,`WAVE ${g.wave} · HULL ${g.lives} · COMBO ${g.combo}`))
  };
  const drawEnemy=enemy=>{const color=['#63e6ff','#ffd45d','#ff6b96'][enemy.row%3],blink=Math.sin(performance.now()/170+enemy.phase)>.2;ctx.save();ctx.translate(enemy.x,enemy.y);ctx.shadowColor=color;ctx.shadowBlur=enemy.hit?25:10;ctx.fillStyle=enemy.hit?'#fff':color;ctx.fillRect(-13,-8,26,5);ctx.fillRect(-17,-3,34,10);ctx.fillRect(-11,7,7,6);ctx.fillRect(4,7,7,6);ctx.fillStyle='#08101c';ctx.fillRect(-7,-1,4,4);ctx.fillRect(3,-1,4,4);if(blink){ctx.fillStyle=color;ctx.fillRect(-21,0,4,7);ctx.fillRect(17,0,4,7)}ctx.restore()};
  g.draw=()=>{
    ctx.save();ctx.translate((Math.random()-.5)*g.shake,(Math.random()-.5)*g.shake);const bg=ctx.createLinearGradient(0,0,0,540);bg.addColorStop(0,'#080c21');bg.addColorStop(.62,'#071527');bg.addColorStop(1,'#02060c');ctx.fillStyle=bg;ctx.fillRect(-10,-10,780,560);for(const star of g.stars){ctx.globalAlpha=star.alpha;ctx.fillStyle='#d9eeff';ctx.fillRect(star.x,star.y,star.size,star.size*2.2)}ctx.globalAlpha=1;ctx.strokeStyle='#1e6380';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(20,518);ctx.lineTo(740,518);ctx.stroke();
    for(const shield of g.shields){if(shield.hp<=0)continue;ctx.globalAlpha=.25+shield.hp*.22;ctx.fillStyle=shield.hp===1?'#f0c65c':'#63eda9';ctx.fillRect(shield.x-shield.w/2,shield.y-shield.h/2,shield.w,shield.h)}ctx.globalAlpha=1;
    for(const enemy of g.enemies)drawEnemy(enemy);for(const bullet of g.bullets){ctx.shadowColor='#85f8ff';ctx.shadowBlur=12;ctx.fillStyle='#ecffff';ctx.fillRect(bullet.x-2,bullet.y-8,4,16);ctx.shadowBlur=0}for(const bullet of g.enemyBullets){ctx.shadowColor='#ff6381';ctx.shadowBlur=10;ctx.fillStyle='#ff7892';ctx.fillRect(bullet.x-2.5,bullet.y-7,5,14);ctx.shadowBlur=0}
    if(g.player.invulnerable<=0||Math.floor(g.player.invulnerable*12)%2===0){ctx.save();ctx.translate(g.player.x,g.player.y);ctx.shadowColor='#57d8ff';ctx.shadowBlur=18;const flame=7+Math.random()*9;ctx.fillStyle='#ffcc68';ctx.beginPath();ctx.moveTo(-7,12);ctx.lineTo(0,12+flame);ctx.lineTo(7,12);ctx.fill();ctx.fillStyle='#7ce8ff';ctx.beginPath();ctx.moveTo(0,-17);ctx.lineTo(-22,12);ctx.lineTo(-8,9);ctx.lineTo(0,14);ctx.lineTo(8,9);ctx.lineTo(22,12);ctx.closePath();ctx.fill();ctx.fillStyle='#eaffff';ctx.fillRect(-4,-6,8,10);ctx.restore()}
    for(const particle of g.particles){ctx.globalAlpha=Math.max(0,particle.life/.8);ctx.fillStyle=particle.color;ctx.fillRect(particle.x-particle.size/2,particle.y-particle.size/2,particle.size,particle.size)}ctx.globalAlpha=1;
    if(g.transition>0){ctx.fillStyle='#030713aa';ctx.fillRect(0,0,760,540);ctx.fillStyle='#e9fbff';ctx.textAlign='center';ctx.font='900 38px sans-serif';ctx.fillText(L('区域清空','SECTOR CLEAR'),380,258);ctx.fillStyle='#7de9ff';ctx.font='800 15px sans-serif';ctx.fillText(L(`准备第 ${g.wave} 波`,`PREPARING WAVE ${g.wave}`),380,290)}ctx.restore();if(g.flash){ctx.fillStyle=`rgba(120,220,255,${g.flash*.12})`;ctx.fillRect(0,0,760,540)}
  };
  buildWave();return g
}
