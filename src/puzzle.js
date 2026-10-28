/* Swap match-3 demo. The model is independent of rendering and village resources. */
window.FB = window.FB || {};
(() => {
  'use strict';
  const N = 6, TYPES = ['apple', 'grape', 'orange', 'pear', 'berry'];
  const text = {
    en: {
      title:'First fruits', eyebrow:'MATCH-3 · STAGE 01', playButton:'Play match-3',
      aim:'Swap. Match. Harvest.', instructions:'Drag a fruit to its neighbour, or click two adjacent fruits. Match 3 or more in a row or column.',
      rules:'Invalid swaps cost no moves. Falling fruit can create a chain of matches.',
      keys:'Keyboard: arrow keys to move, Space or Enter to select two neighbours.',
      moves:'Moves left', restart:'Try again', exit:'Back to village', hint:'Show a match',
      win:'A lovely harvest!', winBody:'Both baskets are full. Your garden has a bright beginning.',
      lose:'Another harvest awaits', loseBody:'No moves left. Try collecting both fruits in 18 moves.',
      demoNote:'One match-3 demo. Rewards and village production are not connected yet.',
      board:'Fruit matching board. Select two adjacent fruits to swap.', ready:'Collect 12 apples and 9 grapes.',
      invalid:'That swap makes no match. No move used.', adjacent:'Choose a neighbouring fruit.',
      collected:'Collected {amount} fruit · {chains} chain(s).', shuffled:'No matches available — the board has been shuffled.',
      selected:'Fruit selected. Choose a neighbour.', hintShown:'The two outlined fruits can make a match.',
      apple:'Apple', grape:'Grapes', orange:'Orange', pear:'Pear', berry:'Blueberry',
      cell:'{fruit}, row {row}, column {col}', goal:'Fill both baskets',
    },
    vi: {
      title:'Mùa quả đầu tiên', eyebrow:'GHÉP 3 · MÀN 01', playButton:'Chơi ghép 3',
      aim:'Đổi chỗ. Ghép. Thu hoạch.', instructions:'Kéo một trái sang ô bên cạnh, hoặc bấm lần lượt hai trái liền kề. Ghép từ 3 trái theo hàng ngang hoặc dọc.',
      rules:'Đổi chỗ không tạo nhóm sẽ không mất lượt. Trái rơi xuống có thể tạo chuỗi ghép liên tiếp.',
      keys:'Bàn phím: phím mũi tên để di chuyển, Space hoặc Enter để chọn hai ô liền kề.',
      moves:'Lượt còn lại', restart:'Chơi lại', exit:'Về ngôi làng', hint:'Gợi ý một nước',
      win:'Mùa thu hoạch thật đẹp!', winBody:'Bạn đã thu đủ cả hai giỏ trái cây. Khu vườn có một khởi đầu tươi sáng.',
      lose:'Cùng thử một mùa mới', loseBody:'Đã hết lượt. Hãy thử thu đủ cả hai loại trái cây trong 18 lượt.',
      demoNote:'Một màn ghép 3 chơi thử. Chưa kết nối phần thưởng hoặc sản xuất trong làng.',
      board:'Bảng ghép trái cây. Chọn hai trái liền kề để đổi chỗ.', ready:'Thu thập 12 táo và 9 chùm nho.',
      invalid:'Chưa tạo được nhóm ghép. Bạn không mất lượt.', adjacent:'Hãy chọn trái ở ô liền kề.',
      collected:'Đã thu {amount} trái · {chains} chuỗi ghép.', shuffled:'Hết nước ghép — bảng đã được xáo lại.',
      selected:'Đã chọn trái. Hãy chọn ô liền kề.', hintShown:'Hai trái có viền sáng có thể tạo nhóm ghép.',
      apple:'Táo', grape:'Nho', orange:'Cam', pear:'Lê', berry:'Việt quất',
      cell:'{fruit}, hàng {row}, cột {col}', goal:'Thu đủ hai giỏ',
    },
  };
  for (const language of ['en','vi']) for (const [key,value] of Object.entries(text[language])) FB.translations[language][`puzzle.${key}`] = value;

  const adjacent = (a,b) => Number.isInteger(a) && Number.isInteger(b) && a>=0 && b>=0 && a<N*N && b<N*N && Math.abs(Math.floor(a/N)-Math.floor(b/N))+Math.abs(a%N-b%N)===1;
  function matches(board) {
    const found = new Set();
    for (let axis=0;axis<2;axis++) for (let line=0;line<N;line++) {
      let start=0;
      const at = pos => axis ? pos*N+line : line*N+pos;
      for (let end=1;end<=N;end++) {
        if (end<N && board[at(start)] && board[at(start)]===board[at(end)]) continue;
        if (board[at(start)] && end-start>=3) for (let p=start;p<end;p++) found.add(at(p));
        start=end;
      }
    }
    return [...found];
  }
  function legalMoves(board) {
    const moves=[];
    for (let a=0;a<N*N;a++) for (const b of [a+1,a+N]) {
      if (!adjacent(a,b) || board[a]===board[b]) continue;
      const copy=board.slice(); [copy[a],copy[b]]=[copy[b],copy[a]];
      if (matches(copy).length) moves.push([a,b]);
    }
    return moves;
  }
  function createModel(options={}) {
    let seed=(options.seed ?? 20261028)>>>0, used=0, status='playing';
    const limit=options.moves ?? 18, goals={apple:12,grape:9,...options.goals};
    const collected=Object.fromEntries(TYPES.map(type=>[type,0]));
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const pick=()=>TYPES[Math.floor(random()*TYPES.length)];
    function freshBoard() {
      let next;
      do {
        next=[];
        for (let i=0;i<N*N;i++) {
          const choices=TYPES.filter(type=>!(i%N>=2 && next[i-1]===type && next[i-2]===type) && !(i>=N*2 && next[i-N]===type && next[i-N*2]===type));
          next.push(choices[Math.floor(random()*choices.length)]);
        }
      } while(!legalMoves(next).length);
      return next;
    }
    let board=options.board ? options.board.slice() : freshBoard();
    if (board.length!==N*N || board.some(type=>!TYPES.includes(type)) || matches(board).length) throw new Error('A starting board needs 36 fruits and no existing matches.');
    if (!legalMoves(board).length) board=freshBoard();
    const snapshot=()=>({board:board.slice(),movesUsed:used,movesLeft:limit-used,collected:{...collected},goals:{...goals},status,size:N});
    function swap(a,b) {
      if (status!=='playing') return null;
      if (!adjacent(a,b)) return {valid:false,reason:'adjacent'};
      const before=board.slice(); [board[a],board[b]]=[board[b],board[a]];
      let found=matches(board);
      if (!found.length) { board=before; return {valid:false,reason:'invalid',before,a,b}; }
      used++;
      const steps=[]; let removed=0, reshuffled=false;
      while(found.length) {
        const current=board.slice();
        found.forEach(i=>{collected[board[i]]++;removed++;board[i]=null;});
        const falls={};
        for(let col=0;col<N;col++) {
          let bottom=N-1;
          for(let row=N-1;row>=0;row--) if(board[row*N+col]) {
            board[bottom*N+col]=board[row*N+col]; falls[bottom*N+col]=bottom-row; bottom--;
          }
          for(let row=bottom;row>=0;row--) {board[row*N+col]=pick();falls[row*N+col]=bottom+1;}
        }
        steps.push({board:current,matched:found,after:board.slice(),falls});
        found=matches(board);
        // A safety bound for pathological refill sequences; never leave a pending match.
        if(steps.length>=100 && found.length){board=freshBoard();reshuffled=true;break;}
      }
      if(Object.entries(goals).every(([type,amount])=>collected[type]>=amount))status='won';
      else if(used>=limit)status='lost';
      else if(!legalMoves(board).length){board=freshBoard();reshuffled=true;}
      return {valid:true,before,a,b,steps,removed,reshuffled,after:snapshot()};
    }
    return {snapshot,swap,legalMoves:()=>status==='playing'?legalMoves(board):[]};
  }

  // Original vector fruit: silhouettes as well as colours distinguish the pieces.
  function fruitSVG(type) {
    const leaf='<path d="M31 13Q34 3 44 6Q43 16 31 13" fill="#5d9241"/><path d="M30 16l2-10" stroke="#6e5832" stroke-width="3" stroke-linecap="round"/>';
    const shapes={
      apple:'<path d="M31 18C16 8 7 21 11 36C15 53 25 54 31 49C38 54 48 50 52 35C57 17 42 10 31 18Z" fill="#ee6657" stroke="#bf4b40" stroke-width="2"/><path d="M19 24Q15 29 18 35" fill="none" stroke="#ffc5a0" stroke-width="4" stroke-linecap="round"/>'+leaf,
      grape:leaf+'<g fill="#9b71c3" stroke="#755098" stroke-width="1.8"><circle cx="24" cy="23" r="10"/><circle cx="40" cy="23" r="10"/><circle cx="17" cy="35" r="9"/><circle cx="32" cy="36" r="10"/><circle cx="46" cy="35" r="9"/><circle cx="25" cy="46" r="9"/><circle cx="39" cy="46" r="9"/><circle cx="32" cy="53" r="7"/></g><path d="M20 20l3-2m13 0 3-1" stroke="#e3c7f1" stroke-width="3" stroke-linecap="round"/>',
      orange:'<circle cx="32" cy="34" r="22" fill="#f5ab3c" stroke="#d8892f" stroke-width="2"/><path d="M18 27Q19 22 24 21" fill="none" stroke="#ffe4a0" stroke-width="4" stroke-linecap="round"/><g fill="#d88b34"><circle cx="40" cy="43" r="1.3"/><circle cx="44" cy="35" r="1.3"/><circle cx="35" cy="48" r="1.3"/></g>'+leaf,
      pear:'<path d="M24 19C25 11 39 11 40 21C41 31 52 35 50 45C47 60 17 61 13 46C10 35 23 29 24 19Z" fill="#a8c957" stroke="#7da040" stroke-width="2"/><path d="M22 37q-5 7-1 11" fill="none" stroke="#e6ed9e" stroke-width="4" stroke-linecap="round"/>'+leaf,
      berry:'<circle cx="32" cy="35" r="22" fill="#608bbd" stroke="#406590" stroke-width="2"/><path d="m32 16 4 7 8-1-5 7 3 7-10-3-8 3 3-8-5-6 8 1Z" fill="#385778"/><path d="M17 35q-1 8 6 12" fill="none" stroke="#a7cbe9" stroke-width="4" stroke-linecap="round"/>',
    };
    return `<svg viewBox="0 0 64 64" aria-hidden="true">${shapes[type]}</svg>`;
  }
  let model=createModel(), root=null, translate=null, selected=null, cursor=0, hint=[], busy=false;
  let cleanup=[], timers=new Set(), generation=0, message='ready', messageVars={};
  const getState=()=>({...model.snapshot(),busy});
  const later=ms=>new Promise(resolve=>{const timer=setTimeout(()=>{timers.delete(timer);resolve();},ms);timers.add(timer);});
  const say=(key,vars={})=>{message=key;messageVars=vars; if(root)root.querySelector('[data-puzzle-status]').textContent=translate(`puzzle.${key}`,vars);};
  function renderBoard(board=model.snapshot().board,falls={}) {
    if(!root)return;
    const focused=root.querySelector('.match-board')?.contains(document.activeElement);
    root.querySelector('.match-board').innerHTML=board.map((type,i)=>`<button class="fruit-tile ${selected===i?'selected':''} ${hint.includes(i)?'hinted':''} ${falls[i]?'falling':''}" data-cell="${i}" tabindex="${i===cursor?'0':'-1'}" aria-pressed="${selected===i}" aria-label="${translate('puzzle.cell',{fruit:translate(`puzzle.${type}`),row:Math.floor(i/N)+1,col:i%N+1})}" style="--fall:${falls[i]||0}">${fruitSVG(type)}</button>`).join('');
    if(focused)root.querySelector(`[data-cell="${cursor}"]`)?.focus({preventScroll:true});
  }
  function updateHud() {
    if(!root)return;
    const state=model.snapshot();
    for(const type of ['apple','grape'])root.querySelector(`[data-puzzle-${type}]`).textContent=`${Math.min(state.goals[type],state.collected[type])} / ${state.goals[type]}`;
    root.querySelector('[data-puzzle-moves]').textContent=state.movesLeft;
    root.querySelector('[data-puzzle-hint]').disabled=busy || state.status!=='playing';
    root.querySelector('.match-board').setAttribute('aria-busy',String(busy));
    const result=root.querySelector('[data-puzzle-result]'); result.hidden=busy || state.status==='playing';
    if(!result.hidden) {
      const won=state.status==='won';
      result.innerHTML=`<div class="puzzle-result-card"><span class="tag gold">${translate('puzzle.goal')}</span><h3>${translate(won?'puzzle.win':'puzzle.lose')}</h3><p>${translate(won?'puzzle.winBody':'puzzle.loseBody')}</p><button class="primary-button" data-puzzle-restart>${translate('puzzle.restart')}</button><button class="secondary-button" data-close>${translate('puzzle.exit')}</button></div>`;
      result.querySelector('button').focus({preventScroll:true});
    }
    say(message,messageVars);
  }
  async function attempt(a,b) {
    if(busy || model.snapshot().status!=='playing')return;
    const result=model.swap(a,b); if(!result)return;
    selected=null;hint=[];
    if(result.reason==='adjacent'){say('adjacent');renderBoard();return;}
    busy=true;const token=++generation;
    renderBoard(result.before);updateHud();
    const reduced=FB.state?.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tiles=[root.querySelector(`[data-cell="${a}"]`),root.querySelector(`[data-cell="${b}"]`)];
    const boxes=tiles.map(tile=>tile.getBoundingClientRect());
    tiles.forEach((tile,i)=>{tile.classList.add('swapping');tile.style.transform=`translate(${boxes[1-i].x-boxes[i].x}px,${boxes[1-i].y-boxes[i].y}px)`;});
    await later(reduced?30:180);if(token!==generation || !root)return;
    if(!result.valid) {
      tiles.forEach(tile=>tile.style.transform='');
      await later(reduced?30:180);if(token!==generation || !root)return;
      say('invalid');
    } else {
      for(const step of result.steps) {
        renderBoard(step.board);
        step.matched.forEach(i=>root.querySelector(`[data-cell="${i}"]`).classList.add('matched'));
        await later(reduced?30:180);if(token!==generation || !root)return;
        renderBoard(step.after,reduced?{}:step.falls);
        await later(reduced?30:230);if(token!==generation || !root)return;
      }
      say(result.reshuffled?'shuffled':'collected',{amount:result.removed,chains:result.steps.length});
    }
    busy=false;renderBoard();updateHud();
  }
  function choose(i) {
    if(busy || model.snapshot().status!=='playing')return;
    cursor=i;hint=[];
    if(selected===null || selected===i){selected=selected===i?null:i;say(selected===null?'ready':'selected');renderBoard();}
    else if(adjacent(selected,i))attempt(selected,i);
    else {selected=i;say('adjacent');renderBoard();}
  }
  function unmount() {
    generation++;timers.forEach(clearTimeout);timers.clear();cleanup.forEach(fn=>fn());cleanup=[];
    // A language switch settles the already accepted move; never replays or charges it twice.
    busy=false;root=null;
  }
  function reset() {
    generation++;timers.forEach(clearTimeout);timers.clear();model=createModel();busy=false;selected=null;cursor=0;hint=[];message='ready';messageVars={};
    if(root){renderBoard();updateHud();root.querySelector('[data-cell="0"]').focus({preventScroll:true});}
  }
  function mount(container,t) {
    unmount();root=container;translate=t;
    root.innerHTML=`<div class="puzzle-shell"><div class="puzzle-board-wrap"><div class="match-board" role="group" aria-label="${t('puzzle.board')}"></div><div class="puzzle-result" data-puzzle-result hidden></div></div><aside class="puzzle-sidebar"><span class="tag gold">${t('puzzle.goal')}</span><h3>${t('puzzle.aim')}</h3><div class="puzzle-goalbar">${['apple','grape'].map(type=>`<div class="puzzle-goal ${type}">${fruitSVG(type)}<div><small>${t(`puzzle.${type}`)}</small><strong data-puzzle-${type}></strong></div></div>`).join('')}<div class="puzzle-move-count"><small>${t('puzzle.moves')}</small><strong data-puzzle-moves></strong></div></div><p class="puzzle-instructions">${t('puzzle.instructions')}</p><p class="puzzle-rules">${t('puzzle.rules')}</p><div class="puzzle-actions"><button class="primary-button" data-puzzle-hint>${t('puzzle.hint')}</button><button class="secondary-button" data-puzzle-restart>${t('puzzle.restart')}</button></div><p class="puzzle-status" data-puzzle-status role="status" aria-live="polite"></p><p class="puzzle-keys">${t('puzzle.keys')}</p></aside></div>`;
    const listen=(el,name,fn)=>{el.addEventListener(name,fn);cleanup.push(()=>el.removeEventListener(name,fn));};
    let down=null,suppressClick=false;
    const board=root.querySelector('.match-board');
    listen(board,'pointerdown',e=>{const cell=e.target.closest('[data-cell]');if(!cell || e.button!==0 || busy)return;down={i:Number(cell.dataset.cell),x:e.clientX,y:e.clientY,id:e.pointerId};board.setPointerCapture(e.pointerId);});
    listen(board,'pointerup',e=>{
      if(!down || e.pointerId!==down.id)return;
      const dx=e.clientX-down.x,dy=e.clientY-down.y;
      if(Math.hypot(dx,dy)>12) {
        const offset=Math.abs(dx)>Math.abs(dy)?(dx>0?1:-1):(dy>0?N:-N), target=down.i+offset;
        suppressClick=true;if(adjacent(down.i,target))attempt(down.i,target);
      } else choose(down.i);
      down=null;
    });
    listen(board,'pointercancel',()=>{down=null;suppressClick=false;});
    // Pointer input is handled above; allow synthetic clicks from assistive technology.
    listen(board,'click',e=>{if(suppressClick){suppressClick=false;return;}if(e.detail===0){const cell=e.target.closest('[data-cell]');if(cell)choose(Number(cell.dataset.cell));}});
    listen(board,'keydown',e=>{
      const offsets={ArrowLeft:-1,ArrowRight:1,ArrowUp:-N,ArrowDown:N};
      if(busy && (e.key in offsets || e.key===' ' || e.key==='Enter')){e.preventDefault();return;}
      if(e.key in offsets){e.preventDefault();const next=cursor+offsets[e.key];if(adjacent(cursor,next)){cursor=next;renderBoard();root.querySelector(`[data-cell="${cursor}"]`).focus({preventScroll:true});}}
      else if(e.key===' ' || e.key==='Enter'){e.preventDefault();choose(cursor);}
    });
    listen(root,'click',e=>{
      if(e.target.closest('[data-puzzle-restart]'))reset();
      if(e.target.closest('[data-puzzle-hint]') && !busy){hint=model.legalMoves()[0]||[];selected=null;renderBoard();say('hintShown');}
    });
    renderBoard();updateHud();
  }
  FB.puzzle={reset,mount,unmount,getState,createModel,matches,legalMoves,fruitSVG};
})();
