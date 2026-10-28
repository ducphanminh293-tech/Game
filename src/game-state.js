/* Local farm progression. No network account, payment, or real-world currency. */
window.FB = window.FB || {};
(() => {
  'use strict';
  const SAVE_KEY = 'fruit-bloom-save-v3';
  const GRID_SIZE = 12;
  const RESOURCES = ['coins', 'wood', 'stone', 'fruit'];
  const catalog = {
    cottage: {footprint:[2,2], price:{coins:180,wood:60,stone:35}, maxLevel:3, unique:true},
    rice: {footprint:[2,2], price:{coins:45,wood:12}, productionSeconds:25, yield:{fruit:4,coins:8}, maxLevel:3},
    tree: {footprint:[1,1], price:{coins:60,wood:15}, productionSeconds:40, yield:{fruit:6,wood:2}, maxLevel:3},
    workshop: {footprint:[2,1], price:{coins:120,wood:45,stone:20}, productionSeconds:45, yield:{wood:5,stone:3}, maxLevel:3},
    path: {footprint:[1,1], price:{coins:4,stone:1}, maxLevel:1},
    lamp: {footprint:[1,1], price:{coins:30,wood:5,stone:3}, maxLevel:1},
    flowers: {footprint:[1,1], price:{coins:18}, maxLevel:1},
    cedar: {footprint:[1,1], price:{coins:35,wood:5}, maxLevel:1},
    fountain: {footprint:[2,2], price:{coins:160,stone:45}, maxLevel:1},
  };
  const stageTemplates = [
    {seed:20261028,moves:18,goals:{apple:12,grape:9}},
    {seed:2045,moves:20,goals:{apple:15,grape:12}},
    {seed:1571,moves:21,goals:{apple:18,grape:12}},
    {seed:4198,moves:22,goals:{apple:18,grape:15}},
    {seed:5387,moves:23,goals:{apple:21,grape:18}},
    {seed:6204,moves:24,goals:{apple:24,grape:18}},
    {seed:7319,moves:25,goals:{apple:24,grape:21}},
    {seed:8453,moves:26,goals:{apple:27,grape:24}},
  ];
  const orderTemplates = [
    {titleKey:'fruitBasket',cost:{fruit:12},rewards:{coins:65,wood:15}},
    {titleKey:'picnicCrate',cost:{fruit:18,wood:5},rewards:{coins:90,stone:15}},
    {titleKey:'villageFair',cost:{fruit:24,wood:8},rewards:{coins:130,stone:20}},
    {titleKey:'gardenSupplies',cost:{fruit:16,stone:8},rewards:{coins:110,wood:25}},
  ];
  const clone = value => JSON.parse(JSON.stringify(value));
  const knownType = type => typeof type === 'string' && Object.prototype.hasOwnProperty.call(catalog,type);
  const integer = (value,max=1000000000) => Number.isInteger(value) && value>=0 && value<=max;
  function fits(items,type,x,y,ignoreId=null) {
    if(!knownType(type) || !integer(x,GRID_SIZE-1) || !integer(y,GRID_SIZE-1))return false;
    const [w,h]=catalog[type].footprint;
    return x+w<=GRID_SIZE && y+h<=GRID_SIZE && !items.some(item=>{
      if(item.id===ignoreId)return false;
      const [iw,ih]=catalog[item.type].footprint;
      return x<item.x+iw && x+w>item.x && y<item.y+ih && y+h>item.y;
    });
  }
  function createGame(storage=null,now=()=>Date.now()) {
    const listeners = new Set();
    const timestamp = () => Math.max(0,Math.floor(now()));
    function initial() {
      const at=timestamp();
      const items=[
        {id:1,type:'cottage',x:2,y:1,level:1},
        {id:2,type:'rice',x:6,y:1,level:1,readyAt:at},
        {id:3,type:'rice',x:8,y:1,level:1,readyAt:at},
        {id:4,type:'tree',x:1,y:4,level:1,readyAt:at},
        {id:5,type:'tree',x:3,y:4,level:1,readyAt:at},
        ...Array.from({length:9},(_,index)=>({id:index+6,type:'path',x:index+1,y:6,level:1})),
        {id:15,type:'lamp',x:4,y:5,level:1},
        {id:16,type:'flowers',x:8,y:5,level:1},
        {id:17,type:'cedar',x:2,y:8,level:1},
      ];
      let language='en';
      try {if(JSON.parse(storage?.getItem('fruit-bloom-demo-v1')||'{}')?.language==='vi')language='vi';} catch(_) {}
      return {version:3,language,muted:false,reducedMotion:false,inventory:{coins:250,wood:100,stone:60,fruit:0},items,nextStage:1,completedStages:[],ordersCompleted:0,orderIndex:0,harvests:0,builds:0,xp:0,level:1,storageAvailable:!!storage};
    }
    function restore(raw) {
      if(!raw || raw.version!==3 || !raw.inventory || !RESOURCES.every(key=>integer(raw.inventory[key])))return null;
      if(!Array.isArray(raw.items) || raw.items.length>GRID_SIZE*GRID_SIZE || !raw.items.length)return null;
      const items=[];
      for(const item of raw.items) {
        if(!item || !knownType(item.type) || !integer(item.id) || !item.id || items.some(other=>other.id===item.id))return null;
        if(!integer(item.level,catalog[item.type].maxLevel) || !item.level || !fits(items,item.type,item.x,item.y))return null;
        const normalized={id:item.id,type:item.type,x:item.x,y:item.y,level:item.level};
        if(catalog[item.type].productionSeconds) {
          if(!Number.isFinite(item.readyAt) || item.readyAt<0)return null;
          normalized.readyAt=Math.floor(item.readyAt);
        }
        items.push(normalized);
      }
      if(items.filter(item=>item.type==='cottage').length!==1)return null;
      if(!integer(raw.nextStage,1000000) || !raw.nextStage)return null;
      for(const key of ['ordersCompleted','orderIndex','harvests','builds','xp'])if(!integer(raw[key]))return null;
      if(raw.ordersCompleted!==raw.orderIndex)return null;
      if(!Array.isArray(raw.completedStages) || raw.completedStages.some((stage,index)=>!integer(stage,1000000)||stage<=0||stage>=raw.nextStage||(index&&stage<=raw.completedStages[index-1])))return null;
      return {version:3,language:raw.language==='vi'?'vi':'en',muted:raw.muted===true,reducedMotion:raw.reducedMotion===true,inventory:Object.fromEntries(RESOURCES.map(key=>[key,raw.inventory[key]])),items,nextStage:raw.nextStage,completedStages:raw.completedStages.slice(-500),ordersCompleted:raw.ordersCompleted,orderIndex:raw.orderIndex,harvests:raw.harvests,builds:raw.builds,xp:raw.xp,level:Math.floor(raw.xp/100)+1,storageAvailable:!!storage};
    }
    let state;
    try {state=restore(JSON.parse(storage?.getItem(SAVE_KEY)||'null'));} catch(_) {}
    if(!state)state=initial();
    function persist() {
      try {
        if(!storage)throw Error('Storage unavailable');
        state.storageAvailable=true;
        storage.setItem(SAVE_KEY,JSON.stringify(state));
      } catch(_) {state.storageAvailable=false;}
    }
    const getState=()=>clone(state);
    const fail=(reason,extra={})=>({ok:false,reason,...extra});
    function success(extra={}) {
      state.level=Math.floor(state.xp/100)+1;
      persist();
      for(const callback of listeners) {
        // One consumer must not prevent saving or notifying another consumer.
        try {callback(getState());} catch(error) {if(typeof console!=='undefined')console.error('Fruit Bloom state subscriber:',error);}
      }
      return {ok:true,...clone(extra)};
    }
    const affordable=cost=>Object.entries(cost).every(([key,value])=>state.inventory[key]>=value);
    const spend=cost=>Object.entries(cost).forEach(([key,value])=>state.inventory[key]-=value);
    const grant=reward=>Object.entries(reward).forEach(([key,value])=>state.inventory[key]=Math.min(1000000000,state.inventory[key]+value));
    const itemById=id=>state.items.find(item=>item.id===id);
    function placementReason(type,x,y,ignoreId=null) {
      if(!knownType(type))return 'unknownType';
      const [w,h]=catalog[type].footprint;
      if(!integer(x,GRID_SIZE-1)||!integer(y,GRID_SIZE-1)||x+w>GRID_SIZE||y+h>GRID_SIZE)return 'outside';
      return fits(state.items,type,x,y,ignoreId)?null:'occupied';
    }
    function productionSeconds(itemOrId) {
      const item=typeof itemOrId==='object'?itemOrId:itemById(itemOrId);
      if(!item || !knownType(item.type) || !catalog[item.type].productionSeconds)return 0;
      return Math.round(catalog[item.type].productionSeconds*(1-(item.level-1)*.15));
    }
    function productionYield(itemOrId) {
      const item=typeof itemOrId==='object'?itemOrId:itemById(itemOrId);
      if(!item || !knownType(item.type) || !catalog[item.type].yield)return {};
      return Object.fromEntries(Object.entries(catalog[item.type].yield).map(([key,amount])=>[key,Math.ceil(amount*(1+(item.level-1)*.3))]));
    }
    function upgradeCost(id) {
      const item=itemById(id);
      if(!item || item.level>=catalog[item.type].maxLevel)return null;
      return Object.fromEntries(Object.entries(catalog[item.type].price).map(([key,amount])=>[key,Math.max(1,Math.ceil(amount*.75*item.level))]));
    }
    function stage(number=state.nextStage) {
      if(!integer(number,1000000) || !number)return null;
      const template=stageTemplates[(number-1)%stageTemplates.length];
      const cycle=Math.floor((number-1)/stageTemplates.length);
      return {number,seed:(template.seed+cycle*7919)>>>0,moves:template.moves,goals:{...template.goals},rewards:{coins:60+Math.min(number-1,7)*10,wood:25,stone:15,fruit:8}};
    }
    function currentOrder() {
      return {id:state.orderIndex+1,...clone(orderTemplates[state.orderIndex%orderTemplates.length])};
    }
    function place(type,x,y) {
      const reason=placementReason(type,x,y);if(reason)return fail(reason);
      if(catalog[type].unique && state.items.some(item=>item.type===type))return fail('protectedItem');
      const cost=catalog[type].price;if(!affordable(cost))return fail('insufficientResources',{cost:clone(cost)});
      const item={id:Math.max(0,...state.items.map(item=>item.id))+1,type,x,y,level:1};
      if(catalog[type].productionSeconds)item.readyAt=timestamp()+catalog[type].productionSeconds*1000;
      spend(cost);state.items.push(item);state.builds++;state.xp+=5;
      return success({item,cost});
    }
    function move(id,x,y) {
      const item=itemById(id);if(!item)return fail('unknownItem');
      const reason=placementReason(item.type,x,y,id);if(reason)return fail(reason);
      if(item.x===x&&item.y===y)return {ok:true,item:clone(item)};
      item.x=x;item.y=y;return success({item});
    }
    function remove(id) {
      const item=itemById(id);if(!item)return fail('unknownItem');
      if(item.type==='cottage')return fail('protectedItem');
      const refund=Object.fromEntries(Object.entries(catalog[item.type].price).map(([key,amount])=>[key,Math.floor(amount*.5)]));
      state.items=state.items.filter(other=>other.id!==id);grant(refund);
      return success({item,reward:refund,refund});
    }
    function harvest(id) {
      const item=itemById(id);if(!item)return fail('unknownItem');
      if(!catalog[item.type].productionSeconds)return fail('notProducer');
      if(item.readyAt>timestamp())return fail('notReady',{readyAt:item.readyAt});
      const reward=productionYield(item);
      grant(reward);item.readyAt=timestamp()+productionSeconds(item)*1000;
      state.harvests++;state.xp+=3;
      return success({item,reward});
    }
    function upgrade(id) {
      const item=itemById(id);if(!item)return fail('unknownItem');
      const cost=upgradeCost(id);if(!cost)return fail('maxLevel');
      if(!affordable(cost))return fail('insufficientResources',{cost});
      spend(cost);item.level++;state.xp+=15;
      // Preserve ripe crops. Growing crops benefit from a shorter remaining cycle.
      if(item.readyAt>timestamp())item.readyAt=Math.min(item.readyAt,timestamp()+productionSeconds(item)*1000);
      return success({item,cost});
    }
    function claimOrder(id) {
      const order=currentOrder();if(id!==order.id)return fail('wrongOrder');
      if(!affordable(order.cost))return fail('insufficientResources',{cost:order.cost});
      spend(order.cost);grant(order.rewards);state.orderIndex++;state.ordersCompleted++;state.xp+=18;
      return success({order,reward:order.rewards});
    }
    function claimWin(number) {
      if(!integer(number,1000000)||!number)return fail('invalidValue');
      if(number<state.nextStage)return fail('alreadyClaimed');
      if(number!==state.nextStage)return fail('wrongStage');
      const config=stage(number);grant(config.rewards);state.completedStages.push(number);state.completedStages=state.completedStages.slice(-500);state.nextStage++;state.xp+=35;
      return success({stage:config,reward:config.rewards});
    }
    function setLanguage(language) {
      if(!['en','vi'].includes(language))return fail('invalidValue');
      state.language=language;return success();
    }
    function setMuted(muted) {
      if(typeof muted!=='boolean')return fail('invalidValue');
      state.muted=muted;return success();
    }
    function setReducedMotion(reducedMotion) {
      if(typeof reducedMotion!=='boolean')return fail('invalidValue');
      state.reducedMotion=reducedMotion;return success();
    }
    persist();
    return {catalog:clone(catalog),gridSize:GRID_SIZE,getState,subscribe(callback){if(typeof callback!=='function')return ()=>{};listeners.add(callback);return ()=>listeners.delete(callback);},place,move,remove,harvest,upgrade,claimOrder,claimWin,stage,currentOrder,upgradeCost,productionSeconds,productionYield,canPlace:(type,x,y,ignoreId=null)=>!placementReason(type,x,y,ignoreId),setLanguage,setMuted,setReducedMotion};
  }
  let storage=null;
  try {storage=window.localStorage || (typeof localStorage!=='undefined'?localStorage:null);} catch(_) {}
  FB.createGame=createGame;
  FB.game=createGame(storage);
})();
