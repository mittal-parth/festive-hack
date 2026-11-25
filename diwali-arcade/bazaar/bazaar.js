(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const scene = byId('scene'), ctx = scene.getContext('2d');
  const panel = byId('panel'), marker = byId('landmark');
  const keys = new Set(), W = 960, H = 540;
  const marketFloor = [[86,398],[260,322],[388,294],[441,265],[544,265],[581,295],[710,321],[869,398],[728,443],[671,537],[277,537],[216,459]];
  const palaceFloor = [[269,536],[420,251],[447,226],[469,192],[495,192],[513,226],[541,251],[701,536]];
  const locations = [
    {x:192,y:363,mx:158,my:301,label:'Laddu stall'},
    {x:763,y:362,mx:829,my:303,label:'Katli stall'},
    {x:471,y:284,mx:477,my:263,label:'Meet Dadi'},
    {x:376,y:442,mx:376,my:422,label:'Follow the light'},
    {x:532,y:337,mx:532,my:319,label:'Next lamp'},
    {x:483,y:209,mx:483,my:188,label:'City gate'},
  ];
  const tasks = ['Pick up a laddu from the golden stall.','Choose two kaju katli at the pink stall.','Take the mithai box to Dadi at the gate.','Walk with Sita and Lakshmana to the first lamp.','Follow the next lamp toward the city gate.','Bring Rama home through the gate.'];
  const art = {
    child: {
      front:['      HHHHHH      ','    HHHhhhhHHH    ','   HhhhKhHHhhHH   ','  HHhhHHHHhhhhHH  ','  HHHHhFfFHHHHHH  ','  HhFFFFFFFFfHHH  ','  HFFFFFfFFFfFHH  ','  hFHKFFfFHKFFhH  ','   FFKFFfFFKFFf   ','   fFFfFffFFFFf   ','    fFFfFFSFFf    ','     fFFfFFFf     ','      SffffS      '],
      hair:'#282032',light:'#4a3540',skin:'#c47c52',skinlight:'#ecaa72',coat:'#158383',coatdark:'#13535b',edging:'#f2bc75',scarf:'#e0594e',trousers:'#eee0b3',feet:'#463140'},
    rama: {hair:'#242036',light:'#594155',skin:'#5794ab',skinlight:'#8bc1c6',coat:'#c68b39',coatdark:'#805237',edging:'#ffdc7d',scarf:'#e39d3b',trousers:'#e4b554',feet:'#7b4d39'},
    sita: {hair:'#211b2a',light:'#523045',skin:'#b7764f',skinlight:'#e2a576',coat:'#ab3c63',coatdark:'#792f53',edging:'#f3bf64',scarf:'#e56b75',trousers:'#ac405f',feet:'#713e39'},
    lakshmana:{hair:'#292335',light:'#493545',skin:'#b97852',skinlight:'#e3aa7e',coat:'#879752',coatdark:'#50643e',edging:'#f3cb75',scarf:'#e7b354',trousers:'#bca85d',feet:'#593b36'},
    dadi:{hair:'#8d8292',light:'#d3c1bb',skin:'#a76446',skinlight:'#d59469',coat:'#9d355c',coatdark:'#673050',edging:'#eaba77',scarf:'#d66b7f',trousers:'#a34561',feet:'#633b3e'}
  };
  let step, packed, pos, target, autoUse, facing, walking, walkTime, last, lastTap, finish, soundOn=false, audio, markerStep=-1;
  const cachedSprites = new Map();
  function sprite(role,back,stride) {
    const key = role+'-'+back+'-'+stride;
    if(cachedSprites.has(key))return cachedSprites.get(key);
    const c=document.createElement('canvas'); c.width=28;c.height=43;
    const g=c.getContext('2d'), s=art[role], ink='#282033';
    const r=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h)};
    const front=art.child.front, cmap={H:s.hair,h:s.light,F:s.skinlight,f:s.skin,K:ink,S:'#8c5151'};
    const robe=role==='sita'||role==='dadi';
    // A two-frame walk gives the feet and sleeves opposite phases.
    r(7,32,5,7+stride,ink);r(8,32,3,6+stride,s.trousers);r(6,38+stride,6,2,s.feet);
    r(15,32,5,7-stride,ink);r(16,32,3,6-stride,s.trousers);r(15,38-stride,6,2,s.feet);
    r(7,19,14,16,ink);r(6,30,16,5,ink);r(8,18,11,3,s.coatdark);
    r(8,21,11,12,s.coat);r(7,31,14,3,s.coat);r(7,33,14,1,s.edging);
    if(robe){r(6,34,16,3,s.coatdark);r(5,36,18,2,s.edging)}
    r(13,20,2,12,s.coatdark);r(15,22,1,1,s.edging);r(15,25,1,1,s.edging);
    r(4,20+stride,4,9,ink);r(5,21+stride,3,7,s.coatdark);r(4,27+stride,4,4,s.skin);
    r(20,21-stride,4,9,ink);r(20,21-stride,3,7,s.coat);r(21,27-stride,3,4,s.skinlight);
    for(let i=0;i<9;i++){r(8+Math.floor(i*.7),22+i,3,2,s.scarf)}
    r(9,18,10,3,s.scarf);r(15,31,4,3,s.scarf);r(16,34,3,1,s.edging);
    front.forEach((row,y)=>[...row].forEach((v,x)=>{
      if(v!==' ')r(x+5,y+6,1,1,back&&y<12?(y>9?s.hair:(v==='h'?s.light:s.hair)):cmap[v]);
    }));
    if(role==='rama'||role==='lakshmana'){r(11,2,7,4,ink);r(12,1,5,3,s.hair);r(10,5,9,2,s.edging);r(11,5,7,1,'#fff0a2')}
    if(role==='rama'&&!back)r(13,11,1,2,'#ffe3b6');
    if(robe){r(6,7,2,15,s.scarf);r(7,6,8,2,s.scarf);r(15,7,5,2,s.scarf);r(20,8,2,15,s.scarf);r(20,12,1,9,s.edging)}
    if(role==='child'&&back){r(11,20,8,9,'#6f3e37');r(10,22,10,5,'#c46c43');r(14,23,2,2,s.edging)}
    cachedSprites.set(key,c);return c;
  }
  function sweetIcon(g,kind){
    g.clearRect(0,0,26,22);
    const r=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h)};
    if(kind==='box'){r(2,8,22,10,'#8d4138');r(3,11,20,6,'#d46946');r(1,7,24,5,'#ef995a');r(2,6,22,2,'#ffe0a0');r(11,7,4,11,'#fab854');r(10,5,6,2,'#f7ce64');return}
    r(1,17,24,2,'#8e6370');r(3,19,20,1,'#61465a');r(2,16,22,2,'#deb784');
    if(kind==='laddu'){r(5,9,15,7,'#ae5728');r(7,6,11,11,'#e58a28');r(9,5,7,12,'#ffb644');r(8,8,3,2,'#ffde80');r(15,10,3,2,'#de872b');r(10,13,2,2,'#c87025');r(14,6,2,2,'#84a14e')}
    if(kind==='katli'){for(let i=0;i<6;i++){r(12-i*2,4+i,i*4+2,1,'#fff1d8');r(2+i*2,10+i,22-i*4,1,'#c6bfd0');r(2+i*2,12+i,22-i*4,1,'#debc86')}r(9,8,5,1,'#b9b5c9');r(14,7,3,1,'#c8c5d6')}
    if(kind==='jalebi'){[[5,5,12,3],[3,7,4,8],[5,14,15,3],[18,7,3,8],[9,8,9,3],[8,10,3,4],[11,12,5,2]].forEach(v=>r(...v,'#fa9439'));r(6,6,9,1,'#ffd174')}
  }
  sweetIcon(byId('box-icon').getContext('2d'),'box');
  function update(){
    const memory=step>=3;
    byId('chapter').textContent=memory?'DADI’S RAMAYANA':'DIWALI EVE';
    byId('place').textContent=memory?'Ayodhya':'Mithai Bazaar';
    byId('speaker').textContent=memory?'THE HOMECOMING':'DADI’S ERRAND';
    byId('objective').textContent=finish?'You brought the story home.':tasks[step];
    byId('count-label').textContent=memory?'LAMP TRAIL':'MITHAI BOX';
    byId('count').textContent=(memory?(finish?3:step-3):packed)+' / 3';
    const point=locations[step];marker.hidden=finish;
    if(markerStep!==step){markerStep=step;marker.style.left=point.mx/W*100+'%';marker.style.top=point.my/H*100+'%';byId('landmark-name').textContent=point.label}
  }
  function reset(){
    step=0;packed=0;finish=false;pos={x:473,y:431};target=null;autoUse=false;walking=false;facing='front';walkTime=0;lastTap=null;
    byId('scenery').src='market.png';byId('scenery').alt='Lanterns light two sweet stalls around a paved Diwali market.';update();scene.focus({preventScroll:true});
  }
  function tone(freq,duration=.14){
    if(!soundOn)return;
    try{audio??=new AudioContext();audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.10,audio.currentTime+.012);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);osc.connect(gain).connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration+.01)}catch{}
  }
  function close(){panel.close();keys.clear();scene.focus({preventScroll:true})}
  function show(tag,title,body,actions=[],choices=[]){
    target=null;autoUse=false;keys.clear();walking=false;
    byId('dialog-tag').textContent=tag;byId('dialog-title').textContent=title;byId('dialog-body').textContent=body;
    byId('feedback').textContent='';const row=byId('actions'),cards=byId('choices');row.replaceChildren();cards.replaceChildren();
    choices.forEach(([name,kind,act])=>{const b=document.createElement('button'),c=document.createElement('canvas');b.type='button';c.width=26;c.height=22;sweetIcon(c.getContext('2d'),kind);b.append(c,document.createTextNode(name));b.onclick=act;cards.append(b)});
    actions.forEach(([name,act],i)=>{const b=document.createElement('button');b.type='button';b.textContent=name;if(i||choices.length)b.className='secondary';b.onclick=act;row.append(b)});
    if(!panel.open)panel.showModal();
  }
  function shop(){
    const first=step===0;
    const options=[['Laddu','laddu'],['Jalebi','jalebi'],['Kaju katli','katli']];
    const select=kind=>{
      if(kind!==(first?'laddu':'katli')){byId('feedback').textContent=first?'Look for the round, golden sweet made of little boondi pearls.':'Look for the silver-topped cashew diamonds.';tone(196);return}
      packed++;tone(packed===2?523:659);update();
      if(!first&&packed===2){byId('feedback').textContent='One diamond packed. Choose a second for our neighbour.';return}
      step++;update();close();
    };
    show('MITHAI COUNTER',first?'One for Dadi':'Two to share',first?'“Dadi always picks the round golden one, made from tiny boondi pearls.” Choose her laddu.':'“One for our box and one for next door.” Pick the silver-topped cashew diamonds.',[['Leave the stall',close]],options.map(([name,kind])=>[name,kind,()=>select(kind)]));
  }
  function startStory(){
    close();step=3;pos={x:480,y:497};facing='back';target=null;
    const image=byId('scenery');image.src='palace.png';image.alt='A procession of glowing diyas leads to the golden gates of Ayodhya.';update();tone(392,.5);
  }
  function interact(){
    if(finish||panel.open)return;
    const point=locations[step];
    if(Math.hypot(point.x-pos.x,point.y-pos.y)>31){walkTo(point,true);return}
    target=null;autoUse=false;
    if(step<2){shop();return}
    if(step===2){show('DADI · AT THE GATE','An old welcome','“We take mithai next door so everyone has a share in Diwali. When I was little, my dadi told me how Ayodhya lit rows of diyas to welcome Rama, Sita and Lakshmana home after fourteen years away. Come, walk it with me.”',[['Enter the story',startStory],['Stay a moment',close]]);return}
    tone([392,523,659][step-3],.48);
    if(step<5){step++;update();return}
    finish=true;update();
    show('DIWALI · THE HOMECOMING','Home, at last','You walked as Rama along the lamp-lit road. Back at the bazaar, Dadi tucks the last kaju katli into your neighbour’s box. This year, you carry her welcome to the next doorstep.',[['Play again',()=>{close();reset()}]]);
  }
  function inside(p,poly){
    let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p.y)!==(b[1]>p.y)&&p.x<(b[0]-a[0])*(p.y-a[1])/(b[1]-a[1])+a[0])hit=!hit}return hit;
  }
  function floor(p){
    const poly=step<3?marketFloor:palaceFloor;if(inside(p,poly))return p;
    let best=null,d=Infinity;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1];const t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/(dx*dx+dy*dy)));const q={x:a[0]+dx*t,y:a[1]+dy*t};const diff=(q.x-p.x)**2+(q.y-p.y)**2;if(diff<d){best=q;d=diff}}
    return best;
  }
  function walkTo(p,use){target=floor({x:p.x,y:p.y});autoUse=use;lastTap={x:target.x,y:target.y,at:performance.now()}}
  function move(dx,dy,dt){
    const len=Math.hypot(dx,dy);if(!len){walking=false;return}
    const speed=(step<3?138:115)*dt, amount=Math.min(speed,len);const next=floor({x:pos.x+dx/len*amount,y:pos.y+dy/len*amount});walking=Math.hypot(next.x-pos.x,next.y-pos.y)>.02;
    if(walking){facing=dy<-Math.abs(dx)*.4?'back':dx<-.2?'left':dx>.2?'right':'front';walkTime+=dt}
    pos=next;
  }
  scene.addEventListener('pointerdown',e=>{
    if(finish||panel.open)return;
    const r=scene.getBoundingClientRect(),p={x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H},point=locations[step];
    scene.focus({preventScroll:true});
    if(Math.hypot(p.x-point.x,p.y-point.y)<40||Math.hypot(p.x-point.mx,p.y-point.my)<56){interact();return}
    walkTo(p,false);
  });
  marker.addEventListener('click',()=>{scene.focus({preventScroll:true});interact()});
  byId('sound').onclick=()=>{soundOn=!soundOn;byId('sound').setAttribute('aria-pressed',String(soundOn));byId('sound').setAttribute('aria-label',soundOn?'Mute sound':'Enable sound');tone(523);scene.focus({preventScroll:true})};
  byId('help').onclick=()=>show('CONTROLS','Around the bazaar','Walk with the arrow keys or WASD. Tap a place to walk there, or tap a gold label to walk up and interact. Press E to visit your current destination.',[['Back to the story',close],['Start again',()=>{close();reset()}]]);
  panel.addEventListener('cancel',e=>{e.preventDefault();if(!finish)close()});
  window.addEventListener('blur',()=>keys.clear());
  document.addEventListener('keydown',e=>{if(panel.open||e.metaKey||e.ctrlKey||e.altKey)return;const k=e.key.toLowerCase();if(['a','s','d','w','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){e.preventDefault();keys.add(k);target=null;autoUse=false}
    if(k==='e'&&!e.repeat){e.preventDefault();interact()}});
  document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  function character(role,x,y,direction,stride,player=false){
    const scale=step<3?.91+(y-270)/360:.57+(y-190)/335;
    const sh=43*scale,sw=28*scale;
    ctx.save();ctx.translate(Math.round(x),Math.round(y));
    ctx.fillStyle='#24152e81';ctx.beginPath();ctx.ellipse(2,0,sw*.41,sh*.067,0,0,Math.PI*2);ctx.fill();
    if(player){ctx.strokeStyle='#ffe59fb3';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,-1,sw*.54,sh*.10,0,0,Math.PI*2);ctx.stroke()}
    if(direction==='left')ctx.scale(-1,1);
    ctx.imageSmoothingEnabled=false;ctx.drawImage(sprite(role,direction==='back',stride),Math.round(-sw/2),Math.round(-sh+2),Math.round(sw),Math.round(sh));ctx.restore();
  }
  function lamp(x,y,t){
    const f=(Math.sin(t*7+x)+1)*.5;
    const light=ctx.createRadialGradient(x,y-5,0,x,y-5,14+3*f);light.addColorStop(0,'#ffe891b3');light.addColorStop(.4,'#ffad4155');light.addColorStop(1,'#ff9d3400');ctx.fillStyle=light;ctx.fillRect(x-18,y-23,36,36);
    ctx.fillStyle='#9d482c';ctx.fillRect(x-5,y-1,10,2);ctx.fillRect(x-3,y+1,6,1);ctx.fillStyle='#ffd372';ctx.fillRect(x-5,y-2,9,1);ctx.fillStyle='#ffbe4b';ctx.fillRect(x-1,y-6,3,4);ctx.fillStyle='#fff0af';ctx.fillRect(x,y-7-Math.round(f),1,5);
  }
  function draw(now){
    ctx.clearRect(0,0,W,H);const t=now/1000;
    for(let i=0;i<30;i++){
      const x=(i*197+Math.sin(t*.35+i)*6)%W,y=90+(i*37-t*(4+i%3))%395;
      const o=(Math.sin(t*.9+i*2)+1)*.30;ctx.fillStyle='rgba(255,222,142,'+o+')';ctx.fillRect(Math.round(x),Math.round(y),i%7===0?2:1,2);
    }
    if(step<3){
      [[415,442],[477,426],[540,442],[540,482],[476,498],[415,482]].forEach(([x,y])=>lamp(x,y,t));
      character('dadi',507,280,'front',0);
    }else{
      for(let i=3;i<=step;i++){const l=locations[i];lamp(l.x,l.y,t)}
      const sx=20*(.5+(pos.y-190)/340),sy=7*(.5+(pos.y-190)/340);
      character('sita',pos.x-sx,pos.y-sy,facing,walking?Math.floor(walkTime*8)%2:0);
      character('lakshmana',pos.x+sx,pos.y-sy,facing,walking?1-Math.floor(walkTime*8)%2:0);
    }
    if(lastTap){const age=(now-lastTap.at)/650;if(age>=0&&age<1){ctx.strokeStyle='rgba(255,230,168,'+(1-age)+')';ctx.beginPath();ctx.ellipse(lastTap.x,lastTap.y,5+age*16,2+age*6,0,0,Math.PI*2);ctx.stroke()}}
    character(step<3?'child':'rama',pos.x,pos.y,facing,walking?Math.floor(walkTime*8)%2?1:-1:0,true);
  }
  function frame(now){
    const dt=Math.min((now-(last||now))/1000,.04);last=now;
    if(!panel.open&&!finish){
      const dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
      const dy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
      if(dx||dy)move(dx*200,dy*200,dt);
      else if(target){
        const before=pos;move(target.x-pos.x,target.y-pos.y,dt);
        if(Math.hypot(target.x-pos.x,target.y-pos.y)<2||(before.x===pos.x&&before.y===pos.y&&dt>0)){const act=autoUse;target=null;autoUse=false;walking=false;if(act)interact()}
      }else walking=false;
    }
    draw(now);requestAnimationFrame(frame);
  }
  const preload=new Image();preload.src='palace.png';
  reset();requestAnimationFrame(frame);
})();
