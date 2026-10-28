/* One garden, one save, and a complete harvest → puzzle → build loop. */
(() => {
  'use strict';
  const $=selector=>document.querySelector(selector), game=FB.game;
  let state=game.getState(), panel=null, selected=null, tool=null, moving=null, modal=null, focusReturn=null;
  FB.state=state;
  FB.asset=name=>window.FB_ASSETS?.[name] || `assets/${name}`;
  const t=(key,vars={})=>(FB.translations[state.language][key] || FB.translations.en[key] || key).replace(/\{(\w+)\}/g,(_,name)=>vars[name] ?? `{${name}}`);
  FB.t=t;
  const tr=(key,vars)=>t(`ui.${key}`,vars);
  const icon=FB.icon;
  const coin='<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#f4bc4a" stroke="#d7972f" stroke-width="1.5"/><circle cx="12" cy="12" r="6.8" fill="none" stroke="#ffe599" stroke-width="1.5"/><path d="m12 6 1.7 3.7 4 .5-3 2.8.7 4-3.4-1.9L8.6 17l.7-4-3-2.8 4-.5Z" fill="#fff2b7"/></svg>';
  const resourceIcon=type=>type==='coins'?coin:icon(type);
  const amounts=(values,positive=false)=>Object.entries(values).map(([type,amount])=>`<span class="amount ${type}" title="${tr(type)}">${resourceIcon(type)}<b>${positive?'+':''}${amount}</b></span>`).join('');
  const languageButtons=()=>`<div class="language-switch" aria-label="${tr('language')}">${['en','vi'].map(lang=>`<button data-language="${lang}" class="${state.language===lang?'active':''}" aria-pressed="${state.language===lang}" aria-label="${lang==='en'?'English':'Tiếng Việt'}">${lang.toUpperCase()}</button>`).join('')}</div>`;
  const art=(type,level=1)=>`<svg class="item-art" viewBox="-90 -130 180 205" aria-hidden="true">${FB.worldArt.object(type,1,level)}</svg>`;
  const affordable=cost=>Object.entries(cost).every(([type,amount])=>state.inventory[type]>=amount);
  const itemById=id=>state.items.find(item=>item.id===Number(id));
  let audioContext;
  function sound(name='tap') {
    if(state.muted)return;
    try {
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      audioContext ||= new Audio();if(audioContext.state==='suspended')audioContext.resume();
      const notes={tap:[440],swap:[370,490],invalid:[220,190],match:[660,830],harvest:[523,659,784],win:[523,659,784,1046],build:[392,523,659]};
      (notes[name]||notes.tap).forEach((frequency,i)=>{
        const oscillator=audioContext.createOscillator(),gain=audioContext.createGain(),at=audioContext.currentTime+i*.075;
        oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.035,at+.01);gain.gain.exponentialRampToValueAtTime(.0001,at+.2);
        oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(at);oscillator.stop(at+.22);
      });
    } catch(_) { /* A browser can decline audio while gameplay continues. */ }
  }
  let toastTimer;
  function clearToast(){clearTimeout(toastTimer);$('#toast').classList.remove('visible');}
  function toast(message,reward=null) {
    clearTimeout(toastTimer);
    $('#toast').innerHTML=`<span>${message}</span>${reward?`<div class="toast-rewards">${amounts(reward,true)}</div>`:''}`;
    $('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3400);
  }
  function outcome(result,key,vars={},effect='tap') {
    if(!result.ok){toast(tr(result.reason==='maxLevel'?'maxLevelReason':result.reason));sound('invalid');return false;}
    sound(effect);if(key)toast(tr(key,vars),result.reward);return true;
  }
  function renderHud() {
    document.documentElement.lang=state.language;document.title=`Fruit Bloom · ${tr('village')}`;
    document.body.classList.toggle('reduce-motion',state.reducedMotion);
    $('#hud').innerHTML=`<button class="village-brand" data-action="help" aria-label="${tr('help')}"><span class="brand-flower">${icon('leaf')}</span><span><small>FRUIT BLOOM</small><strong>${tr('village')}</strong></span><span class="level-badge">${state.level}<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="16"/><circle class="level-ring" cx="18" cy="18" r="16" style="stroke-dasharray:${state.xp%100},100"/></svg></span></button><div class="resource-bar">${Object.entries(state.inventory).map(([type,amount])=>`<div class="resource-pill ${type}" aria-label="${tr(type)}: ${amount}"><span class="resource-picture">${resourceIcon(type)}</span><span><b data-resource="${type}">${new Intl.NumberFormat(state.language).format(amount)}</b><small>${tr(type)}</small></span></div>`).join('')}</div><div class="header-actions">${languageButtons()}<button class="icon-button sound-button" data-action="sound" title="${tr('sound')}" aria-label="${tr('sound')}" aria-pressed="${!state.muted}">${icon(state.muted?'mute':'sound')}</button><button class="icon-button" data-action="settings" title="${tr('settings')}" aria-label="${tr('settings')}">${icon('settings')}</button></div>`;
    $('#save-status').innerHTML=`<i class="${state.storageAvailable?'':'unsaved'}"></i>${tr(state.storageAvailable?'saved':'unsaved')}`;
    $('#portrait-message').innerHTML=`<span class="brand-flower">${icon('leaf')}</span><h2>${tr('portraitTitle')}</h2>${icon('rotate')}<p>${tr('portraitBody')}</p>`;
  }
  function quest() {
    const first=[{name:'questHarvest',done:state.harvests>=3,count:`${Math.min(3,state.harvests)}/3`},{name:'questPlay',done:state.nextStage>1,count:''},{name:'questBuild',done:state.items.some(item=>item.type==='workshop'),count:''}];
    if(!first.every(item=>item.done))return {title:'questTitle',tasks:first};
    const next=[{name:'questOrder',done:state.ordersCompleted>=3,count:`${Math.min(3,state.ordersCompleted)}/3`},{name:'questStages',done:state.nextStage>5,count:`${Math.min(5,state.nextStage-1)}/5`},{name:'questUpgrade',done:state.items.some(item=>item.type==='cottage'&&item.level>1),count:''}];
    return {title:next.every(item=>item.done)?'questComplete':'questNextTitle',tasks:next};
  }
  function renderQuest() {
    const current=quest(),done=current.tasks.filter(item=>item.done).length;
    $('#quest-panel').innerHTML=`<div class="quest-sun">${icon('sun')}</div><div class="eyebrow">${tr('questEyebrow')}</div><h2>${tr(current.title)}</h2><p>${tr(done===3?'questCompleteBody':'questBody')}</p><div class="quest-track"><span style="width:${done/3*100}%"></span></div><div class="quest-tasks">${current.tasks.map(task=>`<div class="quest-task ${task.done?'done':''}"><span class="task-check">${task.done?icon('check'):''}</span><span>${tr(task.name)}</span><small>${task.count}</small></div>`).join('')}</div><div class="guide-resident"><svg class="guide-avatar" viewBox="-27 -86 54 90" role="img" aria-label="Mira">${FB.worldArt.actor()}</svg><span>Mira<small>${tr('readyHint')}</small></span></div>`;
  }
  function renderDock() {
    $('#dock').innerHTML=`<button class="dock-button ${panel==='build'?'active':''}" data-action="build"><span class="dock-icon build">${icon('build')}</span><span>${tr('build')}</span></button><button class="dock-button ${panel==='orders'?'active':''}" data-action="orders"><span class="dock-icon orders">${icon('storage')}${affordable(game.currentOrder().cost)?'<i class="notification-dot"></i>':''}</span><span>${tr('orders')}</span></button><button class="play-button" data-action="play"><span class="play-symbol">${icon('play')}</span><span><b>${tr('play')}</b><small>${tr('stage',{number:state.nextStage})}</small></span><span class="play-spark">✦</span></button><button class="dock-button" data-action="home"><span class="dock-icon home">${icon('home')}</span><span>${tr('village')}</span></button><button class="dock-button" data-action="help"><span class="dock-icon help">${icon('info')}</span><span>${tr('help')}</span></button>`;
    $('#camera-controls').innerHTML=`<button class="camera-button" data-camera="center" aria-label="${tr('center')}">${icon('center')}</button><button class="camera-button" data-camera="out" aria-label="${tr('zoomOut')}">${icon('minus')}</button><button class="camera-button" data-camera="in" aria-label="${tr('zoomIn')}">${icon('plus')}</button>`;
  }
  function panelHeader(eyebrow,title,description='') {
    return `<header class="panel-header"><div><span class="eyebrow">${eyebrow}</span><h2>${title}</h2></div><button class="icon-button panel-close" data-action="close-panel" aria-label="${tr('close')}">${icon('close')}</button></header>${description?`<p class="panel-description">${description}</p>`:''}`;
  }
  function renderPanel() {
    const root=$('#side-panel'), scrollTop=root.querySelector('.panel-scroll')?.scrollTop||0;root.className=`side-panel ${panel?'open':''} ${panel||''}`;
    if(!panel){root.innerHTML='';return;}
    if(panel==='build') {
      const cards=types=>`<div class="build-catalog">${types.map(type=>{const entry=game.catalog[type];return `<button class="build-card ${tool===type?'chosen':''} ${affordable(entry.price)?'':'unaffordable'}" data-build="${type}" aria-pressed="${tool===type}">${art(type)}<strong>${tr(type)}</strong><div class="build-price">${amounts(entry.price)}</div><span class="build-add">${icon('plus')}</span></button>`;}).join('')}</div>`;
      root.innerHTML=panelHeader(tr('decorate'),tr('buildTitle'),tr('buildSubtitle'))+`<div class="panel-scroll"><h3 class="section-title">${tr('production')}</h3>${cards(['rice','tree','workshop'])}<h3 class="section-title">${tr('decorations')}</h3>${cards(['path','lamp','flowers','cedar','fountain'])}</div>`;
    } else if(panel==='orders') {
      const order=game.currentOrder(),canDeliver=affordable(order.cost);
      root.innerHTML=panelHeader(tr('orderEyebrow'),tr('orderTitle'),tr('orderBody'))+`<div class="panel-scroll"><div class="order-illustration"><span class="order-stamp">${icon('heart')}</span>${art('tree')}<span class="parcel">${icon('storage')}</span></div><div class="order-card"><small>${tr('orderFrom')}</small><h3>${tr(order.titleKey)}</h3><div class="section-title">${tr('orderNeeds')}</div><div class="order-cost">${Object.entries(order.cost).map(([type,amount])=>`<div class="order-resource ${state.inventory[type]>=amount?'enough':''}">${resourceIcon(type)}<span>${tr(type)}<b>${state.inventory[type]} / ${amount}</b></span>${state.inventory[type]>=amount?icon('check'):''}</div>`).join('')}</div><div class="section-title">${tr('orderRewards')}</div><div class="reward-row">${amounts(order.rewards,true)}</div><button class="primary-button deliver-button" data-order="${order.id}" ${canDeliver?'':'disabled'}>${icon('check')}${tr('deliver')}</button></div><p class="panel-footnote">${tr('ordersCount',{amount:state.ordersCompleted})}</p></div>`;
    } else if(panel==='inspect') {
      const item=itemById(selected);if(!item){panel=null;renderPanel();return;}
      const producer=!!game.catalog[item.type].productionSeconds,cost=game.upgradeCost(item.id);
      root.innerHTML=panelHeader(tr('level',{level:item.level}),tr(item.type))+`<div class="panel-scroll"><div class="inspection-art">${art(item.type,item.level)}<span class="item-level">${tr('level',{level:item.level})}</span></div><p class="item-description">${tr(`desc.${item.type}`)}</p>${producer?`<div class="production-card"><div class="production-heading"><span data-production-title></span><b data-production-time></b></div><div class="production-track"><span data-production-progress></span></div><small>${tr('yield')} · ${tr('cycle',{seconds:game.productionSeconds(item)})}</small><div class="reward-row">${amounts(game.productionYield(item),true)}</div><button class="primary-button harvest-button" data-harvest="${item.id}">${icon(item.type==='workshop'?'hammer':'leaf')}${tr(item.type==='workshop'?'collect':'harvest')}</button></div>`:''}${cost?`<button class="upgrade-button" data-upgrade="${item.id}"><span>${icon('plus')} ${tr('upgrade')}</span><span class="upgrade-price">${amounts(cost)}</span></button>`:producer||item.type==='cottage'?`<div class="max-level">${icon('check')}${tr('maxLevel')}</div>`:''}<div class="item-actions"><button class="secondary-button" data-move="${item.id}">${icon('center')}${tr('move')}</button>${item.type!=='cottage'?`<button class="text-button" data-remove="${item.id}" title="${tr('refund')}">${tr('remove')}</button>`:''}</div></div>`;
      renderTimers();
    }
    if(root.querySelector('.panel-scroll'))root.querySelector('.panel-scroll').scrollTop=scrollTop;
  }
  function renderMode() {
    const active=tool || moving, item=itemById(moving);
    $('#mode-hint').classList.toggle('visible',!!active);
    $('#mode-hint').innerHTML=active?`<span class="mode-icon">${icon(tool?'build':'center')}</span><span><strong>${tr(tool?'placing':'moving',{name:tr(tool||item?.type||'cottage')})}</strong><small>${tr(tool?'placementHint':'moveHint')}</small></span><button data-action="cancel-tool">${tr('cancel')}</button>`:'';
  }
  function renderTimers() {
    if(panel!=='inspect')return;const item=itemById(selected);if(!item?.readyAt)return;
    const seconds=Math.max(0,Math.ceil((item.readyAt-Date.now())/1000)),ready=seconds===0;
    const title=$('[data-production-title]'),time=$('[data-production-time]'),progress=$('[data-production-progress]'),button=$(`[data-harvest="${item.id}"]`);
    if(title)title.textContent=tr(ready?'ready':item.type==='workshop'?'working':'growing');
    if(time)time.textContent=ready?'✓':`${seconds}s`;
    if(progress)progress.style.width=`${Math.max(0,Math.min(100,(1-seconds/game.productionSeconds(item))*100))}%`;
    if(button)button.disabled=!ready;
  }
  function render() {
    renderHud();renderQuest();renderDock();renderPanel();renderMode();FB.world.render(state);
  }
  function cancelTool() {tool=null;moving=null;FB.world.setTool(null);renderMode();renderPanel();}
  function select(id) {cancelTool();selected=id;panel='inspect';FB.world.setSelected(id);renderPanel();renderDock();}
  function harvest(id) {const result=game.harvest(id);outcome(result,'harvestToast',{},'harvest');}
  function inert(active) {for(const id of ['world-mount','hud','quest-panel','side-panel','dock','mode-hint','camera-controls'])$('#'+id).inert=active;}
  function closeModal() {FB.puzzle.unmount();modal=null;$('#modal-root').innerHTML='';inert(false);if(focusReturn?.isConnected)focusReturn.focus({preventScroll:true});else $('[data-action="play"]')?.focus({preventScroll:true});}
  function helpView() {return `<div class="help-welcome"><svg class="guide-avatar" viewBox="-27 -86 54 90" role="img" aria-label="Mira">${FB.worldArt.actor()}</svg><div><span class="eyebrow">MIRA · ${tr('village')}</span><h3>${tr('welcome')}</h3><p>${tr('welcomeBody')}</p></div></div><div class="help-steps">${['leaf','play','build'].map((glyph,i)=>`<article><span class="help-number">${i+1}</span>${icon(glyph)}<h3>${tr(`help${i+1}Title`)}</h3><p>${tr(`help${i+1}`)}</p></article>`).join('')}</div><p class="help-controls">${tr('help4')}</p><button class="primary-button" data-close>${tr('back')}${icon('arrow')}</button>`;}
  function settingsView() {return `<div class="setting-row"><div><h3>${tr('language')}</h3><p>${tr('languageNote')}</p></div>${languageButtons()}</div><div class="setting-row"><div><h3>${tr('sound')}</h3><p>${tr('soundNote')}</p></div><button class="toggle ${state.muted?'':'active'}" role="switch" aria-checked="${!state.muted}" aria-label="${tr('sound')}" data-action="sound"><span></span></button></div><div class="setting-row"><div><h3>${tr('motion')}</h3><p>${tr('motionNote')}</p></div><button class="toggle ${state.reducedMotion?'active':''}" role="switch" aria-checked="${state.reducedMotion}" aria-label="${tr('motion')}" data-action="motion"><span></span></button></div><div class="save-card">${icon('check')}<p>${tr(state.storageAvailable?'saveNote':'unsaved')}</p></div>`;}
  function renderModal(focus=false) {
    FB.puzzle.unmount();if(!modal)return;
    const puzzle=modal.type==='puzzle',title=puzzle?tr('stage',{number:modal.stage.number}):tr(modal.type==='help'?'helpTitle':'settingsTitle');
    $('#modal-root').innerHTML=`<div class="modal-backdrop"><section class="modal ${puzzle?'puzzle-modal wide':modal.type==='settings'?'settings-modal':''}" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1"><header class="modal-header"><div><span class="eyebrow">${puzzle?'FRUIT BLOOM · MATCH 3':tr('village')}</span><h2 id="modal-title">${title}</h2></div><div class="modal-actions">${languageButtons()}<button class="icon-button" data-close aria-label="${tr('close')}">${icon('close')}</button></div></header><div class="modal-body">${puzzle?'<div id="puzzle-mount"></div>':modal.type==='help'?helpView():settingsView()}</div></section></div>`;
    if(puzzle){const activeStage=modal.stage;FB.puzzle.mount($('#puzzle-mount'),t,{stage:activeStage,onWin:result=>game.claimWin(result.stageNumber??activeStage.number),onExit:closeModal,onNext:()=>openPuzzle(),onSound:sound});}
    inert(true);if(focus)$('.modal').focus({preventScroll:true});
  }
  function openModal(type) {clearToast();focusReturn=document.activeElement;modal={type};renderModal(true);}
  function openPuzzle() {clearToast();cancelTool();panel=null;renderPanel();renderDock();focusReturn=document.activeElement;const stage=game.stage();FB.puzzle.reset(stage);modal={type:'puzzle',stage};sound('tap');renderModal(true);}
  function update(next) {
    const languageChanged=next.language!==state.language;
    if(languageChanged)clearToast();
    state=next;FB.state=state;render();
    if(modal && (languageChanged||modal.type==='settings'))renderModal(false);
  }
  FB.world.mount($('#world-mount'),{
    onSelect:select,onHarvest:harvest,
    onPlace:(type,x,y)=>{const result=game.place(type,x,y);if(outcome(result,'placed',{name:tr(type)},'build')){selected=result.item.id;FB.world.setSelected(selected);}return result;},
    onMove:(id,x,y)=>{const result=game.move(id,x,y);if(outcome(result,'moved',{},'build')){moving=null;FB.world.setTool(null);select(id);}return result;},
    onCancel:cancelTool,
  });
  game.subscribe(update);
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(!button){if(event.target.classList.contains('modal-backdrop'))closeModal();return;}
    const d=button.dataset;
    if(d.language){game.setLanguage(d.language);return;}
    if('close'in d){closeModal();return;}
    if(d.build){if(!affordable(game.catalog[d.build].price)){toast(tr('insufficientResources'));sound('invalid');return;}tool=d.build;moving=null;selected=null;FB.world.setSelected(null);FB.world.setTool(tool);renderMode();renderPanel();sound('tap');return;}
    if(d.harvest){harvest(Number(d.harvest));return;}
    if(d.upgrade){const item=itemById(d.upgrade),result=game.upgrade(Number(d.upgrade));outcome(result,'upgraded',{name:tr(item.type),level:result.item?.level},'build');return;}
    if(d.move){moving=Number(d.move);tool=null;FB.world.startMove(moving);panel=null;renderPanel();renderDock();renderMode();return;}
    if(d.remove){const result=game.remove(Number(d.remove));if(outcome(result,'removed')){selected=null;panel=null;FB.world.setSelected(null);renderPanel();renderDock();}return;}
    if(d.order){outcome(game.claimOrder(Number(d.order)),'orderToast',{},'harvest');return;}
    if(d.camera){if(d.camera==='center')FB.world.center();else FB.world.zoom(d.camera==='in'?.18:-.18);return;}
    if(d.action){
      if(d.action==='play')openPuzzle();
      else if(d.action==='sound'){game.setMuted(!state.muted);sound('tap');}
      else if(d.action==='motion')game.setReducedMotion(!state.reducedMotion);
      else if(d.action==='help'||d.action==='settings')openModal(d.action);
      else if(d.action==='cancel-tool')cancelTool();
      else if(d.action==='close-panel'){panel=null;cancelTool();selected=null;FB.world.setSelected(null);renderPanel();renderDock();}
      else if(d.action==='home'){panel=null;cancelTool();selected=null;FB.world.setSelected(null);FB.world.center();renderPanel();renderDock();}
      else if(d.action==='build'||d.action==='orders'){const next=panel===d.action?null:d.action;cancelTool();panel=next;selected=null;FB.world.setSelected(null);renderPanel();renderDock();sound('tap');}
    }
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){if(modal)closeModal();else if(tool||moving)cancelTool();else{panel=null;selected=null;FB.world.setSelected(null);renderPanel();renderDock();}}
    if(event.key==='Tab'&&modal){const nodes=[...$('.modal').querySelectorAll('button:not(:disabled),input:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length);const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&(document.activeElement===first||document.activeElement===$('.modal'))){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
  });
  setInterval(()=>{renderTimers();FB.world.render(state);},1000);
  render();
})();
