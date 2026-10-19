/* EletroLab R03 · local floor-plan geometry and electrical quantities. */
const FloorCore=(()=>{
 const kinds={sala:{name:'Sala',fill:'#f3dfbc'},quarto:{name:'Quarto',fill:'#e6dcf5'},cozinha:{name:'Cozinha',fill:'#d6efe5'},banheiro:{name:'Banheiro',fill:'#ccebf4'},servico:{name:'Serviço',fill:'#d8edf5'},circulacao:{name:'Circulação',fill:'#f8eccf'},outro:{name:'Outro',fill:'#e7edf3'}};
 const round=n=>Math.round(n*1000)/1000;
 const valid=(n,min,max,label)=>{if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw Error('Confira '+label+'.');return n};
 function room(raw,index=0){
  if(!raw||!/^[A-Za-z][A-Za-z0-9_-]{0,24}$/.test(raw.id||''))throw Error('Identificador de ambiente inválido.');
  const kind=Object.hasOwn(kinds,raw.kind)?raw.kind:'outro',name=String(raw.name||'Ambiente '+(index+1)).slice(0,60);
  const x=valid(raw.x,0,50,'posição do ambiente'),y=valid(raw.y,0,50,'posição do ambiente'),w=valid(raw.w,.35,50,'largura do ambiente'),h=valid(raw.h,.35,50,'profundidade do ambiente');
  return{id:raw.id,name,kind,x,y,w,h,fill:kinds[kind].fill,short:name.toLocaleUpperCase('pt-BR'),label:[x+w/2,y+h/2]};
 }
 function wall(raw,i,width,length){
  const axis=raw.axis;if(!['x','z'].includes(axis))throw Error('Parede deve ser horizontal ou vertical.');
  const limit=axis==='z'?width:length,posLimit=axis==='z'?length:width;
  const pos=valid(raw.pos,0,posLimit,'posição da parede'),a=valid(raw.a,0,limit,'início da parede'),b=valid(raw.b,0,limit,'fim da parede');if(b-a<.05)throw Error('Parede muito curta ou invertida.');
  return{id:'W'+(i+1),axis,pos,a,b,thickness:valid(raw.thickness??.15,.06,.35,'espessura da parede')};
 }
 function fromRooms(rooms){
  const groups=new Map();for(const r of rooms)for(const [axis,pos,a,b]of[['z',r.y,r.x,r.x+r.w],['z',r.y+r.h,r.x,r.x+r.w],['x',r.x,r.y,r.y+r.h],['x',r.x+r.w,r.y,r.y+r.h]]){const key=axis+':'+Math.round(pos*50);if(!groups.has(key))groups.set(key,[]);groups.get(key).push({axis,pos,a,b});}
  const result=[];for(const list of groups.values()){list.sort((a,b)=>a.a-b.a);let active=null;for(const w of list){if(active&&w.a<=active.b+.025)active.b=Math.max(active.b,w.b);else{active={...w,thickness:.15};result.push(active)}}}return result.map((w,i)=>({...w,id:'W'+(i+1)}));
 }
 function validate(raw){
  if(!raw||typeof raw!=='object')throw Error('Planta inválida.');
  const width=valid(raw.width,1,50,'largura total'),length=valid(raw.length,1,50,'profundidade total'),height=valid(raw.height??2.7,2.1,5,'pé-direito');
  if(!Array.isArray(raw.rooms)||!raw.rooms.length||raw.rooms.length>40)throw Error('Defina de 1 a 40 ambientes.');
  const rooms=raw.rooms.map(room),ids=new Set();for(const r of rooms){if(ids.has(r.id)||r.x+r.w>width+.001||r.y+r.h>length+.001)throw Error('Ambiente repetido ou fora da planta.');ids.add(r.id)}
  for(let i=0;i<rooms.length;i++)for(let j=i+1;j<rooms.length;j++){const a=rooms[i],b=rooms[j];if(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>.025&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>.025)throw Error('Os ambientes se sobrepõem. Ajuste os retângulos.');}
  const source=raw.wallSource==='detected'?'detected':'rooms',input=source==='rooms'?fromRooms(rooms):raw.walls;
  if(!Array.isArray(input)||!input.length||input.length>220)throw Error('Defina de 1 a 220 paredes.');
  const walls=input.map((w,i)=>wall(w,i,width,length));
  const openings=(raw.openings||[]);if(!Array.isArray(openings)||openings.length>100)throw Error('Aberturas inválidas.');
  const cleanOpenings=openings.map((o,i)=>{const w=walls.find(w=>w.id===o.wall);if(!w||!['door','window'].includes(o.type))throw Error('Abertura sem parede.');const size=valid(o.width,.3,4,'largura da abertura'),center=valid(o.center,w.a,w.b,'posição da abertura');if(center-size/2<w.a-.001||center+size/2>w.b+.001)throw Error('Abertura ultrapassa a parede.');return{id:'O'+(i+1),wall:w.id,type:o.type,center,width:size};});
  for(const w of walls){const list=cleanOpenings.filter(o=>o.wall===w.id).sort((a,b)=>a.center-b.center);for(let i=1;i<list.length;i++)if(list[i-1].center+list[i-1].width/2>list[i].center-list[i].width/2-.015)throw Error('Portas ou janelas sobrepostas.');}
  const image=String(raw.image||'');if(image&&(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image)||image.length>1800000))throw Error('Imagem inválida ou muito grande.');
  const board=raw.board||{x:Math.min(.3,width/2),y:Math.min(.3,length/2)};
  return{id:String(raw.id||'floor').replace(/[^A-Za-z0-9_-]/g,'').slice(0,50)||'floor',width,length,height,wallSource:source,rooms,walls,openings:cleanOpenings,image,imageName:String(raw.imageName||'Planta personalizada').slice(0,100),board:{x:valid(board.x,0,width,'QD'),y:valid(board.y,0,length,'QD')},reviewed:raw.reviewed===true};
 }
 function segments(floor){return floor.walls.map(w=>w.axis==='z'?[[w.a,w.pos],[w.b,w.pos]]:[[w.pos,w.a],[w.pos,w.b]]);}
 function nearestWall(floor,x,y){let out=null,best=Infinity;for(const w of floor.walls){const along=w.axis==='z'?x:y,perp=w.axis==='z'?y:x,t=Math.max(w.a,Math.min(w.b,along)),d=Math.hypot(perp-w.pos,along-t);if(d<best){best=d;out={wall:w,center:t,distance:d}}}return out;}
 function bounds(p){return p.floor?{width:p.floor.width,length:p.floor.length,height:p.floor.height}:{width:10,length:8,height:2.7};}
 function pointPosition(r,type,i,total){const pad=Math.min(.22,r.w*.16,r.h*.16);if(type==='light'){const cols=Math.max(1,Math.ceil(Math.sqrt(total*r.w/r.h))),rows=Math.ceil(total/cols);return [r.x+r.w*((i%cols)+.5)/cols,r.y+r.h*(Math.floor(i/cols)+.5)/rows]}
  const w=r.w-2*pad,h=r.h-2*pad,t=(i+.5)/(total||1)*2*(w+h);if(t<w)return[r.x+pad+t,r.y+pad];if(t<w+h)return[r.x+r.w-pad,r.y+pad+t-w];if(t<2*w+h)return[r.x+r.w-pad-(t-w-h),r.y+r.h-pad];return[r.x+pad,r.y+r.h-pad-(t-2*w-h)];
 }
 function quantities(p,rows){
  const rooms=p.floor?p.floor.rooms:DEFAULT_ROOMS,next=JSON.parse(JSON.stringify(p)),seen=new Set();
  for(const row of rows){const r=rooms.find(r=>r.id===row.room);if(!r||seen.has(r.id))throw Error('Ambiente inválido nos quantitativos.');seen.add(r.id);for(const type of ['light','tug','tue','switch']){const n=row[type];if(!Number.isInteger(n)||n<0||n>40)throw Error('Use quantidades inteiras entre 0 e 40.');}
   if(!next.circuits.some(c=>c.id===row.circuit))throw Error('Selecione o circuito das tomadas.');
   const va=valid(row.va??100,0,50000,'carga das novas tomadas');
   for(const type of ['light','tug','tue','switch']){const list=next.points.filter(p=>p.room===r.id&&p.type===type),keep=list.slice(0,row[type]),remove=new Set(list.slice(row[type]).map(p=>p.id));next.points=next.points.filter(p=>!remove.has(p.id));for(const s of next.points.filter(p=>p.type==='switch'))if(remove.has(s.target))s.target='';
    for(let i=keep.length;i<row[type];i++){const [x,y]=pointPosition(r,type,i,row[type]);let k=1;while(next.points.some(p=>p.id===TYPES[type].prefix+String(k).padStart(2,'0')))k++;const id=TYPES[type].prefix+String(k).padStart(2,'0');next.points.push({id,type,room:r.id,x:round(x),y:round(y),name:TYPES[type].name+' · '+r.name,circuit:type==='tug'?row.circuit:type==='tue'?'C6':'C1',va:type==='switch'?0:type==='tug'?va:TYPES[type].va,target:'',on:true});}
   }
   const lamps=next.points.filter(p=>p.room===r.id&&p.type==='light');next.points.filter(p=>p.room===r.id&&p.type==='switch').forEach((p,i)=>{const prior=next.points.find(q=>q.id===p.target&&q.type==='light');if(!prior){const lamp=lamps[i%Math.max(1,lamps.length)];p.target=lamp?.id||'';p.circuit=lamp?.circuit||'C1'}});
  }
  for(const s of next.points.filter(p=>p.type==='switch'))if(s.target&&!next.points.some(p=>p.id===s.target))s.target='';
  if(next.points.length>300)throw Error('O projeto pode conter até 300 pontos, incluindo interruptores.');return next;
 }
 // Detect long orthogonal dark strokes. This proposes geometry; it does not infer scale or semantics.
 function detect(rgba,width,height,metresWide,metresLong,threshold=130){
  if(width<20||height<20||rgba.length!==width*height*4||width*height>1200000)throw Error('Imagem indisponível para reconhecimento.');
  const ink=new Uint8Array(width*height);for(let i=0;i<ink.length;i++){const j=i*4,alpha=rgba[j+3]/255,gray=(rgba[j]*.2126+rgba[j+1]*.7152+rgba[j+2]*.0722)*alpha+255*(1-alpha);ink[i]=gray<threshold?1:0;}
  const scan=(horizontal)=>{const major=horizontal?height:width,minor=horizontal?width:height,lines=[],gap=Math.max(2,Math.round(minor*.005)),min=Math.max(14,minor*.055);
   for(let a=0;a<major;a++){let start=-1,last=-1,count=0;for(let b=0;b<=minor+gap;b++){const dark=b<minor&&(horizontal?ink[a*width+b]:ink[b*width+a]);if(dark){if(start<0)start=b;last=b;count++}else if(start>=0&&b-last>gap){if(last-start+1>=min&&count/(last-start+1)>.78)lines.push({axis:horizontal?'z':'x',pos:a,a:start,b:last});start=-1;count=0;}}}
   const groups=[];for(const l of lines){let g=groups.find(g=>l.pos-g.last<=4&&l.pos>=g.last&&Math.min(l.b,g.b)-Math.max(l.a,g.a)>.65*Math.min(l.b-l.a,g.b-g.a));if(g){g.a=Math.min(g.a,l.a);g.b=Math.max(g.b,l.b);g.last=l.pos;g.sum+=l.pos;g.n++}else groups.push({...l,last:l.pos,sum:l.pos,n:1});}
   return groups.filter(g=>g.n>=2||g.b-g.a>minor*.22).map(g=>({...g,pos:g.sum/g.n}));
  };
  let walls=[...scan(true),...scan(false)].map(g=>{const along=g.axis==='z'?metresWide/width:metresLong/height,perp=g.axis==='z'?metresLong/height:metresWide/width;return{axis:g.axis,pos:round(g.pos*perp),a:round(g.a*along),b:round(g.b*along),thickness:Math.max(.08,Math.min(.24,g.n*perp))}}).filter(w=>w.b-w.a>.35);
  // Remove duplicate strokes around the two faces of the same wall.
  const merged=[];for(const w of walls.sort((a,b)=>(b.b-b.a)-(a.b-a.a))){const other=merged.find(q=>q.axis===w.axis&&Math.abs(q.pos-w.pos)<Math.max(.1,(q.thickness+w.thickness)/2)&&Math.min(q.b,w.b)-Math.max(q.a,w.a)>.8*Math.min(q.b-q.a,w.b-w.a));if(!other)merged.push(w)}walls=merged.slice(0,200).map((w,i)=>({...w,id:'W'+(i+1)}));
  // Close aligned door gaps only for finding enclosed rectangular room candidates.
  const mw=240,mh=Math.max(40,Math.round(240*height/width)),mask=new Uint8Array(mw*mh),sx=mw/metresWide,sy=mh/metresLong;
  const close=walls.map(w=>({...w}));for(const w of close)for(const q of close)if(w!==q&&w.axis===q.axis&&Math.abs(w.pos-q.pos)<.12&&q.a>=w.b&&q.a-w.b<1.25)w.b=q.b;
  for(const w of close){if(w.axis==='z'){const y=Math.round(w.pos*sy);for(let j=Math.max(0,y-1);j<=Math.min(mh-1,y+1);j++)for(let x=Math.max(0,Math.floor(w.a*sx));x<=Math.min(mw-1,Math.ceil(w.b*sx));x++)mask[j*mw+x]=1}else{const x=Math.round(w.pos*sx);for(let i=Math.max(0,x-1);i<=Math.min(mw-1,x+1);i++)for(let y=Math.max(0,Math.floor(w.a*sy));y<=Math.min(mh-1,Math.ceil(w.b*sy));y++)mask[y*mw+i]=1}}
  const queue=new Int32Array(mask.length),candidates=[];
  for(let start=0;start<mask.length;start++){if(mask[start])continue;let head=0,tail=1;queue[0]=start;mask[start]=1;let x0=mw,y0=mh,x1=0,y1=0,border=false;
   while(head<tail){const at=queue[head++],x=at%mw,y=Math.floor(at/mw);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);if(!x||!y||x===mw-1||y===mh-1)border=true;for(const n of [x?at-1:-1,x<mw-1?at+1:-1,y?at-mw:-1,y<mh-1?at+mw:-1])if(n>=0&&!mask[n]){mask[n]=1;queue[tail++]=n}}
   const area=tail/sx/sy,rect=tail/((x1-x0+1)*(y1-y0+1));if(!border&&area>1.2&&rect>.86&&(x1-x0+1)/sx>=.35&&(y1-y0+1)/sy>=.35&&candidates.length<40)candidates.push(room({id:'R'+(candidates.length+1),name:'Ambiente '+(candidates.length+1),kind:'outro',x:round(x0/sx),y:round(y0/sy),w:round((x1-x0+1)/sx),h:round((y1-y0+1)/sy)},candidates.length));
  }
  return{walls,rooms:candidates,review:'Confira as linhas, as dimensões e os ambientes antes de gerar o 3D.'};
 }
 return{kinds,round,validate,room,fromRooms,segments,nearestWall,bounds,pointPosition,quantities,detect};
})();
function roomsOf(p){return p.floor?.rooms||DEFAULT_ROOMS;}
function syncFloorGeometry(){ROOMS=roomsOf(project);WALLS=project.floor?FloorCore.segments(project.floor):DEFAULT_WALLS;const b=FloorCore.bounds(project);K=Math.min(600/b.width,480/b.length);SX=(810-b.width*K)/2;SY=(650-b.length*K)/2;if(!ROOMS.some(r=>r.id===ui.room))ui.room=ROOMS[0].id;}
