const SnakeGameLogic=(()=>{
  const opposite=(a,b)=>a.x+b.x===0&&a.y+b.y===0;
  const nextHead=(head,direction)=>({x:head.x+direction.x,y:head.y+direction.y});
  const collides=(head,body,columns,rows,ignoreTail=false)=>head.x<0||head.y<0||head.x>=columns||head.y>=rows||body.slice(0,ignoreTail?-1:body.length).some(segment=>segment.x===head.x&&segment.y===head.y);
  return{opposite,nextHead,collides}
})();

function initSnake(){
  canvas.width=720;canvas.height=540;canvas.className='classic-square-game';
  const columns=24,rows=18,cell=30,directions={left:{x:-1,y:0},right:{x:1,y:0},up:{x:0,y:-1},down:{x:0,y:1}};
  controls([
    {label:'↑',ariaLabel:'向上',action:'up',slot:'up'},
    {label:'←',ariaLabel:'向左',action:'left',slot:'left'},
    {label:'→',ariaLabel:'向右',action:'right',slot:'right'},
    {label:'↓',ariaLabel:'向下',action:'down',slot:'down'}
  ],{layout:'dpad',label:L('贪吃蛇方向','Snake direction')});
  const g={score:0,body:[{x:8,y:9},{x:7,y:9},{x:6,y:9},{x:5,y:9}],previous:[],direction:directions.right,queue:[],food:null,stepClock:0,stepTime:.135,startDelay:.65,particles:[],flash:0,dead:false,pointer:null};
  const spawnFood=()=>{
    const free=[];for(let y=0;y<rows;y+=1)for(let x=0;x<columns;x+=1)if(!g.body.some(segment=>segment.x===x&&segment.y===y))free.push({x,y});
    g.food=free[Math.floor(Math.random()*free.length)]||null
  };
  const enqueue=name=>{
    const next=directions[name];if(!next||g.dead)return;
    const last=g.queue[g.queue.length-1]||g.direction;if(SnakeGameLogic.opposite(last,next)||last===next)return;
    if(g.queue.length<2)g.queue.push(next)
  };
  g.action=(name,on)=>{if(on)enqueue(name)};
  g.key=(key,on)=>{if(!on)return;const name={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'}[key];if(name)enqueue(name)};
  canvas.onpointerdown=event=>{const rect=canvas.getBoundingClientRect();g.pointer={x:event.clientX-rect.left,y:event.clientY-rect.top};canvas.setPointerCapture?.(event.pointerId)};
  canvas.onpointerup=event=>{if(!g.pointer)return;const rect=canvas.getBoundingClientRect(),dx=event.clientX-rect.left-g.pointer.x,dy=event.clientY-rect.top-g.pointer.y;g.pointer=null;if(Math.hypot(dx,dy)<12)return;enqueue(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up')};
  const die=()=>{g.dead=true;g.flash=1;arcadeSfx('lose');setStatus(L('撞到了','COLLISION'));setTimeout(()=>{if(game===g)finish(L('本轮结束','Run over'))},320)};
  const step=()=>{
    if(g.queue.length)g.direction=g.queue.shift();
    g.previous=g.body.map(segment=>({...segment}));
    const head=SnakeGameLogic.nextHead(g.body[0],g.direction),eating=g.food&&head.x===g.food.x&&head.y===g.food.y;
    if(SnakeGameLogic.collides(head,g.body,columns,rows,!eating))return die();
    g.body.unshift(head);if(!eating)g.body.pop();
    else{
      g.score+=100+Math.max(0,g.body.length-5)*4;g.flash=.28;arcadeSfx('eat',1+g.body.length*.015);
      for(let i=0;i<14;i+=1)g.particles.push({x:(head.x+.5)*cell,y:(head.y+.5)*cell,vx:(Math.random()-.5)*150,vy:(Math.random()-.5)*150,life:.45,color:i%3?'#6dffae':'#fff28a'});
      spawnFood();g.stepTime=Math.max(.072,.135-(g.body.length-4)*.0025)
    }
    setScore(g.score);setStatus(L(`长度 ${g.body.length} · ${Math.round(1/g.stepTime)} 格/秒`,`LENGTH ${g.body.length} · ${Math.round(1/g.stepTime)} CELLS/S`))
  };
  g.update=dt=>{
    g.flash=Math.max(0,g.flash-dt*2.8);for(const particle of g.particles){particle.life-=dt;particle.x+=particle.vx*dt;particle.y+=particle.vy*dt;particle.vx*=Math.pow(.03,dt);particle.vy*=Math.pow(.03,dt)}g.particles=g.particles.filter(particle=>particle.life>0);
    if(g.dead)return;if(g.startDelay>0){g.startDelay-=dt;return}g.stepClock+=dt;while(g.stepClock>=g.stepTime&&!g.dead){g.stepClock-=g.stepTime;step()}
  };
  const rounded=(x,y,size,r)=>{ctx.beginPath();ctx.roundRect(x,y,size,size,r)};
  g.draw=()=>{
    const background=ctx.createRadialGradient(360,270,20,360,270,500);background.addColorStop(0,'#10283a');background.addColorStop(.58,'#081522');background.addColorStop(1,'#03070c');ctx.fillStyle=background;ctx.fillRect(0,0,720,540);
    ctx.strokeStyle='#173047';ctx.lineWidth=1;ctx.globalAlpha=.45;for(let x=0;x<=720;x+=cell){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,540);ctx.stroke()}for(let y=0;y<=540;y+=cell){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(720,y);ctx.stroke()}ctx.globalAlpha=1;
    if(g.food){const pulse=1+Math.sin(performance.now()/150)*.12,cx=(g.food.x+.5)*cell,cy=(g.food.y+.5)*cell;ctx.save();ctx.translate(cx,cy);ctx.scale(pulse,pulse);ctx.shadowColor='#ff627d';ctx.shadowBlur=22;ctx.fillStyle='#ff5674';ctx.beginPath();ctx.arc(0,0,8.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff4a8';ctx.beginPath();ctx.arc(-2,-3,2.5,0,Math.PI*2);ctx.fill();ctx.restore()}
    const progress=g.startDelay>0?0:Math.min(1,g.stepClock/g.stepTime);
    for(let index=g.body.length-1;index>=0;index-=1){const current=g.body[index],previous=g.previous[index]||current,x=(previous.x+(current.x-previous.x)*progress)*cell+3,y=(previous.y+(current.y-previous.y)*progress)*cell+3,size=cell-6,head=index===0,fade=1-index/(g.body.length+5);ctx.shadowColor=head?'#a8ffcb':'#48e98e';ctx.shadowBlur=head?18:8;ctx.fillStyle=head?'#b9ffd6':`rgba(62,235,139,${.58+.4*fade})`;rounded(x,y,size,head?10:8);ctx.fill();ctx.shadowBlur=0;if(head){ctx.fillStyle='#092719';const dx=g.direction.x,dy=g.direction.y,sideX=-dy*5,sideY=dx*5;for(const side of [-1,1]){ctx.beginPath();ctx.arc(x+size/2+dx*6+sideX*side,y+size/2+dy*6+sideY*side,2.2,0,Math.PI*2);ctx.fill()}}}
    for(const particle of g.particles){ctx.globalAlpha=Math.max(0,particle.life/.45);ctx.fillStyle=particle.color;ctx.fillRect(particle.x-2,particle.y-2,4,4)}ctx.globalAlpha=1;
    if(g.startDelay>0){ctx.fillStyle='#02060a99';ctx.fillRect(0,0,720,540);ctx.fillStyle='#eafff2';ctx.textAlign='center';ctx.font='900 34px sans-serif';ctx.fillText(L('准备转向','GET READY'),360,252);ctx.fillStyle='#8db5a1';ctx.font='700 16px sans-serif';ctx.fillText(L('滑动或使用方向键','Swipe or use the arrow keys'),360,285)}
    if(g.flash){ctx.fillStyle=`rgba(120,255,178,${g.flash*.08})`;ctx.fillRect(0,0,720,540)}
  };
  spawnFood();setStatus(L('准备开始','GET READY'));return g
}
