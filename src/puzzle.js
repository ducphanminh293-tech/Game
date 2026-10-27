/* Hand-authored fruit-shooter demo. It never modifies the village economy. */
window.FB = window.FB || {};
(() => {
  const translations = {
    en: {
      'puzzle.title': 'First fruits', 'puzzle.start': 'Play the demo', 'puzzle.playButton': 'Play the demo',
      'puzzle.eyebrow': 'A LITTLE HARVEST', 'puzzle.demo': 'Playable demo · one handmade stage',
      'puzzle.aim': 'Aim, match, bloom.', 'puzzle.instructions': 'Move your mouse to aim, then click to shoot. Match 3 or more of the same fruit to pop a cluster.',
      'puzzle.touch': 'On a touch screen, tap the place you want to aim at.',
      'puzzle.rules': 'Fruit can bounce off the side walls. Fruit disconnected from the top will fall and count toward your goals.',
      'puzzle.keys': 'Keyboard: focus the board, aim with ← / →, then press Space to shoot.',
      'puzzle.shots': 'Shots left', 'puzzle.next': 'Next fruit', 'puzzle.current': 'Ready to shoot',
      'puzzle.restart': 'Try again', 'puzzle.exit': 'Back to village',
      'puzzle.win': 'A lovely harvest!', 'puzzle.winBody': 'You collected both goals. Your little garden is off to a good start.',
      'puzzle.lose': 'Try a fresh angle', 'puzzle.loseShots': 'You used all 18 shots. Aim for a group of the same fruit and give it another go.',
      'puzzle.loseLine': 'The fruit reached the garden gate. Clear clusters before they grow too low.',
      'puzzle.noRewards': 'Demo only: no materials or tickets are awarded. Values and matching rules are still being tested.',
      'puzzle.demoNote': 'One handmade demo stage. No materials or tickets are awarded; values and rules are illustrative.',
      'puzzle.board': 'Fruit-shooting board. Move pointer to aim and click to shoot, or use arrow keys and Space.',
      'puzzle.ready': 'Match the fruit below to a cluster above.',
      'puzzle.collected': 'Collected {amount} fruit.', 'puzzle.miss': 'Fruit placed. Match at least 3 to pop the group.',
      'puzzle.goal': 'Collect both fruits', 'puzzle.boundary': 'GARDEN GATE', 'puzzle.celebration': 'Goals complete',
    },
    vi: {
      'puzzle.title': 'Mùa quả đầu tiên', 'puzzle.start': 'Chơi thử', 'puzzle.playButton': 'Chơi thử',
      'puzzle.eyebrow': 'MÙA THU HOẠCH NHỎ', 'puzzle.demo': 'Chơi thử · một màn thiết kế sẵn',
      'puzzle.aim': 'Ngắm, ghép, nở hoa.', 'puzzle.instructions': 'Di chuột để ngắm rồi bấm để bắn. Ghép từ 3 trái cùng loại trở lên để làm nổ cụm.',
      'puzzle.touch': 'Trên màn hình cảm ứng, chạm vào vị trí muốn ngắm.',
      'puzzle.rules': 'Trái cây có thể bật vào hai thành bên. Những trái không còn nối với trần sẽ rơi xuống và được tính vào mục tiêu.',
      'puzzle.keys': 'Bàn phím: chọn bảng chơi, ngắm bằng ← / → rồi nhấn Space để bắn.',
      'puzzle.shots': 'Lượt bắn còn lại', 'puzzle.next': 'Trái tiếp theo', 'puzzle.current': 'Sẵn sàng bắn',
      'puzzle.restart': 'Chơi lại', 'puzzle.exit': 'Về ngôi làng',
      'puzzle.win': 'Mùa thu hoạch thật đẹp!', 'puzzle.winBody': 'Bạn đã hoàn thành cả hai mục tiêu. Khu vườn nhỏ có một khởi đầu đầy hứa hẹn.',
      'puzzle.lose': 'Thử một góc bắn mới', 'puzzle.loseShots': 'Bạn đã dùng hết 18 lượt bắn. Hãy ngắm vào cụm cùng loại và thử lại nhé.',
      'puzzle.loseLine': 'Trái cây đã chạm cổng vườn. Hãy phá các cụm trước khi chúng xuống quá thấp.',
      'puzzle.noRewards': 'Chỉ chơi thử: không cộng nguyên liệu hay vé. Số liệu và luật ghép vẫn đang thử nghiệm.',
      'puzzle.demoNote': 'Một màn chơi thử thiết kế sẵn. Không cộng nguyên liệu hay vé; số liệu và luật chỉ là minh họa.',
      'puzzle.board': 'Bảng bắn trái cây. Di chuột để ngắm và bấm để bắn, hoặc dùng phím mũi tên và Space.',
      'puzzle.ready': 'Ghép trái đang cầm với một cụm cùng loại phía trên.',
      'puzzle.collected': 'Đã thu {amount} trái cây.', 'puzzle.miss': 'Đã đặt trái. Ghép ít nhất 3 trái để làm nổ cụm.',
      'puzzle.goal': 'Thu đủ cả hai loại', 'puzzle.boundary': 'CỔNG VƯỜN', 'puzzle.celebration': 'Đủ mục tiêu',
    },
  };
  Object.keys(translations).forEach(language => Object.assign(FB.translations[language], translations[language]));

  const W=640, H=430, R=16, STEP=32, DY=Math.sqrt(3)*R;
  const LEFT=96, RIGHT=544, TOP=42, LIMIT=316, ORIGIN={x:320,y:382};
  const key=(r,c)=>`${r}:${c}`;
  const point=(r,c)=>({x:LEFT+R+c*STEP+(r%2)*R,y:TOP+r*DY});
  const valid=(r,c)=>r>=0&&r<=10&&c>=0&&c<(r%2?13:14);
  const neighbors=(r,c)=>[[r,c-1],[r,c+1],[r-1,c-(r%2?0:1)],[r-1,c+(r%2?1:0)],[r+1,c-(r%2?0:1)],[r+1,c+(r%2?1:0)]].filter(([a,b])=>valid(a,b));
  const clampAngle=angle=>Math.max(-Math.PI+.25,Math.min(-.25,angle));
  const nextType=shots=>shots%2===0?'apple':'grape';
  function createModel() {
    let board=new Map(), used=0, collected={apple:0,grape:0}, status='playing', reason='';
    for(let row=0;row<3;row++) for(const [cols,type] of [[[1,2],'apple'],[[4,5],'grape'],[[8,9],'apple'],[[11,12],'grape']]) {
      for(const col of cols) board.set(key(row,col),{row,col,type,...point(row,col)});
    }
    function snapshot(){return {board:[...board.values()].map(f=>({...f})),shotsLeft:18-used,shotsUsed:used,collected:{...collected},status,reason,current:nextType(used),next:nextType(used+1)};}
    function trace(angle) {
      angle=clampAngle(angle);
      let x=ORIGIN.x,y=ORIGIN.y,dx=Math.cos(angle)*3,dy=Math.sin(angle)*3,bounces=0,hit=null;
      const path=[{x,y}];
      for(let i=0;i<1600;i++) {
        x+=dx;y+=dy;
        if(x<LEFT+R){x=2*(LEFT+R)-x;dx=-dx;bounces++;}
        if(x>RIGHT-R){x=2*(RIGHT-R)-x;dx=-dx;bounces++;}
        path.push({x,y});
        hit=[...board.values()].find(f=>Math.hypot(f.x-x,f.y-y)<=R*2-1);
        if(hit||y<=TOP)break;
      }
      return {path,hit,x,y,bounces};
    }
    function shoot(angle) {
      if(status!=='playing')return null;
      const travel=trace(angle), type=nextType(used), before=snapshot().board;
      let candidates=travel.hit?neighbors(travel.hit.row,travel.hit.col):Array.from({length:14},(_,c)=>[0,c]);
      candidates=candidates.filter(([r,c])=>!board.has(key(r,c)));
      // Snap only into a real adjacent hex cell; a fully blocked collision is a loss.
      candidates.sort((a,b)=>Math.hypot(point(...a).x-travel.x,point(...a).y-travel.y)-Math.hypot(point(...b).x-travel.x,point(...b).y-travel.y));
      used++;
      if(!candidates.length){status='lost';reason='line';return {...travel,before,type,removed:[],after:snapshot()};}
      const [row,col]=candidates[0], fruit={row,col,type,...point(row,col)};
      board.set(key(row,col),fruit);
      const connected=new Set(),queue=[fruit];
      while(queue.length){const f=queue.pop(),id=key(f.row,f.col);if(connected.has(id))continue;connected.add(id);for(const [r,c] of neighbors(f.row,f.col)){const n=board.get(key(r,c));if(n?.type===type&&!connected.has(key(r,c)))queue.push(n);}}
      const removed=[];
      if(connected.size>=3){
        for(const id of connected){removed.push(board.get(id));board.delete(id);}
        const anchored=new Set(),stack=[...board.values()].filter(f=>f.row===0);
        while(stack.length){const f=stack.pop(),id=key(f.row,f.col);if(anchored.has(id))continue;anchored.add(id);for(const [r,c] of neighbors(f.row,f.col)){const n=board.get(key(r,c));if(n&&!anchored.has(key(r,c)))stack.push(n);}}
        for(const [id,f] of board){if(!anchored.has(id)){removed.push({...f,dropped:true});board.delete(id);}}
        removed.forEach(f=>collected[f.type]++);
      }
      if(collected.apple>=12&&collected.grape>=9)status='won';
      else if([...board.values()].some(f=>f.y+R>=LIMIT)){status='lost';reason='line';}
      else if(used>=18){status='lost';reason='shots';}
      return {...travel,before,type,removed,placed:fruit,after:snapshot()};
    }
    return {snapshot,trace,shoot};
  }

  let model=createModel(), root=null, canvas=null, ctx=null, translate=null, angle=-Math.PI/2;
  let raf=0,lastTime=0,flight=null,effects=[],message='puzzle.ready',messageAmount=0,cleanup=[];
  function getState(){return model.snapshot();}
  function drawFruit(context,x,y,type,r=R,alpha=1){
    context.save();context.globalAlpha=alpha;
    const grape=type==='grape', gradient=context.createRadialGradient(x-r*.4,y-r*.5,2,x,y,r*1.2);
    gradient.addColorStop(0,grape?'#d8bee8':'#ffd197');gradient.addColorStop(.55,grape?'#a988c0':'#ef9872');gradient.addColorStop(1,grape?'#775798':'#cb6c53');
    context.shadowColor='#345a3730';context.shadowBlur=4;context.shadowOffsetY=3;
    context.fillStyle=gradient;context.beginPath();context.arc(x,y,r,0,Math.PI*2);context.fill();context.shadowColor='transparent';
    context.strokeStyle=grape?'#785b94':'#ae6352';context.lineWidth=1.5;context.stroke();
    context.fillStyle=grape?'#72528e':'#f1b48c';
    if(grape){for(const [a,b] of [[-4,-4],[4,-4],[-7,2],[0,2],[7,2],[-3,8],[3,8]]){context.beginPath();context.arc(x+a*r/16,y+b*r/16,r*.19,0,Math.PI*2);context.fill();}}
    else{context.strokeStyle='#fff1c3aa';context.lineWidth=2;context.beginPath();context.arc(x-3,y-2,r*.6,Math.PI*.85,Math.PI*1.3);context.stroke();}
    context.strokeStyle='#696b3b';context.lineWidth=2;context.beginPath();context.moveTo(x,y-r*.5);context.quadraticCurveTo(x-2,y-r*.9,x+1,y-r*1.04);context.stroke();
    context.fillStyle='#778f4d';context.beginPath();context.ellipse(x+r*.23,y-r*.83,r*.23,r*.1,-.5,0,Math.PI*2);context.fill();
    context.restore();
  }
  function draw(now){
    if(!ctx)return;
    ctx.clearRect(0,0,W,H);
    const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#dce8cd');bg.addColorStop(1,'#b0c99d');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#91b38126';for(let i=0;i<12;i++){ctx.beginPath();ctx.ellipse((i*191)%W,40+(i*83)%H,65,35,i,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='#f9f3d64d';ctx.fillRect(LEFT-5,TOP-21,RIGHT-LEFT+10,LIMIT-TOP+21);
    ctx.strokeStyle='#789563';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(LEFT-3,LIMIT);ctx.lineTo(LEFT-3,TOP-23);ctx.quadraticCurveTo(LEFT-3,TOP-29,LEFT+5,TOP-29);ctx.lineTo(RIGHT-5,TOP-29);ctx.quadraticCurveTo(RIGHT+3,TOP-29,RIGHT+3,TOP-23);ctx.lineTo(RIGHT+3,LIMIT);ctx.stroke();
    ctx.strokeStyle='#9b815960';ctx.lineWidth=1;ctx.setLineDash([5,6]);ctx.beginPath();ctx.moveTo(LEFT,LIMIT);ctx.lineTo(RIGHT,LIMIT);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#71825e';ctx.font='8px Trebuchet MS, sans-serif';ctx.textAlign='center';ctx.fillText(translate('puzzle.boundary'),W/2,LIMIT+12);
    const state=model.snapshot();
    if(flight){
      const duration=Math.min(650,Math.max(220,flight.path.length*1.5));
      const progress=Math.max(0,Math.min(1,(now-flight.start)/duration)),index=Math.min(flight.path.length-1,Math.floor(progress*(flight.path.length-1)));
      flight.before.forEach(f=>drawFruit(ctx,f.x,f.y,f.type));
      const p=flight.path[index];drawFruit(ctx,p.x,p.y,flight.type);
      if(progress>=1){effects=flight.removed.map((f,i)=>({...f,start:now,dx:(i%5-2)*12}));message=flight.removed.length?'puzzle.collected':'puzzle.miss';messageAmount=flight.removed.length;flight=null;updateHud();}
    }else{
      state.board.forEach(f=>drawFruit(ctx,f.x,f.y,f.type));
      if(state.status==='playing'){
        const path=model.trace(angle).path;
        for(let i=8;i<path.length;i+=9){ctx.fillStyle=`rgba(255,251,219,${Math.max(.15,.85-i/path.length*.6)})`;ctx.beginPath();ctx.arc(path[i].x,path[i].y,2.1,0,Math.PI*2);ctx.fill();}
      }
    }
    const reduced=FB.state?.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!reduced){effects=effects.filter(f=>now-f.start<550);effects.forEach(f=>{const p=(now-f.start)/550;drawFruit(ctx,f.x+f.dx*p,f.y+(f.dropped?100*p:-20*Math.sin(p*Math.PI)),f.type,R*(1-p*.4),1-p);});}
    ctx.save();ctx.translate(ORIGIN.x,ORIGIN.y);ctx.rotate(angle+Math.PI/2);ctx.fillStyle='#a68b56';ctx.beginPath();ctx.roundRect(-13,-34,26,43,9);ctx.fill();ctx.fillStyle='#d9bf80';ctx.fillRect(-8,-32,16,19);ctx.restore();
    ctx.fillStyle='#f4e7bd';ctx.strokeStyle='#fff5d5';ctx.lineWidth=4;ctx.beginPath();ctx.arc(ORIGIN.x,ORIGIN.y,24,0,Math.PI*2);ctx.fill();ctx.stroke();
    if(!flight&&state.status==='playing')drawFruit(ctx,ORIGIN.x,ORIGIN.y,state.current,18);
    ctx.fillStyle='#6a8058';ctx.font='9px Trebuchet MS, sans-serif';ctx.textAlign='center';ctx.fillText(translate('puzzle.current'),ORIGIN.x,H-8);
    drawFruit(ctx,ORIGIN.x+85,ORIGIN.y+2,state.next,12);ctx.fillText(translate('puzzle.next'),ORIGIN.x+85,H-8);
    lastTime=now;raf=requestAnimationFrame(draw);
  }
  function updateHud(){
    if(!root)return;
    const state=model.snapshot();
    root.querySelector('[data-puzzle-apples]').textContent=`${Math.min(12,state.collected.apple)} / 12`;
    root.querySelector('[data-puzzle-grapes]').textContent=`${Math.min(9,state.collected.grape)} / 9`;
    root.querySelector('[data-puzzle-shots]').textContent=state.shotsLeft;
    root.querySelector('[data-puzzle-status]').textContent=translate(message,{amount:messageAmount});
    const overlay=root.querySelector('[data-puzzle-result]');
    overlay.hidden=state.status==='playing'||!!flight;
    if(!overlay.hidden){const won=state.status==='won';overlay.innerHTML=`<div class="puzzle-result-card"><span class="tag ${won?'gold':'muted'}">${FB.icon(won?'leaf':'info')}${translate('common.demoOnly')}</span><h3>${translate(won?'puzzle.win':'puzzle.lose')}</h3><p>${translate(won?'puzzle.winBody':state.reason==='shots'?'puzzle.loseShots':'puzzle.loseLine')}</p><p class="puzzle-small">${translate('puzzle.noRewards')}</p><button class="primary-button" data-puzzle-restart>${FB.icon('play')}${translate('puzzle.restart')}</button><button class="secondary-button" data-close>${translate('puzzle.exit')}</button></div>`;}
  }
  function fire(){
    if(flight||model.snapshot().status!=='playing')return;
    const result=model.shoot(angle);if(!result)return;
    flight={...result,start:performance.now()};effects=[];updateHud();
  }
  function unmount(){
    if(raf)cancelAnimationFrame(raf);raf=0;
    cleanup.forEach(f=>f());cleanup=[];
    if(flight&&!flight.pausedAt)flight.pausedAt=performance.now();
    root=null;canvas=null;ctx=null;
  }
  function reset(){
    model=createModel();angle=-Math.PI/2;flight=null;effects=[];message='puzzle.ready';messageAmount=0;
    if(root)updateHud();
  }
  function mount(container,t){
    unmount();root=container;translate=t;
    if(flight?.pausedAt){flight.start+=performance.now()-flight.pausedAt;delete flight.pausedAt;}
    root.innerHTML=`<div class="puzzle-shell"><div class="puzzle-goalbar"><div class="puzzle-goal apple">${FB.icon('apple')}<div><small>${t('resource.apple')}</small><strong data-puzzle-apples></strong></div></div><div class="puzzle-goal grape">${FB.icon('grape')}<div><small>${t('resource.grape')}</small><strong data-puzzle-grapes></strong></div></div><div class="puzzle-shot-count"><small>${t('puzzle.shots')}</small><strong data-puzzle-shots></strong></div></div><div class="puzzle-main"><div class="puzzle-board-wrap"><canvas class="puzzle-canvas" width="640" height="430" tabindex="0" aria-label="${t('puzzle.board')}"></canvas><div class="puzzle-result" data-puzzle-result hidden></div></div><aside class="puzzle-sidebar"><span class="tag gold">${t('common.demoOnly')}</span><h3>${t('puzzle.aim')}</h3><p>${t('puzzle.instructions')}</p><p>${t('puzzle.rules')}</p><p class="puzzle-small">${t('puzzle.touch')}</p><p class="puzzle-small">${t('puzzle.keys')}</p><button class="secondary-button" data-puzzle-restart>${FB.icon('center')}${t('puzzle.restart')}</button><p class="puzzle-status" data-puzzle-status role="status" aria-live="polite"></p></aside></div></div>`;
    canvas=root.querySelector('canvas');ctx=canvas.getContext('2d');
    const listen=(el,name,fn,options)=>{el.addEventListener(name,fn,options);cleanup.push(()=>el.removeEventListener(name,fn,options));};
    const aim=event=>{const b=canvas.getBoundingClientRect(),x=(event.clientX-b.left)/b.width*W,y=(event.clientY-b.top)/b.height*H;angle=clampAngle(Math.atan2(Math.min(y,ORIGIN.y-30)-ORIGIN.y,x-ORIGIN.x));};
    listen(canvas,'pointermove',aim);
    listen(canvas,'pointerdown',event=>{if(event.button!==0)return;event.preventDefault();aim(event);canvas.focus({preventScroll:true});fire();});
    listen(canvas,'keydown',event=>{if(['ArrowLeft','ArrowRight',' ','Enter'].includes(event.key)){event.preventDefault();if(event.key==='ArrowLeft')angle=clampAngle(angle-.055);else if(event.key==='ArrowRight')angle=clampAngle(angle+.055);else fire();}});
    listen(root,'click',event=>{if(event.target.closest('[data-puzzle-restart]')){reset();canvas.focus({preventScroll:true});}});
    updateHud();raf=requestAnimationFrame(draw);
  }
  FB.puzzle={reset,mount,unmount,getState,createModel};
})();
