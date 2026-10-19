const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../dist/index.html'),'utf8');
const script=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
let assertions=0;
function check(name,fn){fn();assertions++;console.log('OK',name)}
function boot({storage=new Map(),embedded=null,blocked=false,key='',unavailable3D=false}={}){
 const nodes=new Map(),events={};
 function node(id){if(nodes.has(id))return nodes.get(id);const n={id,style:{},innerHTML:'',textContent:'',dataset:{},tagName:'DIV',open:false,disabled:false,attributes:{},classList:{s:new Set(),add(...x){x.forEach(y=>this.s.add(y))},remove(...x){x.forEach(y=>this.s.delete(y))},toggle(x,on){if(on===undefined)on=!this.s.has(x);on?this.s.add(x):this.s.delete(x);return on}},setAttribute(k,v){this.attributes[k]=v},removeAttribute(k){delete this.attributes[k]},addEventListener(name,f){events[id+':'+name]=f},showModal(){this.open=true},close(){this.open=false},scrollIntoView(){},reportValidity(){return true},matches(){return false},append(){},click(){},remove(){}};nodes.set(id,n);return n;}
 if(unavailable3D)node('scene3d').getContext=()=>null;
 node('senai-logo').src=html.match(/id="senai-logo"[^>]+ src="([^"]+)"/)?.[1]||'';node('senai-logo').dataset.svg=html.match(/id="senai-logo" data-svg="([^"]+)"/)?.[1]||'';node('embedded-project').textContent=JSON.stringify(embedded);node('embedded-project').dataset.storageKey=key;
 const document={getElementById:node,querySelectorAll(){return[]},addEventListener(name,fn){events[name]=fn},createElement:()=>node('new'),body:node('body'),documentElement:node('root'),fullscreenElement:null};
 const ctx={document,localStorage:{getItem:k=>{if(blocked)throw Error('blocked');return storage.get(k)||null},setItem:(k,v)=>{if(blocked)throw Error('blocked');storage.set(k,v)}},console,Blob,URL,setTimeout:()=>1,clearTimeout(){},MouseEvent:class{},FormData:class{constructor(form){this.form=form}get(k){return this.form.values[k]??null}},window:{addEventListener(){},scrollTo(){},print(){}}};
 vm.createContext(ctx);vm.runInContext(script,ctx,{timeout:5000});return{api:ctx.window.EletroLab,nodes,events,ctx,storage,node,script};
}
const a=boot(),api=a.api;
check('Inicialização completa e campos HTML renderizados',()=>{for(const id of ['metrics','circuit-list','tools','legend','plan','inspector','simulation','loads-view','memorial-view','diagram-view','guide-view'])assert.ok(a.node(id).innerHTML.length>10,id)});
check('Cargas independentes e totais calculados',()=>{const p=api.defaultProject(),s=api.getStats(p,Object.fromEntries(p.circuits.map(c=>[c.id,true])));assert.equal(s.total,13400);assert.equal(s.points,28);assert.equal(s.lights,8);assert.equal(p.points.length,36);assert.ok(Math.abs(s.area-80)<1e-9);const expected=[800,1000,1900,1800,5500,2400];s.circuits.forEach((c,i)=>{assert.equal(c.va,expected[i]);assert.ok(Math.abs(c.current-c.va/c.voltage)<1e-12)})});
check('JSON do exemplo válido, sem perda de dados',()=>{const p=api.defaultProject();assert.deepEqual(JSON.parse(JSON.stringify(api.validateProject(JSON.parse(JSON.stringify(p))))),JSON.parse(JSON.stringify(p)))});
check('Interruptor comanda somente a luminária associada',()=>{api.togglePoint('S01');const p=api.getProject();assert.equal(p.points.find(p=>p.id==='L01').on,false);assert.equal(p.points.find(p=>p.id==='L02').on,true);assert.equal(api.getStats(p,api.getState().enabled).active,13300)});
check('Desligamento do circuito e reinício completo',()=>{api.toggleCircuit('C1');assert.equal(api.getStats(api.getProject(),api.getState().enabled).active,12600);api.resetSimulation();assert.equal(api.getStats(api.getProject(),api.getState().enabled).active,13400);assert.ok(api.getProject().points.every(p=>p.on))});
check('Inserção, movimento entre ambientes e histórico',()=>{assert.equal(api.addPoint('light',2,2),true);let p=api.getProject();assert.equal(p.points.length,37);assert.equal(api.getStats(p,api.getState().enabled).total,13500);assert.equal(api.movePoint('L09',8,1),true);assert.equal(api.getProject().points.find(p=>p.id==='L09').room,'quarto1');api.undo();assert.equal(api.getProject().points.find(p=>p.id==='L09').room,'sala');api.removePoint('L09');assert.equal(api.getProject().points.length,36);api.undo();assert.equal(api.getProject().points.length,37);api.undo();assert.equal(api.getProject().points.length,36)});
check('Exclusão da luminária limpa o comando e permite desfazer',()=>{api.removePoint('L01');let p=api.getProject();assert.equal(p.points.find(p=>p.id==='S01').target,'');assert.doesNotThrow(()=>api.validateProject(p));api.undo();assert.equal(api.getProject().points.find(p=>p.id==='S01').target,'L01')});
check('Validação rejeita coordenadas, cargas e referências inválidas',()=>{for(const mutate of [p=>p.points[0].va=-1,p=>p.points[0].va=NaN,p=>p.points[0].x=99,p=>p.points[0].circuit='C99',p=>p.points[1].id=p.points[0].id,p=>p.circuits[0].voltage=380,p=>p.points.find(p=>p.id==='S01').target='E01',p=>p.points.find(p=>p.id==='S01').circuit='C2',p=>p.points[0].id='<script>']){const p=api.defaultProject();mutate(p);assert.throws(()=>api.validateProject(p))}});
check('Persistência das alterações ao reabrir o navegador',()=>{api.togglePoint('S01');const b=boot({storage:a.storage});assert.equal(b.api.getProject().points.find(p=>p.id==='L01').on,false)});
check('HTML offline mantém alterações depois de reabrir',()=>{const p=api.defaultProject();p.name='Projeto offline';const storage=new Map();const b=boot({storage,embedded:p,key:'offline-test'});b.api.addPoint('tug',2.6,2.4);const c=boot({storage,embedded:p,key:'offline-test'});assert.equal(c.api.getProject().points.length,37);assert.equal(c.api.getProject().name,'Projeto offline')});
check('Armazenamento bloqueado preserva o projeto incorporado',()=>{const p=api.defaultProject();p.name='Projeto sem armazenamento';const b=boot({embedded:p,blocked:true});assert.equal(b.api.getProject().name,p.name);assert.ok(b.node('save-status').innerHTML.includes('Exportar'))});
check('Dados hostis são escapados ao renderizar',()=>{const p=api.defaultProject();p.name='<img src=x onerror=alert(1)>';p.points[0].name='<script>alert(1)</script>';const b=boot({embedded:p,key:'safe'});assert.ok(!b.node('loads-view').innerHTML.includes('<img'));assert.ok(b.node('loads-view').innerHTML.includes('&lt;img'));assert.ok(!b.node('plan').innerHTML.includes('<script>alert'))});
check('Exportação CSV desarma fórmulas e mantém os valores',()=>{const p=api.defaultProject();p.name='=HYPERLINK("malicioso")';const b=boot({embedded:p,key:'csv'});const csv=b.api.csvText();assert.ok(csv.startsWith('\ufeff'));assert.ok(csv.includes("'=HYPERLINK"));assert.ok(csv.includes('13400'));assert.ok(csv.includes('25,000') && csv.includes('6,299'))});
check('Perspectiva e planta produzem SVG sem valores inválidos',()=>{for(const v of [api.renderPlan2D(),api.renderIso()]){assert.ok(v.length>15000);assert.ok(!/NaN|undefined|Infinity/.test(v));assert.ok(v.includes('S01'));assert.equal((v.match(/data-point=/g)||[]).length,36)}});
check('Edição de carga e tensão recalcula resultados',()=>{a.events.click({target:{closest:s=>s==='[data-view]'?null:s==='[data-action]'?{dataset:{action:'select-point',id:'L01'}}:null}});let form={id:'point-form',values:{name:'Luz editada',va:'200',circuit:'C2'},reportValidity:()=>true};a.events.submit({target:form,preventDefault(){}});let p=api.getProject();assert.equal(p.points.find(p=>p.id==='L01').va,200);assert.equal(p.points.find(p=>p.id==='S01').circuit,'C2');assert.equal(api.getStats(p,api.getState().enabled).total,13500);assert.doesNotThrow(()=>api.validateProject(p));a.events.click({target:{closest:s=>s==='[data-view]'?null:s==='[data-action]'?{dataset:{action:'edit-circuit',id:'C2'}}:null}});form={id:'circuit-form',values:{name:'Social',voltage:'220'},reportValidity:()=>true};a.events.submit({target:form,preventDefault(){}});p=api.getProject();const c=api.getStats(p,api.getState().enabled).circuits.find(c=>c.id==='C2');assert.equal(c.voltage,220);assert.ok(Math.abs(c.current-1200/220)<1e-12)});
check('Modo apresentação percorre cinco etapas e encerra',()=>{const click=action=>a.events.click({target:{closest:s=>s==='[data-view]'?null:s==='[data-action]'?{dataset:{action}}:null}});click('present');assert.equal(api.getState().present,true);assert.equal(api.getState().step,0);for(let i=0;i<4;i++)click('story-next');assert.equal(api.getState().step,4);assert.equal(api.getState().view,'diagram');click('exit-present');assert.equal(api.getState().present,false)});

check('Migracao R00 preserva pontos e acrescenta dados tecnicos',()=>{const p=api.defaultProject();p.schema='eletrolab-r00';delete p.supply;for(const c of p.circuits)delete c.technical;const n=api.validateProject(p);assert.equal(n.schema,'eletrolab-r03');assert.equal(n.points.length,36);assert.equal(n.circuits[4].technical.connection,'F1-F2');assert.equal(n.supply.confirmed,false)});
check('Queda de tensao tem referencia numerica independente',()=>{const p=api.defaultProject(),s=api.calculateTechnical(p),c=s.circuits.find(c=>c.id==='C5');assert.ok(Math.abs(c.ib-25)<1e-12);assert.ok(Math.abs(c.resistance-3.95)<1e-12);assert.ok(Math.abs(c.delta-2.37)<1e-12);assert.ok(Math.abs(c.drop-1.0772727272727)<1e-10);assert.equal(c.checks.drop,null);assert.equal(c.checks.thermal,null)});
check('Iz corrigida, I2, curto-circuito, DR e queda acumulada',()=>{const p=api.defaultProject();p.supply.upstreamDrop=1;const t=p.circuits[4].technical;Object.assign(t,{iz0:40,kTemp:.9,kGroup:.8,i2:46.4,icn:6,icc:5,drRated:40});let c=api.calculateTechnical(p).circuits[4];assert.ok(Math.abs(c.iz-28.8)<1e-12);assert.equal(c.checks.thermal,false);assert.equal(c.checks.i2,false);t.iz0=50;c=api.calculateTechnical(p).circuits[4];assert.equal(c.checks.thermal,true);assert.equal(c.checks.i2,true);assert.equal(c.checks.short,true);assert.equal(c.checks.drop,true);assert.equal(c.checks.dr,true);t.icn=3;assert.equal(api.calculateTechnical(p).circuits[4].checks.short,false)});
check('Correntes fasoriais respeitam fase-neutro e fase-fase',()=>{const p=api.defaultProject();p.points=p.points.filter(p=>p.id==='E01');let s=api.calculateTechnical(p);assert.ok(Math.abs(s.phase.F1-25)<1e-12);assert.ok(Math.abs(s.phase.F2-25)<1e-12);assert.ok(Math.abs(s.phase.N)<1e-12);p.points=[{id:'T01',type:'tug',circuit:'C1',room:'sala',x:1,y:1,va:1270,on:true,name:'A',target:''},{id:'T02',type:'tug',circuit:'C2',room:'sala',x:2,y:1,va:1270,on:true,name:'B',target:''}];s=api.calculateTechnical(p);assert.ok(Math.abs(s.phase.F1-10)<1e-12);assert.ok(Math.abs(s.phase.F2-10)<1e-12);assert.ok(Math.abs(s.phase.N-10)<1e-12)});
check('Validacao rejeita dados tecnicos e ligacoes impossiveis',()=>{for(const mutate of [p=>p.circuits[0].technical.fp=0,p=>p.circuits[0].technical.section=-1,p=>p.circuits[0].technical.connection='F1-F2',p=>p.circuits[4].technical.connection='F1-N',p=>p.supply.rho=NaN,p=>p.supply.frequency=55]){const p=api.defaultProject();mutate(p);assert.throws(()=>api.validateProject(p))}});
check('Multifilar inclui todas as cargas em folhas de ate seis',()=>{const p=api.defaultProject();let count=0;for(const c of p.circuits){const pages=api.multifilarSheets(p,c.id);for(let i=0;i<pages.length;i++){assert.ok(pages[i].length<=6);count+=pages[i].length;const svg=api.generateMultifilar(p,c.id,i);assert.ok(!/NaN|undefined|Infinity/.test(svg));for(const load of pages[i])assert.ok(svg.includes(load.id+' ·'));assert.ok(svg.includes('image/png;base64,'));}}assert.equal(count,28);assert.equal(api.multifilarSheets(p,'C1').length,2)});
check('Dossie reune memorial e todos os diagramas sem perder estado',()=>{const before=JSON.stringify(api.getProject()),state=JSON.stringify(api.getState());const report=api.reportHTML();assert.ok(report.includes('Memorial de cálculo'));assert.ok(report.includes('Diagrama unifilar'));assert.ok(report.includes('Diagrama multifilar'));assert.ok(report.includes('image/png;base64,'));assert.equal((report.match(/class="electrical-svg"/g)||[]).length,9);assert.equal(JSON.stringify(api.getProject()),before);assert.equal(JSON.stringify(api.getState()),state)});
check('Formularios tecnicos salvam numeros e recalculam as verificacoes',()=>{const b=boot();const values={connection:'F1-F2',fp:'1',demand:'1',length:'12',section:'6',neutralSection:'',peSection:'6',returnSection:'',breaker:'32',iz0:'50',kTemp:'0.9',kGroup:'0.8',i2:'46.4',icn:'6',icc:'5',drRated:'40',drMa:'30',dr:'on',curve:'C',ampacitySource:'Dado de teste documentado',drType:'A',deviceModel:'Modelo de teste',demandReason:''};b.events.submit({target:{id:'technical-form',dataset:{circuit:'C5'},values,reportValidity:()=>true},preventDefault(){}});let c=b.api.calculateTechnical(b.api.getProject()).circuits[4];assert.equal(c.checks.thermal,true);assert.equal(c.checks.i2,true);assert.equal(c.t.dr,true);const supply={frequency:'60',rho:'0.0237',reactance:'0.08',upstreamDrop:'1',dropLimit:'4',generalIn:'63',generalSection:'10',earthing:'TN-S para teste',method:'Dados de teste',spd:'Pendente',notes:'Estudo',confirmed:'on'};b.events.submit({target:{id:'supply-form',values:supply,reportValidity:()=>true},preventDefault(){}});c=b.api.calculateTechnical(b.api.getProject()).circuits[4];assert.equal(c.checks.drop,true);assert.equal(b.api.getProject().supply.confirmed,true);assert.doesNotThrow(()=>b.api.validateProject(b.api.getProject()))});
const h3=api.House3D;
check('Casa 3D mobiliada possui malhas finitas, normais e pontos vinculados',()=>{
 const p=api.defaultProject(),m=h3.buildHouse(p);
 assert.equal(m.anchors.length,36);assert.equal(m.lights.length,8);assert.equal(m.wallHeight,1.52);
 assert.ok(m.solid.length/11>20000);assert.ok(m.solid.length/11<500000);assert.ok(m.glass.length>1000);assert.ok(m.meshes.length>200);
 for(const data of [m.solid,m.glass]){assert.equal(data.length%11,0);for(let i=0;i<data.length;i+=11){for(let k=0;k<11;k++)assert.ok(Number.isFinite(data[i+k]));assert.ok(Math.abs(Math.hypot(data[i+3],data[i+4],data[i+5])-1)<.001);}}
 assert.equal(new Set(m.anchors.map(a=>a.id)).size,36);for(const a of m.anchors){assert.ok(p.points.some(q=>q.id===a.id));assert.ok(a.pos[0]>=0&&a.pos[0]<=10&&a.pos[2]>=0&&a.pos[2]<=8);}
});
check('Luzes 3D respondem a interruptor, circuito e carga movida',()=>{
 const b=boot(),p=b.api.getProject();b.api.activateThreePoint('S01');let m=h3.buildHouse(b.api.getProject(),{enabled:b.api.getState().enabled});assert.equal(m.lights.length,7);assert.equal(m.anchors.find(a=>a.id==='L01').on,false);assert.equal(m.anchors.find(a=>a.id==='S01').on,false);
 b.api.toggleCircuit('C1');m=h3.buildHouse(b.api.getProject(),{enabled:b.api.getState().enabled});assert.equal(m.lights.length,0);assert.ok(m.anchors.filter(a=>a.type==='light').every(a=>!a.on));
 b.api.movePoint('L01',8.3,1.4);m=h3.buildHouse(b.api.getProject());const a=m.anchors.find(a=>a.id==='L01');assert.equal(a.pos[0],8.3);assert.equal(a.pos[2],1.4);assert.equal(a.room,'quarto1');assert.equal(p.points.length,b.api.getProject().points.length);
});
check('Controles 3D alteram vista, paredes e circuitos sem alterar projeto',()=>{
 const b=boot(),p=b.api.getProject(),before=JSON.stringify(p),click=(action,value)=>b.events.click({target:{closest:s=>s==='[data-view]'?null:s==='[data-action]'?{dataset:{action,value}}:null}});
 assert.equal(b.api.getState().projection,'3d');for(const action of ['3d-electric','3d-walls','3d-night','3d-auto','3d-expand'])click(action);
 for(const flag of ['threeElectrical','threeWalls','threeNight','threeAuto','threeWide'])assert.equal(b.api.getState()[flag],true);
 assert.equal(h3.buildHouse(p,{fullWalls:true}).wallHeight,2.65);assert.ok(h3.buildHouse(p,{furniture:false}).solid.length<h3.buildHouse(p).solid.length);
 click('projection','plan');assert.equal(b.api.getState().projection,'plan');assert.ok(b.node('three-stage').classList.s.has('hidden'));assert.ok(!b.node('body').classList.s.has('three-wide'));assert.equal(JSON.stringify(b.api.getProject()),before);
});
check('Camera 3D projeta o alvo no centro e responde a rotacao',()=>{
 const state={yaw:3.98,pitch:.78,distance:20.4,target:[5,.7,4]},a=h3.camera(state,1.5),center=h3.project(a.pv,state.target,1200,800);
 assert.ok(Math.abs(center.x-600)<.001&&Math.abs(center.y-400)<.001);const b=h3.camera({...state,yaw:state.yaw+.7},1.5);assert.notDeepEqual(a.eye,b.eye);for(const n of [...a.pv,...b.pv])assert.ok(Number.isFinite(n));
});
check('Gestos 3D giram, aproximam e respeitam os limites da camera',()=>{
 const b=boot(),v=Object.create(b.api.HouseViewer.prototype),canvas=b.node('scene3d');canvas.focus=()=>{};v.canvas=canvas;v.state={yaw:3.98,pitch:.78,distance:20.4,target:[5,.7,4]};v.pointers=new Map();v.request=()=>{};v.auto=true;v.bindEvents();
 const event=(id,x,y,type)=>({pointerId:id,clientX:x,clientY:y,type,preventDefault(){}}),send=(name,e)=>b.events['scene3d:'+name](e);
 send('pointerdown',event(1,100,100));send('pointermove',event(1,150,130));assert.ok(v.state.yaw<3.98&&v.state.pitch>.78);assert.equal(v.auto,false);send('pointerup',event(1,150,130,'pointerup'));
 send('pointerdown',event(1,100,100));send('pointerdown',event(2,200,100));send('pointermove',event(2,210,100));const before=v.state.distance;send('pointermove',event(2,250,100));assert.ok(v.state.distance<before);send('pointercancel',event(1,100,100,'pointercancel'));send('pointercancel',event(2,250,100,'pointercancel'));
 send('wheel',{deltaY:999999,preventDefault(){}});assert.equal(v.state.distance,34);send('wheel',{deltaY:-999999,preventDefault(){}});assert.equal(v.state.distance,10);
 send('keydown',{key:'ArrowLeft',preventDefault(){},stopPropagation(){}});assert.ok(v.state.yaw<3.63);assert.equal(v.pointers.size,0);
});
check('Ausencia de WebGL oferece vista 2D e preserva calculos',()=>{
 const b=boot({unavailable3D:true});assert.ok(b.node('three-status').textContent.includes('Use 2D'));assert.ok(b.node('loads-view').innerHTML.includes('13.400'));b.events.click({target:{closest:s=>s==='[data-view]'?null:s==='[data-action]'?{dataset:{action:'projection',value:'plan'}}:null}});assert.equal(b.api.getState().projection,'plan');assert.ok(b.node('plan').innerHTML.includes('L01'));
});
check('HTML offline incorpora motor 3D e mantem logo e exportacoes',()=>{
 assert.ok(html.includes("getContext(\'webgl\'"));assert.ok(html.includes('EletroLab_Predial_Offline_R03.html'));assert.ok(html.includes('id="scene3d"'));assert.ok(html.includes('id="senai-logo"'));assert.ok(!/<script[^>]+src=/.test(html));assert.ok(html.includes('webglcontextrestored'));
});
function customFixture(api){
 const F=api.FloorCore,rooms=[
  {id:'R1',name:'Sala',kind:'sala',x:0,y:0,w:6,h:4},
  {id:'R2',name:'Cozinha',kind:'cozinha',x:6,y:0,w:6,h:4},
  {id:'R3',name:'Quarto',kind:'quarto',x:0,y:4,w:6,h:4},
  {id:'R4',name:'Banheiro',kind:'banheiro',x:6,y:4,w:3,h:4},
  {id:'R5',name:'Serviço',kind:'servico',x:9,y:4,w:3,h:4}
 ];
 const floor={id:'test-floor',width:12,length:8,height:2.7,wallSource:'rooms',rooms,walls:F.fromRooms(rooms),openings:[],image:'',imageName:'Planta de ensaio',board:{x:.22,y:.5},reviewed:true};
 const front=floor.walls.find(w=>w.axis==='z'&&w.pos===0),middle=floor.walls.find(w=>w.axis==='z'&&w.pos===4);
 floor.openings=[{id:'O1',type:'window',wall:front.id,center:3,width:1.8},{id:'O2',type:'door',wall:middle.id,center:2,width:.9}];return F.validate(floor);
}
function quantityRows(api,p){return api.roomsOf(p).map((r,i)=>({room:r.id,tug:i===0?4:2,light:i===0?2:1,switch:i===0?2:1,tue:i===2?1:0,circuit:r.kind==='cozinha'?'C3':['banheiro','servico'].includes(r.kind)?'C4':'C2',va:r.kind==='cozinha'?600:100}));}
check('Planta personalizada valida medidas e rejeita paredes, aberturas e imagens hostis',()=>{
 const f=customFixture(api);assert.equal(f.rooms.length,5);assert.equal(f.width,12);
 for(const mutate of [f=>f.width=NaN,f=>f.height=1,f=>f.rooms[0].w=99,f=>f.rooms[1].x=2,f=>f.rooms[0].id='<img>',f=>{f.wallSource='detected';f.walls[0].axis='diagonal'},f=>f.openings[0].center=99,f=>f.image='data:image/svg+xml;base64,PHN2Zz4=',f=>f.board.x=33]){const x=JSON.parse(JSON.stringify(f));mutate(x);assert.throws(()=>api.FloorCore.validate(x));}
});
check('Importar planta inicia projeto vazio e recalcula area sem alterar o exemplo',()=>{
 const b=boot(),before=JSON.stringify(b.api.getProject()),f=customFixture(b.api),p=b.api.createFloorProject(b.api.getProject(),f);
 assert.equal(p.points.length,0);assert.equal(b.api.getStats(p).area,96);assert.equal(p.schema,'eletrolab-r03');assert.equal(p.supply.confirmed,false);assert.ok(p.circuits.every(c=>c.technical.length===null));assert.equal(JSON.stringify(b.api.getProject()),before);
 b.api.applyFloorProject(f);assert.equal(b.api.getRooms().length,5);assert.equal(b.api.getState().projection,'3d');assert.ok(b.node('geometry-size').textContent.includes('12,00'));assert.ok(b.api.renderPlan2D().includes('Planta personalizada'));b.api.undo();assert.equal(b.api.getStats(b.api.getProject()).area,80);assert.equal(b.api.getProject().points.length,36);
});
check('Quantitativos atualizam pontos, comando, carga e multifilar do projeto importado',()=>{
 const b=boot();b.api.applyFloorProject(customFixture(b.api));b.api.setProjectQuantities(quantityRows(b.api,b.api.getProject()));let p=b.api.getProject();
 assert.equal(p.points.filter(p=>p.type==='light').length,6);assert.equal(p.points.filter(p=>p.type==='tug').length,12);assert.equal(p.points.filter(p=>p.type==='tue').length,1);assert.equal(p.points.filter(p=>p.type==='switch').length,6);
 assert.equal(b.api.getStats(p).total,4000);assert.equal(b.api.getStats(p).area,96);assert.ok(p.points.filter(p=>p.type==='switch').every(s=>p.points.some(l=>l.id===s.target&&l.type==='light'&&l.circuit===s.circuit)));
 let count=0;for(const c of p.circuits)for(const sheet of b.api.multifilarSheets(p,c.id))count+=sheet.length;assert.equal(count,19);
 const row=quantityRows(b.api,p)[0];row.light=0;row.switch=1;row.tug=1;b.api.setProjectQuantities([row]);p=b.api.getProject();assert.equal(p.points.find(p=>p.room==='R1'&&p.type==='switch').target,'');assert.doesNotThrow(()=>b.api.validateProject(p));
 b.api.undo();assert.equal(b.api.getProject().points.filter(p=>p.type==='light').length,6);
});
check('Planejamento por formulario salva totais e rejeita excesso sem perder o projeto',()=>{
 const b=boot();b.api.applyFloorProject(customFixture(b.api));b.api.quantitiesModal();assert.ok(b.node('modal-body').innerHTML.includes('R1_tug'));
 const values={};for(const r of quantityRows(b.api,b.api.getProject()))for(const [key,value]of Object.entries(r))if(key!=='room')values[r.room+'_'+key]=String(value);
 b.events.submit({target:{id:'quantities-form',values,reportValidity:()=>true},preventDefault(){}});assert.equal(b.api.getStats(b.api.getProject()).total,4000);const before=JSON.stringify(b.api.getProject());assert.throws(()=>b.api.setProjectQuantities(quantityRows(b.api,b.api.getProject()).map(r=>({...r,tug:40,light:40,switch:40,tue:40}))));assert.equal(JSON.stringify(b.api.getProject()),before);
});
check('Editar a planta conserva pontos, cargas e ligacoes em coordenadas proporcionais',()=>{
 const b=boot();b.api.applyFloorProject(customFixture(b.api));b.api.setProjectQuantities(quantityRows(b.api,b.api.getProject()));const before=b.api.getProject(),f=customFixture(b.api);f.rooms[0].name='Sala principal';const next=b.api.createFloorProject(before,f,true);assert.equal(next.points.length,before.points.length);assert.equal(b.api.getStats(next).total,4000);assert.equal(next.points[0].target,before.points[0].target);assert.equal(next.points[0].x,before.points[0].x);
});
check('Projeto importado persiste e escapa nomes de ambientes na interface e SVG',()=>{
 const b=boot(),f=customFixture(b.api);f.rooms[0].name='<img src=x onerror=alert(1)>';b.api.applyFloorProject(f);b.api.setProjectQuantities(quantityRows(b.api,b.api.getProject()));const c=boot({storage:b.storage});assert.equal(c.api.getProject().floor.width,12);assert.equal(c.api.getProject().points.length,25);assert.ok(!c.node('inspector').innerHTML.includes('<img src=x'));assert.ok(c.api.renderPlan2D().includes('&lt;img'));assert.ok(!c.api.renderIso().includes('<img src=x'));
});
check('Editor abre rascunho e exige revisao antes de substituir o projeto',()=>{
 const b=boot(),before=JSON.stringify(b.api.getProject());b.api.openFloorWizard();b.node('floor-width').value='10';b.node('floor-length').value='8';b.node('floor-height').value='2.7';assert.ok(b.node('modal-body').innerHTML.includes('floor-file'));assert.ok(b.node('floor-editor').innerHTML.includes('floor-grid'));b.events.click({target:{closest:s=>s==='[data-view]'?null:s==='[data-action]'?{dataset:{action:'floor-apply'}}:null}});assert.ok(b.node('floor-message').textContent.includes('marque a revisão'));assert.equal(JSON.stringify(b.api.getProject()),before);
});
check('Reconhecimento de imagem encontra paredes e quatro ambientes em desenho fechado',()=>{
 const w=250,h=200,pixels=new Uint8ClampedArray(w*h*4).fill(255),line=(x0,y0,x1,y1)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=(y*w+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=0}};
 line(15,15,235,19);line(15,180,235,184);line(15,15,19,184);line(231,15,235,184);line(15,98,235,102);line(123,15,127,184);
 const result=api.FloorCore.detect(pixels,w,h,10,8,130);assert.ok(result.walls.length>=6);assert.equal(result.rooms.length,4);assert.ok(result.rooms.every(r=>r.w>3&&r.h>2));const large=api.FloorCore.detect(pixels,w,h,20,16,130);assert.ok(Math.abs(large.rooms[0].w-result.rooms[0].w*2)<.01);
 assert.throws(()=>api.FloorCore.detect(pixels,10,10,10,8));
});
check('Maquete importada renderiza geometria, vidros, pontos e fontes com dimensoes proprias',()=>{
 const b=boot();b.api.applyFloorProject(customFixture(b.api));b.api.setProjectQuantities(quantityRows(b.api,b.api.getProject()));const p=b.api.getProject(),m=b.api.House3D.buildHouse(p,{electrical:true});assert.equal(m.anchors.length,25);assert.equal(m.lights.length,6);assert.equal(m.bounds.width,12);assert.equal(m.bounds.depth,8);assert.ok(m.glass.length>0);assert.ok(m.solid.length>10000);assert.ok(m.solid.every(Number.isFinite));assert.ok(m.lightPV.every(Number.isFinite));assert.equal(b.api.House3D.home(p).target[0],6);assert.ok(m.meshes.some(m=>m.kind==='prism'));
});
check('Tomada exibida usa tres furos e a placa da referencia',()=>{const svg=api.renderPlan2D();assert.ok(svg.includes('cx="-3.5"'));assert.ok(svg.includes('cy="2.3"'));const m=api.House3D.buildHouse(api.defaultProject());assert.ok(m.meshes.filter(x=>x.kind==='prism').length>=17)});

if(process.env.ELETROLAB_3D_QA_DIR){
 const dir=process.env.ELETROLAB_3D_QA_DIR;fs.mkdirSync(dir,{recursive:true});
 const p=api.defaultProject();
 for(const [name,opts]of [['day',{}],['night',{}],['full',{fullWalls:true}],['electric',{electrical:true,circuit:'C5'}],['lights-off',{enabled:{C1:false}}]]){
  const m=h3.buildHouse(p,opts);fs.writeFileSync(dir+'/'+name+'-solid.bin',Buffer.from(m.solid.buffer));fs.writeFileSync(dir+'/'+name+'-glass.bin',Buffer.from(m.glass.buffer));fs.writeFileSync(dir+'/'+name+'.json',JSON.stringify({lights:m.lights,anchors:m.anchors,wallHeight:m.wallHeight,solidVertices:m.solid.length/11,glassVertices:m.glass.length/11,meshes:m.meshes.length}));
 }
 const cp=api.createFloorProject(api.defaultProject(),customFixture(api));const custom=api.FloorCore.quantities(cp,quantityRows(api,cp));const cm=api.House3D.buildHouse(custom,{electrical:true});fs.writeFileSync(dir+'/custom-solid.bin',Buffer.from(cm.solid.buffer));fs.writeFileSync(dir+'/custom-glass.bin',Buffer.from(cm.glass.buffer));fs.writeFileSync(dir+'/custom.json',JSON.stringify({lights:cm.lights,anchors:cm.anchors,wallHeight:cm.wallHeight,solidVertices:cm.solid.length/11,glassVertices:cm.glass.length/11,meshes:cm.meshes.length,lightPV:cm.lightPV,camera:api.House3D.camera(api.House3D.home(custom),1.5)}));
 const sg=api.House3D.builder();api.House3D.outlet(sg,{pos:[0,0,0],normal:[0,0,1],yaw:0},{type:'tug',name:'Tomada'},true,false);fs.writeFileSync(dir+'/socket-solid.bin',Buffer.from(new Float32Array(sg.solid).buffer));fs.writeFileSync(dir+'/socket-glass.bin',Buffer.from(new Float32Array(sg.glass).buffer));fs.writeFileSync(dir+'/socket.json',JSON.stringify({lights:[],solidVertices:sg.solid.length/11,meshes:sg.meshes.length,shadowStart:0,camera:api.House3D.camera({yaw:.2,pitch:.1,distance:.45,target:[0,0,0]},1.5)}));
 fs.writeFileSync(dir+'/shaders.json',JSON.stringify(Object.fromEntries(['vertexShader','fragmentShader','shadowVertex','shadowFragment','lightPV'].map(k=>[k,h3[k]]))));
 const cam=h3.camera({yaw:3.98,pitch:.78,distance:20.4,target:[5,.7,4]},1.5);fs.writeFileSync(dir+'/camera.json',JSON.stringify(cam));
}

if(process.env.ELETROLAB_QA_DIR){const dir=process.env.ELETROLAB_QA_DIR;fs.mkdirSync(dir,{recursive:true});const b=boot();fs.writeFileSync(dir+'/unifilar.svg',b.api.generateUnifilar());fs.writeFileSync(dir+'/multifilar-c1.svg',b.api.generateMultifilar(b.api.getProject(),'C1',0));fs.writeFileSync(dir+'/multifilar-c5.svg',b.api.generateMultifilar(b.api.getProject(),'C5',0));fs.writeFileSync(dir+'/dossie.html',b.api.reportHTML());fs.writeFileSync(dir+'/default-r01.json',JSON.stringify(b.api.defaultProject(),null,2));for(const [name,fn] of [['planta',b.api.renderPlan2D],['perspectiva',b.api.renderIso]])fs.writeFileSync(dir+'/'+name+'.svg','<svg xmlns="http://www.w3.org/2000/svg" width="1215" height="975" viewBox="0 0 810 650"><style>text{font-family:Arial}.point-label{font-size:12px;paint-order:stroke;stroke:white;stroke-width:3;font-weight:bold}</style>'+fn()+'</svg>');}
console.log(JSON.stringify({passed:assertions,model:'28 pontos de carga; 8 interruptores; 6 circuitos; 13400 VA',browserUI:'Não executado: control-browser indisponível'}));
