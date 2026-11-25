(() => {
  "use strict";
  const el = id => document.getElementById(id);
  const scene = el("scene"), ctx = scene.getContext("2d");
  const W = 1600, H = 900, cx = 856, cy = 621, squash = .54;
  const colors = ["#ef457d","#ffc344","#0eab9e"], colorNames = ["Rose","Turmeric","Peacock"];
  const assets = {};
  for (const name of ["courtyard","ayodhya","child","nani","rama","companions"]) {
    const img = new Image();
    img.src = name + (["courtyard","ayodhya"].includes(name) ? ".jpg" : ".png");
    assets[name] = img;
  }
  const keys = new Set(), petals = [], particles = [];
  const stage = el("stage"), guide = el("guide");
  const player = {x:691,y:689,face:1,walking:false};
  const friend = {x:610,y:700};
  const basket={x:976,y:693}, leftPost={x:681,y:423}, rightPost={x:923,y:423}, gate={x:804,y:346};
  const homecoming=[
    {...basket,label:"Pick up the marigold garland",goal:"Collect the marigold garland"},
    {...leftPost,label:"Hang the first end",goal:"Hang one end on the left post"},
    {...rightPost,label:"Hang the second end",goal:"Stretch the garland to the right post"},
    {...gate,label:"Walk through the welcome gate",goal:"Walk under the garland together"}
  ];
  let phase, color, count, destination, actionTarget, painting, targetList, effect, visited;
  let t=0, previous=0, width=0, height=0, scale=1, dx=0, dy=0, gait=0;
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const ease=v=>1-Math.pow(1-v,3);
  function setLine(text) {
    const story=phase==="story"||phase==="end";
    el("speaker").textContent = story ? (phase==="end"?"HOMECOMING":"MARIGOLD GARLAND") : (phase==="diya"?"THE FIRST DIYA":"RANGOLI POWDER");
    el("speech").textContent = text;
    el("portrait").style.backgroundImage = 'url('+ (story ? "rama" : "child") +'.png)';
  }
  function selectColor(index) {
    color=index;
    document.querySelectorAll("[data-color]").forEach((button,i)=>button.setAttribute("aria-pressed",String(i===index)));
    el("toolLabel").textContent=colorNames[index]+" powder";
  }
  function newGame() {
    phase="paint"; count=0; visited=0; effect=0; painting=null; destination=null; actionTarget=null;
    Object.assign(player,{x:685,y:705,face:1,walking:false}); particles.length=0; petals.length=0;
    for(let i=0;i<6;i++){
      const angle=-Math.PI/2+i*Math.PI/3, filled=i%2===0;
      petals.push({id:i,x:cx+Math.cos(angle)*124,y:cy+Math.sin(angle)*124*squash,angle,
        fill:filled?colors[(i/2+1)%3]:null,amount:filled?1:0});
    }
    el("chapter").textContent="DIWALI EVE";el("title").textContent="Rangoli Courtyard";
    el("goal").textContent="Finish Nani’s rangoli";el("count").textContent="0 / 3";el("tools").hidden=false;el("action").hidden=true;
    setLine("Choose a powder and fill the three chalk petals.");selectColor(0);updateTargets();
  }
  function updateTargets(){
    if(phase==="paint") targetList=petals.filter(p=>!p.fill).map(p=>({x:p.x,y:p.y,id:p.id,label:"Fill petal "+(p.id+1),size:78}));
    else if(phase==="diya") targetList=[{x:cx,y:cy,id:"diya",label:"Light the diya",size:95}];
    else if(phase==="story") targetList=[{...homecoming[visited],id:"garland",size:96}];
    else targetList=[];
    el("targets").replaceChildren();
    targetList.forEach(place=>{
      const b=document.createElement("button");b.type="button";b.className="target";b.setAttribute("aria-label",place.label);
      b.onclick=()=>walkTo(place.x,place.y,place.id);
      el("targets").append(b); place.element=b;
    });positionTargets();
  }
  function positionTargets(){
    targetList?.forEach(place=>{
      const x=dx+place.x*scale,y=dy+place.y*scale,sz=Math.max(34,place.size*scale);
      Object.assign(place.element.style,{left:x+"px",top:y+"px",width:sz+"px",height:Math.max(30,sz*.74)+"px"});
    });
  }
  function bounds(x,y){
    if(phase==="story"||phase==="end"){
      y=clamp(y,342,830);const half=(y-320)*1.23+95;
      return {x:clamp(x,800-half,800+half),y};
    }
    y=clamp(y,449,819);
    return {x:clamp(x,Math.max(172,400-(y-449)*1.2),Math.min(1370,1170+(y-449)*1.1)),y};
  }
  function walkTo(x,y,id=null){
    if(painting||phase==="end")return;
    const dest=bounds(x,y);
    destination=dest;actionTarget=id;
  }
  function act(id){
    if(painting)return;
    if(phase==="paint"){
      const petal=petals[id];
      if(!petal||petal.fill)return;
      petal.fill=colors[color]; painting={petal,elapsed:0}; updateTargets();
    } else if(phase==="diya"){beginStory()}
    else if(phase==="story"){
      const p=homecoming[visited];burst(p.x,p.y-25,"#ffd56e",30);visited++;
      if(visited===homecoming.length){
        phase="end";el("goal").textContent="Home at last";el("count").textContent="✦";
        setLine("Rama, Sita and Lakshmana enter Ayodhya beneath your marigolds.");
        el("action").hidden=false;el("action").textContent="Make another rangoli";effect=1;
      }else{
        const lines=["Carry the flowers to the left post.","One end is tied. Carry the loose end across to the other post.","Lead Sita and Lakshmana beneath the garland."];
        setLine(lines[visited-1]);el("goal").textContent=homecoming[visited].goal;
        el("count").textContent=visited+" / 4";
      }
      updateTargets();
    }
  }
  function interact(){
    const closest=[...targetList].sort((a,b)=>dist(player,a)-dist(player,b))[0];
    if(!closest)return;
    if(dist(player,closest)<105){act(closest.id);destination=null;actionTarget=null}
    else setLine(phase==="story"?"Walk to the marked object, then press E.":"Walk closer to a glowing mark, then press E.");
  }
  function beginStory(){
    phase="story";visited=0;destination=null;actionTarget=null;effect=1;
    Object.assign(player,{x:779,y:774,face:1});Object.assign(friend,{x:657,y:805});
    el("chapter").textContent="NANI’S RAMAYANA";el("title").textContent="The homecoming";
    el("goal").textContent=homecoming[0].goal;el("count").textContent="0 / 4";el("action").hidden=true;
    setLine("Ayodhya’s lamps welcome Rama, Sita and Lakshmana home. As Rama, lift the marigolds from the basket.");
    updateTargets();
  }
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function burst(x,y,c,n){
    for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,r=15+Math.random()*90;
      particles.push({x,y,vx:r*Math.cos(a),vy:r*Math.sin(a)-40,life:.35+Math.random()*.5,max:1,c,s:1.5+Math.random()*3});
    }
  }
  function update(dt){
    t+=dt;effect=Math.max(0,effect-dt*1.4);
    let vx=0,vy=0;const pressed=k=>keys.has(k);
    if(!painting&&phase!=="end"){
      vx=(pressed("d")||pressed("arrowright")?1:0)-(pressed("a")||pressed("arrowleft")?1:0);
      vy=(pressed("s")||pressed("arrowdown")?1:0)-(pressed("w")||pressed("arrowup")?1:0);
      if(vx||vy){destination=null;actionTarget=null}
      else if(destination){
        const x=destination.x-player.x,y=destination.y-player.y,d=Math.hypot(x,y/.82);
        if(d<=275*dt+3){
          player.x=destination.x;player.y=destination.y;destination=null;
          const id=actionTarget;actionTarget=null;if(id!==null)act(id);
        }else{vx=x/d;vy=y/d/.82}
      }
    }
    const length=Math.max(1,Math.hypot(vx,vy));
    if(vx||vy){Object.assign(player,bounds(player.x+vx/length*275*dt,player.y+vy/length*225*dt));if(Math.abs(vx)>.03)player.face=Math.sign(vx);gait+=dt*13}
    player.walking=!!(vx||vy);
    if(painting){
      const p=painting.petal;painting.elapsed+=dt;p.amount=clamp(painting.elapsed/.55,0,1);
      if(Math.random()<dt*27)burst(p.x,p.y,p.fill,2);
      if(p.amount===1){
        painting=null;count++;burst(p.x,p.y,p.fill,20);
        el("count").textContent=count+" / 3";
        if(count<3)setLine(count===1?"Two chalk petals to fill. Choose their colours.":"Fill the last petal, then light the diya.");
        else{
          phase="diya";el("goal").textContent="Light the centre diya";el("count").textContent="✧";el("tools").hidden=true;
          el("action").hidden=false;el("action").textContent="Light the diya";
          setLine("The rangoli welcomes guests at the doorstep. Light the lamp at its centre.");
        }
        updateTargets();
      }
    }
    if(phase==="story"||phase==="end"){
      const tx=player.x-88,ty=player.y+34,k=1-Math.exp(-dt*2.7);
      friend.x+=(tx-friend.x)*k;friend.y+=(ty-friend.y)*k;
    }
    for(let i=particles.length-1;i>=0;i--){
      const v=particles[i];v.life-=dt;v.x+=v.vx*dt;v.y+=v.vy*dt;v.vy+=dt*75;if(v.life<=0)particles.splice(i,1);
    }
  }
  function resize(){
    width=stage.clientWidth;height=stage.clientHeight;
    const dpr=Math.min(2,window.devicePixelRatio||1);
    scene.width=Math.round(width*dpr);scene.height=Math.round(height*dpr);
  }
  function camera(){
    scale=Math.max(width/W,height/H);
    const cameraX=width/scale<W*.8?clamp(player.x*.65+cx*.35,width/scale/2,W-width/scale/2):W/2;
    dx=width/2-cameraX*scale;dy=(height-H*scale)*.57;
    // A wide, shallow viewport keeps the floor and interactive pattern visible.
    if(height/width<.43)dy=clamp(height*.62-cy*scale,height-H*scale,0);
  }
  function ellipse(x,y,rx,ry,fill,stroke=null,lw=2){
    ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);
    if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}
  }
  function petalPath(r,w){
    ctx.beginPath();ctx.moveTo(37,0);ctx.bezierCurveTo(71,-w*.85,117,-w,r,0);ctx.bezierCurveTo(119,w,65,w*.86,37,0);ctx.closePath();
  }
  function drawRangoli(){
    ctx.save();ctx.translate(cx,cy);ctx.scale(1,squash);
    ctx.lineCap="round";ctx.lineJoin="round";
    ellipse(0,0,190,190,null,"#fff5cfbb",4);
    for(let i=0;i<96;i++){
      const a=i*Math.PI/48,r=i%4===0?197:187;
      ellipse(Math.cos(a)*r,Math.sin(a)*r,i%4===0?3.5:1.65,i%4===0?3.5:1.65,"#fff9da");
    }
    for(let i=0;i<6;i++){
      ctx.save();ctx.rotate(petals[i].angle+Math.PI/6);
      for(const edge of [-1,1]){
        ctx.save();ctx.translate(18,3*edge);ctx.rotate(edge*.14);
        ctx.beginPath();ctx.moveTo(27,0);ctx.quadraticCurveTo(83,-21,132,0);ctx.quadraticCurveTo(89,18,27,0);
        ctx.fillStyle=edge===1?"#0b7779":"#00ad9d";ctx.fill();ctx.strokeStyle="#fff6c9";ctx.lineWidth=3;ctx.stroke();
        ctx.restore();
      }
      for(let d=0;d<3;d++)ellipse(145+d*11,0,4-d*.6,4-d*.6,"#f38037");
      ctx.restore();
    }
    for(const p of petals){
      ctx.save();ctx.rotate(p.angle);
      petalPath(174,46);
      ctx.fillStyle=p.fill?"#fff2c0":"#fff8d763";ctx.fill();ctx.lineWidth=5;ctx.strokeStyle=p.fill?"#fff4d2":"#fffbee";ctx.setLineDash(p.fill?[]:[8,7]);ctx.stroke();ctx.setLineDash([]);
      if(p.fill){
        ctx.save();petalPath(170,41);ctx.clip();ctx.fillStyle=p.fill;ctx.fillRect(30,-55,150*ease(p.amount),110);
        ctx.strokeStyle="#762b4e84";ctx.lineWidth=3;
        for(let j=0;j<3;j++){ctx.beginPath();ctx.moveTo(58,0);ctx.quadraticCurveTo(95,(j-1)*26,151,(j-1)*6);ctx.stroke()}
        for(let k=0;k<32;k++){const x=52+(k*47%111),y=(k*23%43)-21;ellipse(x,y,1.6,1.6,"#fff4ceab")}
        ctx.restore();
      }
      ctx.restore();
    }
    for(let i=0;i<24;i++){const a=i*Math.PI/12;ellipse(Math.cos(a)*47,Math.sin(a)*47,9,9,i%2?"#f06425":"#ffc434","#fff0b7",2)}
    ellipse(0,0,37,37,"#a91e59","#fff5bf",4);ellipse(0,0,25,25,"#ffc22b","#f9f0bd",3);
    for(let i=0;i<10;i++){const a=i*Math.PI/5;ellipse(Math.cos(a)*16,Math.sin(a)*16,4.5,4.5,"#fff4bc")}
    ctx.restore();
  }
  function sparkle(x,y,size,fill){
    ctx.save();ctx.translate(x,y);ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(0,-size);ctx.quadraticCurveTo(1,-1,size,0);ctx.quadraticCurveTo(1,1,0,size);ctx.quadraticCurveTo(-1,1,-size,0);ctx.quadraticCurveTo(-1,-1,0,-size);ctx.fill();ctx.restore();
  }
  function lamp(x,y,s,on){
    ctx.save();ctx.translate(x,y);ctx.scale(s,s);
    ellipse(3,5,24,6,"#391e3055");
    ctx.beginPath();ctx.moveTo(-22,-5);ctx.bezierCurveTo(-15,17,15,16,22,-5);ctx.closePath();ctx.fillStyle="#b34031";ctx.fill();ctx.lineWidth=2;ctx.strokeStyle="#6f2835";ctx.stroke();ellipse(0,-5,22,5,"#df8e2e","#7d362b",2);
    if(on){const flick=Math.sin(t*8+x)*2;ctx.fillStyle="#ffb832";ctx.beginPath();ctx.moveTo(2,-31+flick);ctx.bezierCurveTo(-19,-3,-1,-3,1,-4);ctx.quadraticCurveTo(11,-8,2,-31+flick);ctx.fill();ellipse(0,-10,3.4,6.5,"#fffbaf")}else{ellipse(3,-6,3,2,"#514431")}
    ctx.restore();
  }
  function flowers(start,end,sag=30){
    const n=clamp(Math.round(dist(start,end)/7),8,40);
    ctx.save();ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.quadraticCurveTo((start.x+end.x)/2,(start.y+end.y)/2+sag*2,end.x,end.y);
    ctx.strokeStyle="#773e21";ctx.lineWidth=5;ctx.stroke();
    for(let i=0;i<=n;i++){
      const u=i/n,x=start.x+(end.x-start.x)*u,y=start.y+(end.y-start.y)*u+4*u*(1-u)*sag;
      ellipse(x,y,5,5,i%4===0?"#e95425":"#ffab19","#bc5921",.8);ellipse(x-1.2,y-1.4,2.3,2.1,"#ffdb52");
      if(i%5===0)ellipse(x,y+5,2.7,3.4,"#148264");
    }
    ctx.restore();
  }
  function garlandScene(){
    for(const p of [leftPost,rightPost]){
      ellipse(p.x,p.y+2,14,4,"#41213366");
      ctx.fillStyle="#713930";ctx.fillRect(p.x-5,p.y-90,10,90);ctx.fillStyle="#e2a245";ctx.fillRect(p.x-3,p.y-90,3,90);
      ellipse(p.x,p.y-91,6,7,"#ffc846","#a95920",2);
    }
    ellipse(basket.x,basket.y,30,8,"#41213366");ellipse(basket.x,basket.y-10,28,15,"#b97131","#774023",3);
    ellipse(basket.x,basket.y-17,28,8,"#805623","#f8c66d",2);
    if(!visited)flowers({x:basket.x-21,y:basket.y-23},{x:basket.x+22,y:basket.y-23},8);
    if(visited>=3)flowers({x:leftPost.x,y:leftPost.y-91},{x:rightPost.x,y:rightPost.y-91},35);
    marker(homecoming[visited]?.x||gate.x,homecoming[visited]?.y||gate.y,true);
  }
  function marker(x,y,active=false){
    const bob=Math.sin(t*3.7+x)*2.4;
    ellipse(x,y,active?25:15,active?9:7,null,"#ffe9a4b8",2);
    sparkle(x,y-9+bob,active?13:8,"#5a3929");sparkle(x,y-10+bob,active?10:6,"#fff2af");
  }
  function sprite(name,x,y,h,face=1,walk=false,selected=false){
    const im=assets[name];if(!im.complete||!im.naturalWidth)return;
    const width=h*im.naturalWidth/im.naturalHeight;
    ellipse(x+7,y-1,width*.49,Math.max(4,h*.044),"#4931435c");
    if(selected){ellipse(x,y,width*.59,Math.max(7,h*.071),null,"#fff5cd",2);ellipse(x,y,width*.63,Math.max(8,h*.081),null,"#5b3f3580",1.4)}
    const stride=walk?Math.sin(gait):0;
    ctx.save();ctx.translate(x,y-Math.abs(stride)*3);ctx.scale(face,1);ctx.rotate(stride*.027);
    ctx.drawImage(im,-width*.5,-h,width,h);ctx.restore();
  }
  function render(){
    camera();positionTargets();
    const dpr=scene.width/Math.max(1,width);
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    ctx.translate(dx,dy);ctx.scale(scale,scale);
    const story=phase==="story"||phase==="end";const bg=assets[story?"ayodhya":"courtyard"];
    if(bg.complete&&bg.naturalWidth)ctx.drawImage(bg,0,0,W,H);
    else{ctx.fillStyle="#dfb277";ctx.fillRect(0,0,W,H)}
    const sprites=[];
    if(story){
      garlandScene();
      const size=100+(player.y-340)*.26;
      sprites.push({y:friend.y,fn:()=>sprite("companions",friend.x,friend.y,size*.95,player.face,player.walking)});
      sprites.push({y:player.y,fn:()=>sprite("rama",player.x,player.y,size,player.face,player.walking,true)});
      for(let i=0;i<21;i++){const x=(i*79+Math.sin(t+i)*9)%W,y=320-(t*13+i*17)%239; sparkle(x,y,1.4+(Math.sin(t+i)+1)*1.2,"#ffdd8aa0")}
    }else{
      drawRangoli();
      if(phase==="paint")targetList.forEach(p=>marker(p.x,p.y));
      if(phase==="diya"){lamp(cx,cy,1,false);marker(cx,cy-24,true)}
      sprites.push({y:552,fn:()=>sprite("nani",529,552,162)});
      const lean=painting?Math.sin(painting.elapsed/.55*Math.PI)*7:0;
      sprites.push({y:player.y,fn:()=>sprite("child",player.x,player.y,113+(player.y-449)*.14-lean,player.face,player.walking,true)});
      for(let i=0;i<12;i++){const x=(i*145+t*(8+i%3))%W,y=(i*61+t*(12+i%4))%H;ctx.save();ctx.translate(x+Math.sin(i+t)*12,y);ctx.rotate(t*.8+i);ellipse(0,0,3.5,1.8,i%2?"#f6a021":"#e8537f");ctx.restore()}
    }
    sprites.sort((a,b)=>a.y-b.y).forEach(s=>s.fn());
    if(story&&(visited===1||visited===2)){
      const hand={x:player.x+12*player.face,y:player.y-(100+(player.y-340)*.26)*.47};
      const other=visited===1?{x:friend.x+12,y:friend.y-(100+(player.y-340)*.26)*.42}:{x:leftPost.x,y:leftPost.y-91};
      flowers(other,hand,visited===1?19:25);
    }
    for(const p of particles){ctx.globalAlpha=Math.min(1,p.life*2);ellipse(p.x,p.y,p.s,p.s,p.c)}ctx.globalAlpha=1;
    if(destination&&actionTarget===null)ellipse(destination.x,destination.y,14+Math.sin(t*7)*2,6,null,"#fff4cc",2);
    if(effect){ctx.fillStyle='rgba(255,225,127,'+(effect*.8)+')';ctx.fillRect(0,0,W,H)}
  }
  scene.addEventListener("pointerdown",e=>{
    const b=scene.getBoundingClientRect();
    const x=(e.clientX-b.left-dx)/scale,y=(e.clientY-b.top-dy)/scale;
    const near=targetList.find(p=>Math.hypot(p.x-x,(p.y-y)*1.35)<p.size*.56);
    if(near)walkTo(near.x,near.y,near.id);else walkTo(x,y);
  });
  document.querySelectorAll("[data-color]").forEach(button=>button.onclick=()=>selectColor(Number(button.dataset.color)));
  el("action").onclick=()=>{if(phase==="end")newGame();else if(phase==="diya")walkTo(cx,cy,"diya")};
  el("help").onclick=()=>{keys.clear();guide.showModal()};
  el("close").onclick=()=>guide.close();
  window.addEventListener("keydown",e=>{
    if(guide.open||e.metaKey||e.ctrlKey||e.altKey)return;
    const k=e.key.toLowerCase();
    if(["arrowup","arrowleft","arrowdown","arrowright","w","a","s","d","e","1","2","3"].includes(k))e.preventDefault();
    keys.add(k);if(e.repeat)return;
    if(k==="e")interact();if(phase==="paint"&&["1","2","3"].includes(k))selectColor(Number(k)-1);
  });
  window.addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));
  window.addEventListener("blur",()=>keys.clear());
  new ResizeObserver(resize).observe(stage);
  newGame();resize();
  function frame(ms){
    const dt=Math.min(.05,Math.max(0,(ms-previous)/1000));previous=ms;
    if(!guide.open)update(dt);render();requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
