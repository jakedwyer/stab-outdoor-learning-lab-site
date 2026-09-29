import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {DRACOLoader} from './vendor/DRACOLoader.js';
import {OrbitControls} from './vendor/OrbitControls.js';
const $=id=>document.getElementById(id);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const zones=[
 {key:'garden',name:'The Butterfly Garden',verb:'Observe + measure',story:'A first encounter with a butterfly. A new leaf to measure. Here, children notice the small things and begin asking the big questions.',gift:50000,look:[4, -43, 1],spot:[10.2, -48, 1.65],map:[1300,3250],image:'z1'},
 {key:'sensory',name:'The Sensory Space',verb:'Explore + experiment',story:'Water trickles. Mud becomes a recipe. Sand becomes a world. Open-ended play turns everyday materials into extraordinary discoveries.',gift:50000,look:[18.8, -42.5, 1],spot:[12.8, -47.9, 1.65],map:[1788,3225],image:'z2'},
 {key:'play',name:'Room to be brave',short:'Play Area',verb:'Move + problem-solve',story:'One more rung. A first fearless slide. Swings, climbing, and shared adventures help children find their balance, their confidence, and each other.',gift:100000,look:[17, -25, 1.4],spot:[10, -31.5, 1.65],map:[1700,2650],image:'z3'},
 {key:'games',name:'A place for fair play',short:'Game Area',verb:'Count + collaborate',story:'Counting points is only the beginning. Games make room for strategy, teamwork, and the integrity to make an honest call.',gift:50000,look:[18, -12.8, 1],spot:[9.3, -18.6, 1.65],map:[1750,2225],image:'z4'},
 {key:'stem',name:'Big ideas start outside',short:'Outdoor STEM Lab',verb:'Investigate + discover',story:'Make color from garden flowers. Track the weather. Follow a question from “what if?” to “let’s find out.” This is a laboratory for every kind of learner.',gift:250000,look:[18, 3, 1.3],spot:[9, -4.8, 1.65],map:[1750,1725],image:'z5'},
 {key:'fitness',name:'Stronger with every try',short:'Fitness Area',verb:'Build + challenge',story:'Across the overhead ladder, through a cargo net, over the next obstacle. Children test their limits, plan a route, and learn to keep going.',gift:100000,look:[18.5, 20, 1.4],spot:[12.6, 12.8, 1.65],map:[1800,1125],image:'z6'},
 {key:'classroom',name:'A classroom without walls',short:'Outdoor Classroom',verb:'Gather + reflect',story:'A circle for stories, a stage for new voices, a quiet place to think. Learning comes together beneath the trees.',gift:100000,look:[19, 38.2, 1],spot:[7.8, 30.4, 1.65],map:[1800,500],image:'z7'},
 {key:'hill',name:'A little higher. A little bolder.',short:'The Hill',verb:'Notice + grow',story:'Climb, scramble, pause, and look again. The changing seasons and the slope itself invite children to see the world from a new perspective.',gift:250000,look:[-7, 38, -1],spot:[2, 31, 1.65],map:[950,475],image:'z8'}
];
const money=n=>'$'+n.toLocaleString('en-US');
const vec=a=>new THREE.Vector3(a[0],a[2],-a[1]);
let renderer,scene,camera,orbit,model,ready=false,started=false,current=0,mode='design',rendered=true,playing=false,tourWait=0,transition=null,yaw=0,pitch=0,drag=null,lastTime=0,failed=false;
const keys=new Set(),moveKeys=new Set();
const ray=new THREE.Raycaster(),collisionMeshes=[];
function dialogOpen(d){if(!d.open)d.showModal();pauseTour();keys.clear();moveKeys.clear();}
document.querySelectorAll('.support-trigger').forEach(b=>b.onclick=()=>{selectGift(-1);dialogOpen($('support'));});
document.querySelectorAll('.dialog-close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$('about').onclick=()=>dialogOpen($('about-dialog'));
function selectGift(i){$('gift-context').textContent=i<0?'A gift of $750,000 offers the opportunity to name the entire Outdoor Learning Lab & Playground.':`${money(zones[i].gift)} naming opportunity · ${zones[i].short||zones[i].name}`;$('giving-list').querySelectorAll('button').forEach((b,j)=>b.classList.toggle('selected',i===j));}
zones.forEach((z,i)=>{
 const b=document.createElement('button');b.textContent=String(i+1).padStart(2,'0');b.title=z.short||z.name;b.setAttribute('aria-label',`Visit ${z.short||z.name}`);b.onclick=()=>{pauseTour();go(i);};$('stops').append(b);
 const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.classList.add('map-node');g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-label',z.short||z.name);g.innerHTML=`<circle cx="${z.map[0]}" cy="${z.map[1]}" r="105"/><text x="${z.map[0]}" y="${z.map[1]}">${i+1}</text>`;g.onclick=()=>{pauseTour();go(i);setMap(false);};g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();g.onclick();}};$('site-map').append(g);
 const gift=document.createElement('button');gift.innerHTML=`<span>${z.short||z.name.replace('The ','')}</span><b>${money(z.gift)}</b>`;gift.onclick=()=>selectGift(i);$('giving-list').append(gift);
});
function caption(){const z=zones[current];$('stop-number').textContent=`${String(current+1).padStart(2,'0')} / 08`;$('stop-verb').textContent=z.verb.toUpperCase();$('stop-title').textContent=z.name;$('stop-story').textContent=z.story;[...$('stops').children].forEach((b,i)=>b.setAttribute('aria-current',String(current===i)));document.querySelectorAll('.map-node').forEach((b,i)=>b.classList.toggle('active',i===current));$('opportunity').onclick=()=>{selectGift(current);dialogOpen($('support'));};}
function setMap(on){$('map-panel').hidden=!on;$('map-toggle').setAttribute('aria-expanded',String(on));}
$('map-toggle').onclick=()=>setMap($('map-panel').hidden);$('map-close').onclick=()=>setMap(false);
$('hint-close').onclick=()=>$('walk-hint').hidden=true;
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('experience').requestFullscreen();}catch{$('fullscreen').hidden=true;}};
function pauseTour(){playing=false;tourWait=0;$('tour').setAttribute('aria-pressed','false');$('tour').setAttribute('aria-label','Take the guided walk');$('tour-icon').textContent='▶';$('tour-label').textContent='Take the guided walk';}
$('tour').onclick=async()=>{if(!ready&&!failed){$('loading').hidden=false;await ensureBoot();$('loading').hidden=true;}if(!ready)return;if(playing){pauseTour();transition=null;return;}playing=true;$('tour').setAttribute('aria-pressed','true');$('tour').setAttribute('aria-label','Pause the guided walk');$('tour-icon').textContent='Ⅱ';$('tour-label').textContent='Pause the walk';if(current===7)current=0;setMode('walk',false);go(current,true);};
$('previous').onclick=()=>{pauseTour();go((current+7)%8);};$('next').onclick=()=>{pauseTour();go((current+1)%8);};
function setRendered(on){rendered=on;$('design-mode').setAttribute('aria-pressed',String(on));$('walk-mode').setAttribute('aria-pressed',String(!on&&mode==='walk'));$('aerial-mode').setAttribute('aria-pressed',String(!on&&mode==='aerial'));if(on){$('still').src=`r/${zones[current].image}.jpg`;$('still').alt=`Supplied conceptual design of ${zones[current].short||zones[current].name}`;}$('still').style.opacity=on?'1':'0';$('still').style.pointerEvents=on?'auto':'none';$('touch-controls').style.visibility=on?'hidden':'visible';$('walk-hint').hidden=on||mode!=='walk';$('design-preview').hidden=on;$('design-preview').querySelector('img').src=`r/${zones[current].image}_m.jpg`;if(on)pauseTour();}
const gallery=[...zones.map(z=>({image:z.image,title:z.short||z.name})),{image:'a2',title:'The connected landscape'},{image:'plan',title:'The complete site plan'}];
let galleryIndex=0;function showImage(i){galleryIndex=i;const v=gallery[i];$('gallery-design').setAttribute('aria-pressed','true');$('gallery-render').setAttribute('aria-pressed','false');$('gallery-image').src=`r/${v.image}.jpg`;$('gallery-image').alt=v.title;$('gallery-caption').textContent=v.title;$('gallery-full').href=`r/${v.image}.jpg`;[...$('gallery-thumbs').children].forEach((b,j)=>b.setAttribute('aria-current',String(i===j)));}
gallery.forEach((v,i)=>{const b=document.createElement('button');b.innerHTML=`<img src="r/${v.image}_t.jpg" alt=""><span>${v.title.replace('The ','')}</span>`;b.onclick=()=>showImage(i);$('gallery-thumbs').append(b);});
$('gallery-design').onclick=()=>showImage(galleryIndex);
$('gallery-render').onclick=()=>{const key=galleryIndex<8?zones[galleryIndex].key:'overview';$('gallery-image').src=`assets/${key}.webp`;$('gallery-image').alt=`3D view of ${gallery[galleryIndex].title}`;$('gallery-full').href=`assets/${key}.webp`;$('gallery-design').setAttribute('aria-pressed','false');$('gallery-render').setAttribute('aria-pressed','true');};
function openImage(){showImage(current);dialogOpen($('image-gallery'));}
$('render-toggle').onclick=openImage;$('design-preview').onclick=openImage;
$('design-mode').onclick=()=>{pauseTour();mode='design';if(orbit)orbit.enabled=false;transition=null;setRendered(true);};
function lookAngles(){const d=new THREE.Vector3();camera.getWorldDirection(d);yaw=Math.atan2(-d.x,-d.z);pitch=Math.asin(THREE.MathUtils.clamp(d.y,-1,1));}
function applyLook(){camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);}
function setMode(next,travel=true){mode=next;if(orbit)orbit.enabled=mode==='aerial';$('walk-mode').setAttribute('aria-pressed',String(mode==='walk'));$('aerial-mode').setAttribute('aria-pressed',String(mode==='aerial'));$('walk-hint').hidden=mode!=='walk';$('touch-controls').style.visibility=mode==='walk'&&!rendered?'visible':'hidden';if(travel)go(current);}
async function enterMode(next){pauseTour();if(!ready&&!failed){$('loading').hidden=false;await ensureBoot();$('loading').hidden=true;}if(ready)setMode(next);}
$('walk-mode').onclick=()=>enterMode('walk');$('aerial-mode').onclick=()=>enterMode('aerial');
function go(i,fromTour=false){current=i;caption();if(!ready||mode==='design'){setRendered(true);return;}setRendered(false);if(fromTour){playing=true;$('tour').setAttribute('aria-pressed','true');$('tour').setAttribute('aria-label','Pause the guided walk');$('tour-icon').textContent='Ⅱ';$('tour-label').textContent='Pause the walk';}
 const z=zones[i];const to=mode==='aerial'?new THREE.Vector3(65,83,58):vec(z.spot);const target=mode==='aerial'?new THREE.Vector3(4,0,0):vec(z.look);
 // Follow the central path traced from the supplied plan.
 const spine=[[-50,12],[-41,11.8],[-33,10.6],[-24,9.3],[-7,9.1],[8,8.8],[20,7.8],[51,7.8]];
 const pathX=y=>{for(let j=1;j<spine.length;j++){if(y<=spine[j][0]){const a=spine[j-1],b=spine[j];return THREE.MathUtils.lerp(a[1],b[1],THREE.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1));}}return 7.8;};
 const pts=[camera.position.clone()];
 if(mode==='walk'&&camera.position.y<3.5){const from=-camera.position.z,end=-to.z;pts.push(new THREE.Vector3(pathX(from),1.65,-from));const route=spine.filter(p=>p[0]>Math.min(from,end)&&p[0]<Math.max(from,end));if(end<from)route.reverse();for(const [y,x] of route)pts.push(new THREE.Vector3(x,1.65,-y));pts.push(new THREE.Vector3(pathX(end),1.65,-end));}
 pts.push(to);const lengths=[0];for(let j=1;j<pts.length;j++)lengths.push(lengths[j-1]+pts[j].distanceTo(pts[j-1]));
 const direction=new THREE.Vector3();camera.getWorldDirection(direction);
 const distance=lengths.at(-1);transition={pts,lengths,distance,target,fromLook:camera.position.clone().add(direction.multiplyScalar(12)),start:performance.now(),duration:reduced?1:Math.min(9000,Math.max(1900,distance*105)),done:()=>{lookAngles();if(fromTour&&playing)tourWait=performance.now()+6500;}};
 if(mode==='aerial')orbit.target.copy(target);
}
async function boot(){try{
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;$('world').append(renderer.domElement);
 scene=new THREE.Scene();scene.background=new THREE.Color('#c3d7dd');scene.fog=new THREE.Fog('#c3d7dd',100,240);camera=new THREE.PerspectiveCamera(60,1,.08,400);camera.position.set(31,17,59);camera.lookAt(10,0,8);
 scene.add(new THREE.HemisphereLight(0xe3f1ff,0x6b6843,2.1));const sun=new THREE.DirectionalLight(0xffecd0,3.2);sun.position.set(40,65,20);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-45,right:55,top:65,bottom:-60,near:1,far:180});sun.shadow.bias=-.0003;sun.shadow.normalBias=.035;scene.add(sun);
 const fill=new THREE.DirectionalLight(0xbcd9f5,.5);fill.position.set(45,15,-20);scene.add(fill);
 orbit=new OrbitControls(camera,renderer.domElement);orbit.enabled=false;orbit.enableDamping=true;orbit.maxPolarAngle=Math.PI*.48;orbit.minDistance=8;orbit.maxDistance=130;orbit.target.set(5,0,-5);orbit.addEventListener('start',()=>{pauseTour();transition=null;});
 const draco=new DRACOLoader();draco.setDecoderPath('./vendor/draco/');const gltf=await new GLTFLoader().setDRACOLoader(draco).loadAsync('assets/learning-landscape.glb');draco.dispose();model=gltf.scene;
 model.traverse(o=>{if(o.isMesh){if(['cedar','brick','stone','limestone'].includes(o.material.name))collisionMeshes.push(o);o.castShadow=true;o.receiveShadow=true;if(o.material.name.startsWith('leaf')||['purple','flower'].includes(o.material.name)){o.material.side=THREE.DoubleSide;o.material.roughness=.82;}o.material.envMapIntensity=.5;}});scene.add(model);
 ready=true;$('enter').disabled=false;resize();lookAngles();requestAnimationFrame(frame);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;ready=false;setRendered(true);$('load-message').textContent='The rendered views are available while 3D is unavailable.';});
 renderer.domElement.addEventListener('pointerdown',e=>{if(mode!=='walk'||rendered)return;pauseTour();transition=null;drag={id:e.pointerId,x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);});
 renderer.domElement.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;yaw-=(e.clientX-drag.x)*.004;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-drag.y)*.004,-1.1,1.1);drag.x=e.clientX;drag.y=e.clientY;applyLook();});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(type,()=>drag=null);
 }catch(e){console.error('Landscape could not start',e);failed=true;$('load-message').textContent='Explore the rendered views';$('enter').disabled=false;}
}
function resize(){if(!renderer)return;const w=$('experience').clientWidth,h=$('experience').clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe($('experience'));
async function enter(walk=false){if(started)return;started=true;$('welcome').hidden=true;$('hero-footer').hidden=true;$('experience').classList.add('exploring');$('explorer').hidden=false;if(!walk){mode='design';caption();setRendered(true);return;}if(!ready&&!failed){$('loading').hidden=false;await ensureBoot();$('loading').hidden=true;}mode=walk?'walk':'design';if(ready){camera.position.copy(vec(zones[0].spot));camera.lookAt(vec(zones[0].look));lookAngles();go(0);}else{caption();setRendered(true);$('walk-mode').disabled=true;$('aerial-mode').disabled=true;$('render-toggle').hidden=true;$('tour').disabled=true;$('walk-hint').hidden=true;$('touch-controls').hidden=true;}}
$('enter').onclick=()=>enter();$('enter-walk').onclick=()=>enter(true);
const keyMap={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
addEventListener('keydown',e=>{if(!started||document.querySelector('dialog[open]')||e.target.closest('input,textarea'))return;if(keyMap[e.code]){e.preventDefault();keys.add(keyMap[e.code]);pauseTour();transition=null;if(rendered){keys.clear();enterMode('walk');}else if(ready&&mode==='walk'&&!e.repeat){const v=keyMap[e.code],f=v==='forward'?1:v==='back'?-1:0,side=v==='right'?1:v==='left'?-1:0;const p=camera.position.clone().add(new THREE.Vector3(-Math.sin(yaw)*f+Math.cos(yaw)*side,0,-Math.cos(yaw)*f-Math.sin(yaw)*side).multiplyScalar(.10));if(canWalk(p)){camera.position.copy(p);camera.position.y=groundHeight(p.x,-p.z)+1.65;}}}});addEventListener('keyup',e=>{if(keyMap[e.code])keys.delete(keyMap[e.code]);});
addEventListener('blur',()=>{keys.clear();moveKeys.clear();});document.addEventListener('visibilitychange',()=>{keys.clear();moveKeys.clear();if(document.hidden)pauseTour();});
document.querySelectorAll('[data-move]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);pauseTour();transition=null;moveKeys.add(b.dataset.move);};for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>moveKeys.delete(b.dataset.move));});
function canWalk(p){
 const x=p.x,y=-p.z;if(y< -49||y>47||x< -16||x>24.05)return false;
 if(x<6.7&&y>29&&y<47)return true;
 if(x<.2)return false;
 const dir=p.clone().sub(camera.position);const distance=dir.length();if(distance<.001)return true;dir.y=0;dir.normalize();
 ray.set(new THREE.Vector3(camera.position.x,groundHeight(camera.position.x,-camera.position.z)+.75,camera.position.z),dir);ray.far=distance+.3;
 return !ray.intersectObjects(collisionMeshes,false).some(hit=>!hit.object.material?.name?.startsWith('leaf')&&!['purple','flower'].includes(hit.object.material?.name));
}
function groundHeight(x,y){return x<2&&y>30&&y<46?-3.1*Math.pow(1-Math.max(0,Math.min(1,(x+16)/18)),1.3):0;}
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-lastTime)/1000,.04);lastTime=now;if(document.hidden||!started)return;
 if(transition){const t=transition,k=Math.min(1,(now-t.start)/t.duration),e=k*k*(3-2*k),d=e*t.distance;let i=1;while(i<t.lengths.length-1&&d>t.lengths[i])i++;const f=(d-t.lengths[i-1])/Math.max(.0001,t.lengths[i]-t.lengths[i-1]);camera.position.lerpVectors(t.pts[i-1],t.pts[i],Math.min(1,f));camera.lookAt(t.fromLook.clone().lerp(t.target,e));if(k===1){transition=null;t.done();}}
 else if(mode==='aerial')orbit.update();
 else if(!rendered&&!document.querySelector('dialog[open]')){
  let forward=Number(keys.has('forward')||moveKeys.has('forward'))-Number(keys.has('back')||moveKeys.has('back'));let side=Number(keys.has('right')||moveKeys.has('right'))-Number(keys.has('left')||moveKeys.has('left'));
  if(forward||side){const direction=new THREE.Vector3(-Math.sin(yaw)*forward+Math.cos(yaw)*side,0,-Math.cos(yaw)*forward-Math.sin(yaw)*side).normalize().multiplyScalar(dt*2.4);const p=camera.position.clone().add(direction);if(canWalk(p))camera.position.copy(p);else{p.copy(camera.position);p.x+=direction.x;if(canWalk(p))camera.position.copy(p);p.copy(camera.position);p.z+=direction.z;if(canWalk(p))camera.position.copy(p);}camera.position.y=groundHeight(camera.position.x,-camera.position.z)+1.65;}
 }
 if(playing&&tourWait&&now>tourWait){tourWait=0;if(current<7)go(current+1,true);else pauseTour();}
 if(!rendered)renderer.render(scene,camera);
 if(Math.floor(now/300)!==Math.floor((now-dt*1000)/300))$('experience').dataset.state=JSON.stringify({ready,mode,current,playing,rendered,position:camera.position.toArray(),triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls});
}
caption();let bootPromise;function ensureBoot(){return bootPromise||(bootPromise=boot());}
// Read-only diagnostics for repeatable acceptance checks.
window.landscapeStatus=()=>({ready,failed,started,current,mode,rendered,playing,transitioning:!!transition,position:camera?.position.toArray(),meshes:model?.children.length,triangles:renderer?.info.render.triangles,drawCalls:renderer?.info.render.calls});
