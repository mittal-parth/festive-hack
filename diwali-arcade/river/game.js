(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const world = byId('world'), actor = byId('actor'), sprite = actor.querySelector('img');
  const targets = byId('targets'), ritual = byId('ritual'), replay = byId('replay');
  const taper = byId('taper'), work = byId('work');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(n, hi));
  const lamps = [
    {x:.28,y:.824}, {x:.54,y:.873}, {x:.76,y:.801}
  ];
  const family = [
    {name:'Sita',image:'sita',start:{x:.37,y:.805}},
    {name:'Lakshmana',image:'lakshmana',start:{x:.62,y:.715}}
  ];
  const gate = {x:.874,y:.655};
  const party = [];
  const sayings = [
    '“See how the oil climbs the cotton? That little wick will carry the flame.”',
    '“There! A second light. Can you see its sister on the water?”',
  ];
  const keys = new Set();
  let chapter = 'ghat', player = {x:.205,y:.854}, facing = 1;
  let lit = new Set(), finished = false, walkTo = null, pending = null, near = null, activeLamp = null;
  let dragging = null, hold = false, heat = 0, stepTime = 0, lastTime = performance.now();


  function quote(name, words) {
    byId('quote').querySelector('small').textContent = name;
    byId('quote').querySelector('p').textContent = words;
  }
  function bounds(x) {
    return chapter === 'ghat' ? [.77,.934] : [.752 - .151*x,.955 - .258*x];
  }
  function distance(a,b) { return Math.hypot((a.x-b.x)*1.4,a.y-b.y); }
  function node(tag,cls) { const el=document.createElement(tag);el.className=cls;return el; }
  function stopMoving() { walkTo=null;pending=null;keys.clear(); }
  function refreshTargets() {
    targets.replaceChildren();
    if(chapter==='story'){
      if(party.length===family.length && !finished){
        const gateButton=node('button','spot storymark');
        gateButton.style.left=gate.x*100+'%';gateButton.style.top=gate.y*100+'%';
        gateButton.textContent='✦';gateButton.setAttribute('aria-label','Walk to the city gate');
        gateButton.onclick=()=>{walkTo={...gate};pending=null;};targets.append(gateButton);
      }
      byId('count').textContent=party.length+' / 2';
      return;
    }
    lamps.forEach((spot,index)=>{
      const el=node('button','spot');el.type='button';
      el.style.left=spot.x*100+'%';el.style.top=spot.y*100+'%';el.dataset.index=index;
      el.setAttribute('aria-label','Light diya '+(index+1));
      const img=node('img','');img.src='assets/diya.png';img.alt='';el.append(img,node('i','spark'));
      const tag=node('span','tag');tag.textContent='Light wick · E';el.append(tag);
      if(lit.has(index)){
        el.classList.add('lit');el.append(node('i','fire'));el.disabled=true;el.setAttribute('aria-label','Lit diya '+(index+1));
      }
      el.onclick=()=>{
        if(!ritual.hidden)return;
        if(distance(player,spot)<.121){doAction(index);return;}
        walkTo={x:spot.x-.035,y:spot.y+.018};pending=index;
      };
      targets.append(el);
    });
    byId('count').textContent=lit.size+' / 3';
  }
  function doAction(index){
    if(chapter!=='ghat'||lit.has(index))return;
    stopMoving();activeLamp=index;heat=0;hold=false;dragging=null;
    positionTaper(.19,.55);ritual.hidden=false;byId('light-key').focus({preventScroll:true});
  }
  function placeFamily(){
    for(const member of family){
      member.pos={...member.start};member.facing=1;
      member.el=node('button','companion');member.el.setAttribute('aria-label','Walk to '+member.name);
      const art=node('img','');art.src='assets/'+member.image+'.png';art.alt=member.name;
      const name=node('span','companion-name');name.textContent=member.name;
      member.el.append(art,name);byId('companions').append(member.el);
      member.el.onclick=()=>{walkTo={...member.pos};pending=null;};
    }
  }
  function updateFamily(dt){
    for(const member of family){
      if(!party.includes(member) && distance(player,member.pos)<.098){
        party.push(member);member.el.classList.add('following');member.el.disabled=true;
        const other=family.find(person=>!party.includes(person));
        byId('objective').textContent=other?'Walk to '+other.name+' on the avenue.':'Lead Sita and Lakshmana to the city gate.';
        quote(member.name,member.name==='Sita'?'“I can see the gate. Look at all the lamps!”':'“Together again, brother. Let’s go home.”');
        refreshTargets();
      }
    }
    let leader=player;
    for(const member of party){
      const dx=leader.x-member.pos.x,dy=leader.y-member.pos.y;
      const length=Math.hypot(dx,dy),gap=finished?.032:.054;
      if(length>gap){
        const amount=Math.min(dt*.29,length-gap)/length;
        member.pos.x+=dx*amount;member.pos.y+=dy*amount;
        if(Math.abs(dx)>.008)member.facing=Math.sign(dx);
      }
      leader=member.pos;
    }
    for(const member of family){
      const sprite=member.el.querySelector('img');
      member.el.style.left=member.pos.x*100+'%';member.el.style.top=member.pos.y*100+'%';
      member.el.style.height=(.18+(member.pos.y-.7)*.43)*100+'cqh';
      member.el.style.zIndex=Math.round(member.pos.y*100);
      sprite.style.transform='scaleX('+member.facing+')';
    }
    if(!finished && party.length===2 && distance(player,gate)<.068 && party.every(m=>distance(m.pos,gate)<.226)){
      finished=true;refreshTargets();replay.hidden=false;
      byId('title').textContent='Home, at last';byId('objective').textContent='Rama, Sita and Lakshmana have reached Ayodhya.';
      quote('Dadi','“Our family lights diyas to remember that welcome home.”');
    }
  }
  function beginStory() {
    chapter='story';byId('game').classList.add('story');world.setAttribute('aria-label','Walkable avenue in ancient Ayodhya');
    player={x:.135,y:.841};facing=1;sprite.src='assets/rama.png';actor.setAttribute('aria-label','Rama');
    byId('location').textContent="Dadi’s Ramayana · Ayodhya";
    byId('title').textContent='The Homecoming';byId('objective').textContent='Gather Sita and Lakshmana. Lead them to the gate.';
    byId('meter-title').textContent='With Rama';quote('Dadi','“After fourteen years away, Ayodhya lit the way home. Walk in Rama’s footsteps, Arun.”');
    placeFamily();updateFamily(0);
    refreshTargets();render(0,false);
  }
  function restart() {
    chapter='ghat';player={x:.205,y:.854};facing=1;finished=false;party.length=0;byId('companions').replaceChildren();replay.hidden=true;lit.clear();stopMoving();
    byId('game').classList.remove('story');world.setAttribute('aria-label','Walkable riverside terrace');
    actor.setAttribute('aria-label','Arun');sprite.src='assets/arun.png';
    byId('location').textContent='Sarayu Ghat · Diwali eve';byId('title').textContent='River of Lights';
    byId('objective').textContent='Light three diyas with Dadi.';byId('meter-title').textContent='Diyas lit';
    quote('Dadi','“Bring your flame, Arun. This little row is ours to light.”');refreshTargets();render(0,false);
  }
  function dismissRitual(){
    activeLamp=null;hold=false;dragging=null;ritual.hidden=true;
    targets.querySelector('.near')?.focus({preventScroll:true});
  }
  function lightLamp() {
    if(activeLamp===null)return;
    lit.add(activeLamp);dismissRitual();refreshTargets();
    if(lit.size===3)beginStory();
    else quote('Dadi',sayings[lit.size-1]);
  }
  function positionTaper(x,y){taper.style.left=(x*100)+'%';taper.style.top=(y*100)+'%';}
  byId('cancel').onclick=dismissRitual;
  replay.onclick=restart;
  const lightButton=byId('light-key');
  lightButton.onpointerdown=e=>{e.preventDefault();lightButton.setPointerCapture(e.pointerId);hold=true;};
  lightButton.onpointerup=lightButton.onpointercancel=()=>{hold=false;};
  lightButton.onclick=e=>{if(e.detail===0)lightLamp();};
  taper.onpointerdown=e=>{e.preventDefault();dragging=e.pointerId;taper.setPointerCapture(e.pointerId);};
  taper.onpointermove=e=>{
    if(dragging!==e.pointerId || ritual.hidden)return;
    const r=work.getBoundingClientRect();
    const x=clamp((e.clientX-r.left)/r.width,0,1),y=clamp((e.clientY-r.top)/r.height,0,1);
    positionTaper(x,y);
    if(Math.hypot((x-.87)*r.width,(y-.24)*r.height)<Math.max(20,r.width*.066))lightLamp();
  };
  taper.onpointerup=taper.onpointercancel=()=>{dragging=null;if(!ritual.hidden)positionTaper(.19,.55);};
  world.onpointerdown=e=>{
    if(e.target.closest('button') || !ritual.hidden)return;
    const r=world.getBoundingClientRect(),x=clamp((e.clientX-r.left)/r.width,.09,.916);
    const [low,high]=bounds(x),y=clamp((e.clientY-r.top)/r.height,low,high);walkTo={x,y};pending=null;
    const ring=node('i','walk-point');ring.style.left=(100*x)+'%';ring.style.top=(100*y)+'%';
    byId('dust').append(ring);setTimeout(()=>ring.remove(),720);
  };
  const motion=['w','a','s','d','arrowleft','arrowup','arrowright','arrowdown'];
  window.addEventListener('keydown',e=>{
    if(e.metaKey||e.ctrlKey||e.altKey)return;
    const key=e.key.toLowerCase();
    if(!ritual.hidden){
      if(key==='escape'){dismissRitual();e.preventDefault();}
      if(key==='e'||key===' '){e.preventDefault();if(!e.repeat)hold=true;}
      return;
    }
    if(motion.includes(key)){e.preventDefault();keys.add(key);walkTo=null;pending=null;}
    if((key==='e'||key===' ') && !e.repeat){e.preventDefault();if(near!==null)doAction(near);}
  });
  window.addEventListener('keyup',e=>{const key=e.key.toLowerCase();keys.delete(key);if(key==='e'||key===' ')hold=false;});
  window.addEventListener('blur',()=>{keys.clear();hold=false;dragging=null;});
  function render(dt,moving){
    const depth=(player.y-.7)*.45;
    actor.style.left=player.x*100+'%';actor.style.top=player.y*100+'%';
    actor.style.height=((chapter==='ghat'?.142:.199)+depth)*100+'cqh';
    if(moving)stepTime+=dt*11.5;
    const stride=moving&&!reduced?Math.sin(stepTime):0;
    sprite.style.transform='translateX(-50%) translateY('+(-Math.abs(stride)*2.5)+'%) scaleX('+facing+') rotate('+(stride*1.8)+'deg)';
    actor.style.zIndex=Math.round(player.y*100);
    near=null;let nearest=.121;
    if(chapter==='story'){updateFamily(dt);return;}
    const spots=lamps;
    for(const el of targets.children){
      const idx=+el.dataset.index,spot=spots[idx];el.style.zIndex=Math.round(spot.y*100);
      const d=distance(player,spot);
      if(!el.disabled && d<nearest){near=idx;nearest=d;}
    }
    for(const el of targets.children)el.classList.toggle('near',+el.dataset.index===near);
  }
  function tick(t){
    const elapsed=(t-lastTime)/1000;lastTime=t;
    const dt=Math.min(elapsed,.045);
    if(!ritual.hidden && dragging===null){
      heat=clamp(heat+(hold?1:-2)*elapsed*1.18,0,1);
      positionTaper(.19+.68*heat,.55-.31*heat-Math.sin(heat*Math.PI)*.12);
      if(heat>=1)lightLamp();
    }
    if(ritual.hidden){
      let dx=Number(keys.has('arrowright')||keys.has('d'))-Number(keys.has('arrowleft')||keys.has('a'));
      let dy=Number(keys.has('arrowdown')||keys.has('s'))-Number(keys.has('arrowup')||keys.has('w'));
      let moving=false;
      if(walkTo){
        const vx=walkTo.x-player.x,vy=walkTo.y-player.y,len=Math.hypot(vx,vy);
        if(len<.007){
          player={...walkTo};walkTo=null;
          if(pending!==null){const id=pending;pending=null;doAction(id);}
        }else{dx=vx/len;dy=vy/len;}
      }
      const magnitude=Math.hypot(dx,dy);
      if(magnitude>0){
        player.x=clamp(player.x+dx/magnitude*dt*.24,.087,.925);
        const [lo,hi]=bounds(player.x);player.y=clamp(player.y+dy/magnitude*dt*.24,lo,hi);
        if(Math.abs(dx)>.025)facing=dx<0?-1:1;moving=true;
      }
      render(dt,moving);
    }
    requestAnimationFrame(tick);
  }
  for(let i=0;i<20;i++){
    const dot=node('i','glint');dot.style.left=(8+i*31%86)+'%';dot.style.top=(30+i*13%45)+'%';
    dot.style.animationDelay=(-i*.67)+'s';byId('glints').append(dot);
  }
  restart();requestAnimationFrame(tick);
})();
