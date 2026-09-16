const chessGlyph={K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};
const chessValue={p:100,n:320,b:330,r:500,q:900,k:20000};
function chessColor(p){return !p?null:p===p.toUpperCase()?'w':'b'}
function chessInside(r,c){return r>=0&&r<8&&c>=0&&c<8}
function chessInitial(){return ['rnbqkbnr','pppppppp','........','........','........','........','PPPPPPPP','RNBQKBNR'].join('').split('').map(x=>x==='.'?'':x)}
function chessPseudo(board,from,attacksOnly=false){
  const p=board[from],color=chessColor(p),type=p.toLowerCase(),r=Math.floor(from/8),c=from%8,out=[];
  const add=(rr,cc)=>{if(!chessInside(rr,cc))return false;const to=rr*8+cc,target=board[to];if(!target){out.push(to);return true}if(chessColor(target)!==color)out.push(to);return false};
  if(type==='p'){
    const d=color==='w'?-1:1,start=color==='w'?6:1;
    for(const dc of [-1,1]){const rr=r+d,cc=c+dc;if(chessInside(rr,cc)&&(attacksOnly||board[rr*8+cc]&&chessColor(board[rr*8+cc])!==color))out.push(rr*8+cc)}
    if(!attacksOnly&&chessInside(r+d,c)&&!board[(r+d)*8+c]){out.push((r+d)*8+c);if(r===start&&!board[(r+2*d)*8+c])out.push((r+2*d)*8+c)}
  }else if(type==='n'){
    [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>add(r+dr,c+dc));
  }else if(type==='k'){
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(dr||dc)add(r+dr,c+dc);
  }else{
    const dirs=type==='b'?[[1,1],[1,-1],[-1,1],[-1,-1]]:type==='r'?[[1,0],[-1,0],[0,1],[0,-1]]:[[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
    for(const [dr,dc] of dirs)for(let n=1;chessInside(r+dr*n,c+dc*n);n++)if(!add(r+dr*n,c+dc*n))break;
  }
  return out;
}
function chessAttacked(board,square,byColor){for(let i=0;i<64;i++)if(chessColor(board[i])===byColor&&chessPseudo(board,i,true).includes(square))return true;return false}
function chessInCheck(board,color){const king=board.findIndex(p=>p===(color==='w'?'K':'k'));return king<0||chessAttacked(board,king,color==='w'?'b':'w')}
function chessAfter(board,move){const next=[...board],piece=next[move.from];next[move.to]=piece;next[move.from]='';if(Number.isInteger(move.enPassantCapture))next[move.enPassantCapture]='';if(move.castle){next[move.castle.to]=next[move.castle.from];next[move.castle.from]=''}const row=Math.floor(move.to/8);if(piece.toLowerCase()==='p'&&(row===0||row===7))next[move.to]=piece===piece.toUpperCase()?'Q':'q';return next}
function chessLegal(board,from,rights={},enPassant=null){
  const piece=board[from],color=chessColor(piece);if(!piece)return[];
  let moves=chessPseudo(board,from).map(to=>({from,to}));
  if(piece.toLowerCase()==='p'&&Number.isInteger(enPassant)){
    const delta=enPassant-from,captured=enPassant+(color==='w'?8:-8),enemyPawn=color==='w'?'p':'P';
    if(((color==='w'&&[-9,-7].includes(delta))||(color==='b'&&[7,9].includes(delta)))&&!board[enPassant]&&board[captured]===enemyPawn)moves.push({from,to:enPassant,enPassantCapture:captured});
  }
  if(piece.toLowerCase()==='k'&&!chessInCheck(board,color)){
    const enemy=color==='w'?'b':'w',row=color==='w'?7:0,keyK=color==='w'?'K':'k',keyQ=color==='w'?'Q':'q';
    const rook=color==='w'?'R':'r';
    if(rights[keyK]&&!board[row*8+5]&&!board[row*8+6]&&board[row*8+7]===rook&&!chessAttacked(board,row*8+5,enemy)&&!chessAttacked(board,row*8+6,enemy))moves.push({from,to:row*8+6,castle:{from:row*8+7,to:row*8+5}});
    if(rights[keyQ]&&!board[row*8+1]&&!board[row*8+2]&&!board[row*8+3]&&board[row*8]===rook&&!chessAttacked(board,row*8+3,enemy)&&!chessAttacked(board,row*8+2,enemy))moves.push({from,to:row*8+2,castle:{from:row*8,to:row*8+3}});
  }
  return moves.filter(m=>!chessInCheck(chessAfter(board,m),color));
}
function chessAllMoves(board,color,rights={},enPassant=null){const out=[];for(let i=0;i<64;i++)if(chessColor(board[i])===color)out.push(...chessLegal(board,i,rights,enPassant));return out}
function chessRightsAfter(rights,board,move){const next={...rights},piece=board[move.from],from=move.from,to=move.to;if(piece==='K'){next.K=false;next.Q=false}if(piece==='k'){next.k=false;next.q=false}if(from===63||to===63)next.K=false;if(from===56||to===56)next.Q=false;if(from===7||to===7)next.k=false;if(from===0||to===0)next.q=false;return next}
function chessNextEnPassant(board,move){return board[move.from]?.toLowerCase()==='p'&&Math.abs(move.to-move.from)===16?(move.from+move.to)/2:null}
function chessEval(board){
  let score=0,bishops={w:0,b:0};
  for(let i=0;i<64;i++){
    const piece=board[i];if(!piece)continue;
    const color=chessColor(piece),type=piece.toLowerCase(),sign=color==='b'?1:-1,r=Math.floor(i/8),c=i%8,center=7-(Math.abs(3.5-r)+Math.abs(3.5-c));
    let positional=type==='p'?(color==='b'?r:7-r)*7:type==='n'?center*9:type==='b'?center*5:type==='q'?center*2:0;
    if(type==='b')bishops[color]++;
    if(type==='k'&&board.filter(Boolean).length>16)positional=(Math.abs(3.5-c)>2?18:0)-(7-Math.abs(3.5-c))*3;
    score+=sign*(chessValue[type]+positional)
  }
  if(bishops.b>=2)score+=24;if(bishops.w>=2)score-=24;
  return score
}
function chessOrderedMoves(board,moves){return [...moves].sort((a,b)=>(board[b.to]?chessValue[board[b.to].toLowerCase()]:0)-(board[a.to]?chessValue[board[a.to].toLowerCase()]:0))}
function chessSearch(board,depth,alpha,beta,color,rights={},enPassant=null){
  if(depth===0)return chessEval(board);const moves=chessOrderedMoves(board,chessAllMoves(board,color,rights,enPassant));if(!moves.length)return chessInCheck(board,color)?(color==='b'?-99999-depth:99999+depth):0;
  if(color==='b'){let best=-Infinity;for(const m of moves){best=Math.max(best,chessSearch(chessAfter(board,m),depth-1,alpha,beta,'w',chessRightsAfter(rights,board,m),chessNextEnPassant(board,m)));alpha=Math.max(alpha,best);if(beta<=alpha)break}return best}
  let best=Infinity;for(const m of moves){best=Math.min(best,chessSearch(chessAfter(board,m),depth-1,alpha,beta,'b',chessRightsAfter(rights,board,m),chessNextEnPassant(board,m)));beta=Math.min(beta,best);if(beta<=alpha)break}return best;
}
const CHESS_SAVE_KEY='gotit_chess_save_v3';
const chessFiles='abcdefgh';
function chessSquareName(index){return `${chessFiles[index%8]}${8-Math.floor(index/8)}`}
function chessPieceName(piece){return({k:'王',q:'后',r:'车',b:'象',n:'马',p:'兵'})[piece?.toLowerCase()]||'空格'}
function initChess(){
  canvas.hidden=true;dom.hidden=false;directControls(L('点击棋子，再点击目标格；也可以使用提示或悔棋。','Tap a piece, then its destination. Hint and undo are available.'));
  const g={score:0,loop:false,board:chessInitial(),turn:'w',selected:-1,moves:[],mode:'ai',difficulty:'normal',started:false,rights:{K:true,Q:true,k:true,q:true},enPassant:null,lastMove:null,timers:[],animating:false,history:[],notation:[],hintMove:null};
  const snapshot=()=>({board:[...g.board],turn:g.turn,rights:{...g.rights},enPassant:g.enPassant,lastMove:g.lastMove?{...g.lastMove}:null,notation:[...g.notation]});
  const restore=state=>{g.board=[...state.board];g.turn=state.turn;g.rights={...state.rights};g.enPassant=Number.isInteger(state.enPassant)?state.enPassant:null;g.lastMove=state.lastMove?{...state.lastMove}:null;g.notation=[...(state.notation||[])];g.selected=-1;g.moves=[];g.hintMove=null;g.animating=false};
  const savedGame=()=>{try{const saved=JSON.parse(localStorage.getItem(CHESS_SAVE_KEY)||'null');return saved&&Array.isArray(saved.board)&&saved.board.length===64&&['w','b'].includes(saved.turn)?saved:null}catch{return null}};
  const persist=()=>{try{localStorage.setItem(CHESS_SAVE_KEY,JSON.stringify({...snapshot(),mode:g.mode,difficulty:g.difficulty,history:g.history.slice(-80),savedAt:Date.now()}))}catch{}}
  const setup=()=>{const saved=savedGame();setStatus('选择模式');dom.innerHTML=`<div class="mode-panel"><h3>♞ 建立棋局</h3><p>白方先行。电脑模式中你执白棋；双人模式在同一设备轮流操作。棋局会自动保存在本机。</p><div class="setup-grid"><label class="setup-field">对战模式<select id="chessMode"><option value="ai">对战电脑</option><option value="pvp">本地双人</option></select></label><label class="setup-field" id="chessDifficultyField">电脑难度<select id="chessDifficulty"><option value="easy">轻松</option><option value="normal" selected>进阶</option><option value="hard">大师</option></select></label></div><div class="setup-actions"><button class="setup-start" id="chessStart">开始新棋局</button>${saved?'<button class="mini-btn resume-btn" id="chessResume">继续上次棋局</button>':''}</div><p class="setup-online-note">本地模式 · 不需要匹配，不上传棋局</p></div>`;const mode=$('#chessMode'),field=$('#chessDifficultyField');mode.onchange=()=>field.hidden=mode.value!=='ai';$('#chessStart').onclick=()=>{localStorage.removeItem(CHESS_SAVE_KEY);g.board=chessInitial();g.turn='w';g.rights={K:true,Q:true,k:true,q:true};g.enPassant=null;g.lastMove=null;g.history=[];g.notation=[];g.mode=mode.value;g.difficulty=$('#chessDifficulty').value;g.started=true;render()};if(saved)$('#chessResume').onclick=()=>{restore(saved);g.mode=saved.mode==='pvp'?'pvp':'ai';g.difficulty=['easy','normal','hard'].includes(saved.difficulty)?saved.difficulty:'normal';g.history=Array.isArray(saved.history)?saved.history.filter(item=>Array.isArray(item?.board)&&item.board.length===64).slice(-80):[];g.started=true;render();if(g.mode==='ai'&&g.turn==='b')scheduleAI()}};
  const endCheck=()=>{const moves=chessAllMoves(g.board,g.turn,g.rights,g.enPassant);if(moves.length)return false;const checked=chessInCheck(g.board,g.turn);if(checked){const winner=g.turn==='w'?'黑方':'白方';g.score=g.turn==='b'?1500:300;setScore(g.score);finish(`${winner}将死获胜`)}else finish('和棋 · 无合法着法');return true};
  const notationFor=(m,piece,captured,checked)=>`${piece.toLowerCase()==='p'?'':chessPieceName(piece)}${captured?'×':''}${chessSquareName(m.to)}${checked?'＋':''}`;
  const finalizeMove=m=>{const piece=g.board[m.from],captured=g.board[m.to]||g.board[m.enPassantCapture];g.rights=chessRightsAfter(g.rights,g.board,m);g.enPassant=chessNextEnPassant(g.board,m);g.board=chessAfter(g.board,m);g.lastMove=m;g.turn=g.turn==='w'?'b':'w';g.notation.push(notationFor(m,piece,captured,chessInCheck(g.board,g.turn)));g.selected=-1;g.moves=[];g.hintMove=null;g.animating=false;persist();render();if(endCheck()){localStorage.removeItem(CHESS_SAVE_KEY);return}if(g.mode==='ai'&&g.turn==='b')scheduleAI()};
  const flight=(board,piece,from,to)=>{const node=document.createElement('span'),fr=Math.floor(from/8),fc=from%8,tr=Math.floor(to/8),tc=to%8;node.className=`chess-flying-piece ${chessColor(piece)==='w'?'white':'black'}`;node.textContent=chessGlyph[piece];node.style.left=`${fc*12.5}%`;node.style.top=`${fr*12.5}%`;node.style.setProperty('--move-x',`${(tc-fc)*100}%`);node.style.setProperty('--move-y',`${(tr-fr)*100}%`);board.appendChild(node);board.querySelector(`[data-square="${from}"]`)?.classList.add('moving-origin');g.timers.push(setTimeout(()=>node.classList.add('go'),20))};
  const move=m=>{if(g.animating)return;g.history.push(snapshot());g.history=g.history.slice(-80);g.animating=true;const board=dom.querySelector('.chess-board'),piece=g.board[m.from],done=()=>finalizeMove(m);if(!board)return done();flight(board,piece,m.from,m.to);if(m.castle)flight(board,g.board[m.castle.from],m.castle.from,m.castle.to);g.timers.push(setTimeout(done,340))};
  const pickAI=()=>{const list=chessOrderedMoves(g.board,chessAllMoves(g.board,'b',g.rights,g.enPassant));if(!list.length)return null;if(g.difficulty==='easy'){const safe=list.filter(m=>!chessInCheck(chessAfter(g.board,m),'b'));const pool=safe.length?safe:list;return pool[Math.floor(Math.random()*Math.min(pool.length,Math.max(4,Math.ceil(pool.length*.7))))]}if(g.difficulty==='normal'){const ranked=list.map(m=>({m,v:chessEval(chessAfter(g.board,m))+(g.board[m.to]?chessValue[g.board[m.to].toLowerCase()]*.25:0)+Math.random()*16})).sort((a,b)=>b.v-a.v);return ranked[0].m}let best=-Infinity,choices=[];for(const m of list){const next=chessAfter(g.board,m),v=chessSearch(next,3,-Infinity,Infinity,'w',chessRightsAfter(g.rights,g.board,m),chessNextEnPassant(g.board,m))+(chessInCheck(next,'w')?22:0);if(v>best+1){best=v;choices=[m]}else if(Math.abs(v-best)<=1)choices.push(m)}return choices[Math.floor(Math.random()*choices.length)]};
  const scheduleAI=()=>{setStatus('黑棋由电脑思考中…');g.timers.push(setTimeout(()=>{if(!g.started||ended)return;const m=pickAI();if(m)move(m)},g.difficulty==='hard'?420:260))};
  const clickSquare=i=>{if(ended||g.animating||!g.started||g.mode==='ai'&&g.turn==='b')return;const own=chessColor(g.board[i])===g.turn;if(g.selected>=0){const chosen=g.moves.find(m=>m.to===i);if(chosen)return move(chosen)}g.hintMove=null;if(own){g.selected=i;g.moves=chessLegal(g.board,i,g.rights,g.enPassant)}else{g.selected=-1;g.moves=[]}render()};
  const suggest=()=>{if(g.animating||g.mode==='ai'&&g.turn==='b')return;const list=chessAllMoves(g.board,g.turn,g.rights,g.enPassant);if(!list.length)return;const ranked=list.map(m=>({m,v:chessEval(chessAfter(g.board,m))})).sort((a,b)=>g.turn==='w'?a.v-b.v:b.v-a.v);g.hintMove=ranked[0].m;g.selected=g.hintMove.from;g.moves=chessLegal(g.board,g.hintMove.from,g.rights,g.enPassant);render()};
  const undo=()=>{if(g.animating||!g.history.length)return;g.timers.forEach(clearTimeout);g.timers=[];let state=g.history.pop();if(g.mode==='ai'&&g.turn==='w'&&g.history.length)state=g.history.pop();restore(state);persist();render()};
  const render=()=>{const turnName=g.turn==='w'?'白棋':'黑棋',checked=chessInCheck(g.board,g.turn),files=(arcadeLang==='zh'?'甲乙丙丁戊己庚辛':'ABCDEFGH').split(''),ranks=(arcadeLang==='zh'?'八七六五四三二一':'87654321').split('');setStatus(`${turnName}${checked?' · 将军':''}`);const squares=g.board.map((p,i)=>{const r=Math.floor(i/8),capture=g.moves.some(m=>m.to===i)&&!!p,classes=['chess-square',(r+i%8)%2?'dark':'light',p?(chessColor(p)==='w'?'piece-white':'piece-black'):'',g.selected===i?'selected':'',g.moves.some(m=>m.to===i)?(capture?'capture':'move'):'',g.lastMove&&(g.lastMove.from===i||g.lastMove.to===i)?'last':'',g.hintMove?.from===i?'hint-from':'',g.hintMove?.to===i?'hint-to':''].join(' '),color=p?(chessColor(p)==='w'?'白方':'黑方'):'';return`<button class="${classes}" data-square="${i}" role="gridcell" aria-label="${chessSquareName(i)} ${p?`${color}${chessPieceName(p)}`:'空格'}">${chessGlyph[p]||''}</button>`}).join('');const log=g.notation.map((item,i)=>`<span><b>${i+1}.</b> ${item}</span>`).join('');dom.innerHTML=`<div class="game-toolbar"><strong>${turnName}行棋 ${checked?'⚠️ 将军':''}</strong><div class="chess-actions"><button class="mini-btn" id="chessHint" ${g.mode==='ai'&&g.turn==='b'?'disabled':''}>提示</button><button class="mini-btn" id="chessUndo" ${g.history.length?'':'disabled'}>悔棋</button><button class="mini-btn" id="chessConfig">设置</button></div></div><div class="chess-layout"><div class="chess-frame"><div class="chess-coords chess-files top">${files.map(x=>`<span>${x}</span>`).join('')}</div><div class="chess-coords chess-files bottom">${files.map(x=>`<span>${x}</span>`).join('')}</div><div class="chess-coords chess-ranks left">${ranks.map(x=>`<span>${x}</span>`).join('')}</div><div class="chess-coords chess-ranks right">${ranks.map(x=>`<span>${x}</span>`).join('')}</div><div class="chess-board" role="grid" aria-label="${L('国际象棋棋盘','Chess board')}">${squares}</div></div><aside class="chess-history" aria-label="棋谱"><div><strong>本局棋谱</strong><small>自动保存在本机</small></div><div class="chess-move-list">${log||'<p>落下第一步后，这里会记录棋谱。</p>'}</div></aside></div><p class="chess-note">${g.mode==='ai'?`你执白棋 · 电脑执黑棋 · 难度：${{easy:'轻松',normal:'进阶',hard:'大师'}[g.difficulty]}`:'本地双人 · 白棋与黑棋轮流操作'}</p>`;dom.querySelectorAll('[data-square]').forEach(b=>b.onclick=()=>clickSquare(+b.dataset.square));$('#chessHint').onclick=suggest;$('#chessUndo').onclick=undo;$('#chessConfig').onclick=()=>{g.timers.forEach(clearTimeout);g.started=false;g.animating=false;setup()}};
  g.destroy=()=>{g.timers.forEach(clearTimeout);if(g.started)persist()};setup();return g;
}
