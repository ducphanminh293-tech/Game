/* Fruit Bloom: presentation and local demo state only; no game economy. */
(() => {
  'use strict';
  const {data, icon} = FB;
  const $ = (selector) => document.querySelector(selector);
  const storageKey = 'fruit-bloom-demo-v1';
  let persisted = {};
  try { persisted = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch (_) {}
  const state = {
    language: persisted.language === 'vi' ? 'vi' : 'en',
    reducedMotion: typeof persisted.reducedMotion === 'boolean' ? persisted.reducedMotion : matchMedia('(prefers-reduced-motion: reduce)').matches,
    assignments: {...data.defaultAssignments},
    modal: null, selectedCharacter: null, focusReturn: null,
    camera: {x: 0, y: 0, zoom: 1, fit: 1},
  };
  if (persisted.assignments && typeof persisted.assignments === 'object') {
    const assigned = new Set();
    Object.keys(state.assignments).forEach(id => {
      const char = persisted.assignments[id];
      state.assignments[id] = data.characters.some(c => c.id === char) && !assigned.has(char) ? char : null;
      if (state.assignments[id]) assigned.add(char);
    });
  }
  FB.state = state;
  FB.asset = name => window.FB_ASSETS?.[name] || `assets/${name}`;
  const art = name => FB.asset(`${name}.png`);
  const t = (key, vars = {}) => (FB.translations[state.language][key] || FB.translations.en[key] || key).replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? `{${name}}`);
  FB.t = t;
  const buildingName = id => t(`building.${id}.name`);
  const characterName = id => t(`character.${id}.name`);
  const resourceIcon = id => `<span class="resource-symbol ${id}">${icon(id)}</span>`;
  const buildingIcons = {hall:'home',orchard:'leaf',kitchen:'pot',workshop:'hammer'};
  const languageSwitch = () => `<div class="lang-switch" aria-label="${t('common.language')}"><button data-language="en" class="${state.language === 'en' ? 'active' : ''}" aria-pressed="${state.language === 'en'}" aria-label="English">EN</button><button data-language="vi" class="${state.language === 'vi' ? 'active' : ''}" aria-pressed="${state.language === 'vi'}" aria-label="Tiếng Việt">VI</button></div>`;
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify({language:state.language,reducedMotion:state.reducedMotion,assignments:state.assignments})); }
    catch (_) { toast('status.storageUnavailable'); }
  }
  const levels = id => data.buildings.find(b => b.id === id);
  const getCharacter = id => data.characters.find(c => c.id === id);
  const getAssignment = charId => Object.keys(state.assignments).find(id => state.assignments[id] === charId);
  function benefit(char, building) {
    return char.bestBuilding === building ? t(`assignment.${building}Benefit`, {bonus:char.bonus}) : t('assignment.noBonus');
  }
  function renderChrome() {
    document.documentElement.lang = state.language;
    document.title = `${t('app.title')} — ${t('app.village')}`;
    document.body.classList.toggle('reduce-motion', state.reducedMotion);
    $('#hud').innerHTML = `<div class="brand"><span class="brand-mark">${icon('leaf')}</span><div><div class="brand-name">Fruit Bloom</div><div class="brand-small">${t('app.brandCaption')}</div></div></div>
      <div class="resources">${data.resources.map(r=>`<button class="resource" data-open="storage" title="${t(`resource.${r.id}`)}" aria-label="${t(`resource.${r.id}`)}: ${r.amount}">${resourceIcon(r.id)}<div><div class="resource-number">${r.amount}</div><div class="resource-name">${t(`resource.${r.id}`)}</div></div></button>`).join('')}</div>
      <div class="header-actions">${languageSwitch()}<button class="icon-button" data-open="settings" aria-label="${t('nav.settings')}" title="${t('nav.settings')}">${icon('settings')}</button></div>`;
    $('#village-heading').innerHTML = `<div class="eyebrow">${t('village.subtitle')}</div><h1>${t('app.village')}</h1><div class="village-level">${icon('home')}${t('app.player')}<span>·</span>${t('app.levelShort',{level:data.villageLevel})}</div>`;
    $('#garden-note').innerHTML = `${t('app.tagline')}<div class="sunny">${icon('sun')}${t('scene.sunny')}</div>`;
    const nav = [['build','build'],['characters','people'],['play','play'],['recruit','recruit'],['storage','storage']];
    $('#navigation').setAttribute('aria-label',t('app.title'));
    $('#navigation').innerHTML = nav.map(([id, glyph])=>`<button class="nav-button ${id === 'play' ? 'play-button' : ''}" data-open="${id}">${icon(glyph)}<span>${t(`nav.${id}`)}${id==='play'?`<small>${t('nav.playHint',{number:data.stage.number})}</small>`:''}</span></button>`).join('');
    $('#scene-caption').innerHTML = `<button class="help-button" data-open="guide">${icon('info')}${t('nav.guide')}</button><p>${t('camera.hint')}</p>`;
    $('#camera-controls').innerHTML = `<button class="icon-button" data-camera="reset" aria-label="${t('camera.reset')}" title="${t('camera.reset')}">${icon('center')}</button><button class="icon-button" data-camera="out" aria-label="${t('camera.zoomOut')}" title="${t('camera.zoomOut')}">${icon('minus')}</button><span class="zoom-value">${Math.round(state.camera.zoom*100)}%</span><button class="icon-button" data-camera="in" aria-label="${t('camera.zoomIn')}" title="${t('camera.zoomIn')}">${icon('plus')}</button>`;
    $('#demo-badge').textContent = t('status.preview');
    $('#portrait-prompt').innerHTML = `<div class="brand-name">Fruit Bloom</div>${icon('rotate')}<h2>${t('rotate.title')}</h2><p>${t('rotate.description')}</p>${languageSwitch()}`;
  }
  function renderWorld() {
    const compact = innerHeight < 600 && innerWidth > innerHeight;
    const positions = compact
      ? {hall:[810,410,330,310],orchard:[440,500,360,310],kitchen:[1150,530,315,305],workshop:[820,635,280,260]}
      : {hall:[810,405,330,310],orchard:[440,560,360,310],kitchen:[1150,625,315,305],workshop:[820,795,280,260]};
    const residents = compact
      ? [{id:'mira',x:590,y:550},{id:'jasper',x:1040,y:600},{id:'rowan',x:680,y:680}]
      : [{id:'mira',x:590,y:610},{id:'jasper',x:1040,y:715},{id:'rowan',x:680,y:805}];
    $('#world').innerHTML = `<img class="garden-background" src="${art('garden')}" alt="" draggable="false">
      <button class="plot" style="left:380px;top:${compact ? 680 : 780}px" data-plot="available" aria-label="${t('plot.available')}">${icon('plus')}</button>
      <button class="plot locked" style="left:1230px;top:355px" data-plot="locked" aria-label="${t('plot.locked')}">${icon('lock')}</button>
      ${data.buildings.map(b=>{const [x,y,w,h]=positions[b.id]; return `<button class="building ${b.status}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;z-index:${Math.round(y/100)}" data-building="${b.id}" aria-label="${buildingName(b.id)}, ${t(`common.${b.status}`)}"><img class="building-art" src="${art(b.id)}" alt="" draggable="false">${b.status==='available'?`<span class="building-status">${icon('hammer')}</span>`:''}<span class="building-label">${icon(buildingIcons[b.id])}${buildingName(b.id)}<span class="level-pip">${b.status==='available'?t('common.available'):t('app.levelShort',{level:b.level})}</span></span></button>`;}).join('')}
      ${residents.map(c=>`<button class="resident resident-${c.id}" style="left:${c.x}px;top:${c.y}px;z-index:${Math.round(c.y/100)+1}" data-character="${c.id}" aria-label="${t('characters.details',{name:characterName(c.id)})}"><img src="${art(c.id)}" alt="" draggable="false"><span class="resident-name">${characterName(c.id)}</span></button>`).join('')}
      ${[[520,285],[1370,730],[270,610]].map(([x,y],i)=>`<span class="drifting-leaf" style="left:${x}px;top:${y}px;animation-delay:${-i*5}s" aria-hidden="true">${icon('leaf')}</span>`).join('')}
      ${Array.from({length:14},(_,i)=>`<i class="firefly" style="left:${250+(i*197)%1100}px;top:${230+(i*137)%600}px;animation-delay:${-(i%8)}s"></i>`).join('')}`;
    applyCamera();
  }
  function costList(building) { return `<div class="cost-row">${Object.entries(building.cost).map(([id,amount])=>`<span class="cost-chip">${icon(id)}${amount} <span>${t(`resource.${id}`)}</span></span>`).join('')}</div>`; }
  function buildingView(id) {
    const b = levels(id), char = getCharacter(state.assignments[id]);
    return `<div class="building-detail"><div class="building-showcase"><img src="${art(id)}" alt="${buildingName(id)}"></div><div class="detail-copy"><span class="tag ${b.status==='available'?'gold':''}">${icon(b.status==='available'?'hammer':'check')}${t(`common.${b.status}`)}${b.level?' · '+t('app.levelShort',{level:b.level}):''}</span><h3 style="margin-top:14px">${t(`building.${id}.short`)}</h3><p>${t(`building.${id}.description`)}</p><div class="product-row">${icon(buildingIcons[id])}<div><small>${t('building.product')}</small>${t(b.productKey)}</div></div><div class="section-title">${t(b.status==='built'?'building.upgradeCost':'building.buildCost')}</div>${costList(b)}
      ${id==='hall'?`<p class="subtle-note">${t('building.noAssignment')}</p>`:`<div class="assignment-line">${char?`<img src="${art(char.id)}" alt="">`:icon('people')}<div><p>${char?characterName(char.id):t('assignment.vacant')}</p><small>${b.status==='available'?t('building.futureAssignment')+' · ':''}${char?benefit(char,id):t('building.noResident')}</small></div><button data-open="characters">${t(char?'assignment.change':'building.assign')}</button></div>`}
      <div class="button-row"><button class="secondary-button" data-cost="${id}">${icon(b.status==='built'?'plus':'hammer')}${t(b.status==='built'?'building.upgrade':'building.build')}</button></div><p class="subtle-note">${t('building.productionNote')}</p></div></div>`;
  }
  function buildView() {
    return `<p class="intro">${t('build.subtitle')}</p><div class="build-grid">${data.buildings.map(b=>`<button class="build-card" data-building="${b.id}"><img src="${art(b.id)}" alt=""><h3>${buildingName(b.id)}</h3><p>${t(`building.${b.id}.short`)}</p><span class="tag ${b.status==='available'?'gold':''}">${icon(b.status==='available'?'hammer':'check')}${t(`common.${b.status}`)}</span></button>`).join('')}</div><p class="subtle-note">${t('build.note')}</p>`;
  }
  function charactersView() {
    return `<p class="intro">${t('characters.subtitle')}</p><div class="characters-grid">${data.characters.map(c=>{
      const assignment = getAssignment(c.id), selected = state.selectedCharacter === c.id;
      const highest = Object.keys(c.stats).reduce((a,b)=>c.stats[a]>c.stats[b]?a:b);
      return `<article class="character-card" data-character-card="${c.id}"><div class="character-portrait"><span class="tag">${t('recruit.sample')}</span><img src="${art(c.id)}" alt="${characterName(c.id)}"></div><div class="character-content"><h3>${characterName(c.id)}${icon(buildingIcons[c.bestBuilding])}</h3><p class="character-role">${t(`character.${c.id}.role`)}</p>${Object.entries(c.stats).map(([id,value])=>`<div class="stat ${id===highest?'best':''}"><span>${t(`stat.${id}`)}</span><strong>${value}</strong><div class="stat-track"><span style="width:${value}%"></span></div></div>`).join('')}<div class="talent"><strong>${t(`character.${c.id}.talent`)}</strong>${t(`character.${c.id}.talentDescription`)}</div><p class="assigned-label">${assignment?t('assignment.at',{building:buildingName(assignment)}):t('assignment.unassigned')}</p><button class="${selected?'primary':'secondary'}-button" data-assign-menu="${c.id}" aria-expanded="${selected}">${icon('people')}${t(selected?'assignment.chooseBuilding':'assignment.preview')}</button>
      ${selected?`<div class="assignment-panel"><div class="section-title">${t('assignment.chooseBuilding')}</div>${['orchard','kitchen','workshop'].map(id=>{const occupant=state.assignments[id];return `<button class="assignment-option ${c.bestBuilding===id?'best':''}" data-assign="${c.id}:${id}">${icon(buildingIcons[id])}<span>${buildingName(id)}${c.bestBuilding===id?' · '+t('assignment.bestFit'):''}<small>${benefit(c,id)}</small>${id==='workshop'?`<small>${t('assignment.workshopNote')}</small>`:''}${occupant && occupant!==c.id?`<small>${t('assignment.replaces',{name:characterName(occupant)})}</small>`:''}</span>${occupant===c.id?icon('check'):''}</button>`;}).join('')}${assignment?`<button class="assignment-option" data-unassign="${c.id}">${icon('close')}${t('assignment.unassign')}</button>`:''}</div>`:''}</div></article>`;
    }).join('')}</div><p class="subtle-note">${t('assignment.note')}</p>`;
  }
  function playView() {
    const fruits = ['apple','apple','grape','grape','grape','lime','lime','apple','apple','grape','empty','grape','lime','lime','apple','empty','grape','grape','grape','lime','lime','apple','apple','apple','empty','empty','lime','empty','empty','apple','empty','empty','empty','empty','empty'];
    return `<div class="play-layout"><div class="stage-art" aria-label="${t('play.boardLabel')}"><span class="stage-label">${t('common.preview')}</span><div class="fruit-board" aria-hidden="true">${fruits.map(id=>`<span class="board-fruit ${id}">${icon(id==='lime'?'leaf':id)}</span>`).join('')}</div><div class="aim-dots"></div><div class="shooter">${icon('apple')}</div></div><div class="stage-copy"><span class="tag gold">${icon('flag')}${t('play.stage',{number:data.stage.number})}</span><h3>${t('play.title')}</h3><p>${t('play.instructions')}</p><div class="section-title">${t('play.objectives')} · ${t('play.shots',{amount:data.stage.shots})}</div><div class="objectives">${data.stage.goals.map(goal=>`<div class="objective ${goal.fruit}">${icon(goal.fruit)}<div><strong>${goal.amount}</strong><small>${t(`resource.${goal.fruit}`)}</small></div></div>`).join('')}</div><p class="subtle-note">${t('play.completeAll')}</p><div class="divider"></div><div class="section-title">${t('play.rewards')}</div><div class="rewards">${Object.entries(data.stage.rewards).map(([id,amount])=>`<div class="reward ${id}" title="${t(`resource.${id}`)}">${icon(id)}<strong>+${amount}</strong><span style="font-size:8px">${t(`resource.${id}`)}</span></div>`).join('')}</div><button class="secondary-button" disabled style="width:100%;margin-top:18px">${icon('lock')}${t('play.button')}</button><p class="subtle-note">${t('play.balanceNote')}</p></div></div>`;
  }
  function recruitView() {
    return `<div class="recruit-layout"><div class="recruit-art"><img src="${art('jasper')}" alt="${characterName('jasper')}"><img src="${art('rowan')}" alt="${characterName('rowan')}"><img src="${art('mira')}" alt="${characterName('mira')}"></div><div class="recruit-copy"><span class="tag gold">${icon('recruit')}${t('common.preview')}</span><h3>${t('recruit.title')}</h3><p>${t('recruit.subtitle')}</p><div class="ticket-balance">${icon('ticket')}<div><strong>${data.resources.find(r=>r.id==='ticket').amount}</strong><span>${t('recruit.tickets')}</span></div></div><button class="primary-button" data-open="characters">${icon('people')}${t('common.viewResidents')}</button><p class="subtle-note">${t('recruit.earn')}</p></div></div><p class="subtle-note">${t('recruit.undecided')}</p>`;
  }
  function storageView() {
    return `<p class="intro">${t('storage.subtitle')}</p><div class="storage-grid">${data.resources.map(r=>`<div class="storage-item">${resourceIcon(r.id)}<h3>${t(`resource.${r.id}`)}</h3><strong>${r.amount}</strong><p>${t(`resource.${r.id}.description`)}</p></div>`).join('')}</div>`;
  }
  function settingsView() {
    return `<div class="settings-row"><div><h3>${t('settings.language')}</h3><p>${t('settings.languageNote')}</p></div>${languageSwitch()}</div><div class="settings-row"><div><h3>${t('settings.audio')}</h3><p>${t('settings.audioNote')}</p></div><span class="tag muted">${icon('mute')}${t('settings.audioUnavailable')}</span></div><div class="settings-row"><div><h3>${t('settings.motion')}</h3><p>${t('settings.motionNote')}</p></div><button class="toggle ${state.reducedMotion?'active':''}" data-motion role="switch" aria-checked="${state.reducedMotion}" aria-label="${t('settings.motion')}"><span></span></button></div><div class="settings-row"><div><h3>${t('settings.about')}</h3><p>${t('settings.aboutNote')}</p></div>${icon('leaf')}</div>`;
  }
  function guideView() {
    return `<p class="intro">${t('guide.subtitle')}</p><div class="guide-grid">${['home','people','recruit'].map((glyph,index)=>`<div class="guide-step"><span class="step-number">0${index+1}</span>${icon(glyph)}<h3>${t(`guide.step${index+1}.title`)}</h3><p>${t(`guide.step${index+1}.body`)}</p></div>`).join('')}</div><div class="card" style="margin-top:18px"><div class="section-title">${t('guide.controls')}</div><p class="intro" style="margin:0">${t('guide.drag')} ${t('guide.zoom')} ${t('guide.keyboard')}</p></div><div class="button-row"><button class="primary-button" data-close>${icon('leaf')}${t('guide.button')}</button></div>`;
  }
  function plotView(locked) {
    return `<div class="plot-preview"><img src="${art('workshop')}" alt=""><div><span class="tag ${locked?'muted':'gold'}">${icon(locked?'lock':'hammer')}${t(locked?'common.locked':'common.available')}</span><h3>${t(locked?'plot.locked':'plot.available')}</h3><p>${t(locked?'plot.unlock':'plot.note',{level:3})}</p><div class="button-row"><button class="secondary-button" data-building="${locked?'hall':'workshop'}">${icon(locked?'home':'hammer')}${t(locked?'building.hall.name':'plot.viewWorkshop')}</button></div></div></div>`;
  }
  function renderModal(focus = false) {
    if (!state.modal) { $('#modal-root').innerHTML=''; return; }
    const previousScroll = $('.modal-body')?.scrollTop || 0;
    const {type,id} = state.modal;
    const configs = {
      building: [buildingName(id),'app.preview',buildingView,'building.productionNote',''],
      build:[t('build.title'),'build.eyebrow',buildView,'build.note','wide'],
      characters:[t('characters.title'),'characters.eyebrow',charactersView,'characters.statsNote','wide'],
      play:[t('nav.play'),'play.eyebrow',playView,'play.previewNote',''],
      recruit:[t('nav.recruit'),'recruit.eyebrow',recruitView,'recruit.note',''],
      storage:[t('storage.title'),'storage.eyebrow',storageView,'storage.note',''],
      settings:[t('settings.title'),'nav.settings',settingsView,'app.demoNote','narrow'],
      guide:[t('guide.title'),'app.welcome',guideView,'app.demoNote',''],
      plot:[t('plot.title'),'plot.subtitle',()=>plotView(id==='locked'),'plot.note','narrow'],
      cost:[t('building.costPreviewTitle'),'common.preview',()=>`<div class="plot-preview"><img src="${art(id)}" alt=""><div><h3>${buildingName(id)}</h3><p>${t(levels(id).status==='built'?'building.upgradeCost':'building.buildCost')}</p><div style="margin-top:15px">${costList(levels(id))}</div><p class="subtle-note">${t('building.productionNote')}</p><div class="button-row"><button class="secondary-button" data-building="${id}">${icon('back')}${t('common.back')}</button></div></div></div>`,'common.illustrative','narrow'],
    };
    const config = configs[type];
    if (!config) return;
    const [title,eyebrow,view,note,size] = config;
    $('#modal-root').innerHTML = `<div class="modal-backdrop"><section class="modal ${size}" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1"><header class="modal-header"><div><div class="eyebrow">${t(eyebrow)}</div><h2 id="modal-title">${title}</h2></div><div class="modal-actions">${languageSwitch()}<button class="icon-button" data-close aria-label="${t('common.close')}">${icon('close')}</button></div></header><div class="modal-body">${view(id)}</div><footer class="modal-footer">${icon('info')}<span>${t(note)}</span></footer></section></div>`;
    $('.modal-body').scrollTop = focus ? 0 : previousScroll;
    if (focus) $('.modal').focus({preventScroll:true});
  }
  function setOutsideInert(active) {
    [...$('#game').children].forEach(el=>{ if (!['modal-root','toast','portrait-prompt'].includes(el.id)) el.inert=active; });
  }
  function openModal(type,id=null) {
    if (!state.modal) state.focusReturn = document.activeElement;
    state.modal={type,id};
    if(type!=='characters') state.selectedCharacter=null;
    renderModal(true); setOutsideInert(true);
  }
  function closeModal() {
    state.modal=null;state.selectedCharacter=null;renderModal();setOutsideInert(false);
    if(state.focusReturn?.isConnected)state.focusReturn.focus({preventScroll:true});
  }
  let toastTimer, toastMessage;
  const toastText = ({key,vars}) => t(key,{...vars,...(vars.buildingId ? {building:buildingName(vars.buildingId)} : {})});
  function toast(key,vars={}) {
    clearTimeout(toastTimer); toastMessage={key,vars};
    $('#toast').textContent=toastText(toastMessage);$('#toast').classList.add('visible');
    toastTimer=setTimeout(()=>{$('#toast').classList.remove('visible');toastMessage=null;},4500);
  }
  function changeLanguage(language) {
    if(!['en','vi'].includes(language))return;
    state.language=language;save();renderChrome();renderWorld();renderModal(false);setOutsideInert(!!state.modal);
    if(state.modal) $(`.modal [data-language="${language}"]`)?.focus({preventScroll:true});
    if(toastMessage)$('#toast').textContent=toastText(toastMessage);
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(!button){if(event.target.classList.contains('modal-backdrop'))closeModal();return;}
    const d=button.dataset;
    if(d.language)changeLanguage(d.language);
    else if('close'in d)closeModal();
    else if(d.open)openModal(d.open);
    else if(d.building)openModal('building',d.building);
    else if(d.plot)openModal('plot',d.plot);
    else if(d.cost)openModal('cost',d.cost);
    else if(d.character){state.selectedCharacter=d.character;openModal('characters');}
    else if(d.assignMenu){state.selectedCharacter=state.selectedCharacter===d.assignMenu?null:d.assignMenu;renderModal(false);$(`[data-assign-menu="${d.assignMenu}"]`)?.focus({preventScroll:true});}
    else if(d.assign){
      const [charId,buildingId]=d.assign.split(':');
      Object.keys(state.assignments).forEach(id=>{if(state.assignments[id]===charId)state.assignments[id]=null;});
      state.assignments[buildingId]=charId;save();renderModal(false);
      $(`[data-assign="${d.assign}"]`)?.focus({preventScroll:true});
      toast('assignment.saved',{name:characterName(charId),buildingId});
    }
    else if(d.unassign){Object.keys(state.assignments).forEach(id=>{if(state.assignments[id]===d.unassign)state.assignments[id]=null;});save();renderModal(false);$(`[data-assign-menu="${d.unassign}"]`)?.focus({preventScroll:true});toast('assignment.removed',{name:characterName(d.unassign)});}
    else if('motion'in d){state.reducedMotion=!state.reducedMotion;save();document.body.classList.toggle('reduce-motion',state.reducedMotion);renderModal(false);$('[data-motion]')?.focus({preventScroll:true});}
    else if(d.camera){if(d.camera==='reset'){state.camera={...state.camera,x:0,y:0,zoom:1};}else state.camera.zoom=Math.max(.8,Math.min(1.7,state.camera.zoom+(d.camera==='in'?.15:-.15)));applyCamera();}
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape' && state.modal)closeModal();
    if(event.key==='Tab' && state.modal){
      const focusables=[...$('.modal').querySelectorAll('button:not(:disabled),[tabindex="0"]')];
      const first=focusables[0],last=focusables[focusables.length-1];
      if(event.shiftKey&&(document.activeElement===first||document.activeElement===$('.modal'))){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
  });
  function applyCamera() {
    const camera=state.camera;
    camera.x=Math.max(-280,Math.min(280,camera.x));camera.y=Math.max(-190,Math.min(190,camera.y));
    $('#world').style.transform=`translate(-50%,-50%) translate(${camera.x}px,${camera.y}px) scale(${camera.fit*camera.zoom})`;
    const value=$('.zoom-value');if(value)value.textContent=`${Math.round(camera.zoom*100)}%`;
  }
  function resize(){state.camera.fit=Math.max(innerWidth/1600,innerHeight/1000);renderWorld();}
  let drag=null;
  $('#viewport').addEventListener('pointerdown',event=>{
    if(event.target.closest('button'))return;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,camX:state.camera.x,camY:state.camera.y};
    $('#viewport').setPointerCapture(event.pointerId);$('#viewport').classList.add('dragging');
  });
  $('#viewport').addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;state.camera.x=drag.camX+event.clientX-drag.x;state.camera.y=drag.camY+event.clientY-drag.y;applyCamera();});
  function endDrag(){drag=null;$('#viewport').classList.remove('dragging');}
  $('#viewport').addEventListener('pointerup',endDrag);$('#viewport').addEventListener('pointercancel',endDrag);
  $('#viewport').addEventListener('wheel',event=>{event.preventDefault();state.camera.zoom=Math.max(.8,Math.min(1.7,state.camera.zoom-event.deltaY*.001));applyCamera();},{passive:false});
  window.addEventListener('resize',resize);
  renderChrome();resize();
})();
