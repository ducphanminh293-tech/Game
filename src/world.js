/* The farm is a scene of movable objects on a shared isometric grid. */
window.FB = window.FB || {};
(() => {
  'use strict';
  const SIZE=12, HW=32, HH=16, ORIGIN={x:650,y:220};
  const NS='http://www.w3.org/2000/svg';
  const FALLBACK={cottage:[2,2],rice:[2,2],tree:[1,1],workshop:[2,1],path:[1,1],lamp:[1,1],flowers:[1,1],cedar:[1,1],fountain:[2,2]};
  const names={en:{cottage:'Farmhouse',rice:'Rice paddy',tree:'Apple tree',workshop:'Workshop',path:'Stone path',lamp:'Garden lamp',flowers:'Flower bed',cedar:'Cypress',fountain:'Fountain'},vi:{cottage:'Nhà vườn',rice:'Ruộng lúa',tree:'Cây táo',workshop:'Xưởng mộc',path:'Đường đá',lamp:'Đèn vườn',flowers:'Luống hoa',cedar:'Cây bách',fountain:'Đài phun nước'}};
  const tile=(x,y)=>({x:ORIGIN.x+(x-y)*HW,y:ORIGIN.y+(x+y)*HH});
  const diamond=(x,y,w=1,h=1)=>`${x},${y} ${x+w*HW},${y+w*HH} ${x+(w-h)*HW},${y+(w+h)*HH} ${x-h*HW},${y+h*HH}`;
  const footprint=type=>FB.game?.catalog?.[type]?.footprint || FALLBACK[type] || [1,1];
  let root=null,svg=null,cameraNode=null,objects=null,badges=null,preview=null,selection=null,grid=null,actor=null;
  let state=null,callbacks={},tool=null,moving=null,selected=null,hover=null,aborter=null,resizeObserver=null;
  let camera={x:0,y:0,scale:1.15},pointer=null,lastInput=0,keyboard={x:5,y:5},actorTime=0,raf=0,previousRoute='',lastActorRender=0;
  const nodes=new Map();
  const lang=()=>state?.language==='vi'?'vi':'en';
  const name=type=>{const translated=FB.t?.(`ui.${type}`);return translated&&translated!==`ui.${type}`?translated:names[lang()][type] || type;};
  const reduced=()=>state?.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const objectArt=(type,growth,level)=>FB.worldArt?.object(type,growth,level) || `<polygon points="${diamond(0,0,...footprint(type))}" fill="#a8ca71"/>`;
  const svgNode=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([key,val])=>n.setAttribute(key,val));return n;};
  function fits(type,x,y,ignore=null){
    const [w,h]=footprint(type);
    return x>=0 && y>=0 && x+w<=SIZE && y+h<=SIZE && !(state?.items || []).some(o=>{
      if(o.id===ignore)return false;const [ow,oh]=footprint(o.type);return x<o.x+ow && x+w>o.x && y<o.y+oh && y+h>o.y;
    });
  }
  function terrain(){
    let tiles='',tufts='';
    for(let x=0;x<SIZE;x++)for(let y=0;y<SIZE;y++){
      const p=tile(x,y),tone=(x*7+y*11)%5;
      tiles+=`<polygon data-ground="${x}:${y}" points="${diamond(p.x,p.y)}" fill="${['#ffffff08','#294e1606','#ffffff00','#ffffff0b','#30542105'][tone]}"/>`;
      if((x*13+y*7)%17===0)tufts+=`<path d="M${p.x-8} ${p.y+16}l-2 -4m3 4 1 -5m3 5 2 -3" stroke="#6f9e4d" stroke-width="1.5" opacity=".3"/>`;
    }
    return `<ellipse cx="650" cy="455" rx="425" ry="220" fill="#226c6640" filter="url(#world-soft)"/><path d="M266 412 650 604 1034 412V434L650 628 266 434Z" fill="#8c9b58"/><path d="M266 420 650 612 1034 420" fill="none" stroke="#b6bc71" stroke-width="13" stroke-linejoin="round"/><polygon points="650,220 1034,412 650,604 266,412" fill="url(#world-grass)" stroke="#ccdf95" stroke-width="6" stroke-linejoin="round"/><g class="world-ground">${tiles}${tufts}</g><g class="world-grid">${Array.from({length:SIZE+1},(_,i)=>{const p=tile(i,0),q=tile(i,SIZE),r=tile(0,i),s=tile(SIZE,i);return `<path d="M${p.x} ${p.y}L${q.x} ${q.y}M${r.x} ${r.y}L${s.x} ${s.y}"/>`;}).join('')}</g>`;
  }
  function environment(){
    const trees=[[278,386,.82],[320,351,.62],[342,326,.72],[974,352,.72],[1012,378,.91],[1055,404,.78],[928,329,.65]];
    const treeShape='<ellipse cy="21" rx="29" ry="12" fill="#26584f22"/><path d="M-4 18V-51H5V18" fill="#9e7750"/><path d="M0-129C-14-113-32-86-22-69C-43-51-39-32-25-25C-45-4-14 15 2 9C26 16 50-8 27-27C45-43 36-59 24-68C33-86 17-111 0-129Z" fill="url(#world-pine)"/><path d="M-2-119C-17-90-14-74-6-70C-29-45-20-28-8-28C-24-8-11 5 1 3" fill="#72ad7c" opacity=".6"/>';
    return `<g class="world-environment" pointer-events="none"><g fill="#b7d8c2" opacity=".8"><ellipse cx="303" cy="352" rx="72" ry="37"/><ellipse cx="997" cy="382" rx="87" ry="45"/></g>${trees.map(([x,y,s])=>`<g transform="translate(${x} ${y}) scale(${s})">${treeShape}</g>`).join('')}<g transform="translate(345 480) rotate(-27)"><path d="M-96 0H50V33H-96Z" fill="#8e7552"/><path d="M-100 -5H54V22H-100Z" fill="#cfa975"/>${Array.from({length:9},(_,i)=>`<path d="M${i*18-96} -3V21" stroke="#a98458" stroke-width="2"/>`).join('')}<path d="M-89 -8V34M41 -8V34" stroke="#98774d" stroke-width="9"/><path d="M-89 -10H41" stroke="#e4c18b" stroke-width="6"/></g><g transform="translate(226 548) rotate(23)"><ellipse cy="14" rx="36" ry="13" fill="#327e7826"/><path d="M-31-5Q0-30 34-5Q18 26-15 18Z" fill="#e1b47c" stroke="#aa8051" stroke-width="3"/><path d="M-21-4Q1-19 24-4Q12 12-9 9Z" fill="#a5784e"/><path d="M-6-11 9 11" stroke="#eaca9b" stroke-width="5"/><path d="M-4 12 31 31" stroke="#95764f" stroke-width="4" stroke-linecap="round"/></g><g class="world-water-lines" stroke="#e1f5df" stroke-width="3" stroke-linecap="round" fill="none" opacity=".55"><path d="M170 475q30 8 65 0M205 615q40 8 79 0M855 640q40 7 75-2M1040 476q45 8 78-2M406 682q28 8 60 0"/></g><g class="world-lilies" fill="#75aa73"><ellipse cx="978" cy="552" rx="16" ry="8"/><ellipse cx="1002" cy="540" rx="12" ry="6"/><ellipse cx="936" cy="581" rx="13" ry="6"/><path d="M976 551q-14-15-1-16q10-6 14 3q9 11-13 13" fill="#f4c6b2"/></g></g>`;
  }
  function background(){
    return `<defs><linearGradient id="world-sky" x2="0" y2="1"><stop stop-color="#c7e9df"/><stop offset=".65" stop-color="#dceac6"/><stop offset="1" stop-color="#9bcdb7"/></linearGradient><linearGradient id="world-grass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c3dc8b"/><stop offset=".6" stop-color="#a6cb78"/><stop offset="1" stop-color="#97c174"/></linearGradient><linearGradient id="world-water" x2="0" y2="1"><stop stop-color="#b7d9c1"/><stop offset=".5" stop-color="#a6d3bd"/><stop offset="1" stop-color="#7fbcb1"/></linearGradient><linearGradient id="world-pine" x2="1" y2=".6"><stop stop-color="#558d70"/><stop offset="1" stop-color="#386c5b"/></linearGradient><filter id="world-soft" x="-.2" y="-.2" width="1.4" height="1.4"><feGaussianBlur stdDeviation="15"/></filter>${FB.worldArt?.defs?.() || ''}</defs><rect width="1200" height="800" fill="url(#world-sky)"/><path d="M-40 258Q85 120 229 212Q320 130 465 195Q613 98 732 204Q896 111 1037 202Q1131 163 1255 244V800H-40Z" fill="#a9c9a2" opacity=".42"/><path d="M-45 335Q101 231 213 281Q346 215 438 302Q620 226 771 291Q978 214 1228 296V800H-45Z" fill="url(#world-water)"/><g class="world-cloud cloud-a" fill="#ffffed" opacity=".65"><ellipse cx="220" cy="145" rx="93" ry="15"/><ellipse cx="199" cy="131" rx="44" ry="24"/><ellipse cx="247" cy="137" rx="41" ry="17"/></g><g class="world-cloud cloud-b" fill="#ffffed" opacity=".6"><ellipse cx="1040" cy="145" rx="88" ry="15"/><ellipse cx="1020" cy="132" rx="42" ry="23"/><ellipse cx="1062" cy="138" rx="40" ry="18"/></g>`;
  }
  function applyCamera(){
    if(!cameraNode)return;
    camera.scale=Math.max(.75,Math.min(2.2,camera.scale));camera.x=Math.max(-360,Math.min(360,camera.x));camera.y=Math.max(-230,Math.min(230,camera.y));
    cameraNode.setAttribute('transform',`translate(${camera.x} ${camera.y}) translate(650 410) scale(${camera.scale}) translate(-650 -410)`);
    root.dataset.zoom=String(Math.round(camera.scale*100));
  }
  function screenPoint(event){
    const m=cameraNode?.getScreenCTM();return m ? new DOMPoint(event.clientX,event.clientY).matrixTransform(m.inverse()) : null;
  }
  function cellAt(event){
    const p=screenPoint(event);if(!p)return null;const dx=(p.x-ORIGIN.x)/HW,dy=(p.y-ORIGIN.y)/HH,x=Math.floor((dx+dy)/2),y=Math.floor((dy-dx)/2);
    return x>=0&&y>=0&&x<SIZE&&y<SIZE?{x,y}:null;
  }
  function clearPlacement(){tool=null;moving=null;hover=null;drawPreview();}
  function announce(message){const live=root?.querySelector('.world-live');if(live)live.textContent=message;}
  function drawPreview(){
    if(!preview)return;
    const kind=tool || state?.items.find(o=>o.id===moving)?.type;
    root.classList.toggle('is-placing',!!kind);grid?.classList.toggle('visible',!!kind);
    preview.innerHTML='';
    if(!hover)return;
    const p=tile(hover.x,hover.y);
    if(kind){const valid=fits(kind,hover.x,hover.y,moving),[w,h]=footprint(kind);preview.innerHTML=`<g transform="translate(${p.x} ${p.y})" class="world-ghost ${valid?'valid':'invalid'}"><polygon points="${diamond(0,0,w,h)}"/><g opacity=".65">${objectArt(kind,1,1)}</g><g transform="translate(${(w-h)*HW/2} ${(w+h)*HH/2})"><circle r="10" fill="${valid?'#fff8d9':'#fce2d3'}"/><path d="${valid?'m-4 0 3 3 5-6':'m-3-3 6 6m-6 0 6-6'}" fill="none" stroke="${valid?'#478a58':'#bd6f4c'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g></g>`;}
    else if(document.activeElement===svg)preview.innerHTML=`<polygon points="${diamond(p.x,p.y)}" fill="#fff4b944" stroke="#fff9dd" stroke-width="3"/>`;
  }
  function choose(cell,id=null){
    if(!state)return;
    if(cell){keyboard=cell;hover=cell;}
    if(tool && cell){callbacks.onPlace?.(tool,cell.x,cell.y);drawPreview();return;}
    if(moving && cell){const result=callbacks.onMove?.(moving,cell.x,cell.y);if(result?.ok!==false)clearPlacement();return;}
    const found=id!=null ? state.items.find(o=>String(o.id)===String(id)) : cell ? state.items.find(o=>{const [w,h]=footprint(o.type);return cell.x>=o.x&&cell.x<o.x+w&&cell.y>=o.y&&cell.y<o.y+h;}) : null;
    selected=found?.id ?? null;drawSelection();callbacks.onSelect?.(selected);
  }
  function drawSelection(){
    if(!selection)return;
    const found=state?.items.find(o=>o.id===selected);
    selection.innerHTML='';
    nodes.forEach((el,id)=>el.classList.toggle('selected',id===selected));
    if(found){const p=tile(found.x,found.y),[w,h]=footprint(found.type);selection.innerHTML=`<polygon points="${diamond(p.x,p.y,w,h)}" fill="#fff4bf66" stroke="#fff9d3" stroke-width="3.5" stroke-linejoin="round"/>`;}
  }
  function growthFor(item,now){
    if(!item.readyAt)return item.growth ?? 1;
    return item.readyAt<=now ? 1 : 0;
  }
  function render(next){
    if(!root)return;
    state=next || FB.game?.getState?.();if(!state)return;
    root.classList.toggle('world-reduced-motion',!!state.reducedMotion);
    svg.setAttribute('aria-label',lang()==='vi'?'Khu vườn. Kéo để di chuyển góc nhìn. Chọn vật thể để thu hoạch hoặc chỉnh sửa. Phím mũi tên chọn ô, Enter chọn hoặc đặt vật.':'Your farm. Drag to pan. Select objects to harvest or edit. Arrow keys choose a tile; Enter selects or places.');
    const now=Date.now(),active=new Set();
    const sorted=state.items.slice().sort((a,b)=>{const [aw,ah]=footprint(a.type),[bw,bh]=footprint(b.type);return (a.x+a.y+aw+ah)-(b.x+b.y+bw+bh) || a.x-b.x;});
    const visibleBadges=[];
    sorted.forEach(item=>{
      active.add(item.id);let node=nodes.get(item.id);
      if(!node){node=svgNode('g',{'data-world-id':item.id,class:'world-object',role:'button',tabindex:'-1'});nodes.set(item.id,node);}
      const p=tile(item.x,item.y),growth=growthFor(item,now),signature=`${item.type}:${growth}:${item.level||1}`;
      node.setAttribute('transform',`translate(${p.x} ${p.y})`);node.setAttribute('aria-label',name(item.type));node.dataset.type=item.type;
      if(node.dataset.art!==signature){node.innerHTML=`<title>${name(item.type)}</title>${objectArt(item.type,growth,item.level||1)}`;node.dataset.art=signature;}
      objects.append(node);
      if(item.readyAt && item.readyAt<=now){const [w,h]=footprint(item.type),offset=item.type==='tree'?-83:item.type==='workshop'?-47:-17;visibleBadges.push(`<g class="world-ready" data-world-ready="${item.id}" data-world-id="${item.id}" transform="translate(${p.x+(w-h)*HW/2} ${p.y+offset})" role="button" aria-label="${lang()==='vi'?'Thu hoạch':'Harvest'} ${name(item.type)}"><g class="world-ready-bob"><path d="M-15-16Q-15-22-9-22H9Q15-22 15-16V1Q15 7 9 7H4L0 12-4 7H-9Q-15 7-15 0Z" fill="#fffbdf" stroke="#fff" stroke-width="2"/><path d="M-6-7Q-7-18 0-18Q7-18 6-7" fill="none" stroke="#a9874c" stroke-width="2.3"/><circle cx="-4" cy="-8" r="4" fill="#ee9970"/><circle cx="3" cy="-9" r="4" fill="#b1c876"/><path d="M-10-9H10L7 3H-7Z" fill="#e9bf77" stroke="#bc9558" stroke-width="1.5"/><path d="M-5-6-4 0M0-6V0M5-6 4 0" stroke="#f9e1aa" stroke-width="1.5" stroke-linecap="round"/></g></g>`);}
    });
    for(const [id,node] of nodes)if(!active.has(id)){node.remove();nodes.delete(id);}
    const badgeMarkup=visibleBadges.join('');if(badges.dataset.signature!==badgeMarkup){badges.innerHTML=badgeMarkup;badges.dataset.signature=badgeMarkup;}
    if(selected!=null&&!active.has(selected))selected=null;
    drawSelection();drawPreview();updateActor();
  }
  function updateActor(){
    if(!actor || !state)return;
    const paths=state.items.filter(o=>o.type==='path');
    let route=[];
    // Longest contiguous stretch: the gardener only follows placed walkable tiles.
    for(const row of new Set(paths.map(p=>p.y))){const xs=paths.filter(p=>p.y===row).map(p=>p.x).sort((a,b)=>a-b);let run=[];for(const x of xs){if(run.length&&x!==run[run.length-1].x+1){if(run.length>route.length)route=run;run=[];}run.push({x,y:row});}if(run.length>route.length)route=run;}
    const signature=route.map(p=>`${p.x},${p.y}`).join('|');
    if(signature!==previousRoute || !actor.innerHTML){previousRoute=signature;actorTime=0;actor.dataset.route=signature;actor.innerHTML=FB.worldArt?.actor?.() || '<ellipse cy="-24" rx="10" ry="20" fill="#edbd74"/><circle cy="-49" r="12" fill="#eac09b"/>';}
    actor.style.display=route.length?'':'none';actor.classList.toggle('is-idle',route.length<2 || reduced());
    actor._route=route;
  }
  function animate(now){
    if(!root)return;
    const delta=Math.min(80,now-(lastActorRender||now));lastActorRender=now;
    const route=actor?._route || [];
    if(route.length){
      if(!reduced()&&route.length>1)actorTime+=delta/2300;
      const length=route.length-1,cycle=length?actorTime%(length*2):0,progress=cycle>length?length*2-cycle:cycle,index=Math.min(Math.floor(progress),Math.max(0,route.length-2)),part=progress-index,a=route[index],b=route[Math.min(index+1,route.length-1)];
      const x=a.x+(b.x-a.x)*part+.5,y=a.y+(b.y-a.y)*part+.5,p=tile(x,y);
      actor.setAttribute('transform',`translate(${p.x} ${p.y})`);actor.classList.toggle('returning',cycle>length);
      // Insert at the current feet depth so buildings can occlude the gardener.
      const depth=x+y;let before=null;for(const node of objects.children){if(node===actor)continue;const object=state.items.find(o=>String(o.id)===node.dataset.worldId);if(!object)continue;const [w,h]=footprint(object.type);if(object.x+object.y+w+h>depth){before=node;break;}}
      if(actor.nextSibling!==before)objects.insertBefore(actor,before);
    }
    raf=requestAnimationFrame(animate);
  }
  function mount(container,events={}){
    unmount();root=container;callbacks=events;state=FB.game?.getState?.() || null;aborter=new AbortController();
    root.classList.add('farm-world');root.innerHTML=`<svg class="world-backdrop" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${background()}</svg><svg class="world-scene" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid meet" tabindex="0" role="application"><g class="world-camera">${terrain()}<g class="world-selection" pointer-events="none"></g><g class="world-objects"></g>${environment()}<g class="world-badges"></g><g class="world-preview" pointer-events="none"></g><g class="world-butterfly" transform="translate(800 385)" pointer-events="none"><path d="M0 0Q-17-16-17-3Q-16 8 0 2Q15 9 16-3Q16-14 0 0" fill="#fff1b6"/><path d="M0-2V6" stroke="#ae864d" stroke-width="2"/></g></g></svg><span class="world-live" role="status" aria-live="polite"></span>`;
    svg=root.querySelector('.world-scene');cameraNode=root.querySelector('.world-camera');objects=root.querySelector('.world-objects');badges=root.querySelector('.world-badges');preview=root.querySelector('.world-preview');selection=root.querySelector('.world-selection');grid=root.querySelector('.world-grid');
    actor=svgNode('g',{class:'world-actor','pointer-events':'none'});objects.append(actor);
    const on=(el,event,fn,options={})=>el.addEventListener(event,fn,{...options,signal:aborter.signal});
    on(svg,'pointerdown',e=>{if(e.button!==0)return;const c=svg.getScreenCTM();pointer={id:e.pointerId,x:e.clientX,y:e.clientY,camX:camera.x,camY:camera.y,scale:c?.a||1,moved:false,target:e.target.closest('[data-world-id]')?.dataset.worldId,harvest:e.target.closest('[data-world-ready]')?.dataset.worldReady};svg.setPointerCapture(e.pointerId);});
    on(svg,'pointermove',e=>{
      hover=cellAt(e);
      if(pointer&&pointer.id===e.pointerId){const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(Math.hypot(dx,dy)>7)pointer.moved=true;if(pointer.moved&&!tool&&!moving){camera.x=pointer.camX+dx/pointer.scale;camera.y=pointer.camY+dy/pointer.scale;root.classList.add('is-dragging');applyCamera();}}
      drawPreview();
    });
    on(svg,'pointerup',e=>{if(!pointer||pointer.id!==e.pointerId)return;const click=!pointer.moved,original=pointer.target,harvest=pointer.harvest;pointer=null;root.classList.remove('is-dragging');if(click){lastInput=performance.now();if(harvest!=null&&!tool&&!moving){const item=state.items.find(o=>String(o.id)===harvest);if(item)callbacks.onHarvest?.(item.id);}else choose(cellAt(e),original);}});
    on(svg,'pointercancel',()=>{pointer=null;root.classList.remove('is-dragging');});
    on(svg,'pointerleave',()=>{if(!pointer){hover=null;drawPreview();}});
    on(svg,'click',e=>{if(e.detail===0&&performance.now()-lastInput>150){const harvest=e.target.closest('[data-world-ready]')?.dataset.worldReady;if(harvest!=null&&!tool&&!moving){const item=state.items.find(o=>String(o.id)===harvest);if(item)callbacks.onHarvest?.(item.id);}else choose(cellAt(e),e.target.closest('[data-world-id]')?.dataset.worldId);}});
    on(svg,'wheel',e=>{e.preventDefault();zoom(-e.deltaY*.001);},{passive:false});
    on(svg,'keydown',e=>{
      const directions={ArrowRight:[1,0],ArrowLeft:[-1,0],ArrowDown:[0,1],ArrowUp:[0,-1]};
      if(directions[e.key]){e.preventDefault();const [dx,dy]=directions[e.key];keyboard={x:Math.max(0,Math.min(SIZE-1,keyboard.x+dx)),y:Math.max(0,Math.min(SIZE-1,keyboard.y+dy))};hover={...keyboard};drawPreview();announce(lang()==='vi'?`Ô ${keyboard.x+1}, ${keyboard.y+1}`:`Tile ${keyboard.x+1}, ${keyboard.y+1}`);}
      if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(keyboard);}
      if(e.key==='Escape'&&(tool||moving)){e.preventDefault();e.stopPropagation();clearPlacement();callbacks.onCancel?.();}
    });
    on(svg,'focus',()=>{hover={...keyboard};drawPreview();});
    resizeObserver=new ResizeObserver(()=>{applyCamera();});resizeObserver.observe(root);
    camera={x:0,y:0,scale:1.15};applyCamera();render(state);lastActorRender=0;raf=requestAnimationFrame(animate);
  }
  function setTool(type){tool=type||null;moving=null;if(type){selected=null;hover={...keyboard};}drawSelection();drawPreview();}
  function startMove(id){moving=id;tool=null;selected=id;const item=state?.items.find(o=>o.id===id);if(item){keyboard={x:item.x,y:item.y};hover={...keyboard};}drawSelection();drawPreview();}
  function setSelected(id){selected=id;drawSelection();}
  function zoom(delta){camera.scale+=delta;applyCamera();}
  function center(){camera={x:0,y:0,scale:1.15};applyCamera();}
  function unmount(){aborter?.abort();resizeObserver?.disconnect();if(raf)cancelAnimationFrame(raf);raf=0;nodes.clear();root=null;svg=null;cameraNode=null;objects=null;actor=null;preview=null;selection=null;badges=null;grid=null;state=null;callbacks={};tool=null;moving=null;selected=null;pointer=null;hover=null;previousRoute='';}
  FB.world={mount,render,setTool,startMove,setSelected,zoom,center,unmount,getView:()=>({...camera,tool,moving,selected,hover: hover?{...hover}:null}),tileToPoint:tile};
})();
