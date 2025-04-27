// game.js — Clickable & hoverable snake

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');
  const info   = document.getElementById('info-box');

  const S    = 50;
  const COLS = Math.floor(canvas.width / S);
  const ROWS = Math.floor(canvas.height / S);

  // Metadata for each photo
  const IMAGES = [
    { src:'assets/photo1.jpg', title:'Project A', artist:'Artist 1', link:'https://example.com/A' },
    { src:'assets/photo2.jpg', title:'Project B', artist:'Artist 2', link:'https://example.com/B' },
    // …etc for each photo
  ];

  // Preload
  const loaded = IMAGES.map(obj => {
    const img = new Image(); img.src = obj.src;
    return img;
  });
  function preloadAll(arr) {
    return Promise.all(arr.map(i => new Promise(r=>{i.onload=i.onerror=r;})));
  }

  // Game state
  let snakePos=[], snakeImg=[], target={}, nextPhoto=0, gameI;

  function initSnake(){
    snakePos=[{ x:0,y:0 }]; snakeImg=[0]; nextPhoto=1;
  }
  function spawnTarget(){
    let x,y;
    do { x=Math.floor(Math.random()*COLS)*S; y=Math.floor(Math.random()*ROWS)*S; }
    while(snakePos.some(p=>p.x===x&&p.y===y));
    target={x,y,img:nextPhoto};
    nextPhoto=(nextPhoto+1)%loaded.length;
  }

  function candidates(head){
    const arr=[];
    const dx = target.x-head.x, dy=target.y-head.y;
    if(dx>0) arr.push({x:head.x+S,y:head.y});
    if(dx<0) arr.push({x:head.x-S,y:head.y});
    if(dy>0) arr.push({x:head.x,y:head.y+S});
    if(dy<0) arr.push({x:head.x,y:head.y-S});
    // all 4 dirs fallback
    [{x:S,y:0},{x:-S,y:0},{x:0,y:S},{x:0,y:-S}].forEach(d=>arr.push({x:head.x+d.x,y:head.y+d.y}));
    return arr;
  }

  function move(){
    const head={...snakePos[0]};
    const arr=candidates(head);
    // pick first non-self-colliding
    let next=arr.find(p=>!snakePos.some(q=>q.x===p.x&&q.y===p.y))||arr[0];
    return next;
  }

  function die(){
    clearInterval(gameI);
    let f=0;const t=setInterval(()=>{
      ctx.fillStyle=(f%2?'white':'red');ctx.fillRect(0,0,canvas.width,canvas.height);
      if(++f>5){clearInterval(t);start();}
    },100);
  }

  function step(){
    const head=move();
    // collision kill
    if(snakePos.some(p=>p.x===head.x&&p.y===head.y)) return die();
    const ate=head.x===target.x&&head.y===target.y;
    snakePos.unshift(head);
    if(!ate) snakePos.pop();
    else{ snakeImg.push(target.img); spawnTarget(); }
    draw();
  }

  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // target
    const ti=loaded[target.img]; if(ti) ctx.drawImage(ti, target.x, target.y, S,S);
    // snake
    snakePos.forEach((p,i)=>{ const si=loaded[snakeImg[i]]; if(si) ctx.drawImage(si,p.x,p.y,S,S); });
  }

  // Handle clicks & hovers
  canvas.addEventListener('click', e=>{
    const r=canvas.getBoundingClientRect();
    const x=Math.floor((e.clientX-r.left)/r.width*canvas.width),
          y=Math.floor((e.clientY-r.top)/r.height*canvas.height);
    // find segment or target
    [...snakePos.map((p,i)=>({p,i,type:'snake'})),{p:target,i:target.img,type:'target'}]
      .some(o=>{
        if(x>=o.p.x&&x<o.p.x+S&&y>=o.p.y&&y<o.p.y+S){
          const md=IMAGES[o.i]; window.open(md.link,'_blank'); return true;
        }
      });
  });

  canvas.addEventListener('mousemove', e=>{
    const r=canvas.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width*canvas.width,
          y=(e.clientY-r.top)/r.height*canvas.height;
    let found=false;
    [...snakePos.map((p,i)=>({p,i})),{p:target,i:target.img}].forEach(o=>{
      if(x>=o.p.x&&x<o.p.x+S&&y>=o.p.y&&y<o.p.y+S){
        const md=IMAGES[o.i];
        info.textContent = md.title+ ' — ' + md.artist;
        found=true;
      }
    });
    if(!found) info.textContent='';
  });

  function start(){ initSnake(); spawnTarget(); draw(); gameI=setInterval(step,400); }
  preloadAll(loaded).then(start);
});
