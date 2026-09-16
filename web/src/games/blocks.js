const FallingBlocksLogic=(()=>{
  const base={
    I:[[0,1],[1,1],[2,1],[3,1]],O:[[0,0],[1,0],[0,1],[1,1]],T:[[0,0],[1,0],[2,0],[1,1]],
    S:[[1,0],[2,0],[0,1],[1,1]],Z:[[0,0],[1,0],[1,1],[2,1]],J:[[0,0],[0,1],[1,1],[2,1]],L:[[2,0],[0,1],[1,1],[2,1]]
  };
  const normalize=cells=>{const minX=Math.min(...cells.map(cell=>cell[0])),minY=Math.min(...cells.map(cell=>cell[1]));return cells.map(([x,y])=>[x-minX,y-minY]).sort((a,b)=>a[1]-b[1]||a[0]-b[0])};
  const rotate=(cells,clockwise=true,type='')=>{if(type==='O')return cells.map(cell=>[...cell]);const maxX=Math.max(...cells.map(cell=>cell[0])),maxY=Math.max(...cells.map(cell=>cell[1]));return normalize(cells.map(([x,y])=>clockwise?[maxY-y,x]:[y,maxX-x]))};
  const collides=(board,piece,offsetX=0,offsetY=0,cells=piece.cells)=>cells.some(([x,y])=>{const bx=piece.x+x+offsetX,by=piece.y+y+offsetY;return bx<0||bx>=10||by>=20||(by>=0&&board[by][bx])});
  const clearLines=board=>{const remaining=board.filter(row=>row.some(cell=>!cell)),cleared=20-remaining.length;while(remaining.length<20)remaining.unshift(Array(10).fill(''));return{board:remaining,cleared}};
  return{base,normalize,rotate,collides,clearLines}
})();

function initBlocks(){
  const compact=matchMedia('(max-width: 650px)').matches;
  canvas.width=compact?600:760;canvas.height=compact?640:540;canvas.className='classic-wide-game';
  controls([
    {label:'←',ariaLabel:'向左移动',action:'left'},
    {label:'↻',ariaLabel:'旋转方块',action:'rotate'},
    {label:'→',ariaLabel:'向右移动',action:'right'},
    {label:'↓',ariaLabel:'加速下落',action:'down'},
    {label:'⇊',ariaLabel:'直接落下',action:'drop'},
    {label:'存',ariaLabel:'暂存方块',action:'hold'}
  ],{layout:'blocks',label:L('落块操作','Falling-block controls')});
  const colors={I:'#55dcff',O:'#ffd95d',T:'#aa75ff',S:'#59ef91',Z:'#ff6177',J:'#5d83ff',L:'#ff9b52'},boardX=compact?160:250,boardY=compact?40:20,cell=compact?28:25,boardWidth=cell*10,boardHeight=cell*20;
  const g={score:0,board:Array.from({length:20},()=>Array(10).fill('')),current:null,next:[],bag:[],hold:'',canHold:true,fallClock:0,lockClock:0,lockResets:0,level:1,lines:0,combo:-1,particles:[],flash:0,shake:0,keys:{left:false,right:false,down:false},repeat:{left:0,right:0},gameOver:false};
  const refillBag=()=>{const bag=Object.keys(FallingBlocksLogic.base);for(let index=bag.length-1;index>0;index-=1){const swap=Math.floor(Math.random()*(index+1));[bag[index],bag[swap]]=[bag[swap],bag[index]]}g.bag.push(...bag)};
  const take=()=>{if(!g.bag.length)refillBag();return g.bag.shift()};
  const pieceFor=type=>{const cells=FallingBlocksLogic.base[type].map(cell=>[...cell]),width=Math.max(...cells.map(c=>c[0]))+1;return{type,cells,x:Math.floor((10-width)/2),y:0,rotation:0}};
  const ensureNext=()=>{while(g.next.length<5)g.next.push(take())};
  const spawn=()=>{ensureNext();g.current=pieceFor(g.next.shift());ensureNext();g.canHold=true;g.fallClock=0;g.lockClock=0;g.lockResets=0;if(FallingBlocksLogic.collides(g.board,g.current)){g.gameOver=true;arcadeSfx('lose');setTimeout(()=>{if(game===g)finish(L('方块堆满了','Stack topped out'))},300)}};
  const grounded=()=>g.current&&FallingBlocksLogic.collides(g.board,g.current,0,1);
  const move=(dx,dy)=>{if(!g.current||g.gameOver||FallingBlocksLogic.collides(g.board,g.current,dx,dy))return false;g.current.x+=dx;g.current.y+=dy;if(dx&&grounded()&&g.lockResets<12){g.lockClock=0;g.lockResets+=1}return true};
  const rotatePiece=(clockwise=true)=>{if(!g.current||g.gameOver)return false;const rotated=FallingBlocksLogic.rotate(g.current.cells,clockwise,g.current.type),kicks=[[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1]];for(const [dx,dy] of kicks)if(!FallingBlocksLogic.collides(g.board,g.current,dx,dy,rotated)){g.current.cells=rotated;g.current.x+=dx;g.current.y+=dy;g.current.rotation=(g.current.rotation+(clockwise?1:3))%4;if(grounded()&&g.lockResets<12){g.lockClock=0;g.lockResets+=1}arcadeSfx('tap',1.18);return true}return false};
  const ghostY=()=>{let distance=0;while(!FallingBlocksLogic.collides(g.board,g.current,0,distance+1))distance+=1;return g.current.y+distance};
  const burstLine=(row,color)=>{for(let x=0;x<10;x+=1)for(let i=0;i<3;i+=1)g.particles.push({x:boardX+(x+.5)*cell,y:boardY+(row+.5)*cell,vx:(Math.random()-.5)*220,vy:(Math.random()-.5)*130,life:.45,color})};
  const lock=()=>{
    if(!g.current)return;for(const [x,y] of g.current.cells){const bx=g.current.x+x,by=g.current.y+y;if(by>=0&&by<20)g.board[by][bx]=g.current.type}
    const fullRows=[];g.board.forEach((row,index)=>{if(row.every(Boolean))fullRows.push(index)});const result=FallingBlocksLogic.clearLines(g.board);g.board=result.board;
    if(result.cleared){g.lines+=result.cleared;g.combo+=1;const base=[0,100,300,500,800][result.cleared]||1200;g.score+=(base*g.level)+(g.combo>0?g.combo*50*g.level:0);g.flash=.75;g.shake=4+result.cleared*2;fullRows.forEach(row=>burstLine(row,'#ddf8ff'));arcadeSfx('line',.9+result.cleared*.12)}else{g.combo=-1;arcadeSfx('tap',.7)}g.level=1+Math.floor(g.lines/10);spawn();setScore(g.score)
  };
  const hardDrop=()=>{if(!g.current||g.gameOver)return;let distance=0;while(move(0,1))distance+=1;g.score+=distance*2;g.shake=3;arcadeSfx('hit',.65);lock()};
  const hold=()=>{if(!g.current||!g.canHold||g.gameOver)return;const type=g.current.type;if(g.hold){g.current=pieceFor(g.hold);g.hold=type}else{g.hold=type;spawn()}g.canHold=false;g.lockClock=0;arcadeSfx('tap',.85)};
  const press=action=>{if(action==='left')move(-1,0);else if(action==='right')move(1,0);else if(action==='down'){if(move(0,1))g.score+=1}else if(action==='rotate')rotatePiece(true);else if(action==='drop')hardDrop();else if(action==='hold')hold();setScore(g.score)};
  g.action=(action,on)=>{if(['left','right','down'].includes(action)){g.keys[action]=on;if(on)press(action)}else if(on)press(action)};
  g.key=(key,on)=>{const action={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowDown:'down',s:'down',S:'down'}[key];if(action){g.keys[action]=on;if(on)press(action);return}if(!on)return;if(key==='ArrowUp'||key==='x'||key==='X')rotatePiece(true);else if(key==='z'||key==='Z')rotatePiece(false);else if(key===' ')hardDrop();else if(key==='c'||key==='C'||key==='Shift')hold()};
  const updateRepeats=dt=>{for(const direction of ['left','right']){if(!g.keys[direction]){g.repeat[direction]=0;continue}g.repeat[direction]+=dt;if(g.repeat[direction]>.16){const repeatEvery=.055;while(g.repeat[direction]>.16+repeatEvery){g.repeat[direction]-=repeatEvery;move(direction==='left'?-1:1,0)}}}};
  g.update=dt=>{
    if(g.gameOver)return;updateRepeats(dt);const interval=Math.max(.065,.72*Math.pow(.82,g.level-1)),soft=g.keys.down?.055:interval;g.fallClock+=dt;while(g.fallClock>=soft&&g.current){g.fallClock-=soft;if(move(0,1)){if(g.keys.down){g.score+=1;setScore(g.score)}}else break}
    if(grounded()){g.lockClock+=dt;if(g.lockClock>=.48)lock()}else g.lockClock=0;
    for(const particle of g.particles){particle.life-=dt;particle.x+=particle.vx*dt;particle.y+=particle.vy*dt;particle.vy+=250*dt}g.particles=g.particles.filter(particle=>particle.life>0);g.flash=Math.max(0,g.flash-dt*2.5);g.shake*=Math.pow(.01,dt);setStatus(L(`等级 ${g.level} · 消除 ${g.lines} · ${g.combo>0?'连消 '+(g.combo+1):'保持整洁'}`,`LEVEL ${g.level} · LINES ${g.lines} · ${g.combo>0?'COMBO '+(g.combo+1):'KEEP IT CLEAN'}`))
  };
  const drawPiece=(piece,originX,originY,size,alpha=1,outline=false)=>{if(!piece)return;ctx.globalAlpha=alpha;for(const [x,y] of piece.cells){const px=originX+(piece.x+x)*size,py=originY+(piece.y+y)*size;if(py<originY)continue;ctx.fillStyle=outline?'transparent':colors[piece.type];ctx.strokeStyle=outline?colors[piece.type]:'#ffffff35';ctx.lineWidth=outline?2:1;ctx.beginPath();ctx.roundRect(px+2,py+2,size-4,size-4,5);outline?ctx.stroke():ctx.fill();if(!outline){const shine=ctx.createLinearGradient(px,py,px,py+size);shine.addColorStop(0,'#ffffff66');shine.addColorStop(.35,'transparent');ctx.fillStyle=shine;ctx.fill();ctx.stroke()}}ctx.globalAlpha=1};
  const previewWidth=compact?132:150;
  const preview=(type,x,y,label)=>{ctx.fillStyle='#101827';ctx.beginPath();ctx.roundRect(x,y,previewWidth,94,14);ctx.fill();ctx.strokeStyle='#253954';ctx.stroke();ctx.fillStyle='#8fa4ba';ctx.font='800 12px sans-serif';ctx.textAlign='left';ctx.fillText(label,x+12,y+19);if(type){const piece=pieceFor(type),width=Math.max(...piece.cells.map(c=>c[0]))+1,height=Math.max(...piece.cells.map(c=>c[1]))+1;piece.x=0;piece.y=0;drawPiece(piece,x+previewWidth/2-width*15,y+35+(48-height*30)/2,30)}};
  g.draw=()=>{
    const centerX=canvas.width/2,centerY=canvas.height/2,leftCenter=compact?78:130,rightCenter=compact?522:630;
    ctx.save();ctx.translate((Math.random()-.5)*g.shake,(Math.random()-.5)*g.shake);const bg=ctx.createRadialGradient(centerX,centerY,30,centerX,centerY,Math.max(canvas.width,canvas.height)*.72);bg.addColorStop(0,'#18233b');bg.addColorStop(.55,'#09111f');bg.addColorStop(1,'#03070d');ctx.fillStyle=bg;ctx.fillRect(-10,-10,canvas.width+20,canvas.height+20);
    ctx.fillStyle='#050a12';ctx.fillRect(boardX-5,boardY-5,boardWidth+10,boardHeight+10);ctx.strokeStyle='#30425c';ctx.lineWidth=2;ctx.strokeRect(boardX-5,boardY-5,boardWidth+10,boardHeight+10);ctx.strokeStyle='#172437';ctx.lineWidth=1;for(let x=0;x<=10;x++){ctx.beginPath();ctx.moveTo(boardX+x*cell,boardY);ctx.lineTo(boardX+x*cell,boardY+boardHeight);ctx.stroke()}for(let y=0;y<=20;y++){ctx.beginPath();ctx.moveTo(boardX,boardY+y*cell);ctx.lineTo(boardX+boardWidth,boardY+y*cell);ctx.stroke()}
    for(let y=0;y<20;y++)for(let x=0;x<10;x++){const type=g.board[y][x];if(!type)continue;drawPiece({type,cells:[[0,0]],x,y},boardX,boardY,cell)}
    if(g.current){const ghost={...g.current,y:ghostY()};drawPiece(ghost,boardX,boardY,cell,.38,true);drawPiece(g.current,boardX,boardY,cell)}
    preview(g.hold,compact?12:55,compact?72:72,L('暂存','HOLD'));preview(g.next[0],compact?456:555,compact?72:72,L('下一个','NEXT'));
    ctx.fillStyle='#dceaff';ctx.textAlign='center';ctx.font='900 28px sans-serif';ctx.fillText(String(g.score),leftCenter,compact?230:220);ctx.fillStyle='#7890a8';ctx.font='800 11px sans-serif';ctx.fillText(L('当前得分','SCORE'),leftCenter,compact?251:241);ctx.fillStyle='#dceaff';ctx.font='900 22px sans-serif';ctx.fillText(String(g.level),rightCenter,compact?230:220);ctx.fillStyle='#7890a8';ctx.font='800 11px sans-serif';ctx.fillText(L('等级','LEVEL'),rightCenter,compact?251:241);ctx.font='900 22px sans-serif';ctx.fillStyle='#dceaff';ctx.fillText(String(g.lines),rightCenter,compact?310:300);ctx.fillStyle='#7890a8';ctx.font='800 11px sans-serif';ctx.fillText(L('消除行数','LINES'),rightCenter,compact?331:321);
    for(const particle of g.particles){ctx.globalAlpha=Math.max(0,particle.life/.45);ctx.fillStyle=particle.color;ctx.fillRect(particle.x-3,particle.y-3,6,6)}ctx.globalAlpha=1;ctx.restore();if(g.flash){ctx.fillStyle=`rgba(210,240,255,${g.flash*.12})`;ctx.fillRect(0,0,canvas.width,canvas.height)}
  };
  ensureNext();spawn();setStatus(L('保持棋盘清爽','KEEP THE BOARD CLEAR'));return g
}
