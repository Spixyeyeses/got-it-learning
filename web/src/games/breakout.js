const BreakoutGameLogic=(()=>{
  const paddleBounce=(ballX,paddleX,paddleWidth,speed)=>{const ratio=Math.max(-1,Math.min(1,(ballX-paddleX)/(paddleWidth/2))),angle=ratio*1.08;return{vx:Math.sin(angle)*speed,vy:-Math.max(150,Math.cos(angle)*speed)}};
  const circleRect=(ball,rect)=>ball.x+ball.r>rect.x&&ball.x-ball.r<rect.x+rect.w&&ball.y+ball.r>rect.y&&ball.y-ball.r<rect.y+rect.h;
  return{paddleBounce,circleRect}
})();

function initBreakout(){
  canvas.width=760;canvas.height=520;canvas.className='classic-wide-game';
  controls([
    {label:'◀',ariaLabel:'挡板向左',action:'left'},
    {label:'发射',ariaLabel:'发射小球',action:'launch'},
    {label:'▶',ariaLabel:'挡板向右',action:'right'}
  ],{layout:'row',label:L('打砖块操作','Breakout controls')});
  const g={score:0,lives:3,level:1,paddle:{x:380,target:380,w:124,h:15,y:482,vx:0},balls:[],bricks:[],particles:[],keys:{left:false,right:false},combo:0,shake:0,flash:0,pointerActive:false,completed:false};
  const colors=['#ff5f78','#ff9a55','#ffd45c','#68efb0','#57c9ff','#a981ff','#ff79ce'];
  const build=()=>{
    g.bricks=[];const columns=10,rows=Math.min(7,4+g.level),gap=7,w=64,h=22,startX=(760-(columns*w+(columns-1)*gap))/2,startY=58;
    for(let row=0;row<rows;row+=1)for(let column=0;column<columns;column+=1){const stagger=row%2?4:0;g.bricks.push({x:startX+column*(w+gap)+stagger,y:startY+row*(h+gap),w:w-(stagger?1:0),h,hp:1,color:colors[row%colors.length],hit:0})}
  };
  const resetBall=()=>{g.balls=[{x:g.paddle.x,y:g.paddle.y-13,vx:0,vy:0,r:8,stuck:true,trail:[]}];g.combo=0;setStatus(L(`第 ${g.level} 关 · 点击发射`,`LEVEL ${g.level} · LAUNCH`))};
  const launch=()=>{for(const ball of g.balls)if(ball.stuck){ball.stuck=false;const speed=350+g.level*18,side=Math.random()<.5?-1:1;ball.vx=side*(105+Math.random()*55);ball.vy=-Math.sqrt(speed*speed-ball.vx*ball.vx);arcadeSfx('tap',1.2);setStatus(L(`第 ${g.level} 关 · 连击 ${g.combo}`,`LEVEL ${g.level} · COMBO ${g.combo}`))}};
  g.action=(action,on)=>{if(action==='left'||action==='right')g.keys[action]=on;else if(action==='launch'&&on)launch()};
  g.key=(key,on)=>{if(key==='ArrowLeft'||key==='a'||key==='A')g.keys.left=on;if(key==='ArrowRight'||key==='d'||key==='D')g.keys.right=on;if(on&&(key===' '||key==='Enter'||key==='ArrowUp'))launch()};
  const pointerX=event=>{const rect=canvas.getBoundingClientRect();return Math.max(g.paddle.w/2+8,Math.min(760-g.paddle.w/2-8,(event.clientX-rect.left)*760/rect.width))};
  canvas.onpointerdown=event=>{event.preventDefault();g.pointerActive=true;g.paddle.target=pointerX(event);canvas.setPointerCapture?.(event.pointerId);launch()};
  canvas.onpointermove=event=>{if(event.pointerType==='mouse'||g.pointerActive)g.paddle.target=pointerX(event)};
  canvas.onpointerup=canvas.onpointercancel=()=>{g.pointerActive=false};
  const burst=(x,y,color,count=10)=>{for(let i=0;i<count;i+=1)g.particles.push({x,y,vx:(Math.random()-.5)*230,vy:(Math.random()-.65)*180,life:.5+Math.random()*.25,color,size:2+Math.random()*4})};
  const loseBall=ball=>{
    const index=g.balls.indexOf(ball);if(index>=0)g.balls.splice(index,1);if(g.balls.length)return;
    g.lives-=1;g.shake=8;g.combo=0;arcadeSfx('lose');if(g.lives<=0){setTimeout(()=>{if(game===g)finish(L('砖墙未清空','Wall remains'))},260);return}resetBall()
  };
  const advance=()=>{g.level+=1;g.score+=800;g.flash=.7;arcadeSfx('win');if(g.level>3){g.completed=true;g.balls=[];setStatus(L('全部清除','ALL CLEAR'));setTimeout(()=>{if(game===g)finish(L('砖墙全部清除','All walls cleared'))},500);return}build();resetBall()};
  const moveBall=(ball,dt)=>{
    if(ball.stuck){ball.x=g.paddle.x;ball.y=g.paddle.y-13;return}
    const previous={x:ball.x,y:ball.y};ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
    if(ball.x-ball.r<8){ball.x=8+ball.r;ball.vx=Math.abs(ball.vx);arcadeSfx('tap',.75)}else if(ball.x+ball.r>752){ball.x=752-ball.r;ball.vx=-Math.abs(ball.vx);arcadeSfx('tap',.75)}
    if(ball.y-ball.r<8){ball.y=8+ball.r;ball.vy=Math.abs(ball.vy);arcadeSfx('tap',.8)}
    if(ball.y-ball.r>520){loseBall(ball);return}
    const paddleRect={x:g.paddle.x-g.paddle.w/2,y:g.paddle.y,w:g.paddle.w,h:g.paddle.h};
    if(ball.vy>0&&BreakoutGameLogic.circleRect(ball,paddleRect)&&previous.y+ball.r<=paddleRect.y+6){const speed=Math.min(610,Math.hypot(ball.vx,ball.vy)+5),bounce=BreakoutGameLogic.paddleBounce(ball.x,g.paddle.x,g.paddle.w,speed);ball.vx=bounce.vx+g.paddle.vx*.16;ball.vy=bounce.vy;ball.y=paddleRect.y-ball.r;g.combo=0;arcadeSfx('tap',1.05)}
    for(const brick of g.bricks){if(brick.hp<=0||!BreakoutGameLogic.circleRect(ball,brick))continue;brick.hp=0;brick.hit=.2;g.combo+=1;g.score+=40+Math.min(12,g.combo)*8;g.shake=Math.min(5,1+g.combo*.18);arcadeSfx('break',.8+Math.random()*.35);burst(brick.x+brick.w/2,brick.y+brick.h/2,brick.color,9);
      const fromLeft=Math.abs((previous.x+ball.r)-brick.x),fromRight=Math.abs((previous.x-ball.r)-(brick.x+brick.w)),fromTop=Math.abs((previous.y+ball.r)-brick.y),fromBottom=Math.abs((previous.y-ball.r)-(brick.y+brick.h)),minimum=Math.min(fromLeft,fromRight,fromTop,fromBottom);if(minimum===fromLeft||minimum===fromRight)ball.vx*=-1;else ball.vy*=-1;break}
    ball.trail.unshift({x:ball.x,y:ball.y});if(ball.trail.length>10)ball.trail.pop()
  };
  g.update=dt=>{
    const keyboard=(g.keys.right?1:0)-(g.keys.left?1:0);if(keyboard)g.paddle.target+=keyboard*520*dt;
    g.paddle.target=Math.max(g.paddle.w/2+8,Math.min(760-g.paddle.w/2-8,g.paddle.target));const desired=(g.paddle.target-g.paddle.x)*16;g.paddle.vx+=(desired-g.paddle.vx)*(1-Math.exp(-18*dt));g.paddle.x+=g.paddle.vx*dt;
    const steps=Math.max(1,Math.ceil(dt/(1/240))),slice=dt/steps;for(let step=0;step<steps;step+=1)for(const ball of [...g.balls])moveBall(ball,slice);
    for(const particle of g.particles){particle.life-=dt;particle.x+=particle.vx*dt;particle.y+=particle.vy*dt;particle.vy+=260*dt;particle.vx*=Math.pow(.08,dt)}g.particles=g.particles.filter(particle=>particle.life>0);g.shake*=Math.pow(.015,dt);g.flash=Math.max(0,g.flash-dt*2);
    setScore(g.score);if(!g.completed&&g.bricks.length&&g.bricks.every(brick=>brick.hp<=0))advance();else if(g.balls.length)setStatus(L(`第 ${g.level} 关 · 生命 ${g.lives} · 连击 ${g.combo}`,`LEVEL ${g.level} · LIVES ${g.lives} · COMBO ${g.combo}`))
  };
  g.draw=()=>{
    ctx.save();ctx.translate((Math.random()-.5)*g.shake,(Math.random()-.5)*g.shake);const bg=ctx.createLinearGradient(0,0,0,520);bg.addColorStop(0,'#15162d');bg.addColorStop(.55,'#081326');bg.addColorStop(1,'#03070d');ctx.fillStyle=bg;ctx.fillRect(-10,-10,780,540);
    ctx.globalAlpha=.17;ctx.fillStyle='#6f87ff';for(let i=0;i<40;i+=1){const x=(i*191)%760,y=(i*79)%520;ctx.fillRect(x,y,1.5,1.5)}ctx.globalAlpha=1;
    for(const brick of g.bricks){if(brick.hp<=0)continue;const glowAmount=8+Math.sin((brick.x+performance.now()*.03)*.02)*3;ctx.shadowColor=brick.color;ctx.shadowBlur=glowAmount;const gradient=ctx.createLinearGradient(brick.x,brick.y,brick.x,brick.y+brick.h);gradient.addColorStop(0,'#ffffff66');gradient.addColorStop(.18,brick.color);gradient.addColorStop(1,'#111827');ctx.fillStyle=gradient;ctx.beginPath();ctx.roundRect(brick.x,brick.y,brick.w,brick.h,6);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#ffffff30';ctx.stroke()}
    for(const ball of g.balls){for(let index=ball.trail.length-1;index>=0;index-=1){const point=ball.trail[index];ctx.globalAlpha=(1-index/ball.trail.length)*.23;ctx.fillStyle='#dffbff';ctx.beginPath();ctx.arc(point.x,point.y,ball.r*(1-index/ball.trail.length),0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;ctx.shadowColor='#9eefff';ctx.shadowBlur=18;ctx.fillStyle='#f5ffff';ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}
    const paddleGradient=ctx.createLinearGradient(g.paddle.x-g.paddle.w/2,g.paddle.y,g.paddle.x+g.paddle.w/2,g.paddle.y);paddleGradient.addColorStop(0,'#577bff');paddleGradient.addColorStop(.5,'#eef9ff');paddleGradient.addColorStop(1,'#a65fff');ctx.shadowColor='#6e9aff';ctx.shadowBlur=16;ctx.fillStyle=paddleGradient;ctx.beginPath();ctx.roundRect(g.paddle.x-g.paddle.w/2,g.paddle.y,g.paddle.w,g.paddle.h,8);ctx.fill();ctx.shadowBlur=0;
    for(const particle of g.particles){ctx.globalAlpha=Math.max(0,particle.life/.75);ctx.fillStyle=particle.color;ctx.fillRect(particle.x,particle.y,particle.size,particle.size)}ctx.globalAlpha=1;ctx.restore();if(g.flash){ctx.fillStyle=`rgba(150,220,255,${g.flash*.1})`;ctx.fillRect(0,0,760,520)}
  };
  build();resetBall();return g
}
