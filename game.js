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
  const keys = new Set(), pointer = {x:700,y:350,down:false};
  const game = {mode:'menu', time:0, camera:0, stage:0, score:0, best:Number(localStorage.getItem('littlelegs-best')||0), snacks:0, insects:[], webs:[], particles:[], platforms:[], hazards:[], boss:null, eaten:0, stageTime:0, toastTimer:0, shake:0, sound:true, mutedUntil:0, last:0, controls:{x:0,y:0,jump:false,web:false,attack:false}, totalTime:0};
  const spider = {x:100,y:FLOOR,vx:0,vy:0,face:1,health:3,maxHealth:3,web:100,grounded:true,climbing:false,invuln:0,attackCd:0,webCd:0,jumpLock:0,anim:0,dead:false};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const rand=(a,b)=>a+Math.random()*(b-a);
  const rr=(x,y,w,h,r)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);};
  function bestUpdate(){ui.best.textContent=game.best;}
  function toast(text){ui.toast.textContent=text;ui.toast.classList.add('show');game.toastTimer=2.2;}
  function beep(freq=420,duration=.08,type='sine',volume=.035){if(!game.sound)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!game.audio)game.audio=new AC();const o=game.audio.createOscillator(),g=game.audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(volume,game.audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,game.audio.currentTime+duration);o.connect(g);g.connect(game.audio.destination);o.start();o.stop(game.audio.currentTime+duration)}catch{}}
  function emit(x,y,color,n=8,power=120){for(let i=0;i<n;i++){let a=rand(0,Math.PI*2),s=rand(.2,1)*power;game.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.35,.8),max:.8,color,size:rand(2,5)})}}
  function seedStage(index){
    game.stage=index;game.stageTime=0;game.eaten=0;game.camera=0;game.insects=[];game.webs=[];game.particles=[];game.hazards=[];game.boss=null;
    const w=worlds[index];
    game.length=1900;game.platforms=[{x:0,y:FLOOR,w:game.length,h:150,kind:'ground'}];
    for(let i=0;i<8;i++){let x=235+i*205+rand(-45,40);let y=FLOOR-rand(85,185);let width=rand(95,165);game.platforms.push({x,y,w:width,h:18,kind:index===5?'pillow':'ledge',phase:rand(0,6)});}
    game.platforms.push({x:game.length-190,y:FLOOR-95,w:130,h:18,kind:'exit'});
    for(let i=0;i<w.bugs+2;i++){let px=220+i*(game.length-440)/(w.bugs+1)+rand(-35,35),py=FLOOR-rand(35,180);game.insects.push({x:px,y:py,alive:true,type:Math.random()<.3?'glow':'bug',phase:rand(0,6),vx:rand(-18,18)});}
    if(index===0){game.platforms.push({x:35,y:410,w:150,h:20,kind:'bark'});game.hazards.push({x:1000,y:300,w:70,h:205,kind:'branch'});}
    if(index===1){game.boss={name:w.boss,x:1510,y:FLOOR-32,hp:5,max:5,r:34,phase:0,hit:0};game.hazards.push({x:1425,y:FLOOR-100,w:105,h:20,kind:'flower'});}
    if(index===4){game.boss={name:w.boss,x:1510,y:FLOOR-35,hp:6,max:6,r:38,phase:0,hit:0};game.hazards.push({x:1040,y:FLOOR-28,w:130,h:25,kind:'fan'});game.hazards.push({x:800,y:FLOOR-180,w:70,h:180,kind:'stove'});}
    if(index===6){game.boss={name:w.boss,x:1510,y:FLOOR-40,hp:7,max:7,r:42,phase:0,hit:0};game.hazards.push({x:1400,y:FLOOR-15,w:110,h:15,kind:'drain'});game.hazards.push({x:700,y:FLOOR-90,w:100,h:18,kind:'soap'});}
    spider.x=95;spider.y=FLOOR;spider.vx=0;spider.vy=0;spider.health=Math.max(spider.health,2);spider.grounded=true;spider.climbing=false;spider.invuln=1.2;spider.dead=false;
    ui.stage.textContent=w.name;ui.world.textContent=String(index+1).padStart(2,'0')+' / 07';ui.tip.textContent=w.tip;ui.status.textContent=w.path;
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
      ctx.fillStyle='#315839';for(let i=0;i<15;i++){let x=sx(i*111);ctx.beginPath();ctx.ellipse(x,70+(i%3)*24,65,28,rand(-.4,.4),0,Math.PI*2);ctx.fill();}
      ctx.fillStyle='#f9e4a5';ctx.globalAlpha=.45;ctx.beginPath();ctx.arc(756,130,49,0,7);ctx.fill();ctx.globalAlpha=1;
    }else if(game.stage<4){
      // sun disc, layered leaves and a soft rolling horizon
      ctx.fillStyle='#fff0b0';ctx.globalAlpha=.7;ctx.beginPath();ctx.arc(770,132,48,0,7);ctx.fill();ctx.globalAlpha=1;
      for(let i=0;i<12;i++){let x=sx(i*132+18),y=100+(i%4)*58;ctx.fillStyle=i%2?'#528451':'#669651';ctx.beginPath();ctx.ellipse(x,y,68,31,Math.sin(i)*.4,0,7);ctx.fill();ctx.strokeStyle='#9bb66a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-38,y+5);ctx.quadraticCurveTo(x,y-10,x+43,y+4);ctx.stroke();}
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
    if(spider.invuln>0&&Math.floor(game.time*18)%2===0){ctx.strokeStyle='#f6f5bf';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,feet-22,27,0,7);ctx.stroke();}
  }
  function render(){ctx.clearRect(0,0,W,H);drawBackground();drawPlatforms();drawInsects();drawBoss();drawSpider();}
  function jump(){if(spider.grounded){spider.vy=-440;spider.grounded=false;spider.jumpLock=.15;spider.climbing=false;beep(330,.08,'triangle',.022);emit(spider.x,spider.y-2,'#d7e9ae',5,42);}}
  function fireWeb(){if(spider.web<22||spider.webCd>0)return;spider.web-=22;spider.webCd=.33;let target=game.boss&&game.boss.hp>0?game.boss:null;let dx=target?target.x-spider.x:spider.face*290;let dy=target?target.y-(spider.y-24):0;let d=Math.hypot(dx,dy)||1;game.webs.push({x:spider.x+spider.face*15,y:spider.y-25,vx:dx/d*480,vy:dy/d*480,life:1.1});beep(700,.07,'sine',.018);}
  function bite(){if(spider.attackCd>0)return;spider.attackCd=.38;emit(spider.x+spider.face*24,spider.y-28,'#ffd18a',5,32);beep(190,.06,'square',.018);if(game.boss&&game.boss.hp>0&&Math.abs(game.boss.x-spider.x)<68&&Math.abs(game.boss.y-spider.y)<54)hitBoss(1,'bite');}
  function hitBoss(amount,source){const b=game.boss;if(!b||b.hp<=0)return;b.hp=Math.max(0,b.hp-amount);b.hit=.25;game.score+=120;game.shake=5;emit(b.x,b.y-25,'#f5d477',11,110);beep(source==='hazard'?110:520,.12,source==='hazard'?'sawtooth':'triangle',.04);if(b.hp===0){game.score+=900;toast(`${b.name} defeated! The way is clear!`);emit(b.x,b.y-20,'#ffe58f',32,190);beep(780,.3,'triangle',.05);}}
  function activateEat(){let b=game.insects.find(i=>i.alive&&Math.hypot(i.x-spider.x,(i.y)-(spider.y-18))<55);if(!b)return toast('Get a little closer to that snack.');b.alive=false;game.eaten++;game.snacks++;game.score+=b.type==='glow'?150:100;spider.health=Math.min(spider.maxHealth,spider.health+1);spider.web=Math.min(100,spider.web+34);emit(b.x,b.y,b.type==='glow'?'#fff5a2':'#a7d870',14,100);toast(b.type==='glow'?'Glowbug! +1 heart · web refilled':'Crunch! +1 heart · web refilled');beep(b.type==='glow'?880:620,.12,'sine',.04);updateHud();}
  function update(dt){
    game.time+=dt;game.totalTime+=dt;if(game.mode!=='play')return;game.stageTime+=dt;
    if(game.toastTimer>0){game.toastTimer-=dt;if(game.toastTimer<=0)ui.toast.classList.remove('show');}
    spider.invuln=Math.max(0,spider.invuln-dt);spider.attackCd=Math.max(0,spider.attackCd-dt);spider.webCd=Math.max(0,spider.webCd-dt);spider.web=Math.min(100,spider.web+dt*9);spider.anim+=dt*Math.abs(spider.vx)*.045;
    if(game.controls.jump&&spider.jumpReady!==false){jump();spider.jumpReady=false;}if(!game.controls.jump)spider.jumpReady=true;
    const move=game.controls.x; if(move){spider.vx+=move*1300*dt;spider.face=move>0?1:-1;}else spider.vx*=Math.pow(.001,dt);
    spider.vx=clamp(spider.vx,-220,220);
    // Press up beside a wall/platform edge to scamper vertically.
    let wall=false;if(game.controls.y<-.3){for(const p of game.platforms){if(p.kind==='ground')continue;let side=Math.min(Math.abs(spider.x-p.x),Math.abs(spider.x-(p.x+p.w)));if(side<19&&spider.y>p.y-30&&spider.y<p.y+p.h+85){wall=true;break;}}
      if(game.stage===0&&spider.x<188&&spider.y<420)wall=true;
    }
    if(wall){spider.climbing=true;spider.grounded=false;spider.vy=-120;spider.vx*=.3;}else spider.climbing=false;
    spider.x+=spider.vx*dt;spider.x=clamp(spider.x,20,game.length-25);
    if(!spider.climbing){spider.vy+=1120*dt;spider.y+=spider.vy*dt;}
    let land=FLOOR;for(const p of game.platforms){if(p.kind==='ground')continue;if(spider.x>p.x-8&&spider.x<p.x+p.w+8&&spider.y<=p.y+10&&spider.y+spider.vy*dt>=p.y&&spider.vy>=0)land=Math.min(land,p.y);}
    if(spider.y>=land){spider.y=land;spider.vy=0;spider.grounded=true;spider.climbing=false;}else spider.grounded=false;
    if(spider.y>H+90){hurt(1);spider.y=FLOOR;spider.x=Math.max(35,spider.x-120);spider.vy=0;}
    if(game.controls.web||pointer.down)fireWeb();if(game.controls.attack)bite();if(game.controls.eat){game.controls.eat=false;activateEat();}
    // Bugs flutter just enough to feel alive, but stay within a reachable part of the stage.
    for(const b of game.insects){if(!b.alive)continue;b.x+=Math.sin(game.time*1.6+b.phase)*b.vx*dt;b.y+=Math.sin(game.time*2.7+b.phase)*5*dt;if(Math.hypot(b.x-spider.x,b.y-(spider.y-20))<19)activateBug(b);}
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
    const minBugs=worlds[game.stage].bugs;let ready=game.eaten>=minBugs&&(!game.boss||game.boss.hp<=0);
    if(spider.x>game.length-130&&ready){if(game.stage===worlds.length-1){game.score+=Math.max(0,spider.health)*250;endGame(true);}else{let next=game.stage+1;game.score+=300;spider.health=Math.min(3,spider.health+1);seedStage(next);toast(`Welcome to ${worlds[next].name}! +1 heart`);beep(680,.2,'triangle',.04);}}
    if(spider.x>game.length-155&&!ready){spider.x=game.length-155;if(game.boss&&game.boss.hp>0)toast(`${game.boss.name} is blocking the way!`);else toast(`Find ${Math.max(0,minBugs-game.eaten)} more bug snack${minBugs-game.eaten===1?'':'s'}!`);}
    game.shake=Math.max(0,game.shake-dt*20);updateHud();
  }
  function activateBug(b){if(!b.alive)return;b.alive=false;game.eaten++;game.snacks++;game.score+=b.type==='glow'?150:100;spider.health=Math.min(spider.maxHealth,spider.health+1);spider.web=Math.min(100,spider.web+35);emit(b.x,b.y,b.type==='glow'?'#fff5a2':'#a7d870',12,100);toast(b.type==='glow'?'Glowbug snack! +heart +web':'Bug snack! +heart +web');beep(b.type==='glow'?880:620,.12,'sine',.04);updateHud();}
  function hurt(n){if(spider.invuln>0||game.mode!=='play')return;spider.health-=n;spider.invuln=1.15;game.shake=10;emit(spider.x,spider.y-25,'#ffb17e',10,110);beep(100,.22,'sawtooth',.045);toast('Ouch! Find a bug snack to heal.');if(spider.health<=0){spider.health=0;updateHud();endGame(false);}}
  function togglePause(){if(game.mode==='play'){game.mode='paused';ui.overlay.classList.remove('hidden');ui.pause.classList.remove('visible');ui.status.textContent='TAKING A LITTLE REST';ui.card.querySelector('.eyebrow').innerHTML='<span class="eyebrow-line"></span> PAUSED UNDER A LEAF <span class="eyebrow-line"></span>';ui.card.querySelector('h1').innerHTML='TAKE A<br><span>BREATHER</span>';ui.card.querySelector('.subtitle').innerHTML='Your little adventure is safe right here.';ui.start.querySelector('span').textContent='CONTINUE ADVENTURE';}
    else if(game.mode==='paused'){game.mode='play';ui.overlay.classList.add('hidden');ui.pause.classList.add('visible');ui.status.textContent=worlds[game.stage].path;}}
  ui.start.addEventListener('click',()=>{if(game.mode==='paused'){togglePause();return;}begin();});
  ui.pause.addEventListener('click',togglePause);
  ui.sound.addEventListener('click',()=>{game.sound=!game.sound;ui.sound.querySelector('.sound-state').textContent=game.sound?'ON':'OFF';ui.sound.setAttribute('aria-label',game.sound?'Mute sound':'Enable sound');if(game.sound)beep(600,.08);});
  bestUpdate();
  window.addEventListener('keydown',e=>{let k=e.key.toLowerCase();if([' ','arrowleft','arrowright','arrowup','arrowdown'].includes(k))e.preventDefault();keys.add(k);
    if(k==='p'||k==='escape'){togglePause();return;}
    if((k===' '||k==='arrowup'||k==='w')&&!e.repeat)game.controls.jump=true;
    if(k==='j'||k===' '){}if(k==='j')game.controls.web=true;
    if(k==='k'||k==='f')game.controls.attack=true;
    if(k==='e'&&!e.repeat)game.controls.eat=true;
  });
  window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys.delete(k);if(k===' '||k==='arrowup'||k==='w')game.controls.jump=false;if(k==='j')game.controls.web=false;if(k==='k'||k==='f')game.controls.attack=false;});
  function moveKeys(){let left=keys.has('a')||keys.has('arrowleft'),right=keys.has('d')||keys.has('arrowright'),up=keys.has('w')||keys.has('arrowup'),down=keys.has('s')||keys.has('arrowdown');if(!joy.active){game.controls.x=(right?1:0)-(left?1:0);game.controls.y=(down?1:0)-(up?1:0);}}
  canvas.addEventListener('pointermove',e=>{let r=canvas.getBoundingClientRect();pointer.x=(e.clientX-r.left)*W/r.width;pointer.y=(e.clientY-r.top)*H/r.height;});
  canvas.addEventListener('pointerdown',e=>{if(game.mode!=='play')return;e.preventDefault();pointer.down=true;try{canvas.setPointerCapture(e.pointerId)}catch{};});
  window.addEventListener('pointerup',()=>{pointer.down=false;game.controls.web=false;game.controls.attack=false;game.controls.jump=false;});
  canvas.addEventListener('contextmenu',e=>{e.preventDefault();if(game.mode==='play')bite();});
  const joy={active:false,id:null,cx:0,cy:0};const stick=$('#stick'),joyEl=$('#joystick');
  joyEl.addEventListener('pointerdown',e=>{e.preventDefault();joy.active=true;joy.id=e.pointerId;const r=joyEl.getBoundingClientRect();joy.cx=r.left+r.width/2;joy.cy=r.top+r.height/2;joyEl.setPointerCapture(e.pointerId);updateJoy(e);});
  joyEl.addEventListener('pointermove',e=>{if(joy.active&&joy.id===e.pointerId)updateJoy(e);});
  function updateJoy(e){let dx=e.clientX-joy.cx,dy=e.clientY-joy.cy,d=Math.hypot(dx,dy),max=27;if(d>max){dx*=max/d;dy*=max/d;}stick.style.transform=`translate(${dx}px,${dy}px)`;game.controls.x=Math.abs(dx)<7?0:dx/max;game.controls.y=Math.abs(dy)<7?0:dy/max;}
  function endJoy(){joy.active=false;joy.id=null;stick.style.transform='';game.controls.x=0;game.controls.y=0;moveKeys();}
  joyEl.addEventListener('pointerup',endJoy);joyEl.addEventListener('pointercancel',endJoy);
  function bindHold(id,prop){const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();game.controls[prop]=true;try{el.setPointerCapture(e.pointerId)}catch{}});el.addEventListener('pointerup',()=>game.controls[prop]=false);el.addEventListener('pointercancel',()=>game.controls[prop]=false);el.addEventListener('lostpointercapture',()=>game.controls[prop]=false);}
  bindHold('#jumpButton','jump');bindHold('#webButton','web');bindHold('#attackButton','attack');
  let previous=performance.now();function frame(now){let dt=Math.min(.032,(now-previous)/1000);previous=now;moveKeys();update(dt);render();requestAnimationFrame(frame);}requestAnimationFrame(frame);
})();
