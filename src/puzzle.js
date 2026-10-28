/* Fruit Bloom match-3. Pure rules, stage-aware presentation, and one win callback per attempt. */
window.FB = window.FB || {};
(() => {
  'use strict';
  const N = 6, TYPES = ['apple', 'grape', 'orange', 'pear', 'berry'];
  const text = {
    en: {
      title:'The harvest trail', eyebrow:'A LITTLE MATCH, A BIG ADVENTURE', playButton:'Play match-3',
      aim:'Fill your baskets', instructions:'Drag a fruit to its neighbour, or tap two neighbours. Match 3 in a row or column.',
      rules:'A match uses one move. Falling fruit can make a chain. A swap without a match is free.',
      keys:'Arrow keys to move · Space or Enter to select two neighbours',
      moves:'Moves left', restart:'Try again', exit:'Back to village', hint:'Give me a hint', next:'Next adventure',
      win:'What a sweet harvest!', winBody:'Your harvest is on its way to the village.',
      lose:'So close, little gardener!', loseBody:'Fill every basket within {moves} moves. Try a different match and let the fruit fall into place.',
      demoNote:'Gather the harvest, earn supplies, and make your village bloom.',
      board:'Fruit matching board. Select two adjacent fruits to swap.', ready:'Fill the baskets before your moves run out.',
      invalid:'No match yet. You kept your move!', adjacent:'Choose a fruit in the next tile.',
      collected:'{amount} fruit collected · {chains} chain(s)', shuffled:'A fresh arrangement! Every board has a match.',
      selected:'Now choose a neighbouring fruit.', hintShown:'Try swapping the two sparkling fruits.',
      apple:'Apples', grape:'Grapes', orange:'Oranges', pear:'Pears', berry:'Blueberries',
      cell:'{fruit}, row {row}, column {col}', goal:'HARVEST CHALLENGE', level:'Level {number}',
      score:'Harvest score', reward:'For your village', earned:'Harvest delivered', sweet:'Sweet!', blooming:'Blooming!', amazing:'Wonderful!',
      left:'{amount} moves left', complete:'Basket full', footer:'A little match makes a big difference.',
      coins:'Coins', wood:'Wood', stone:'Stone', fruit:'Harvest', stageComplete:'Level {number} complete',
    },
    vi: {
      title:'Hành trình mùa quả', eyebrow:'GHÉP TRÁI NHỎ, HÀNH TRÌNH LỚN', playButton:'Chơi ghép 3',
      aim:'Đong đầy giỏ quả', instructions:'Kéo một trái sang ô liền kề, hoặc chạm lần lượt hai trái cạnh nhau. Ghép từ 3 trái theo hàng ngang hoặc dọc.',
      rules:'Một lượt cho mỗi lần ghép. Trái rơi có thể tạo chuỗi. Đổi chỗ không tạo nhóm sẽ không mất lượt.',
      keys:'Phím mũi tên để di chuyển · Space hoặc Enter để chọn hai ô liền kề',
      moves:'Lượt còn lại', restart:'Thử lại nhé', exit:'Về ngôi làng', hint:'Gợi ý cho tôi', next:'Chơi màn tiếp',
      win:'Mùa quả thật ngọt ngào!', winBody:'Những món quà từ mùa thu hoạch đã được gửi về làng.',
      lose:'Sắp được rồi, bạn ơi!', loseBody:'Thu đủ mọi giỏ trong {moves} lượt. Thử một nước ghép khác để trái rơi thành chuỗi nhé.',
      demoNote:'Thu thập trái cây, nhận vật liệu và vun đắp ngôi làng của bạn.',
      board:'Bảng ghép trái cây. Chọn hai trái liền kề để đổi chỗ.', ready:'Thu đầy các giỏ trước khi hết lượt nhé.',
      invalid:'Chưa tạo được nhóm. Bạn vẫn giữ nguyên lượt!', adjacent:'Hãy chọn trái ở ô liền kề.',
      collected:'Đã thu {amount} trái · {chains} chuỗi ghép', shuffled:'Bảng mới đã sẵn sàng! Luôn có một nước ghép cho bạn.',
      selected:'Giờ hãy chọn một trái ở ô bên cạnh.', hintShown:'Thử đổi chỗ hai trái đang lấp lánh nhé.',
      apple:'Táo', grape:'Nho', orange:'Cam', pear:'Lê', berry:'Việt quất',
      cell:'{fruit}, hàng {row}, cột {col}', goal:'THỬ THÁCH THU HOẠCH', level:'Màn {number}',
      score:'Điểm thu hoạch', reward:'Quà cho ngôi làng', earned:'Đã gửi về làng', sweet:'Ngọt ngào!', blooming:'Nở rộ!', amazing:'Tuyệt vời!',
      left:'Còn {amount} lượt', complete:'Đã đầy giỏ', footer:'Một nước ghép nhỏ, một góc vườn lớn hơn.',
      coins:'Xu', wood:'Gỗ', stone:'Đá', fruit:'Nông sản', stageComplete:'Hoàn thành màn {number}',
    },
  };
  FB.translations = FB.translations || {en:{},vi:{}};
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
    const limit=options.moves ?? 18, goals=options.goals ? {...options.goals} : {apple:12,grape:9};
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

  // Shaded, original fruit silhouettes remain readable without relying on colour alone.
  let fruitId=0;
  function fruitSVG(type) {
    const id=`fb-fruit-${++fruitId}`;
    const colours={apple:['#ffb497','#ef665a','#ce3d47'],grape:['#d0b0ff','#9564ca','#6d45a4'],orange:['#ffe397','#ffb23d','#ed8735'],pear:['#e3f39a','#aad35a','#6fa641'],berry:['#b2dcff','#719bdf','#4a6fae']}[type]||['#fff','#eee','#ccc'];
    const defs=`<defs><radialGradient id="${id}" cx="32%" cy="22%" r="83%"><stop stop-color="${colours[0]}"/><stop offset=".48" stop-color="${colours[1]}"/><stop offset="1" stop-color="${colours[2]}"/></radialGradient><linearGradient id="${id}-leaf" x2="1" y2="1"><stop stop-color="#c5df77"/><stop offset="1" stop-color="#4f923f"/></linearGradient></defs>`;
    const leaf=`<path d="M30 18Q28 11 32 7" fill="none" stroke="#775c3e" stroke-width="3.5" stroke-linecap="round"/><path d="M32 13Q35 3 46 6Q44 17 32 13" fill="url(#${id}-leaf)"/><path d="m33 12 9-4" stroke="#689c48" stroke-width="1.2"/>`;
    const fill=`fill="url(#${id})"`;
    const shapes={
      apple:`<path d="M31 18C17 9 6 20 10 35C14 52 23 58 31 51C40 58 50 51 54 35C58 18 44 9 31 18Z" ${fill}/><path d="M13 37Q20 54 31 48Q44 53 51 36" fill="none" stroke="#ba3e4233" stroke-width="3"/><path d="M18 28Q18 22 24 21" fill="none" stroke="#fff4d4" stroke-width="4" stroke-linecap="round" opacity=".85"/><ellipse cx="19" cy="35" rx="2" ry="3" fill="#ffeacb" opacity=".6"/>${leaf}`,
      grape:`${leaf}<g ${fill} stroke="#7951ac" stroke-width="1.2"><circle cx="24" cy="22" r="10"/><circle cx="40" cy="22" r="10"/><circle cx="16" cy="34" r="9.5"/><circle cx="47" cy="34" r="9.5"/><circle cx="32" cy="35" r="10.5"/><circle cx="24" cy="46" r="9.5"/><circle cx="40" cy="46" r="9.5"/><circle cx="32" cy="54" r="7.5"/></g><g fill="#f5e7ff" opacity=".7"><ellipse cx="21" cy="18" rx="3" ry="2" transform="rotate(-30 21 18)"/><ellipse cx="37" cy="18" rx="3" ry="2" transform="rotate(-30 37 18)"/><ellipse cx="29" cy="31" rx="3" ry="2" transform="rotate(-30 29 31)"/><ellipse cx="21" cy="43" rx="2.6" ry="1.6" transform="rotate(-30 21 43)"/></g>`,
      orange:`<circle cx="32" cy="34" r="23" ${fill}/><path d="M13 39Q18 54 32 55Q47 53 52 42" fill="none" stroke="#c6712533" stroke-width="2.5"/><path d="M17 28Q19 21 26 20" fill="none" stroke="#fff6cc" stroke-width="4" stroke-linecap="round"/><g fill="#d48128" opacity=".55"><circle cx="42" cy="42" r="1"/><circle cx="46" cy="34" r="1"/><circle cx="36" cy="49" r="1"/><circle cx="40" cy="48" r=".8"/><circle cx="43" cy="36" r=".7"/></g>${leaf}`,
      pear:`<path d="M24 19C25 10 39 10 40 21C41 30 53 35 51 45C48 61 17 62 13 46C9 35 23 29 24 19Z" ${fill}/><path d="M15 45Q19 57 33 55Q44 55 49 47" fill="none" stroke="#558c3433" stroke-width="2.5"/><path d="M23 35Q17 41 20 47" fill="none" stroke="#f5ffca" stroke-width="4" stroke-linecap="round"/><g fill="#6c9743" opacity=".4"><circle cx="38" cy="48" r="1"/><circle cx="43" cy="41" r=".8"/><circle cx="37" cy="43" r=".7"/></g>${leaf}`,
      berry:`<circle cx="32" cy="35" r="23" ${fill}/><path d="M12 40Q17 54 32 56Q46 55 52 44" fill="none" stroke="#335b8c33" stroke-width="3"/><path d="m32 15 4 8 9-1-5 7 3 8-11-3-9 3 3-8-5-7 9 1Z" fill="#466493"/><path d="m32 20 3 7 7-1-6 6-4-3-4 3-5-6 7 1Z" fill="#789dc7"/><path d="M17 35q-2 8 5 12" fill="none" stroke="#e1f2ff" stroke-width="4" stroke-linecap="round" opacity=".8"/><ellipse cx="42" cy="44" rx="6" ry="3" fill="#95b9eb" opacity=".25"/>`,
    };
    return `<svg viewBox="0 0 64 64" aria-hidden="true">${defs}<ellipse cx="32" cy="57" rx="19" ry="4" fill="#314e3e20"/>${shapes[type]||shapes.apple}</svg>`;
  }
  const defaultStage={number:1,seed:20261028,moves:18,goals:{apple:12,grape:9},rewards:{}};
  const stageCopy=stage=>({...defaultStage,...stage,goals:{...(stage?.goals||defaultStage.goals)},rewards:{...(stage?.rewards||{})}});
  let stage=stageCopy(defaultStage), model=createModel(stage), root=null, translate=null, selected=null, cursor=0, hint=[], busy=false;
  let cleanup=[], timers=new Set(), generation=0, message='ready', messageVars={}, options={}, winReported=false, score=0, bestChain=0;
  const getState=()=>({...model.snapshot(),busy,stage:stage.number,score,bestChain});
  const later=ms=>new Promise(resolve=>{const timer=setTimeout(()=>{timers.delete(timer);resolve();},ms);timers.add(timer);});
  const say=(key,vars={})=>{message=key;messageVars=vars;if(root)root.querySelector('[data-puzzle-status]').textContent=translate(`puzzle.${key}`,vars);};
  const sound=name=>options.onSound?.(name);
  const reducedMotion=()=>FB.game?.getState?.().reducedMotion || FB.state?.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  function reportWin() {
    const state=model.snapshot();
    if(state.status!=='won'||winReported)return;
    winReported=true;
    options.onWin?.({stageNumber:stage.number,collected:{...state.collected},movesLeft:state.movesLeft,movesUsed:state.movesUsed,score,bestChain,rewards:{...stage.rewards}});
  }
  function rewardMarkup(result=false) {
    return Object.entries(stage.rewards).filter(([,n])=>n>0).map(([type,n])=>`<span class="puzzle-reward ${type}"><span class="reward-token">${type==='coins'?'✦':type==='wood'?'▰':type==='stone'?'◆':'●'}</span><strong>+${n}</strong><small>${translate(`puzzle.${type}`)}</small></span>`).join('');
  }
  function renderBoard(board=model.snapshot().board,falls={}) {
    if(!root)return;
    const focused=root.querySelector('.match-board')?.contains(document.activeElement);
    root.querySelector('.match-board').innerHTML=board.map((type,i)=>`<button class="fruit-tile ${selected===i?'selected':''} ${hint.includes(i)?'hinted':''} ${falls[i]?'falling':''}" data-cell="${i}" tabindex="${i===cursor?'0':'-1'}" aria-pressed="${selected===i}" aria-label="${translate('puzzle.cell',{fruit:translate(`puzzle.${type}`),row:Math.floor(i/N)+1,col:i%N+1})}" style="--fall:${falls[i]||0}">${fruitSVG(type)}</button>`).join('');
    if(focused)root.querySelector(`[data-cell="${cursor}"]`)?.focus({preventScroll:true});
  }
  function updateHud() {
    if(!root)return;
    const state=model.snapshot();
    for(const [type,goal] of Object.entries(state.goals)) {
      const value=Math.min(goal,state.collected[type]), block=root.querySelector(`[data-goal="${type}"]`);
      if(!block)continue;
      block.classList.toggle('complete',value>=goal);
      block.querySelector('strong').textContent=`${value} / ${goal}`;
      block.querySelector('.puzzle-goal-fill').style.width=`${Math.min(100,value/goal*100)}%`;
      block.querySelector('.puzzle-goal-check').textContent=value>=goal?'✓':'';
    }
    root.querySelector('[data-puzzle-moves]').textContent=state.movesLeft;
    root.querySelector('[data-puzzle-score]').textContent=score.toLocaleString();
    root.querySelector('.puzzle-move-count').classList.toggle('low',state.movesLeft<=5);
    root.querySelector('[data-puzzle-hint]').disabled=busy || state.status!=='playing';
    root.querySelector('.match-board').setAttribute('aria-busy',String(busy));
    const result=root.querySelector('[data-puzzle-result]'), wasHidden=result.hidden;
    result.hidden=busy || state.status==='playing';
    if(!result.hidden) {
      const won=state.status==='won';
      const stars=won?(state.movesLeft>=stage.moves*.4?3:state.movesLeft>=stage.moves*.15?2:1):0;
      result.innerHTML=`<div class="puzzle-result-card ${won?'won':'lost'}"><div class="puzzle-result-stars" aria-hidden="true">${Array.from({length:3},(_,i)=>`<span class="${i<stars?'lit':''}">★</span>`).join('')}</div><span class="puzzle-result-kicker">${translate(won?'puzzle.stageComplete':'puzzle.level',{number:stage.number})}</span><h3>${translate(won?'puzzle.win':'puzzle.lose')}</h3><p>${translate(won?'puzzle.winBody':'puzzle.loseBody',{moves:stage.moves})}</p>${won&&Object.keys(stage.rewards).length?`<div class="puzzle-earned"><small>${translate('puzzle.earned')}</small><div class="puzzle-rewards">${rewardMarkup(true)}</div></div>`:''}<button class="primary-button" ${won&&options.onNext?'data-puzzle-next':'data-puzzle-restart'}>${translate(won&&options.onNext?'puzzle.next':'puzzle.restart')}<span aria-hidden="true">→</span></button><button class="secondary-button" ${options.onExit?'data-puzzle-exit':'data-close'}>${translate('puzzle.exit')}</button></div>`;
      if(wasHidden) {sound(won?'win':'lose');result.querySelector('button').focus({preventScroll:true});}
    }
    say(message,messageVars);
  }
  function showCombo(chain) {
    const combo=root?.querySelector('.puzzle-combo');if(!combo)return;
    combo.classList.remove('show');void combo.offsetWidth;
    combo.innerHTML=`<strong>${translate(chain>2?'puzzle.amazing':chain>1?'puzzle.blooming':'puzzle.sweet')}</strong>${chain>1?`<span>×${chain}</span>`:''}`;
    combo.classList.add('show');
  }
  async function attempt(a,b) {
    if(busy || model.snapshot().status!=='playing')return;
    const result=model.swap(a,b);if(!result)return;
    selected=null;hint=[];
    if(result.reason==='adjacent'){say('adjacent');renderBoard();return;}
    if(result.valid){score+=result.removed*10+Math.max(0,result.steps.length-1)*25;bestChain=Math.max(bestChain,result.steps.length);reportWin();}
    busy=true;const token=++generation;
    renderBoard(result.before);updateHud();sound('swap');
    const reduced=reducedMotion(), tiles=[root.querySelector(`[data-cell="${a}"]`),root.querySelector(`[data-cell="${b}"]`)];
    const boxes=tiles.map(tile=>tile.getBoundingClientRect());
    tiles.forEach((tile,i)=>{tile.classList.add('swapping');tile.style.transform=`translate(${boxes[1-i].x-boxes[i].x}px,${boxes[1-i].y-boxes[i].y}px)`;});
    await later(reduced?25:170);if(token!==generation || !root)return;
    if(!result.valid) {
      tiles.forEach(tile=>tile.style.transform='');sound('invalid');
      await later(reduced?25:170);if(token!==generation || !root)return;
      say('invalid');
    } else {
      let chain=0;
      for(const step of result.steps) {
        chain++;renderBoard(step.board);sound('match');if(chain>1 || step.matched.length>=5)showCombo(chain);
        step.matched.forEach(i=>root.querySelector(`[data-cell="${i}"]`).classList.add('matched'));
        await later(reduced?25:190);if(token!==generation || !root)return;
        renderBoard(step.after,reduced?{}:step.falls);
        await later(reduced?25:230);if(token!==generation || !root)return;
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
    // Accepted moves and win delivery persist across a language change or a closed window.
    busy=false;root=null;
  }
  function reset(nextStage) {
    generation++;timers.forEach(clearTimeout);timers.clear();
    if(nextStage)stage=stageCopy(nextStage);
    model=createModel(stage);busy=false;selected=null;cursor=0;hint=[];message='ready';messageVars={};winReported=false;score=0;bestChain=0;
    if(root){renderBoard();updateHud();root.querySelector('[data-cell="0"]').focus({preventScroll:true});}
  }
  function mount(container,t,nextOptions={}) {
    unmount();
    if(nextOptions.stage && nextOptions.stage.number!==stage.number){stage=stageCopy(nextOptions.stage);reset(stage);}
    else if(nextOptions.stage)stage=stageCopy(nextOptions.stage);
    root=container;translate=t;options=nextOptions;
    const goals=Object.keys(model.snapshot().goals);
    root.innerHTML=`<div class="puzzle-shell"><div class="puzzle-left"><div class="puzzle-stage-ribbon"><span class="puzzle-level-pill">${t('puzzle.level',{number:stage.number})}</span><span class="puzzle-score"><small>${t('puzzle.score')}</small><strong data-puzzle-score>0</strong></span></div><div class="puzzle-board-wrap"><div class="match-board" role="group" aria-label="${t('puzzle.board')}"></div><div class="puzzle-combo" aria-hidden="true"></div><div class="puzzle-result" data-puzzle-result hidden></div></div><p class="puzzle-board-caption">${t('puzzle.footer')}</p></div><aside class="puzzle-sidebar"><span class="puzzle-eyebrow">${t('puzzle.goal')}</span><h3>${t('puzzle.aim')}</h3><div class="puzzle-goalbar">${goals.map(type=>`<div class="puzzle-goal ${type}" data-goal="${type}"><div class="puzzle-goal-fruit">${fruitSVG(type)}</div><div class="puzzle-goal-copy"><small>${t(`puzzle.${type}`)}</small><strong data-puzzle-${type}></strong><div class="puzzle-goal-track"><i class="puzzle-goal-fill"></i></div></div><span class="puzzle-goal-check" aria-hidden="true"></span></div>`).join('')}</div><div class="puzzle-move-count"><div><small>${t('puzzle.moves')}</small><span aria-hidden="true">✦ ✦ ✦</span></div><strong data-puzzle-moves></strong></div>${Object.keys(stage.rewards).length?`<div class="puzzle-prize"><div class="puzzle-prize-label">${t('puzzle.reward')}</div><div class="puzzle-rewards">${rewardMarkup()}</div></div>`:''}<p class="puzzle-instructions">${t('puzzle.instructions')}</p><div class="puzzle-actions"><button class="primary-button" data-puzzle-hint><span aria-hidden="true">✧</span>${t('puzzle.hint')}</button><button class="secondary-button puzzle-retry" data-puzzle-restart aria-label="${t('puzzle.restart')}" title="${t('puzzle.restart')}">↻</button></div><p class="puzzle-status" data-puzzle-status role="status" aria-live="polite"></p><p class="puzzle-keys">${t('puzzle.keys')}</p></aside></div>`;
    const listen=(el,name,fn)=>{el.addEventListener(name,fn);cleanup.push(()=>el.removeEventListener(name,fn));};
    let down=null,suppressClick=false;
    const board=root.querySelector('.match-board');
    listen(board,'pointerdown',e=>{const cell=e.target.closest('[data-cell]');if(!cell || e.button!==0 || busy)return;down={i:Number(cell.dataset.cell),x:e.clientX,y:e.clientY,id:e.pointerId};board.setPointerCapture(e.pointerId);});
    listen(board,'pointerup',e=>{
      if(!down || e.pointerId!==down.id)return;
      const dx=e.clientX-down.x,dy=e.clientY-down.y;
      if(Math.hypot(dx,dy)>12) {
        const offset=Math.abs(dx)>Math.abs(dy)?(dx>0?1:-1):(dy>0?N:-N),target=down.i+offset;
        suppressClick=true;if(adjacent(down.i,target))attempt(down.i,target);
      } else choose(down.i);
      down=null;
    });
    listen(board,'pointercancel',()=>{down=null;suppressClick=false;});
    listen(board,'click',e=>{if(suppressClick){suppressClick=false;return;}if(e.detail===0){const cell=e.target.closest('[data-cell]');if(cell)choose(Number(cell.dataset.cell));}});
    listen(board,'keydown',e=>{
      const offsets={ArrowLeft:-1,ArrowRight:1,ArrowUp:-N,ArrowDown:N};
      if(busy && (e.key in offsets || e.key===' ' || e.key==='Enter')){e.preventDefault();return;}
      if(e.key in offsets){e.preventDefault();const next=cursor+offsets[e.key];if(adjacent(cursor,next)){cursor=next;renderBoard();root.querySelector(`[data-cell="${cursor}"]`).focus({preventScroll:true});}}
      else if(e.key===' ' || e.key==='Enter'){e.preventDefault();choose(cursor);}
    });
    listen(root,'click',e=>{
      if(e.target.closest('[data-puzzle-restart]'))reset();
      if(e.target.closest('[data-puzzle-hint]') && !busy){hint=model.legalMoves()[0]||[];selected=null;renderBoard();say('hintShown');sound('hint');}
      if(e.target.closest('[data-puzzle-next]'))options.onNext?.();
      if(e.target.closest('[data-puzzle-exit]'))options.onExit?.();
    });
    renderBoard();updateHud();
  }
  FB.puzzle={reset,mount,unmount,getState,createModel,matches,legalMoves,fruitSVG};
})();
