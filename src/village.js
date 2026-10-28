/* Original modular SVG art and a local-only decorating prototype. No village resources are spent. */
window.FB = window.FB || {};
(() => {
  const copy = {
    en: { title:'Village studio', eyebrow:'A PLACE OF YOUR OWN', note:'Decorating prototype · layout saved on this device · no resources spent.', intro:'A little room to grow', help:'Choose an item, then choose an empty tile. Select an existing item to move it.', select:'Select / move', rice:'Rice paddy', tree:'Apple tree', path:'Stone path', lamp:'Garden lamp', flowers:'Wildflowers', cottage:'Cottage', workshop:'Workbench', cedar:'Cypress', move:'Move selected', remove:'Remove', undo:'Undo', growth:'Change growth', grid:'Show grid', placed:'Placed and saved.', moved:'Moved and saved.', blocked:'This space is occupied. Choose a clear tile.', outside:'Choose a tile inside the meadow.', ready:'Your meadow is ready. Try placing a path or a lamp.', selected:'Selected: {name}. Move, remove or change its growth below.', placing:'Place: {name}. Choose a clear tile.', moving:'Choose a new space for {name}.', removed:'Item removed. Undo can bring it back.', undone:'Last change undone.', noUndo:'No changes to undo.', keyboard:'Keyboard: Tab to the meadow, arrows to choose a tile, Enter to place or select, Esc to cancel.', board:'Village decorating grid. Arrow keys choose a tile; Enter places or selects an item.', autosave:'Saved on this device', unavailable:'Storage unavailable; this layout will last for this visit.', young:'Growing', ripe:'Ready to harvest', selection:'Selected item', empty:'Select a placed item to edit it.', count:'items', cancel:'Cancel placement', tile:'Tile {x}, {y}', changed:'Growth preview changed.', demo:'BUILD & DECORATE', farmer:'A gardener walks between the plots.' },
    vi: { title:'Xưởng thiết kế làng', eyebrow:'GÓC VƯỜN CỦA BẠN', note:'Bản thử trang trí · lưu bố cục trên thiết bị này · không trừ tài nguyên.', intro:'Một góc vườn để lớn lên', help:'Chọn vật dụng rồi chọn ô trống. Chọn vật đã đặt để di chuyển.', select:'Chọn / di chuyển', rice:'Ruộng lúa', tree:'Cây táo', path:'Đường đá', lamp:'Đèn vườn', flowers:'Hoa dại', cottage:'Nhà nhỏ', workshop:'Bàn làm việc', cedar:'Cây bách', move:'Di chuyển', remove:'Dỡ bỏ', undo:'Hoàn tác', growth:'Đổi giai đoạn', grid:'Hiện lưới', placed:'Đã đặt và lưu.', moved:'Đã di chuyển và lưu.', blocked:'Ô này đã có vật khác. Hãy chọn ô trống.', outside:'Hãy chọn một ô trong khu đất.', ready:'Khu vườn đã sẵn sàng. Thử đặt một đoạn đường hoặc đèn nhé.', selected:'Đã chọn: {name}. Có thể di chuyển, dỡ bỏ hoặc đổi giai đoạn bên dưới.', placing:'Đang đặt: {name}. Hãy chọn ô trống.', moving:'Chọn chỗ mới cho {name}.', removed:'Đã dỡ bỏ. Có thể hoàn tác để khôi phục.', undone:'Đã hoàn tác thay đổi vừa rồi.', noUndo:'Chưa có thay đổi để hoàn tác.', keyboard:'Bàn phím: Tab vào khu đất, phím mũi tên chọn ô, Enter để đặt hoặc chọn, Esc để hủy.', board:'Lưới trang trí làng. Phím mũi tên chọn ô; Enter đặt hoặc chọn vật dụng.', autosave:'Đã lưu trên thiết bị này', unavailable:'Không lưu được trên thiết bị; bố cục chỉ tồn tại trong lần mở này.', young:'Đang lớn', ripe:'Sẵn sàng thu hoạch', selection:'Vật đang chọn', empty:'Chọn một vật đã đặt để chỉnh sửa.', count:'vật dụng', cancel:'Hủy đặt vật', tile:'Ô {x}, {y}', changed:'Đã đổi giai đoạn để xem trước.', demo:'XÂY DỰNG & TRANG TRÍ', farmer:'Một người làm vườn đi bộ giữa các thửa đất.' }
  };
  for (const lang of Object.keys(copy)) {
    FB.translations = FB.translations || {en:{},vi:{}};
    Object.assign(FB.translations[lang], Object.fromEntries(Object.entries(copy[lang]).map(([k,v])=>['villageStudio.'+k,v])));
  }
  const TYPES = {rice:[2,2],tree:[1,1],path:[1,1],lamp:[1,1],flowers:[1,1],cedar:[1,1],cottage:[2,2],workshop:[2,1]};
  const SIZE=11, HW=30, HH=15, OX=390, OY=78, KEY='fruit-bloom-village-studio-v1';
  const point=(x,y)=>({x:OX+(x-y)*HW,y:OY+(x+y)*HH});
  const diamond=(x,y,w=1,h=1)=>`${x},${y} ${x+w*HW},${y+w*HH} ${x+(w-h)*HW},${y+(w+h)*HH} ${x-h*HW},${y+h*HH}`;
  const poly=(points,fill,extra='')=>`<polygon points="${points}" fill="${fill}" ${extra}/>`;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const initial=()=>[
    {id:1,type:'cottage',x:2,y:1},{id:2,type:'rice',x:6,y:1,growth:0},{id:3,type:'rice',x:8,y:1,growth:1},
    {id:4,type:'tree',x:1,y:4,growth:1},{id:5,type:'tree',x:3,y:4,growth:1},{id:6,type:'workshop',x:6,y:5},
    {id:7,type:'lamp',x:4,y:5},{id:8,type:'flowers',x:8,y:5},{id:9,type:'cedar',x:2,y:8},
    ...Array.from({length:9},(_,n)=>({id:10+n,type:'path',x:n+1,y:6})),
    {id:19,type:'lamp',x:8,y:7},{id:20,type:'flowers',x:1,y:8},{id:21,type:'tree',x:7,y:8,growth:0}
  ].map(o=>({...o,growth:o.growth===1?1:0}));
  function fits(items,type,x,y,ignore=null){
    const [w,h]=TYPES[type]||[0,0];
    return w&&x>=0&&y>=0&&x+w<=SIZE&&y+h<=SIZE&&!items.some(o=>{
      if(o.id===ignore)return false;
      const [ow,oh]=TYPES[o.type];return x<o.x+ow&&x+w>o.x&&y<o.y+oh&&y+h>o.y;
    });
  }
  // Preserve this visit's edits across modal/language remounts when storage is blocked.
  let memoryFallback=null;
  function load(){
    if(memoryFallback)return clone(memoryFallback);
    try{const saved=JSON.parse(localStorage.getItem(KEY));if(Array.isArray(saved)&&saved.length<=SIZE*SIZE){const out=[];for(const o of saved){if(!TYPES[o.type]||!Number.isInteger(o.id)||out.some(a=>a.id===o.id)||!Number.isInteger(o.x)||!Number.isInteger(o.y)||!fits(out,o.type,o.x,o.y))throw Error('layout');out.push({id:o.id,type:o.type,x:o.x,y:o.y,growth:o.growth===1?1:0});}return out;}}catch(_){}
    return initial();
  }
  function art(type,growth=1){
    if(type==='path')return `<g stroke="#d5d0ad" stroke-width="1">${poly(diamond(0,0),'#c5bd9d')}<path d="M-23 16 0 4 22 15 0 26Z" fill="#e5dec2"/><path d="M0 4V14L-11 21M0 14 22 15" fill="none"/></g>`;
    if(type==='rice'){
      let stems='';for(let x=0;x<4;x++)for(let y=0;y<4;y++){const px=(x-y)*12,py=11+(x+y)*6;stems+=`<g transform="translate(${px} ${py})" class="studio-rice-blades"><path d="M0 0Q-1 -10 -6 -17M0 0Q3 -12 1 -21M0 0Q8 -8 7 -16" fill="none" stroke="${growth?'#a6a548':'#598b49'}" stroke-width="2.2" stroke-linecap="round"/>${growth?'<path d="M1 -21Q8 -25 10 -16M-6 -17Q-12 -19 -11 -10M7 -16Q12 -19 13 -11" fill="none" stroke="#eec45d" stroke-width="3.8" stroke-linecap="round"/>':''}</g>`;}
      return `${poly(diamond(0,0,2,2),'#b4a17a','stroke="#957a50" stroke-width="3"')}${poly(diamond(0,7,1.65,1.65),growth?'#a4b49a':'#9ec8b5','transform="translate(0 2)"')}<g transform="translate(0 10)">${stems}</g><path d="M-52 32 0 58 54 31" fill="none" stroke="#ccb58a" stroke-width="5"/>`;
    }
    if(type==='tree'||type==='cedar'){
      if(type==='cedar')return '<ellipse cy="17" rx="22" ry="11" fill="#547a5530"/><path d="M-3 17V-29H3V17" fill="#967345"/><g class="studio-tree-crown"><path d="M0 -80Q-27 -46 -19 -25Q-37 -8 -17 1Q0 10 19 -3Q34 -14 19 -27Q26 -47 0 -80Z" fill="#4f8062"/><path d="M-3 -70Q-18 -41 -11 -24Q-26 -11 -9 -4Q-3 -20 -3 -70" fill="#68996b"/></g>';
      return `<ellipse cy="17" rx="29" ry="12" fill="#547a552a"/><path d="M-5 17-3 -29 3 -29 6 17Z" fill="#9d794d"/><path d="M0 -13-15 -35M1 -22 15 -39" fill="none" stroke="#9d794d" stroke-width="5"/><g class="studio-tree-crown" ${growth?'':'transform="translate(0 -4) scale(.72)"'}><path d="M-32 -28Q-46 -43 -28 -58Q-28 -83 -5 -78Q19 -91 29 -67Q49 -61 38 -40Q33 -17 9 -26Q-13 -12 -32 -28" fill="#669952"/><path d="M-29 -53Q-29 -73 -9 -71Q8 -85 20 -66Q0 -58 -5 -38Q-22 -30 -30 -42" fill="#8bb661"/>${growth?'<g fill="#dd7253"><circle cx="-24" cy="-47" r="6"/><circle cx="8" cy="-61" r="6"/><circle cx="24" cy="-39" r="6"/><circle cx="-2" cy="-30" r="6"/></g><g fill="#f3a36d"><circle cx="-26" cy="-49" r="2"/><circle cx="6" cy="-63" r="2"/></g>':''}</g>`;
    }
    if(type==='lamp')return '<ellipse cy="17" rx="13" ry="7" fill="#547a5528"/><path d="M-6 17H6L4 12H2V-39H-2V12H-4Z" fill="#68796b"/><path d="M-8 -57H8L7 -40H-7Z" fill="#ffe6a1" stroke="#68796b" stroke-width="3"/><path d="M-12 -57 0 -66 12 -57Z" fill="#68796b"/><ellipse cy="-48" rx="17" ry="18" fill="#ffe6a1" opacity=".12" class="studio-lamp-glow"/>';
    if(type==='flowers')return '<ellipse cy="16" rx="25" ry="13" fill="#83a766"/><g stroke="#5d8956" stroke-width="2"><path d="M-12 16V-4M0 22V0M12 16V-7"/></g><g fill="#edbc82"><circle cx="-12" cy="-5" r="7"/><circle cx="12" cy="-8" r="7"/></g><circle cy="-1" r="8" fill="#efd7c9"/><g fill="#b6924f"><circle cx="-12" cy="-5" r="2.4"/><circle cx="12" cy="-8" r="2.4"/><circle cy="-1" r="2.8"/></g>';
    if(type==='cottage')return `${poly(diamond(0,8,2,2),'#7f8d6230')}<path d="M-49 -24 0 0V51L-49 27Z" fill="#e4d2a4"/><path d="M0 0 49 -24V27L0 51Z" fill="#f8e9c0"/><path d="M-58 -25-10 -70 51 -39 3 6Z" fill="#b87955"/><path d="M-10 -70 58 -27 51 -39Z" fill="#d39368"/><path d="M-42 -30 3 -8M-30 -42 15 -20M-18 -54 27 -32" fill="none" stroke="#c78b62" stroke-width="3"/><path d="M14 43V16L30 8V35Z" fill="#8f7354"/><path d="M-35 -5-18 3V20L-35 12Z" fill="#6d9d96" stroke="#f8e9c0" stroke-width="3"/><path d="M36 -55V-79L46 -74V-48Z" fill="#dcba8d"/><path d="M0 51 14 58 37 45 24 38Z" fill="#b7a078"/><circle cx="25" cy="25" r="1.5" fill="#eccc8e"/>`;
    if(type==='workshop')return '<ellipse cx="14" cy="26" rx="45" ry="17" fill="#547a5528"/><path d="M-27 -1V29M6 15V45M44 -7V23" stroke="#92734b" stroke-width="6"/><path d="M-34 -10 8 11 52 -11 10 -32Z" fill="#dbb780" stroke="#ad895b" stroke-width="3"/><path d="M-34 -10V0L8 21V11M8 21 52 -1V-11" fill="#b48d5a"/><path d="M-7 -17 7 -10 23 -18 10 -25Z" fill="#e9d6a8"/><path d="M11 -12 31 -22" stroke="#6d7e70" stroke-width="4"/><path d="M25 -25 34 -20" stroke="#6d7e70" stroke-width="7"/><path d="M-23 -30V-15" stroke="#8e7150" stroke-width="4"/><path d="M-29 -30-23 -37-17 -30" fill="none" stroke="#6d7e70" stroke-width="3"/>';
    return '';
  }
  function farmer(){return '<ellipse cy="0" rx="11" ry="5" fill="#405b4a25"/><g class="studio-farmer-body"><path class="studio-leg first" d="M-4 -15-5 -2" stroke="#597b73" stroke-width="5" stroke-linecap="round"/><path class="studio-leg second" d="M4 -15 5 -2" stroke="#597b73" stroke-width="5" stroke-linecap="round"/><path d="M-9 -33Q0 -38 9 -33L8 -14H-8Z" fill="#edb66c"/><path d="M-5 -32V-16H6V-32" fill="#748c69"/><path d="M-10 -30-14 -18M10 -30 14 -21" stroke="#e8bd91" stroke-width="5" stroke-linecap="round"/><circle cy="-42" r="10" fill="#eac497"/><path d="M-10 -44Q-11 -58 2 -55Q12 -54 10 -43L6 -49Z" fill="#7d644b"/><ellipse cy="-50" rx="17" ry="4" fill="#e4c28c"/><path d="M-10 -51Q-12 -65 2 -64Q11 -64 10 -51Z" fill="#f1d7a2"/><circle cx="4" cy="-42" r="1.2" fill="#554f43"/></g>';}
  let mounted=null;
  function mount(container,_t,language){
    unmount();
    const lang=language==='vi'||(!language&&document.documentElement.lang==='vi')?'vi':'en';
    const tr=(key,values={})=>Object.entries(values).reduce((s,[k,v])=>s.replace('{'+k+'}',v),copy[lang][key]||key);
    let items=load(), history=[], tool=null, selected=null, moving=null, hover=null, keyboardCell={x:4,y:4}, grid=true, status=tr('ready'), storage=true;
    const aborter=new AbortController(), on=(el,type,fn)=>el.addEventListener(type,fn,{signal:aborter.signal});
    container.innerHTML=`<section class="studio-shell"><div class="studio-meadow"><div class="studio-map-label"><span>${tr('demo')}</span><strong>${tr('intro')}</strong></div><svg class="studio-svg" viewBox="0 0 780 490" role="application" tabindex="0" aria-label="${tr('board')}"><defs><linearGradient id="studio-ground" x2="0" y2="1"><stop stop-color="#c4d29b"/><stop offset="1" stop-color="#9fbd82"/></linearGradient><radialGradient id="studio-sky"><stop stop-color="#e6ecd1"/><stop offset="1" stop-color="#c8dab6"/></radialGradient></defs><rect width="780" height="490" fill="url(#studio-sky)"/><ellipse cx="390" cy="296" rx="330" ry="167" fill="#718e6020"/><path d="M60 243 390 408 720 243V258L390 423 60 258Z" fill="#8fa571"/><polygon points="390,78 720,243 390,408 60,243" fill="url(#studio-ground)"/><g class="studio-grid"></g><g class="studio-objects"></g><g class="studio-preview" pointer-events="none"></g><g class="studio-cursor" pointer-events="none"></g></svg><div class="studio-map-bottom"><label><input type="checkbox" class="studio-grid-toggle" checked> ${tr('grid')}</label><span class="studio-save"></span></div></div><aside class="studio-tools"><p class="studio-help">${tr('help')}</p><button class="studio-select studio-tool active" data-studio-tool="select">${tr('select')}</button><div class="studio-palette">${Object.keys(TYPES).map(type=>`<button class="studio-tool" data-studio-tool="${type}" aria-pressed="false"><svg viewBox="-65 -92 130 155" aria-hidden="true">${art(type,1)}</svg><span>${tr(type)}</span><small>${TYPES[type].join(' × ')}</small></button>`).join('')}</div><div class="studio-selected"><strong>${tr('selection')}</strong><p class="studio-selection-label">${tr('empty')}</p><div class="studio-edit-buttons"><button data-studio-action="move" disabled>${tr('move')}</button><button data-studio-action="remove" disabled>${tr('remove')}</button><button data-studio-action="growth" hidden>${tr('growth')}</button></div></div><button class="studio-undo" data-studio-action="undo" disabled>↶ ${tr('undo')}</button></aside><p class="studio-status" role="status" aria-live="polite"></p><p class="studio-keyboard">${tr('keyboard')}</p></section>`;
    const svg=container.querySelector('.studio-svg'), objectLayer=container.querySelector('.studio-objects'), preview=container.querySelector('.studio-preview'), cursor=container.querySelector('.studio-cursor');
    const gridLayer=container.querySelector('.studio-grid');
    for(let x=0;x<SIZE;x++)for(let y=0;y<SIZE;y++){const p=point(x,y);gridLayer.insertAdjacentHTML('beforeend',poly(diamond(p.x,p.y),(x+y)%2?'#ffffff08':'#486e3304','stroke="#6d915b35" stroke-width=".8"'));}
    function save(){try{localStorage.setItem(KEY,JSON.stringify(items));storage=true;memoryFallback=null;}catch(_){storage=false;memoryFallback=clone(items);}}
    function remember(){history.push(clone(items));if(history.length>30)history.shift();}
    function setStatus(value){status=value;container.querySelector('.studio-status').textContent=value;}
    function sync(){
      const chosen=items.find(o=>o.id===selected);
      container.querySelectorAll('[data-studio-tool]').forEach(b=>{const active=b.dataset.studioTool===(tool||'select');b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
      container.querySelector('.studio-selection-label').textContent=chosen?`${tr(chosen.type)}${['tree','rice'].includes(chosen.type)?' · '+tr(chosen.growth?'ripe':'young'):''}`:tr('empty');
      container.querySelector('[data-studio-action="move"]').disabled=!chosen;
      container.querySelector('[data-studio-action="remove"]').disabled=!chosen;
      container.querySelector('[data-studio-action="growth"]').hidden=!chosen||!['tree','rice'].includes(chosen.type);
      container.querySelector('[data-studio-action="undo"]').disabled=!history.length;
      container.querySelector('.studio-save').textContent=storage?`${items.length} ${tr('count')} · ${tr('autosave')}`:tr('unavailable');
      setStatus(status);draw();
    }
    function draw(){
      objectLayer.innerHTML=items.slice().sort((a,b)=>(a.x+a.y+TYPES[a.type][0]+TYPES[a.type][1])-(b.x+b.y+TYPES[b.type][0]+TYPES[b.type][1])).map(o=>{
        const p=point(o.x,o.y),[w,h]=TYPES[o.type];
        return `<g data-studio-id="${o.id}" transform="translate(${p.x} ${p.y})" class="studio-object${o.id===selected?' selected':''}"><title>${tr(o.type)}</title>${o.id===selected?poly(diamond(0,0,w,h),'#fff3ae66','stroke="#fbefb0" stroke-width="3"'):''}<g transform="translate(${o.type==='rice'||o.type==='cottage'?0:o.type==='workshop'?0:0} ${o.type==='rice'||o.type==='cottage'||o.type==='workshop'?0:14})">${art(o.type,o.growth)}</g></g>`;
      }).join('');
      // The gardener is an independent scene object, with separate leg and body animation.
      const paths=items.filter(o=>o.type==='path'), routeOpen=Array.from({length:7},(_,i)=>i+2).every(x=>paths.some(o=>o.x===x&&o.y===6));
      if(paths.length){const resting=paths[Math.floor(paths.length/2)],p=point(routeOpen?4:resting.x,routeOpen?6:resting.y);objectLayer.insertAdjacentHTML('beforeend',`<g class="studio-farmer${routeOpen?'':' studio-farmer-idle'}" transform="translate(${p.x} ${p.y+15})" pointer-events="none"><title>${tr('farmer')}</title><g class="studio-farmer-walk">${farmer()}</g></g>`);}
      drawPreview();
    }
    function drawPreview(){
      preview.innerHTML='';cursor.innerHTML='';
      if(!hover)return;
      const p=point(hover.x,hover.y),kind=tool||items.find(o=>o.id===moving)?.type;
      if(kind){const valid=fits(items,kind,hover.x,hover.y,moving),[w,h]=TYPES[kind];preview.innerHTML=`<g transform="translate(${p.x} ${p.y})">${poly(diamond(0,0,w,h),valid?'#f2e19a77':'#df886777',`stroke="${valid?'#fff5b7':'#bd6550'}" stroke-width="3"`)}<g opacity=".58" transform="translate(0 ${['rice','cottage','workshop'].includes(kind)?0:14})">${art(kind,1)}</g></g>`;}
      else cursor.innerHTML=poly(diamond(p.x,p.y),'#ffffee28','stroke="#fff9cb" stroke-width="2"');
    }
    function choose(cell){
      keyboardCell=cell;hover=cell;
      const kind=tool||items.find(o=>o.id===moving)?.type;
      if(kind){
        if(!fits(items,kind,cell.x,cell.y,moving)){setStatus(tr('blocked'));drawPreview();return;}
        remember();
        if(moving){const obj=items.find(o=>o.id===moving);Object.assign(obj,cell);selected=moving;moving=null;tool=null;setStatus(tr('moved'));}
        else {const obj={id:Math.max(0,...items.map(o=>o.id))+1,type:kind,...cell,growth:kind==='rice'?0:1};items.push(obj);selected=obj.id;setStatus(tr('placed'));}
        save();sync();return;
      }
      const found=items.find(o=>cell.x>=o.x&&cell.x<o.x+TYPES[o.type][0]&&cell.y>=o.y&&cell.y<o.y+TYPES[o.type][1]);
      selected=found?.id||null;setStatus(found?tr('selected',{name:tr(found.type)}):tr('ready'));sync();
    }
    function cellAt(event){const matrix=svg.getScreenCTM();if(!matrix)return null;const q=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse()),dx=(q.x-OX)/HW,dy=(q.y-OY)/HH;const x=Math.floor((dx+dy)/2),y=Math.floor((dy-dx)/2);return x>=0&&x<SIZE&&y>=0&&y<SIZE?{x,y}:null;}
    on(container,'click',event=>{
      const b=event.target.closest('[data-studio-tool],[data-studio-action]');if(!b)return;
      if(b.dataset.studioTool){tool=b.dataset.studioTool==='select'?null:b.dataset.studioTool;moving=null;selected=null;setStatus(tool?tr('placing',{name:tr(tool)}):tr('ready'));sync();return;}
      const action=b.dataset.studioAction,chosen=items.find(o=>o.id===selected);
      if(action==='undo'&&history.length){items=history.pop();tool=null;moving=null;selected=null;save();setStatus(tr('undone'));}
      else if(action==='move'&&chosen){moving=chosen.id;tool=null;setStatus(tr('moving',{name:tr(chosen.type)}));}
      else if(action==='remove'&&chosen){remember();items=items.filter(o=>o.id!==selected);selected=null;moving=null;tool=null;save();setStatus(tr('removed'));}
      else if(action==='growth'&&chosen){remember();chosen.growth=chosen.growth?0:1;save();setStatus(tr('changed'));}
      sync();
    });
    on(svg,'pointermove',event=>{hover=cellAt(event);drawPreview();});
    on(svg,'pointerleave',()=>{hover=null;drawPreview();});
    on(svg,'click',event=>{
      if(!tool&&!moving){const obj=event.target.closest('[data-studio-id]');if(obj){selected=Number(obj.dataset.studioId);const chosen=items.find(o=>o.id===selected);setStatus(tr('selected',{name:tr(chosen.type)}));sync();return;}}
      const cell=cellAt(event);if(cell)choose(cell);else setStatus(tr('outside'));
    });
    on(svg,'keydown',event=>{
      const directions={ArrowRight:[1,0],ArrowLeft:[-1,0],ArrowDown:[0,1],ArrowUp:[0,-1]};
      if(directions[event.key]){event.preventDefault();const [dx,dy]=directions[event.key];keyboardCell={x:Math.max(0,Math.min(SIZE-1,keyboardCell.x+dx)),y:Math.max(0,Math.min(SIZE-1,keyboardCell.y+dy))};hover=keyboardCell;drawPreview();setStatus(tr('tile',{x:hover.x+1,y:hover.y+1}));}
      if(event.key==='Enter'||event.key===' '){event.preventDefault();choose(keyboardCell);}
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();tool=null;moving=null;setStatus(tr('ready'));sync();}
    });
    on(svg,'focus',()=>{hover=keyboardCell;drawPreview();});
    on(container.querySelector('.studio-grid-toggle'),'change',event=>{grid=event.target.checked;gridLayer.style.display=grid?'':'none';});
    mounted={aborter,snapshot:()=>({items:clone(items),selected,tool,moving,canUndo:history.length>0})};save();sync();
  }
  function unmount(){mounted?.aborter.abort();mounted=null;}
  FB.village={mount,unmount,getState:()=>mounted?.snapshot()||null};
})();
