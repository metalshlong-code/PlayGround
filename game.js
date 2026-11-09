(() => {
  'use strict';
  const canvas = document.querySelector('#game'), ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, FLOOR = 505;
  const $ = (s) => document.querySelector(s);
  const ui = { overlay:$('#overlay'), card:$('#overlayCard'), start:$('#startButton'), hud:$('#hud'), stage:$('#stageName'), progress:$('#stageProgress'), health:$('#healthFill'), healthValue:$('#healthValue'), snacks:$('#snackValue'), web:$('#webFill'), tip:$('#tipText'), toast:$('#toast'), status:$('#statusText'), world:$('#worldValue'), score:$('#scoreValue'), best:$('#bestValue'), pause:$('#pauseButton'), sound:$('#soundButton'), wave:$('#stageProgress'), threat:$('#threatValue') };
  const worlds = [
    {name:'The Old Tree', short:'OLD TREE', sky:['#8dbb75','#d9d995'], ground:'#684d31', edge:'#aa8954', leaf:'#4e794a', path:'TREE HOLLOW', bugs:3, tip:'Try a little hop. Hold ↑ near the bark to climb.'},
    {name:'The Garden', short:'GARDEN', sky:['#92ce9c','#ffe1a0'], ground:'#426b3d', edge:'#83a95a', leaf:'#39734a', path:'PETAL PATCH', bugs:4, boss:'MANTIS MATRIARCH', tip:'The mantis guards the garden. Web its eyes, then bite!'},
    {name:'The Sandbox', short:'SANDBOX', sky:['#edc78d','#ffe7b0'], ground:'#c69455', edge:'#e6c27a', leaf:'#789553', path:'DUNE CUP', bugs:4, tip:'The warm sand hides beetle snacks. Keep exploring.'},
    {name:'The Lawn', short:'BACK LAWN', sky:['#82b9d1','#d5e8a4'], ground:'#386d3c', edge:'#75a94b', leaf:'#43864b', path:'GRASS SEA', bugs:5, tip:'Tall grass can hide you. Watch the moving shadows.'},
    {name:'The Kitchen', short:'KITCHEN', sky:['#a7c7c7','#f1dfbd'], ground:'#706a5a', edge:'#d5c7a6', leaf:'#718785', path:'TILE COUNTRY', bugs:5, boss:'THE ROACH KING', tip:'Hop over the hot stove, then lure the Roach King toward the fan.'},
    {name:'The Bedroom', short:'BEDROOM', sky:['#444f79','#b181a0'], ground:'#70546e', edge:'#b68ba3', leaf:'#74658c', path:'PILLOW FORT', bugs:5, tip:'Soft landing! Hop across the floating pillows.'},
    {name:'The Bathroom', short:'BATHROOM', sky:['#8bbfc4','#d9f0e2'], ground:'#658c8e', edge:'#b8ded5', leaf:'#6d9e91', path:'SOAPY SUMMIT', bugs:5, boss:'DRAIN DRAKE', tip:'The drain drake hates bubbles. Use the faucet hazard!'}
  ];
  const keys = new Set(), pointer = {x:700,y:350};
  const actionHolds={jump:new Set(),web:new Set(),attack:new Set()};
  function holdAction(source,prop,down){const holds=actionHolds[prop];if(!holds)return;if(down)holds.add(source);else holds.delete(source);game.controls[prop]=holds.size>0;}
  const game = {mode:'menu', time:0, camera:0, stage:0, score:0, best:Number(localStorage.getItem('littlelegs-best')||0), snacks:0, insects:[], webs:[], particles:[], platforms:[], hazards:[], boss:null, eaten:0, stageTime:0, toastTimer:0, shake:0, sound:true, mutedUntil:0, last:0, controls:{x:0,y:0,jump:false,web:false,attack:false}, totalTime:0};
  const spider = {x:100,y:FLOOR,vx:0,vy:0,face:1,health:3,maxHealth:3,web:100,grounded:true,climbing:false,webDrop:null,invuln:0,attackCd:0,attackAnim:0,webCd:0,jumpLock:0,anim:0,dead:false};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const rand=(a,b)=>a+Math.random()*(b-a);
  const rr=(x,y,w,h,r)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);};
  function bestUpdate(){ui.best.textContent=game.best;}
  function toast(text){ui.toast.textContent=text;ui.toast.classList.add('show');game.toastTimer=2.2;}
  function beep(freq=420,duration=.08,type='sine',volume=.035){if(!game.sound)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!game.audio)game.audio=new AC();const o=game.audio.createOscillator(),g=game.audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(volume,game.audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,game.audio.currentTime+duration);o.connect(g);g.connect(game.audio.destination);o.start();o.stop(game.audio.currentTime+duration)}catch{}}
  function emit(x,y,color,n=8,power=120){for(let i=0;i<n;i++){let a=rand(0,Math.PI*2),s=rand(.2,1)*power;game.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.35,.8),max:.8,color,size:rand(2,5)})}}
  function seedStage(index){
    game.stage=index;game.stageTime=0;game.eaten=0;game.area=0;game.areaEaten=0;game.camera=0;game.insects=[];game.webs=[];game.particles=[];game.hazards=[];game.boss=null;
    const w=worlds[index], goals=[1,1,1];
    for(let i=3;i<w.bugs;i++)goals[1+(i-3)%2]++;
    const areaWidth=980;game.length=areaWidth*3;game.areas=goals.map((goal,i)=>({start:i*areaWidth,end:(i+1)*areaWidth,goal}));
    game.checkpoints=[areaWidth,areaWidth*2];game.platforms=[{x:0,y:FLOOR,w:game.length,h:150,kind:'ground'}];
    const routes=[
      [ [300,350,405,455,420,470], [315,370,430,390,460,475], [330,380,425,460,475,480] ],
      [ [420,330,395,300,410,365], [390,310,430,335,390,300], [420,335,390,315,420,350] ],
      [ [430,410,390,365,330,275], [435,405,375,350,315,275], [425,395,360,325,285,245] ],
      [ [420,320,405,290,390,310], [400,300,430,315,390,275], [420,335,390,285,410,300] ],
      [ [420,340,275,390,310,250], [400,300,380,270,360,290], [420,320,270,370,295,250] ],
      [ [420,335,260,360,285,230], [390,290,355,245,330,220], [410,310,255,350,280,215] ],
      [ [420,340,275,375,290,235], [400,310,245,360,270,220], [420,335,265,365,285,220] ]
    ];
    const kinds=['branch','petal','dune','grass','tile','pillow','bubble'];
    for(let area=0;area<3;area++){
      const section=game.areas[area],ys=routes[index][area];
      for(let i=0;i<ys.length;i++){
        const x=section.start+115+i*145+((i%2)*18),width=i===ys.length-1?132:rand(108,158);
        game.platforms.push({x,y:ys[i],w:width,h:16,kind:kinds[index],phase:rand(0,6)});
      }
      // Small route variations make the same room feel less like a repeated staircase.
      if(area===1||index>2){game.platforms.push({x:section.start+475,y:ys[2]-70,w:92,h:14,kind:kinds[index],phase:rand(0,6)});}
    }
    if(index===0){
      game.platforms.push({x:30,y:255,w:150,h:20,kind:'bark'});
      game.hazards.push({x:game.areas[1].start+420,y:300,w:70,h:205,kind:'branch'});
      spider.y=235;
    }
    game.checkpoints.forEach((x,i)=>game.platforms.push({x:x-22,y:FLOOR-64,w:44,h:64,kind:'checkpoint',label:`AREA ${i+2}`}));
    game.platforms.push({x:game.length-185,y:FLOOR-95,w:130,h:18,kind:'exit'});
    for(let area=0;area<3;area++){
      const section=game.areas[area];
      for(let i=0;i<section.goal+1;i++){
        const px=section.start+135+(i+1)*(section.end-section.start-270)/(section.goal+1)+rand(-24,24);
        const nearby=game.platforms.filter(p=>p.kind!=='ground'&&p.kind!=='checkpoint'&&p.kind!=='exit'&&px>=p.x-18&&px<=p.x+p.w+18);
        const surface=nearby.length?nearby.reduce((a,b)=>Math.abs(a.x+a.w/2-px)<Math.abs(b.x+b.w/2-px)?a:b):null;
        const py=surface?surface.y-22:FLOOR-24;
        game.insects.push({x:px,homeX:px,y:py,homeY:py,minX:section.start+45,maxX:section.end-45,alive:true,type:Math.random()<.3?'glow':'bug',phase:rand(0,6),vx:rand(20,42)});
      }
    }
    if(index===2){
      // A tall sand lip makes the route finish with a deliberate web-assisted descent.
      game.platforms.push({x:game.length-260,y:245,w:160,h:18,kind:'dune'});
      game.hazards.push({x:game.length-120,y:300,w:26,h:205,kind:'sandwall'});
    }
    if(index===1){game.boss={name:w.boss,x:game.length-330,y:FLOOR-32,hp:5,max:5,r:34,phase:0,hit:0};game.hazards.push({x:game.length-440,y:FLOOR-100,w:105,h:20,kind:'flower'});}
    if(index===4){game.boss={name:w.boss,x:game.length-330,y:FLOOR-35,hp:6,max:6,r:38,phase:0,hit:0};game.hazards.push({x:game.length-440,y:FLOOR-28,w:130,h:25,kind:'fan'});game.hazards.push({x:1450,y:FLOOR-180,w:70,h:180,kind:'stove'});}
    if(index===6){game.boss={name:w.boss,x:game.length-330,y:FLOOR-40,hp:7,max:7,r:42,phase:0,hit:0};game.hazards.push({x:game.length-455,y:FLOOR-15,w:110,h:15,kind:'drain'});game.hazards.push({x:1450,y:FLOOR-90,w:100,h:18,kind:'soap'});}
    spider.x=95;spider.vx=0;spider.vy=0;spider.health=Math.max(spider.health,2);spider.grounded=index!==0;spider.climbing=false;spider.webDrop=null;spider.invuln=1.2;spider.dead=false;
    ui.stage.textContent=w.name;ui.world.textContent=String(index+1).padStart(2,'0')+' / 07';ui.tip.textContent=w.tip;ui.status.textContent=`${w.path} · AREA 1/3`;
    updateHud();
  }
  function updateHud(){const pct=clamp(spider.health/spider.maxHealth,0,1);ui.health.style.width=(pct*100)+'%';ui.healthValue.textContent=spider.health+' / '+spider.maxHealth;ui.snacks.textContent=game.snacks;ui.web.style.width=spider.web+'%';ui.score.textContent=game.score;ui.progress.style.width=clamp(spider.x/(game.length||1900)*100,0,100)+'%';}
  function begin(){game.score=0;game.snacks=0;spider.health=3;spider.web=100;seedStage(0);game.mode='play';ui.overlay.classList.add('hidden');ui.pause.classList.add('visible');toast('TREE SCHOOL: jump, climb, web, and snack!');beep(540,.14,'triangle');}
  function endGame(won){game.mode=won?'won':'over';ui.pause.classList.remove('visible');game.best=Math.max(game.best,game.score);localStorage.setItem('littlelegs-best',game.best);bestUpdate();ui.overlay.classList.remove('hidden');
    const title=ui.card.querySelector('h1'),sub=ui.card.querySelector('.subtitle'),eyebrow=ui.card.querySelector('.eyebrow'),btn=ui.start;
    eyebrow.innerHTML=won?'<span class="eyebrow-line"></span> THE WHOLE HOUSE IS YOURS <span class="eyebrow-line"></span>':'<span class="eyebrow-line"></span> LITTLE SPIDER, BIG HEART <span class="eyebrow-line"></span>';
    title.innerHTML=won?'YOU DID<br><span>IT!</span>':'TRY<br><span>AGAIN?</span>';
    sub.innerHTML=won?`You made it from the old tree to the bathroom!<br>${game.score} points · ${game.snacks} bug snacks`:`The adventure ends here — ${game.score} points<br>${game.snacks} bug snacks collected.`;
    btn.querySelector('span').textContent=won?'PLAY AGAIN':'TRY AGAIN';ui.status.textContent=won?'ADVENTURE COMPLETE':'NAPPING FOR A MOMENT';
  }
  function drawBackground(){
    const w=worlds[game.stage],g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,w.sky[0]);g.addColorStop(1,w.sky[1]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    // distant soft-focus silhouettes give each room a sense of scale
    ctx.save();ctx.globalAlpha=.18;ctx.fillStyle=game.stage<4?'#264b36':'#455a58';
    for(let i=0;i<8;i++){let x=((i*180-game.camera*.18)%1200+1200)%1200-120;ctx.beginPath();ctx.ellipse(x,300,90+(i%3)*20,160+(i%4)*19,0,0,Math.PI*2);ctx.fill();}
    ctx.restore();
    const sx=(x)=>((x-game.camera*.34)%1200+1200)%1200-120;
    if(game.stage===0){ // the trunk's sunlit hollow
      ctx.fillStyle='#59452d';ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(120,50,45,210,120,380);ctx.lineTo(0,425);ctx.fill();ctx.beginPath();ctx.moveTo(960,0);ctx.bezierCurveTo(850,120,925,245,865,390);ctx.lineTo(960,430);ctx.fill();
      for(let i=0;i<9;i++){let x=sx(i*190+35);ctx.strokeStyle=i%2?'#b8a56a':'#725536';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x-25,140,x+30,260,x-10,440);ctx.stroke();}
      ctx.fillStyle='#315839';for(let i=0;i<15;i++){let x=sx(i*111+Math.sin(game.time*.8+i)*5);ctx.beginPath();ctx.ellipse(x,70+(i%3)*24,65,28,Math.sin(game.time*.7+i)*.12,0,Math.PI*2);ctx.fill();}
      ctx.fillStyle='#f9e4a5';ctx.globalAlpha=.45;ctx.beginPath();ctx.arc(756,130,49,0,7);ctx.fill();ctx.globalAlpha=1;
    }else if(game.stage<4){
      // sun disc, layered leaves and a soft rolling horizon
      ctx.fillStyle='#fff0b0';ctx.globalAlpha=.7;ctx.beginPath();ctx.arc(770,132,48,0,7);ctx.fill();ctx.globalAlpha=1;
      for(let i=0;i<12;i++){let x=sx(i*132+18+Math.sin(game.time*.65+i)*5),y=100+(i%4)*58+Math.sin(game.time*.9+i)*3;ctx.fillStyle=i%2?'#528451':'#669651';ctx.beginPath();ctx.ellipse(x,y,68,31,Math.sin(game.time*.55+i)*.16,0,7);ctx.fill();ctx.strokeStyle='#9bb66a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-38,y+5);ctx.quadraticCurveTo(x,y-10,x+43,y+4);ctx.stroke();}
      if(game.stage===2){ctx.fillStyle='#e3ba76';for(let i=0;i<7;i++){let x=sx(i*180+65);ctx.beginPath();ctx.ellipse(x,414,95,24,0,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(x-95,414,190,20);}}
      if(game.stage===3){ctx.fillStyle='#f7f1cf';ctx.globalAlpha=.8;ctx.fillRect(620,130,3,200);ctx.fillRect(0,183,960,2);ctx.globalAlpha=1;}
    }else{
      // recognizable room-scale shapes
      ctx.fillStyle='#f7edd1';ctx.globalAlpha=.32;ctx.fillRect(0,106,W,3);ctx.globalAlpha=1;
      if(game.stage===4){for(let i=0;i<5;i++){let x=sx(i*260+80);ctx.fillStyle='#c2b8a0';ctx.fillRect(x,155,190,128);ctx.fillStyle='#eee2c3';ctx.fillRect(x+8,161,174,9);ctx.fillStyle='#879291';ctx.fillRect(x+12,176,166,91);ctx.fillStyle='#a7b6ac';ctx.fillRect(x+22,186,45,63);ctx.fillRect(x+78,186,42,63);ctx.fillRect(x+130,186,38,63);}}
      else if(game.stage===5){ctx.fillStyle='#4b5678';ctx.fillRect(665,93,184,182);ctx.fillStyle='#ffeab7';ctx.beginPath();ctx.arc(757,173,54,0,7);ctx.fill();ctx.fillStyle='#897094';ctx.fillRect(650,319,350,118);ctx.fillStyle='#c59ab0';ctx.fillRect(648,307,365,31);ctx.fillStyle='#eee0d5';ctx.beginPath();ctx.ellipse(734,310,62,20,0,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(867,311,60,21,0,0,7);ctx.fill();}
      else{ctx.fillStyle='#d5eeea';ctx.fillRect(687,107,182,174);ctx.strokeStyle='#efffff';ctx.lineWidth=9;ctx.strokeRect(687,107,182,174);ctx.fillStyle='#86b4bb';ctx.beginPath();ctx.ellipse(766,184,61,46,0,0,7);ctx.fill();ctx.fillStyle='#f4f4e3';ctx.fillRect(40,147,160,20);ctx.fillRect(110,166,20,125);ctx.strokeStyle='#faf7e3';ctx.lineWidth=9;ctx.beginPath();ctx.arc(113,169,38,Math.PI,Math.PI*1.5);ctx.stroke();ctx.fillStyle='#a5d6d4';ctx.beginPath();ctx.moveTo(157,166);ctx.lineTo(159,216);ctx.lineTo(170,245);ctx.stroke();}
      for(let i=0;i<12;i++){let x=sx(i*110+10);ctx.fillStyle=game.stage===5?'#b798a8':'#c6d9cd';ctx.globalAlpha=.25;ctx.fillRect(x,280,2,170);ctx.globalAlpha=1;}
    }
    // ground plane with depth seams and soft ambient shadow
    ctx.fillStyle=w.ground;ctx.fillRect(0,FLOOR,W,H-FLOOR);
    ctx.fillStyle=w.edge;ctx.fillRect(0,FLOOR,W,6);
    ctx.globalAlpha=.23;ctx.strokeStyle=game.stage<4?'#e1d7a4':'#e9eadb';ctx.lineWidth=2;
    let shift=(game.camera*.75)%110;for(let x=-shift;x<W;x+=110){ctx.beginPath();ctx.moveTo(x,FLOOR+7);ctx.lineTo(x-48,H);ctx.stroke();}
    ctx.globalAlpha=1;
    if(game.stage===3){for(let i=0;i<50;i++){let x=sx(i*43),height=20+(i%7)*7;ctx.strokeStyle=i%3?'#5ea547':'#9bc354';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,FLOOR);ctx.quadraticCurveTo(x-8,FLOOR-height*.7,x+2,FLOOR-height);ctx.stroke();}}
  }
  function drawPlatforms(){
    const w=worlds[game.stage];ctx.save();ctx.translate(-game.camera,0);
    for(const p of game.platforms){if(p.x+p.w<game.camera-30||p.x>game.camera+W+30)continue;
      if(p.kind==='ground')continue;
      if(p.kind==='exit'){ctx.fillStyle='#d5ee83';ctx.globalAlpha=.85+.15*Math.sin(game.time*4);ctx.beginPath();ctx.ellipse(p.x+p.w/2,p.y-38,28,42,0,0,7);ctx.fill();ctx.globalAlpha=.35;ctx.fillStyle='#fff8c4';ctx.beginPath();ctx.ellipse(p.x+p.w/2,p.y-38,16,30,0,0,7);ctx.fill();ctx.globalAlpha=1;continue;}
      if(p.kind==='checkpoint'){ctx.fillStyle='#20352d';ctx.globalAlpha=.78;rr(p.x,p.y,p.w,p.h,12);ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle='#c9e78a';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x+p.w/2,p.y+18,15,Math.PI,0);ctx.lineTo(p.x+p.w/2+15,p.y+p.h);ctx.moveTo(p.x+p.w/2-15,p.y+18);ctx.lineTo(p.x+p.w/2-15,p.y+p.h);ctx.stroke();ctx.fillStyle='#e6f4bd';ctx.font='8px "DM Mono"';ctx.textAlign='center';ctx.fillText(p.label,p.x+p.w/2,p.y-7);continue;}
      ctx.fillStyle=p.kind==='pillow'?'#9d7995':p.kind==='bark'?'#88673d':w.edge;rr(p.x,p.y,p.w,p.h,8);ctx.fill();ctx.fillStyle=p.kind==='pillow'?'#d1a8c1':p.kind==='bark'?'#ad8957':'#d6d394';rr(p.x,p.y,p.w,6,5);ctx.fill();
      ctx.globalAlpha=.2;ctx.fillStyle='#18221a';ctx.fillRect(p.x+8,p.y+p.h,p.w-16,5);ctx.globalAlpha=1;
      if(p.kind==='pillow'){ctx.strokeStyle='#e4c4d2';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x+12,p.y+9);ctx.quadraticCurveTo(p.x+p.w/2,p.y+15,p.x+p.w-12,p.y+9);ctx.stroke();}
    }
    for(const h of game.hazards){if(h.x<game.camera-100||h.x>game.camera+W+100)continue;
      if(h.kind==='fan'){ctx.fillStyle='#777568';ctx.fillRect(h.x,h.y,h.w,h.h);ctx.fillStyle='#c9bea0';ctx.beginPath();ctx.arc(h.x+h.w/2,h.y+5,28,0,7);ctx.fill();for(let i=0;i<4;i++){ctx.save();ctx.translate(h.x+h.w/2,h.y+5);ctx.rotate(game.time*6+i*Math.PI/2);ctx.fillStyle='#e0dbc7';ctx.beginPath();ctx.ellipse(0,-16,8,17,0,0,7);ctx.fill();ctx.restore();}}
      else if(h.kind==='stove'){ctx.fillStyle='#8c8a7a';ctx.fillRect(h.x,h.y,h.w,h.h);ctx.fillStyle='#e08458';ctx.globalAlpha=.6+.35*Math.sin(game.time*4);ctx.fillRect(h.x+9,h.y+12,h.w-18,h.h-12);ctx.globalAlpha=1;}
      else if(h.kind==='drain'){ctx.fillStyle='#455a5c';rr(h.x,h.y,h.w,h.h,9);ctx.fill();ctx.strokeStyle='#a9cecc';ctx.lineWidth=3;for(let x=h.x+12;x<h.x+h.w;x+=16){ctx.beginPath();ctx.moveTo(x,h.y+4);ctx.lineTo(x,h.y+h.h-4);ctx.stroke();}}
      else if(h.kind==='soap'){ctx.fillStyle='#d8f8ed';ctx.globalAlpha=.78;ctx.beginPath();ctx.ellipse(h.x+h.w/2,h.y+6,h.w/2,18,0,0,7);ctx.fill();ctx.globalAlpha=1;}
      else if(h.kind==='flower'){ctx.fillStyle='#68a958';ctx.fillRect(h.x+h.w/2-5,h.y+16,10,FLOOR-h.y);ctx.fillStyle='#e579ab';for(let i=0;i<7;i++){ctx.beginPath();ctx.ellipse(h.x+h.w/2+Math.cos(i*Math.PI/3.5)*22,h.y+12+Math.sin(i*Math.PI/3.5)*22,17,10,i*Math.PI/3.5,0,7);ctx.fill();}ctx.fillStyle='#f7d96c';ctx.beginPath();ctx.arc(h.x+h.w/2,h.y+12,13,0,7);ctx.fill();}
      else if(h.kind==='branch'){ctx.fillStyle='#765536';ctx.save();ctx.translate(h.x,h.y+110);ctx.rotate(-.08);ctx.fillRect(-18,-110,36,230);ctx.restore();}
    }
    ctx.restore();
  }
  function drawInsects(){
    ctx.save();ctx.translate(-game.camera,0);
    for(const b of game.insects){if(!b.alive)continue;let bob=Math.sin(game.time*4+b.phase)*5;b.x+=0;ctx.save();ctx.translate(b.x,b.y+bob);ctx.fillStyle=b.type==='glow'?'#fff5a2':'#403a28';ctx.globalAlpha=.16;ctx.beginPath();ctx.ellipse(0,12,17,5,0,0,7);ctx.fill();ctx.globalAlpha=1;
      if(b.type==='glow'){ctx.shadowColor='#fff19a';ctx.shadowBlur=22;ctx.fillStyle='#fff2a1';ctx.beginPath();ctx.arc(0,0,7,0,7);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-2,-2,2,0,7);ctx.fill();}
      else{ctx.fillStyle='#5e3827';ctx.beginPath();ctx.ellipse(0,0,8,6,0,0,7);ctx.fill();ctx.fillStyle='#a76e3d';ctx.beginPath();ctx.ellipse(1,-2,5,3,0,0,7);ctx.fill();ctx.strokeStyle='#4d3529';ctx.lineWidth=1.5;for(let s of [-1,1])for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(s*5,1);ctx.lineTo(s*(10+i*2),4+i*2);ctx.stroke();}ctx.fillStyle='#382b25';ctx.beginPath();ctx.arc(-6,-2,2,0,7);ctx.fill();}
      ctx.restore();}
    for(const p of game.webs){ctx.strokeStyle='#d9faff';ctx.lineWidth=2;ctx.globalAlpha=.8;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*.12,p.y-p.vy*.12);ctx.stroke();ctx.fillStyle='#f6ffff';ctx.beginPath();ctx.arc(p.x,p.y,4,0,7);ctx.fill();}
    for(const p of game.particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,7);ctx.fill();}ctx.globalAlpha=1;ctx.restore();
  }
  function drawBoss(){if(!game.boss)return;let b=game.boss,x=b.x-game.camera,y=b.y+Math.sin(game.time*2)*4;if(x<-100||x>W+100)return;ctx.save();ctx.translate(x,y);let flash=b.hit>0;ctx.shadowColor=flash?'#fff':'#392813';ctx.shadowBlur=flash?24:8;
    if(game.stage===1){ // mantis with folded scythe arms
      ctx.fillStyle=flash?'#fff':'#82a548';ctx.beginPath();ctx.ellipse(0,-12,32,27,0,0,7);ctx.fill();ctx.fillStyle='#a6c85c';ctx.beginPath();ctx.ellipse(0,-42,19,17,0,0,7);ctx.fill();ctx.fillStyle='#d8f484';for(let s of [-1,1]){ctx.beginPath();ctx.arc(s*8,-46,6,0,7);ctx.fill();ctx.fillStyle='#263a2b';ctx.beginPath();ctx.arc(s*9,-46,2,0,7);ctx.fill();}ctx.strokeStyle='#718d42';ctx.lineWidth=6;for(let s of [-1,1]){ctx.beginPath();ctx.moveTo(s*19,-24);ctx.lineTo(s*38,-44);ctx.lineTo(s*26,-68);ctx.stroke();ctx.beginPath();ctx.moveTo(s*13,1);ctx.lineTo(s*28,17);ctx.lineTo(s*35,9);ctx.stroke();}ctx.fillStyle='#6b8640';ctx.beginPath();ctx.ellipse(0,-9,24,16,.3,0,7);ctx.fill();
    }else if(game.stage===4){ // great roach, shell and antennae
      ctx.fillStyle=flash?'#fff':'#714c2c';ctx.beginPath();ctx.ellipse(0,-17,39,26,0,0,7);ctx.fill();ctx.fillStyle='#a67542';ctx.beginPath();ctx.ellipse(-3,-25,27,18,-.08,0,7);ctx.fill();ctx.strokeStyle='#4c3224';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-2,-42);ctx.lineTo(-8,-57);ctx.lineTo(-20,-66);ctx.moveTo(6,-42);ctx.lineTo(15,-60);ctx.lineTo(28,-66);ctx.stroke();ctx.fillStyle='#f4cf67';ctx.beginPath();ctx.arc(-11,-43,4,0,7);ctx.arc(11,-43,4,0,7);ctx.fill();ctx.strokeStyle='#543a28';ctx.lineWidth=4;for(let s of [-1,1])for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(s*23,-6);ctx.lineTo(s*(38+i*4),4+i*7);ctx.stroke();}
    }else{ // drain drake, scaled house lizard / monster
      ctx.fillStyle=flash?'#fff':'#59817a';ctx.beginPath();ctx.ellipse(0,-17,43,29,0,0,7);ctx.fill();ctx.beginPath();ctx.moveTo(-22,-34);ctx.lineTo(-35,-62);ctx.lineTo(-7,-41);ctx.lineTo(10,-66);ctx.lineTo(18,-38);ctx.fill();ctx.fillStyle='#8fd5bd';ctx.beginPath();ctx.ellipse(18,-30,21,12,-.2,0,7);ctx.fill();ctx.fillStyle='#f9eb98';ctx.beginPath();ctx.arc(22,-35,5,0,7);ctx.fill();ctx.fillStyle='#253d3c';ctx.beginPath();ctx.arc(24,-35,2,0,7);ctx.fill();ctx.strokeStyle='#406860';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-31,-14);ctx.quadraticCurveTo(-59,-1,-50,17);ctx.stroke();ctx.fillStyle='#79b3a5';for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(-17+i*11,-35,4,0,7);ctx.fill();}
    }
    ctx.shadowBlur=0;ctx.restore();
    // boss health ribbon
    const bw=115,bx=x-bw/2,by=y-91;ctx.fillStyle='#1b2821';rr(bx,by,bw,8,4);ctx.fill();ctx.fillStyle='#f2a47a';rr(bx,by,bw*b.hp/b.max,8,4);ctx.fill();ctx.font='9px "DM Mono"';ctx.textAlign='center';ctx.fillStyle='#fff1d2';ctx.fillText(b.name,bx+bw/2,by-6);
  }
  function drawSpider(){
    const x=spider.x-game.camera,feet=spider.y,walk=Math.sin(spider.anim*13),jumping=!spider.grounded&&!spider.climbing;let bob=spider.grounded?Math.abs(walk)*2:0;
    if(spider.webDrop){ctx.save();ctx.strokeStyle='#efffff';ctx.lineWidth=2;ctx.globalAlpha=.88;ctx.beginPath();ctx.moveTo(spider.webDrop.x-game.camera,spider.webDrop.originY-2);ctx.quadraticCurveTo(x+Math.sin(game.time*3)*4,spider.webDrop.originY+25,x,feet-18);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(spider.webDrop.x-game.camera,spider.webDrop.originY-2,3,0,7);ctx.fill();ctx.restore();}
    ctx.fillStyle='#17231b55';ctx.beginPath();ctx.ellipse(x,feet+4,jumping?14:22,5,0,0,7);ctx.fill();
    ctx.save();ctx.translate(x,feet-bob);ctx.scale(spider.face,1);
    const bodyY=-21+(jumping?-5:0);
    // eight jointed, visibly articulated legs
    ctx.lineCap='round';ctx.lineJoin='round';
    for(let s of [-1,1])for(let i=0;i<4;i++){
      const swing=walk*(i<2?1:-1)*4,rootX=s*(i<2?5:9),rootY=bodyY+(i-1.5)*3;
      let kneeX=s*(13+i*3),kneeY=bodyY+(-13+i*8)+swing;
      let toeX=s*(12+i*7)+(i<2?5:-2),toeY=-2+(i%2)*2+swing*.5;
      if(jumping){kneeY+=s*(i<2?-5:5);toeY+=s*(i<2?-9:7);}
      ctx.strokeStyle='#392b29';ctx.lineWidth=i===0?4:3;ctx.beginPath();ctx.moveTo(rootX,rootY);ctx.lineTo(kneeX,kneeY);ctx.lineTo(toeX,toeY);ctx.stroke();
      ctx.strokeStyle='#c89162';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(rootX,rootY);ctx.lineTo(kneeX,kneeY);ctx.stroke();ctx.fillStyle='#d4a476';ctx.beginPath();ctx.arc(kneeX,kneeY,2.1,0,7);ctx.fill();
    }
    // abdomen, fuzzy markings, cephalothorax
    ctx.fillStyle='#392827';ctx.beginPath();ctx.ellipse(-8,bodyY+1,15,12,-.18,0,7);ctx.fill();
    ctx.fillStyle='#a75b43';ctx.beginPath();ctx.ellipse(-12,bodyY-2,8,7,-.3,0,7);ctx.fill();
    ctx.fillStyle='#e2a56b';ctx.beginPath();ctx.ellipse(-14,bodyY-5,3,2,-.4,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(-7,bodyY+5,3,2,.4,0,7);ctx.fill();
    ctx.fillStyle='#49302b';ctx.beginPath();ctx.ellipse(5,bodyY-3,11,10,-.1,0,7);ctx.fill();ctx.fillStyle='#b87952';ctx.beginPath();ctx.ellipse(4,bodyY-8,7,3,0,0,7);ctx.fill();
    // huge forward-facing eyes, signature jumping-spider look
    ctx.fillStyle='#171c1b';ctx.beginPath();ctx.ellipse(11,bodyY-6,5.3,6.2,0,0,7);ctx.ellipse(3,bodyY-7,4.2,5,0,0,7);ctx.fill();ctx.fillStyle='#ecf4dc';ctx.beginPath();ctx.arc(12.5,bodyY-8,1.8,0,7);ctx.arc(4.4,bodyY-9,1.3,0,7);ctx.fill();ctx.fillStyle='#171c1b';ctx.beginPath();ctx.arc(13,bodyY-8,1,0,7);ctx.fill();
    ctx.restore();
    if(spider.attackAnim>0){
      const a=spider.attackAnim/.2;ctx.save();ctx.translate(x,feet);ctx.scale(spider.face,1);ctx.globalAlpha=.22+.48*a;ctx.fillStyle='#ffcb73';rr(12,-56,62,48,13);ctx.fill();ctx.globalAlpha=.9*a;ctx.strokeStyle='#fff0b5';ctx.lineWidth=2;ctx.setLineDash([5,3]);rr(12,-56,62,48,13);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(20,-12);ctx.quadraticCurveTo(48,-45,72,-39);ctx.stroke();ctx.restore();
    }
    if(spider.invuln>0&&Math.floor(game.time*18)%2===0){ctx.strokeStyle='#f6f5bf';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,feet-22,27,0,7);ctx.stroke();}
  }
  function render(){ctx.clearRect(0,0,W,H);drawBackground();drawPlatforms();drawInsects();drawBoss();drawSpider();}
  function jump(){if(spider.webDrop){spider.webDrop=null;spider.vy=-360;spider.grounded=false;}else if(spider.grounded)spider.vy=-440;else return;spider.grounded=false;spider.jumpLock=.15;spider.climbing=false;beep(330,.08,'triangle',.022);emit(spider.x,spider.y-2,'#d7e9ae',5,42);}
  function fireWeb(){if(spider.web<22||spider.webCd>0)return;spider.web-=22;spider.webCd=.33;let target=game.boss&&game.boss.hp>0?game.boss:null;let dx=target?target.x-spider.x:spider.face*290;let dy=target?target.y-(spider.y-24):0;let d=Math.hypot(dx,dy)||1;game.webs.push({x:spider.x+spider.face*15,y:spider.y-25,vx:dx/d*480,vy:dy/d*480,life:1.1});beep(700,.07,'sine',.018);}
  function bite(){if(spider.attackCd>0)return;spider.attackCd=.42;spider.attackAnim=.2;emit(spider.x+spider.face*43,spider.y-34,'#ffd18a',7,48);beep(190,.06,'square',.018);
    const left=spider.face>0?spider.x+12:spider.x-74,right=spider.face>0?spider.x+74:spider.x-12,top=spider.y-56,bottom=spider.y-8;
    for(const bug of game.insects)if(bug.alive&&bug.x>=left&&bug.x<=right&&bug.y>=top&&bug.y<=bottom)activateBug(bug);
    if(game.boss&&game.boss.hp>0&&game.boss.x>=left-12&&game.boss.x<=right+12&&game.boss.y>=top-12&&game.boss.y<=bottom+30)hitBoss(1,'bite');
  }
  function hitBoss(amount,source){const b=game.boss;if(!b||b.hp<=0)return;b.hp=Math.max(0,b.hp-amount);b.hit=.25;game.score+=120;game.shake=5;emit(b.x,b.y-25,'#f5d477',11,110);beep(source==='hazard'?110:520,.12,source==='hazard'?'sawtooth':'triangle',.04);if(b.hp===0){game.score+=900;toast(`${b.name} defeated! The way is clear!`);emit(b.x,b.y-20,'#ffe58f',32,190);beep(780,.3,'triangle',.05);}}
  function activateEat(){let b=game.insects.find(i=>i.alive&&Math.hypot(i.x-spider.x,(i.y)-(spider.y-18))<55);if(!b)return toast('Get a little closer to that snack.');b.alive=false;game.eaten++;game.areaEaten++;game.snacks++;game.score+=b.type==='glow'?150:100;spider.health=Math.min(spider.maxHealth,spider.health+1);spider.web=Math.min(100,spider.web+34);emit(b.x,b.y,b.type==='glow'?'#fff5a2':'#a7d870',14,100);toast(b.type==='glow'?'Glowbug! +1 heart · web refilled':'Crunch! +1 heart · web refilled');beep(b.type==='glow'?880:620,.12,'sine',.04);updateHud();}
  function update(dt){
    game.time+=dt;game.totalTime+=dt;if(game.mode!=='play')return;game.stageTime+=dt;
    if(game.toastTimer>0){game.toastTimer-=dt;if(game.toastTimer<=0)ui.toast.classList.remove('show');}
    spider.invuln=Math.max(0,spider.invuln-dt);spider.attackCd=Math.max(0,spider.attackCd-dt);spider.attackAnim=Math.max(0,spider.attackAnim-dt);spider.webCd=Math.max(0,spider.webCd-dt);spider.web=Math.min(100,spider.web+dt*9);spider.anim+=dt*Math.abs(spider.vx)*.045;
    if(game.controls.jump&&spider.jumpReady!==false){jump();spider.jumpReady=false;}if(!game.controls.jump)spider.jumpReady=true;
    const move=game.controls.x;
    if(spider.webDrop&&Math.abs(move)>.25)spider.webDrop=null;
    if(move){spider.vx+=move*1300*dt;spider.face=move>0?1:-1;}else spider.vx*=Math.pow(.001,dt);
    spider.vx=clamp(spider.vx,-220,220);
    if(!spider.webDrop&&spider.grounded&&game.controls.web&&game.controls.y>.3){
      const support=game.platforms.find(p=>p.kind!=='ground'&&p.kind!=='checkpoint'&&p.kind!=='exit'&&Math.abs(spider.y-p.y)<3&&spider.x>=p.x-8&&spider.x<=p.x+p.w+8);
      if(support&&spider.web>=14){spider.web-=14;spider.webDrop={x:spider.x,originY:support.y};spider.grounded=false;spider.vy=0;toast('Web rappel! Hold ↓ + WEB to descend.');}
    }
    // Press up beside a wall/platform edge to scamper vertically; down + web rappels off a ledge.
    let wall=false;if(!spider.webDrop&&game.controls.y<-.3){for(const p of game.platforms){if(p.kind==='ground')continue;let side=Math.min(Math.abs(spider.x-p.x),Math.abs(spider.x-(p.x+p.w)));if(side<19&&spider.y>p.y-30&&spider.y<p.y+p.h+85){wall=true;break;}}
      if(game.stage===0&&spider.x<188&&spider.y<420)wall=true;
    }
    if(wall){spider.climbing=true;spider.grounded=false;spider.vy=-120;spider.vx*=.3;}else spider.climbing=false;
    spider.x+=spider.vx*dt;spider.x=clamp(spider.x,Math.max(20,game.areas[game.area].start+12),game.length-25);
    const previousY=spider.y;
    if(spider.webDrop){spider.vy=game.controls.y>.3?135:game.controls.y<-.3?-90:0;spider.web=Math.max(0,spider.web-dt*4);if(spider.web<=0)spider.webDrop=null;}
    else if(!spider.climbing)spider.vy+=1120*dt;
    const nextY=spider.y+spider.vy*dt;if(!spider.climbing)spider.y=nextY;
    let land=FLOOR;for(const p of game.platforms){if(p.kind==='ground'||spider.webDrop&&p.y<=spider.webDrop.originY+2)continue;if(spider.x>p.x-8&&spider.x<p.x+p.w+8&&previousY<=p.y+10&&spider.y>=p.y&&spider.vy>=0)land=Math.min(land,p.y);}
    if(spider.y>=land){spider.y=land;spider.vy=0;spider.grounded=true;spider.climbing=false;spider.webDrop=null;}else if(!spider.climbing)spider.grounded=false;
    if(spider.y>H+90){hurt(1);spider.y=FLOOR;spider.x=Math.max(35,spider.x-120);spider.vy=0;spider.webDrop=null;}
    if(game.controls.web&&!spider.webDrop&&game.controls.y<=.3)fireWeb();if(game.controls.attack)bite();if(game.controls.eat){game.controls.eat=false;activateEat();}
    // Bugs bob in place inside their own area, so snacks can never flutter out of bounds.
    for(const b of game.insects){if(!b.alive)continue;b.x=clamp(b.homeX+Math.sin(game.time*1.35+b.phase)*b.vx,b.minX,b.maxX);b.y=b.homeY+Math.sin(game.time*2.2+b.phase)*4;if(Math.hypot(b.x-spider.x,b.y-(spider.y-20))<19)activateBug(b);}
    for(const p of game.webs){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(game.boss&&game.boss.hp>0&&Math.hypot(p.x-game.boss.x,p.y-(game.boss.y-25))<game.boss.r+12){hitBoss(1,'web');p.life=0;}if(p.x<0||p.x>game.length||p.y<0||p.y>H)p.life=0;}game.webs=game.webs.filter(p=>p.life>0);
    if(game.boss&&game.boss.hp>0){let b=game.boss;b.hit=Math.max(0,b.hit-dt);b.phase+=dt;let engaged=spider.x>650; if(engaged){const target=clamp(spider.x,120,game.length-100);b.x+=(target-b.x)*Math.min(1,dt*.9);if(Math.sin(b.phase*1.4)>.96&&Math.abs(b.x-spider.x)<100)hurt(1);}
      // Room hazards are a boss-fight tool as well as scenery.
      const hazard=game.hazards.find(h=>['fan','flower','drain','soap'].includes(h.kind)&&b.x>h.x-25&&b.x<h.x+h.w+25);
      if(hazard&&Math.floor(b.phase*2.4)!==Math.floor((b.phase-dt)*2.4)){hitBoss(1,'hazard');toast(`The ${hazard.kind==='fan'?'fan':hazard.kind==='flower'?'flower':hazard.kind} caught it!`);}
    }
    // Hazard collisions: hot surfaces and spinning blades hurt; soap and soft surfaces are safe.
    for(const h of game.hazards){if(['stove','fan','branch'].includes(h.kind)&&spider.x>h.x-10&&spider.x<h.x+h.w+10&&spider.y>h.y-5&&spider.y<FLOOR+5){if(h.kind!=='fan'||Math.sin(game.time*8)>-.2)hurt(1);}}
    if(spider.invuln<=0&&game.boss&&game.boss.hp>0&&Math.abs(game.boss.x-spider.x)<48&&Math.abs(game.boss.y-spider.y)<45)hurt(1);
    game.camera=clamp(spider.x-W*.42,0,game.length-W);
    if(game.boss&&game.boss.hp>0&&spider.x>game.length-210)spider.x=game.length-210;
    if(game.area<2&&spider.x>game.checkpoints[game.area]-20){
      const area=game.areas[game.area];
      if(game.areaEaten>=area.goal){game.area++;game.areaEaten=0;spider.x=game.areas[game.area].start+22;ui.status.textContent=`${worlds[game.stage].path} · AREA ${game.area+1}/3`;toast(`Checkpoint reached! Area ${game.area+1} of 3`);beep(610,.16,'triangle',.035);}
      else{spider.x=game.checkpoints[game.area]-20;if(game.toastTimer<=0)toast(`This area needs ${area.goal-game.areaEaten} more bug snack${area.goal-game.areaEaten===1?'':'s'}!`);}
    }
    const finalArea=game.areas[2],ready=game.area===2&&game.areaEaten>=finalArea.goal&&(!game.boss||game.boss.hp<=0);
    if(spider.x>game.length-130&&ready){if(game.stage===worlds.length-1){game.score+=Math.max(0,spider.health)*250;endGame(true);}else{let next=game.stage+1;game.score+=300;spider.health=Math.min(3,spider.health+1);seedStage(next);toast(`Welcome to ${worlds[next].name}! +1 heart`);beep(680,.2,'triangle',.04);}}
    if(spider.x>game.length-155&&!ready){spider.x=game.length-155;if(game.boss&&game.boss.hp>0)toast(`${game.boss.name} is blocking the way!`);else toast(`Find ${Math.max(0,finalArea.goal-game.areaEaten)} more bug snack${finalArea.goal-game.areaEaten===1?'':'s'} in this area!`);}
    game.shake=Math.max(0,game.shake-dt*20);updateHud();
  }
  function activateBug(b){if(!b.alive)return;b.alive=false;game.eaten++;game.areaEaten++;game.snacks++;game.score+=b.type==='glow'?150:100;spider.health=Math.min(spider.maxHealth,spider.health+1);spider.web=Math.min(100,spider.web+35);emit(b.x,b.y,b.type==='glow'?'#fff5a2':'#a7d870',12,100);toast(b.type==='glow'?'Glowbug snack! +heart +web':'Bug snack! +heart +web');beep(b.type==='glow'?880:620,.12,'sine',.04);updateHud();}
  function hurt(n){if(spider.invuln>0||game.mode!=='play')return;spider.health-=n;spider.invuln=1.15;game.shake=10;emit(spider.x,spider.y-25,'#ffb17e',10,110);beep(100,.22,'sawtooth',.045);toast('Ouch! Find a bug snack to heal.');if(spider.health<=0){spider.health=0;updateHud();endGame(false);}}
  function togglePause(){if(game.mode==='play'){game.mode='paused';ui.overlay.classList.remove('hidden');ui.pause.classList.remove('visible');ui.status.textContent='TAKING A LITTLE REST';ui.card.querySelector('.eyebrow').innerHTML='<span class="eyebrow-line"></span> PAUSED UNDER A LEAF <span class="eyebrow-line"></span>';ui.card.querySelector('h1').innerHTML='TAKE A<br><span>BREATHER</span>';ui.card.querySelector('.subtitle').innerHTML='Your little adventure is safe right here.';ui.start.querySelector('span').textContent='CONTINUE ADVENTURE';}
    else if(game.mode==='paused'){game.mode='play';ui.overlay.classList.add('hidden');ui.pause.classList.add('visible');ui.status.textContent=worlds[game.stage].path;}}
  ui.start.addEventListener('click',()=>{if(game.mode==='paused'){togglePause();return;}begin();});
  ui.pause.addEventListener('click',togglePause);
  ui.sound.addEventListener('click',()=>{game.sound=!game.sound;ui.sound.querySelector('.sound-state').textContent=game.sound?'ON':'OFF';ui.sound.setAttribute('aria-label',game.sound?'Mute sound':'Enable sound');if(game.sound)beep(600,.08);});
  bestUpdate();
  window.addEventListener('keydown',e=>{let k=e.key.toLowerCase();if([' ','arrowleft','arrowright','arrowup','arrowdown'].includes(k))e.preventDefault();keys.add(k);
    if(k==='p'||k==='escape'){if(!e.repeat)togglePause();return;}
    if(k===' '||k==='arrowup'||k==='w')holdAction(`key:${k}`,'jump',true);
    if(k==='j')holdAction('key:j','web',true);
    if(k==='k'||k==='f')holdAction(`key:${k}`,'attack',true);
    if(k==='e'&&!e.repeat)game.controls.eat=true;
  });
  window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys.delete(k);if(k===' '||k==='arrowup'||k==='w')holdAction(`key:${k}`,'jump',false);if(k==='j')holdAction('key:j','web',false);if(k==='k'||k==='f')holdAction(`key:${k}`,'attack',false);});
  function moveKeys(){let left=keys.has('a')||keys.has('arrowleft'),right=keys.has('d')||keys.has('arrowright'),up=keys.has('w')||keys.has('arrowup'),down=keys.has('s')||keys.has('arrowdown');if(!joy.active){game.controls.x=(right?1:0)-(left?1:0);game.controls.y=(down?1:0)-(up?1:0);}}
  canvas.addEventListener('pointermove',e=>{let r=canvas.getBoundingClientRect();pointer.x=(e.clientX-r.left)*W/r.width;pointer.y=(e.clientY-r.top)*H/r.height;});
  canvas.addEventListener('pointerdown',e=>{if(game.mode!=='play')return;e.preventDefault();holdAction(`canvas:${e.pointerId}`,'web',true);try{canvas.setPointerCapture(e.pointerId)}catch{}});
  function releaseCanvasPointer(e){holdAction(`canvas:${e.pointerId}`,'web',false);}
  canvas.addEventListener('pointerup',releaseCanvasPointer);canvas.addEventListener('pointercancel',releaseCanvasPointer);canvas.addEventListener('lostpointercapture',releaseCanvasPointer);
  canvas.addEventListener('contextmenu',e=>{e.preventDefault();if(game.mode==='play')bite();});
  const joy={active:false,id:null,cx:0,cy:0};const stick=$('#stick'),joyEl=$('#joystick');
  joyEl.addEventListener('pointerdown',e=>{e.preventDefault();joy.active=true;joy.id=e.pointerId;const r=joyEl.getBoundingClientRect();joy.cx=r.left+r.width/2;joy.cy=r.top+r.height/2;joyEl.setPointerCapture(e.pointerId);updateJoy(e);});
  joyEl.addEventListener('pointermove',e=>{if(joy.active&&joy.id===e.pointerId)updateJoy(e);});
  function updateJoy(e){let dx=e.clientX-joy.cx,dy=e.clientY-joy.cy,d=Math.hypot(dx,dy),max=27;if(d>max){dx*=max/d;dy*=max/d;}stick.style.transform=`translate(${dx}px,${dy}px)`;game.controls.x=Math.abs(dx)<7?0:dx/max;game.controls.y=Math.abs(dy)<7?0:dy/max;}
  function endJoy(e){if(!joy.active||e&&e.pointerId!==joy.id)return;joy.active=false;joy.id=null;stick.style.transform='';game.controls.x=0;game.controls.y=0;moveKeys();}
  joyEl.addEventListener('pointerup',endJoy);joyEl.addEventListener('pointercancel',endJoy);joyEl.addEventListener('lostpointercapture',endJoy);
  function bindHold(id,prop){const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();holdAction(`${id}:${e.pointerId}`,prop,true);try{el.setPointerCapture(e.pointerId)}catch{}});const release=e=>holdAction(`${id}:${e.pointerId}`,prop,false);el.addEventListener('pointerup',release);el.addEventListener('pointercancel',release);el.addEventListener('lostpointercapture',release);}
  bindHold('#jumpButton','jump');bindHold('#webButton','web');bindHold('#attackButton','attack');
  let previous=performance.now();function frame(now){let dt=Math.min(.032,(now-previous)/1000);previous=now;moveKeys();update(dt);render();requestAnimationFrame(frame);}requestAnimationFrame(frame);
})();
