'use strict';
// The renderer consumes the 2D simulation. Depth is decorative, never a control axis.
class KaariRenderer {
  constructor(canvas){
    this.canvas=canvas;
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.mobile=navigator.maxTouchPoints>0||matchMedia('(any-pointer: coarse)').matches;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.mobile?1.5:2));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
    this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-400,400,240,-240,.1,4500);
    this.sphere=new THREE.SphereGeometry(1,20,14);this.cylinder=new THREE.CylinderGeometry(1,1,1,14);this.box=new THREE.BoxGeometry(1,1,1);
    this.mountainGeometry=new THREE.ConeGeometry(1,1,6);
    this.rockGeometry=new THREE.DodecahedronGeometry(1,0);
    this.up=new THREE.Vector3(0,1,0);this.mapIndex=-1;
    this.hemi=new THREE.HemisphereLight('#edfaff','#607659',2.5);this.scene.add(this.hemi);
    this.sun=new THREE.DirectionalLight('#fff1d5',3.4);this.sun.castShadow=true;this.sun.shadow.mapSize.set(this.mobile?1024:2048,this.mobile?1024:2048);
    Object.assign(this.sun.shadow.camera,{left:-650,right:650,top:650,bottom:-650,near:10,far:1800});
    this.sun.shadow.bias=-.0003;this.sun.shadow.normalBias=.6;this.sun.shadow.radius=3;this.scene.add(this.sun,this.sun.target);
    const rim=new THREE.DirectionalLight('#b9dcff',1.2);rim.position.set(-300,220,-250);this.scene.add(rim);
    this.world=new THREE.Group();this.scene.add(this.world);this.person=new THREE.Group();this.scene.add(this.person);
    this.characterId='rookie';this.makePerson();
    this.makeCrashEffects();
    this.trailGeometry=new THREE.BufferGeometry();this.trailGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(90),3));
    this.trailLine=new THREE.Line(this.trailGeometry,new THREE.LineBasicMaterial({color:'#fff9d7',transparent:true,opacity:.55}));this.trailLine.frustumCulled=false;this.scene.add(this.trailLine);
    this.labels=document.getElementById('effects');this.targetGuide=document.getElementById('target-guide');this.resize();
    this.previewCanvas=document.getElementById('character-preview');
    this.previewRenderer=new THREE.WebGLRenderer({canvas:this.previewCanvas,alpha:true,antialias:true});
    this.previewRenderer.setPixelRatio(Math.min(devicePixelRatio,this.mobile?1.5:2));
    this.previewRenderer.outputColorSpace=THREE.SRGBColorSpace;this.previewRenderer.toneMapping=THREE.ACESFilmicToneMapping;this.previewRenderer.toneMappingExposure=1.15;
    this.previewCamera=new THREE.OrthographicCamera(-75,75,70,-70,.1,1500);
  }
  material(color,roughness=.65,metalness=0){const m=new THREE.MeshStandardMaterial({color,roughness,metalness});return m;}
  makeCrashEffects(){
    this.crashEffects=new THREE.Group();this.scene.add(this.crashEffects);this.dust=[];this.stars=[];
    for(let i=0;i<12;i++){
      const material=new THREE.MeshBasicMaterial({color:i%2?'#fff2cf':'#d7d5ad',transparent:true,opacity:0,depthWrite:false});
      const puff=new THREE.Mesh(this.sphere,material);this.crashEffects.add(puff);this.dust.push(puff);
    }
    const shape=new THREE.Shape();for(let i=0;i<10;i++){const angle=i*Math.PI/5-Math.PI/2,r=i%2?2.8:6.5;const x=Math.cos(angle)*r,y=Math.sin(angle)*r;if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);}shape.closePath();
    const geometry=new THREE.ShapeGeometry(shape);
    for(let i=0;i<5;i++){const star=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:i%2?'#fff49a':'#ffca3a',side:THREE.DoubleSide}));this.crashEffects.add(star);this.stars.push(star);}
    this.crashEffects.visible=false;
  }
  drawCrash(game){
    const crash=game.crash,t=game.elapsedAfterEnd;this.crashEffects.visible=!!crash&&t<crash.duration;
    if(!this.crashEffects.visible)return;
    this.dust.forEach((p,i)=>{const a=i*Math.PI*2/12,d=12+t*(35+i%3*13);p.position.set(crash.x+Math.cos(a)*d,5+Math.sin(Math.min(1,t)*Math.PI)*12+(i%3)*3,Math.sin(a)*d*.45);p.scale.setScalar(4+t*9+i%3);p.material.opacity=Math.max(0,.65*(1-t/1.2));});
    const head=game.ragdoll.joints.head;
    this.stars.forEach((star,i)=>{const a=t*4+i*Math.PI*2/5;star.position.set(head.x+Math.cos(a)*23,K_FLOOR-head.y+25+Math.sin(a*2)*4,Math.sin(a)*16+8);star.rotation.set(0,0,-t*2+i);star.scale.setScalar(Math.min(1,t*5)*Math.min(1,(crash.duration-t)*3));});
  }
  mesh(geo,mat,parent=this.world){const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  block(x,y,z,w,h,d,mat,parent=this.world){const m=this.mesh(this.box,mat,parent);m.position.set(x,y,z);m.scale.set(w,h,d);return m;}
  ball(x,y,z,r,mat,parent=this.world,sx=1,sy=1,sz=1){const m=this.mesh(this.sphere,mat,parent);m.position.set(x,y,z);m.scale.set(r*sx,r*sy,r*sz);return m;}
  rod(a,b,r,mat,parent=this.world){const m=this.mesh(this.cylinder,mat,parent);this.placeRod(m,a,b,r);return m;}
  placeRod(mesh,a,b,r){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),direction=to.clone().sub(from);mesh.position.copy(from).add(to).multiplyScalar(.5);mesh.scale.set(r,direction.length(),r);mesh.quaternion.setFromUnitVectors(this.up,direction.normalize());}
  label(text,color='#f5eee0',size=20){
    const c=document.createElement('canvas');c.width=512;c.height=128;const c2=c.getContext('2d');c2.fillStyle=color;c2.font='600 54px sans-serif';c2.textAlign='center';c2.textBaseline='middle';c2.fillText(text,256,64);
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));sprite.scale.set(size*4,size,1);return sprite;
  }
  makePerson(){
    const c=JUMPBAR_CHARACTERS.find(c=>c.id===this.characterId)||JUMPBAR_CHARACTERS[0],big=c.id==='bruno';
    const skin=this.material(c.skin,.82),cloth=this.material(c.pants,.94),top=this.material(c.bare?c.skin:c.shirt,.85),hair=this.material(c.hair,.95),white=this.material('#fff8e9'),ink=this.material('#302628');
    this.bodyScale=c.body;this.bodyDepth=big?14:c.id==='neon'?7:8;this.bodyWidth=big?15:c.id==='neon'?8:10;
    // One smoothly sampled surface from waist to neck. The belly is part of
    // this mesh, never a second overlapping sphere.
    const profile=new THREE.CatmullRomCurve3((big?[[.7,-1],[1,-.65],[1.05,-.15],[.94,.4],[.8,.75],[.32,1]]:[[.72,-1],[.8,-.5],[.9,.2],[1,.62],[.82,.83],[.33,1]]).map(([r,y])=>new THREE.Vector3(r,y,0)));
    this.torso=this.mesh(new THREE.LatheGeometry([new THREE.Vector2(0,-1),...profile.getPoints(36).map(p=>new THREE.Vector2(p.x,p.y)),new THREE.Vector2(0,1)],32),top,this.person);
    const shortsCanvas=document.createElement('canvas');shortsCanvas.width=256;shortsCanvas.height=128;const ctx=shortsCanvas.getContext('2d');ctx.fillStyle=c.pants;ctx.fillRect(0,0,256,128);ctx.fillStyle='#f8f1dc';ctx.fillRect(0,0,256,16);
    if(c.id==='rookie'){ctx.fillStyle='#3e8bbb';for(let y=32;y<128;y+=28)for(let x=12;x<256;x+=32){ctx.beginPath();ctx.arc(x+(y%56?8:0),y,4,0,Math.PI*2);ctx.fill();}}
    if(big){ctx.fillStyle='#ffd49a';for(let x=0;x<256;x+=40)ctx.fillRect(x,17,5,111);}
    const shortsTex=new THREE.CanvasTexture(shortsCanvas);shortsTex.colorSpace=THREE.SRGBColorSpace;
    const shortsMat=this.material('#ffffff',.94);shortsMat.map=shortsTex;
    this.hips=this.mesh(new THREE.LatheGeometry([new THREE.Vector2(0,-1),new THREE.Vector2(.72,-1),new THREE.Vector2(.98,-.5),new THREE.Vector2(1,.5),new THREE.Vector2(.94,1),new THREE.Vector2(0,1)],32),shortsMat,this.person);
    this.hips.scale.set(this.bodyDepth*.77,7,this.bodyWidth*.83);
    this.limbs=[];this.jointMeshes={};
    for(const side of ['L','R']){
      const sign=side==='L'?-1:1;
      for(const arm of [true,false]){
        const geo=new THREE.BufferGeometry(),rings=20,segments=12,positions=new Float32Array((rings+1)*(segments+1)*3),indices=[];
        for(let i=0;i<rings;i++)for(let k=0;k<segments;k++){const a=i*(segments+1)+k,b=a+segments+1;indices.push(a,a+1,b,b,a+1,b+1);}
        geo.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geo.setIndex(indices);
        const mesh=this.mesh(geo,arm||c.bare?skin:cloth,this.person);mesh.frustumCulled=false;
        this.limbs.push({mesh,side,sign,arm,rings,segments,radii:arm?(big?[4.5,3.9,2.7]:[3.7,3,2.3]):(big?[6.7,4.7,3.2]:[5.2,3.6,2.6])});
      }
      const z=sign*6.5;
      this.jointMeshes['hand'+side]={mesh:this.ball(0,0,0,2.7,skin,this.person,1,1.15,.9),z};
      this.jointMeshes['foot'+side]={mesh:this.ball(0,0,0,1,c.bare?skin:this.material(c.shoe),this.person),z};
      this.jointMeshes['foot'+side].mesh.scale.set(6.3,3.2,3.8);
    }
    this.neck=this.mesh(this.cylinder,skin,this.person);
    this.headGroup=new THREE.Group();this.person.add(this.headGroup);
    this.ball(0,0,0,10,skin,this.headGroup,big?1.08:.92,1.1,.92);
    for(const x of [-8.8,8.8])this.ball(x,0,0,1.7,skin,this.headGroup,.75,1.3,1);
    const cap=this.mesh(new THREE.SphereGeometry(1,28,16,0,Math.PI*2,0,big?1.1:1.5),hair,this.headGroup);cap.position.set(0,2,-.4);cap.scale.set(big?10:9.5,10,9.6);
    if(c.id==='neon')this.ball(0,7,-10,5.2,hair,this.headGroup,.8,1.7,.8);
    if(c.id==='rookie'){const quiff=this.ball(0,9,3,5,hair,this.headGroup,1.5,.55,.8);quiff.rotation.z=-.2;}
    for(const x of [-3.5,3.5]){
      this.ball(x,1.6,8,1.65,white,this.headGroup,1,1.2,.35);
      this.ball(x+.3,1.5,8.65,.82,ink,this.headGroup,1,1.1,.4);
      this.rod([x-1.4,4.4,8],[x+1.3,4.7,8],.55,hair,this.headGroup);
    }
    this.ball(0,-.7,9,1.9,skin,this.headGroup,.85,.85,1.25);
    this.rod([-2,-4.4,8],[2,-4.4,8],.4,ink,this.headGroup);
    if(big)for(const x of [-2.5,2.5]){const mustache=this.ball(x,-2.8,9.3,2,hair,this.headGroup,1.6,.5,.5);mustache.rotation.z=x>0?.15:-.15;}
    this.person.matrixAutoUpdate=false;
  }
  poseLimb(limb,j,inMenu,specialPose){
    const {side,sign,arm,rings,segments,radii,mesh}=limb;
    const ids=arm?['chest','elbow'+side,'hand'+side]:['hip','knee'+side,'foot'+side];
    const zs=arm?[sign*this.bodyWidth*.7,sign*(inMenu?this.bodyWidth+3:9),sign*(inMenu?this.bodyWidth+5:7)]:[sign*6.5,sign*(inMenu?8:6.5),sign*(inMenu?9:6.5)];
    if(specialPose==='deathdive'&&!inMenu){zs[1]=sign*(arm?22:12);zs[2]=sign*(arm?32:18);}
    const points=ids.map((id,i)=>new THREE.Vector3(j[id].x,K_FLOOR-j[id].y+(i===0?(arm?-2:-3):0),zs[i]));
    const curve=new THREE.CatmullRomCurve3(points,false,'centripetal'),pos=mesh.geometry.attributes.position;
    for(let i=0;i<=rings;i++){
      const t=i/rings,p=curve.getPoint(t),tangent=curve.getTangent(t).normalize();
      const normal=new THREE.Vector3(0,0,1).cross(tangent).normalize(),binormal=tangent.clone().cross(normal).normalize();
      const cap=t<.1?Math.sqrt(1-Math.pow(1-t/.1,2)):t>.94?Math.sqrt(Math.max(0,1-Math.pow((t-.94)/.06,2))):1;
      const radius=cap*(t<.5?THREE.MathUtils.lerp(radii[0],radii[1],t*2):THREE.MathUtils.lerp(radii[1],radii[2],(t-.5)*2));
      for(let k=0;k<=segments;k++){const a=k/segments*Math.PI*2,v=p.clone().addScaledVector(normal,Math.cos(a)*radius).addScaledVector(binormal,Math.sin(a)*radius);pos.setXYZ(i*(segments+1)+k,v.x,v.y,v.z);}
    }
    pos.needsUpdate=true;mesh.geometry.computeVertexNormals();
    const end=this.jointMeshes[ids[2]].mesh;end.position.copy(points[2]);
  }
  setCharacter(id){
    const character=JUMPBAR_CHARACTERS.find(c=>c.id===id)||JUMPBAR_CHARACTERS[0];
    if(character.id===this.characterId)return;
    const materials=new Set(),geometries=new Set(),textures=new Set();
    this.person.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material){materials.add(o.material);if(o.material.map)textures.add(o.material.map);}});
    this.person.clear();
    for(const g of geometries)if(g!==this.sphere&&g!==this.cylinder&&g!==this.box)g.dispose();
    for(const m of materials)m.dispose();for(const t of textures)t.dispose();
    this.characterId=character.id;this.makePerson();
  }
  makeTree(x,z,height,palette){
    const trunk=this.material(palette==='coast'?'#9c8264':'#78674f');this.rod([x,-6,z],[x,height*.65,z],5,trunk);
    if(palette==='coast'){
      const leaf=this.material('#5c927a');for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const m=this.ball(x+Math.cos(a)*23,height*.65+4,z+Math.sin(a)*23,27,leaf,this.world,1,.15,.35);m.rotation.y=-a;m.rotation.z=Math.cos(a)*.22;}
    }else{
      const leaf=this.material(palette==='sunset'?'#829079':'#77996b');
      this.ball(x,height*.7,z,height*.29,leaf,this.world,.9,1.25,.8);this.ball(x-18,height*.55,z+6,height*.22,leaf);this.ball(x+19,height*.58,z-5,height*.23,leaf);
    }
  }
  clearWorld(){
    const materials=new Set(),textures=new Set();this.world.traverse(o=>{if(o.material){const list=Array.isArray(o.material)?o.material:[o.material];for(const m of list){materials.add(m);if(m.map)textures.add(m.map);}}});
    this.world.traverse(o=>{if(o.geometry?.userData.worldOwned)o.geometry.dispose();});
    this.world.clear();for(const m of materials)m.dispose();for(const t of textures)t.dispose();
  }
  buildLandmarks(game,length){
    const id=game.map.id;this.landmarkKind=id;
    const cream=this.material('#f0e2bb'),steel=this.material('#53697a'),wood=this.material('#8c684a');
    if(id==='city'){
      const canvas=document.createElement('canvas');canvas.width=128;canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#344567';c.fillRect(0,0,128,256);
      for(let y=8;y<256;y+=24)for(let x=8;x<128;x+=24){c.fillStyle=(x+y)%5<2?'#edcc87':'#8bb7ca';c.fillRect(x,y,11,15);}
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
      const tower=new THREE.MeshStandardMaterial({map:texture,roughness:.7});
      this.block(length/2,-210,0,length+240,400,170,steel);
      for(let i=0;i<13;i++){const x=i*190-480,h=390+(i*73)%360,z=-260-(i%3)*100;this.block(x,h/2-430,z,110+(i%3)*20,h,115,tower);this.block(x,h-427,z,125+(i%3)*20,7,130,cream);if(i%3===0)this.rod([x,h-425,z],[x,h-360,z],3,steel);}
      for(let i=0;i<6;i++){const x=i*310+40;this.block(x,24,-77,50,45,32,steel);for(let n=0;n<4;n++)this.block(x-18+n*12,48,-77,4,2,24,cream);}
      const tank=this.material('#ba7953');this.rod([500,35,-165],[500,125,-165],35,tank);for(const dx of [-24,24])this.rod([500+dx,-10,-165],[500+dx,45,-165],4,steel);this.ball(500,124,-165,36,steel,this.world,1,.2,1);
    }else if(id==='harbor'){
      const water=this.material('#397e98',.25,.35);this.block(length/2,-8,-560,length+2200,2,820,water);
      const red=this.material('#c95446'),blue=this.material('#447ea0'),orange=this.material('#de9d48');
      for(let i=0;i<15;i++){const x=i*120-240,z=-170-(i%3)*64;const mat=[red,blue,orange][i%3];this.block(x,22+(i%2)*48,z,106,46,52,mat);if(i%2)this.block(x,22,z,106,46,52,[blue,orange,red][i%3]);for(let k=0;k<7;k++)this.block(x-45+k*15,22+(i%2)*48,z+27,2,40,2,steel);}
      for(const x of [150,780,1400]){this.rod([x,-5,-290],[x,280,-290],8,orange);this.rod([x-80,275,-290],[x+200,275,-290],6,orange);this.rod([x,200,-290],[x+160,275,-290],4,orange);this.rod([x+170,275,-290],[x+170,105,-290],1.5,steel);this.block(x+170,100,-290,15,10,8,steel);}
      this.block(850,5,-510,470,55,95,red);this.block(1050,62,-510,72,80,65,cream);this.block(1050,87,-473,56,22,2,blue);this.rod([1060,100,-510],[1060,160,-510],8,steel);
    }else if(id==='alpine'){
      const snow=this.material('#f0f6fa'),rock=this.material('#829aaf'),pine=this.material('#37756e');
      for(let i=0;i<9;i++){const x=i*240-400,h=220+(i%3)*85;const mountain=this.mesh(this.mountainGeometry,rock);mountain.position.set(x,h/2-12,-500);mountain.scale.set(160,h,150);mountain.rotation.y=i*.7;const cap=this.mesh(this.mountainGeometry,snow);cap.position.set(x,h*.83-11,-500);cap.scale.set(55,h*.34,52);cap.rotation.y=i*.7;}
      for(let i=0;i<13;i++){const x=i*150-170,z=-170-(i%2)*70;this.rod([x,-5,z],[x,100,z],4,wood);for(let n=0;n<3;n++){const radius=32-n*7;this.ball(x,55+n*28,z,radius,pine,this.world,1,1.4,1);this.ball(x,55+n*28+radius,z,radius*.8,snow,this.world,1,.5,1);}}
      this.rod([-250,235,-210],[length+200,340,-210],1.3,steel);
      const red=this.material('#e35c53');for(let i=0;i<6;i++){const x=i*280,y=235+(x+250)/(length+450)*105;this.rod([x,y,-210],[x,y-22,-210],2,steel);this.block(x,y-42,-210,40,36,28,red);this.block(x,y-36,-195,30,17,2,cream);}
      this.block(700,34,-170,90,70,66,wood);this.block(700,74,-170,110,12,84,snow);
    }else if(id==='sunset'){
      const rock=this.material('#ce855c'),cactus=this.material('#638861');
      for(const x of [100,720,1400]){for(const dx of [-70,70])this.ball(x+dx,78,-220,55,rock,this.world,.7,1.9,.8);this.ball(x,168,-220,95,rock,this.world,1,.38,.6);}
      for(let i=0;i<12;i++){const x=i*160-180,z=-145-(i%2)*40;this.rod([x,0,z],[x,72,z],8,cactus);this.ball(x,72,z,8,cactus);this.rod([x,32,z],[x+24,32,z],6,cactus);this.rod([x+24,32,z],[x+24,58,z],6,cactus);}
    }else if(id==='coast'){
      const red=this.material('#da6659'),water=this.material('#8bd6db',.3);
      this.rod([600,-5,-260],[600,155,-260],24,cream);this.rod([600,72,-260],[600,93,-260],24.5,red);this.rod([600,156,-260],[600,186,-260],17,water);this.ball(600,190,-260,27,red,this.world,1,.3,1);
      for(const x of [140,1050,1600]){this.ball(x,-3,-460,60,wood,this.world,1,.17,.35);this.rod([x,-3,-460],[x,105,-460],2,cream);this.block(x+20,62,-460,35,65,2,cream);}
      for(let i=0;i<5;i++){const x=i*270+20;this.rod([x,0,-140],[x,75,-140],2,cream);this.ball(x,76,-140,35,i%2?red:water,this.world,1,.2,1);}
    }else{
      const teal=this.material('#62adb5',.25),roof=this.material('#735d83');
      this.rod([420,-2,-200],[420,15,-200],50,cream);this.rod([420,15,-200],[420,19,-200],44,teal);this.rod([420,18,-200],[420,55,-200],8,cream);this.ball(420,57,-200,19,teal,this.world,1,.3,1);
      for(const dx of [-45,45])for(const z of [-220,-140])this.rod([820+dx,0,z],[820+dx,115,z],4,wood);this.block(820,118,-180,110,12,108,roof);
      for(let i=0;i<8;i++){this.ball(i*180+80,7,-95,22,roof,this.world,1,.5,.5);}
    }
  }
  buildDiveMap(game,length){
    const warm=game.map.id==='sunset',alpine=game.map.id==='alpine',islands=game.map.id==='harbor';
    this.landmarkKind=game.map.id;
    const rock=this.material(warm?'#b66d46':alpine?'#738899':'#81918a'),lightRock=this.material(warm?'#e4a36d':'#b3b7a1');
    const grass=this.material(alpine?'#aac5b3':islands?'#5a9566':'#83ba75');
    const water=this.material(warm?'#369fa7':alpine?'#237eaa':'#16b9bd',.18,.3),foam=this.material('#c7fff0',.4);
    const edge=game.mat.x;
    const points=game.map.terrain.filter(([x])=>x>=-900),shape=new THREE.Shape();
    shape.moveTo(-900,-35);shape.lineTo(edge-90,-35);
    const summit=terrainHeight(game.map,edge);
    if(alpine){shape.lineTo(edge+45,35);shape.lineTo(edge-55,110);shape.lineTo(edge+15,180);shape.lineTo(edge-45,265);shape.lineTo(edge+22,330);}
    else if(warm){shape.lineTo(edge-55,45);shape.lineTo(edge-95,135);shape.lineTo(edge-38,225);}
    else if(islands){shape.lineTo(edge+50,12);shape.lineTo(edge+24,45);shape.lineTo(edge-15,82);}
    else{shape.lineTo(edge+65,8);shape.lineTo(edge+38,50);shape.lineTo(edge+12,95);}
    shape.lineTo(edge,summit);
    for(const [x,h] of [...points].reverse())shape.lineTo(x,h);
    shape.closePath();
    if(warm){const arch=new THREE.Path();arch.absellipse(280,100,90,75,0,Math.PI*2,true);shape.holes.push(arch);}
    const geo=new THREE.ExtrudeGeometry(shape,{depth:180,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:9,bevelThickness:8});geo.userData.worldOwned=true;
    const land=this.mesh(geo,rock);land.position.z=-90;
    // A sloping lip follows the actual collision surface, not a rectangular cap.
    for(let i=1;i<points.length;i++){
      const [a,h]=points[i-1],[b,k]=points[i],dx=b-a,dy=k-h;
      const lip=this.block((a+b)/2,(h+k)/2+1,0,Math.hypot(dx,dy),5,172,alpine?lightRock:grass);lip.rotation.z=Math.atan2(dy,dx);
    }
    for(let i=0;i<12;i++){
      const x=-300+i*65;if(x>edge-35)continue;
      const h=terrainHeight(game.map,x),stone=this.mesh(this.rockGeometry,i%2?rock:lightRock);
      stone.position.set(x,h*.35,94);stone.scale.set(30+(i%3)*10,h*.36,20);stone.rotation.y=i*.8;
      if(!warm)for(let k=0;k<2;k++){const ledge=this.block(x,h*(.25+k*.35),105,45,4,8,lightRock);ledge.rotation.z=(i%3-1)*.08;}
    }
    if(islands){
      for(let i=0;i<5;i++){const isle=this.mesh(this.rockGeometry,rock);isle.position.set(edge+250+i*180,10,-170-i%2*70);isle.scale.set(70,28+i%2*20,55);this.ball(edge+250+i*180,27,-170-i%2*70,45,grass,this.world,1,.18,.8);}
    }
    this.block(edge+game.mat.w/2,-25,-280,game.mat.w+1400,45,3200,water);
    this.waterStreaks=[];
    for(let i=0;i<65;i++){
      const x=edge+40+(i*137)%(game.mat.w+400),z=-650+(i*97)%1050;
      const m=this.block(x,-1+(i%3)*.2,z,12+(i%5)*12,.3,1.5,foam);m.userData.baseX=x;this.waterStreaks.push(m);
    }
    // Separate silhouettes for the four destinations: sandstone arches,
    // forested islands, alpine peaks, and a tropical limestone cove.
    for(let i=0;i<11;i++){
      const x=-400+i*210,z=-480-(i%3)*120,h=alpine?320+(i%4)*110:110+(i%4)*45;
      const peak=this.mesh(alpine?this.mountainGeometry:this.rockGeometry,i%2?rock:lightRock);peak.position.set(x,h/2-20,z);peak.scale.set(alpine?160:110,alpine?h:h*.65,130);peak.rotation.y=i*.7;
      if(alpine){const cap=this.mesh(this.mountainGeometry,this.material('#e8f3f5'));cap.position.set(x,h*.82-20,z);cap.scale.set(58,h*.36,47);cap.rotation.y=peak.rotation.y;}
      else if(!warm){for(let k=0;k<4;k++)this.ball(x-48+k*30,h*.87-22+(k%2)*10,z,30,grass,this.world,1.2,.65,1);}
    }
    if(warm){
      for(const x of [660,1270]){
        this.rod([x,0,-300],[x,215,-300],33,rock);this.rod([x+155,0,-300],[x+155,215,-300],36,rock);
        this.ball(x+78,210,-300,95,lightRock,this.world,1.3,.32,.45);
      }
      this.ball(1050,510,-1200,92,this.material('#ffda8b'),this.world);
    }else if(alpine){
      const pineMat=this.material('#397e73');
      for(let i=0;i<16;i++){const x=i*105-250,z=-490;this.ball(x,-5,z,75,rock,this.world,1,.35,.8);this.rod([x,8,z],[x,70,z],4,rock);for(let k=0;k<3;k++){const pine=this.mesh(this.mountainGeometry,pineMat);pine.position.set(x,35+k*20,z);pine.scale.set(25-k*5,45,25-k*5);}}
    }else{
      for(let i=0;i<6;i++)this.makeTree(-340+i*110,-95,220+(i%2)*35,islands?'garden':'coast');
      if(islands){
        const wood=this.material('#b78255');for(let i=0;i<16;i++)this.block(edge+680+i*13,12,-140,11,5,85,wood);
        for(const x of [edge+690,edge+850])this.rod([x,-20,-120],[x,20,-120],4,wood);
        this.ball(edge+530,4,-220,35,this.material('#f3b658'),this.world,2,.22,.5);
      }else{
        const sand=this.material('#f4d6a0');this.ball(edge+800,-5,-310,200,sand,this.world,2,.15,1);
        for(let i=0;i<4;i++)this.makeTree(edge+630+i*90,-380,150,'coast');
      }
    }
    if(alpine||game.map.id==='coast'){
      const x=edge+440,z=-410,fallMat=this.material('#b8f0ed',.2);
      const cliff=this.mesh(this.rockGeometry,rock);cliff.position.set(x,80,z-25);cliff.scale.set(65,125,55);
      this.block(x,92,z+25,19,182,3,fallMat);
      this.block(x+5,88,z+28,5,174,2,foam);
      for(let i=0;i<6;i++)this.ball(x-22+i*9,3,z+25,11,foam,this.world,1,.3,1);
    }
    // Shore foam marks where the safe water begins.
    for(let i=0;i<9;i++)this.ball(edge+10,0,-75+i*20,14,foam,this.world,.7,.07,1);
    this.splashGroup=new THREE.Group();this.world.add(this.splashGroup);this.splashGroup.visible=false;
    this.splashDrops=[];for(let i=0;i<24;i++)this.splashDrops.push(this.ball(0,0,0,3+i%3,foam,this.splashGroup));
    if(!this.rippleGeometry)this.rippleGeometry=new THREE.TorusGeometry(1,.018,5,48);
    this.ripples=[];for(let i=0;i<3;i++){const ring=this.mesh(this.rippleGeometry,foam,this.splashGroup);ring.rotation.x=Math.PI/2;this.ripples.push(ring);}
  }
  drawWater(game,time){
    if(!game.water)return;
    this.waterStreaks.forEach((m,i)=>{m.position.x=m.userData.baseX+Math.sin(time*.65+i)*9;m.scale.x=(12+(i%5)*12)*(1+Math.sin(time+i)*.15);});
    this.splashGroup.visible=!!game.splash;
    if(!game.splash)return;
    const t=game.elapsedAfterEnd;this.splashGroup.position.x=game.splash.x;this.splashGroup.scale.setScalar(game.splash.kind==='bomb'?1.7:game.splash.kind==='deathdive'?1.3:1);
    this.splashDrops.forEach((m,i)=>{const a=i*2.4,v=38+(i%5)*13;m.position.set(Math.cos(a)*t*v,Math.max(0,t*(120+(i%4)*22)-120*t*t),Math.sin(a)*t*v*.7);m.scale.setScalar(Math.max(0,1-t/1.5)*(3+i%3));});
    this.ripples.forEach((m,i)=>{const size=8+Math.max(0,t-i*.16)*90;m.scale.setScalar(size);m.position.y=.5+i*.1;m.visible=t>i*.16;});
  }
  buildMap(game){
    this.clearWorld();this.mapIndex=game.mapIndex;const coast=this.mapIndex===1,sunset=this.mapIndex===2;
    const sky=this.mapIndex>2?game.map.colors[0]:sunset?'#eea9a4':coast?'#69cdeb':'#8edcdb';this.scene.background=new THREE.Color(sky);this.scene.fog=new THREE.Fog(sky,1500,3500);
    this.sun.color.set(sunset?'#ffc592':'#fff2d8');this.sun.intensity=sunset?3.8:3.4;
    this.hemi.groundColor.set(sunset?'#8e786a':coast?'#779994':'#6c8869');
    const length=game.mat.x+game.mat.w+280;
    this.splashGroup=null;this.waterStreaks=[];
    if(game.water){this.buildDiveMap(game,length);}else{
    const ground=this.material(this.mapIndex>2?game.map.colors[3]:coast?'#e9ca8b':sunset?'#b3a176':'#88bb69');this.block(length/2,game.map.id==='city'?-520:-28,-200,length+2400,30,2500,ground);
    const concrete=this.material('#d9d7c9'),edge=this.material('#8caaa1'),deck=this.material(sunset?'#d9b99b':coast?'#c4c8b6':'#bcc9ad');
    this.block(length/2,-13,0,length+240,20,170,concrete);this.block(length/2,-2,0,length+200,3,145,deck);
    this.block(length/2,-5,78,length+230,13,6,edge);
    const lane=this.material('#eaf0d4');for(const z of [-57,57])this.block(length/2,.1,z,length+150,.4,1.8,lane);
    const seam=this.material(game.map.id==='city'?'#53677c':'#a6b59c');for(let x=-80;x<length+160;x+=70)this.block(x,-.1,0,.7,.5,140,seam);
    if(coast){
      const sea=this.material('#729eac',.25,.25);this.block(length/2,-10,-610,length+2200,2,720,sea);
      const foam=this.material('#bdd8d5');for(let i=0;i<16;i++)this.block(i*180-400,-8.7,-430-(i%4)*90,80+(i%3)*30,.3,2,foam);
      const dock=this.material('#ac967a');for(let i=0;i<20;i++)this.block(700+i*17,-5,-320,14,4,160,dock);
    }else if(this.mapIndex<3){
      const hill=this.material(sunset?'#a3a497':'#9db49b');
      for(let i=0;i<12;i++)this.ball(i*240-650,-45,-680-(i%3)*100,150+(i%4)*20,hill,this.world,1.9,1,1.5);
    }
    const stone=this.material('#c3c8b8'),dark=this.material('#50665f');
    for(let i=0;i<(this.mapIndex<2?Math.ceil(length/240)+5:0);i++){
      const x=i*250-350,z=-190-(i%3)*65;this.makeTree(x,z,135+(i%3)*25,coast?'coast':sunset?'sunset':'garden');
      if(i%2===0){this.block(x+75,8,-120,63,6,23,stone);for(const dx of [-22,22])this.block(x+75+dx,0,-120,4,17,20,dark);}
    }
    const backWall=this.material(game.map.id==='city'?'#5c7084':sunset?'#c7b3a0':'#b8c6b2');this.block(length/2,16,-110,length+450,35,8,backWall);
    this.block(length/2,36,-110,length+470,5,15,concrete);
    this.buildLandmarks(game,length);
    }
    const steel=this.material('#d6e4df',.27,.7),frame=this.material(coast?'#40747e':sunset?'#715f56':'#476f60',.4,.35),rubber=this.material('#324d45'),bolt=this.material('#f4e7c4',.3,.65);
    this.barIndicators=[];
    game.bars.forEach((b,i)=>{
      const y=K_FLOOR-b.y;
      for(const z of [-38,38]){
        const base=game.water?terrainHeight(game.map,b.x):0;
        this.rod([b.x,base+2,z],[b.x,y+6,z],4.5,frame);
        this.block(b.x,base+3,z,34,6,22,rubber);
        for(const dx of [-11,11])this.ball(b.x+dx,base+7,z,2,bolt);
        this.rod([b.x,base+10,z],[b.x,base+62,z],6.5,rubber);
        this.rod([b.x,y-8,z],[b.x,y+5,z],6,steel);
      }
      this.rod([b.x,y,-45],[b.x,y,45],3.6,steel);
      const gripMat=this.material('#d8b98a',.88);this.rod([b.x,y,-20],[b.x,y,20],3.9,gripMat);
      const indicator=this.ball(b.x,y+8,39,3.2,this.material('#a8b6ac'));this.barIndicators.push(indicator);
      const label=this.label(String(i+1).padStart(2,'0'),'#426158',12);label.position.set(b.x,y+25,0);this.world.add(label);
    });
    if(game.water)return;
    const lane=this.material('#eaf0d4');
    const mat=game.mat,foam=this.material('#69a28f',.9),top=this.material('#95c5a4',.95);
    this.block(mat.x+mat.w/2,-9,0,mat.w,17,117,foam);this.block(mat.x+mat.w/2,0,0,mat.w-6,2,111,top);
    for(const z of [-48,48])this.block(mat.x+mat.w/2,1.2,z,mat.w-22,.35,1.6,lane);
    const finish=this.label('LANDING','#355e50',15);finish.position.set(mat.x+mat.w/2,25,-48);this.world.add(finish);
  }
  resize(){const r=this.canvas.getBoundingClientRect();this.width=r.width;this.height=r.height;this.renderer.setSize(r.width,r.height,false);const half=240*r.width/r.height;Object.assign(this.camera,{left:-half,right:half,top:240,bottom:-240});this.camera.updateProjectionMatrix();}
  draw(game,offset,trail,particles,focusY=160,viewHeight=480){
    const inMenu=document.body.dataset.screen==='menu',time=performance.now()/1000;
    if(this.mapIndex!==game.mapIndex)this.buildMap(game);
    this.drawWater(game,time);
    this.person.visible=inMenu||!game.splash||game.elapsedAfterEnd<.12;
    const halfHeight=viewHeight/2,halfWidth=halfHeight*this.width/this.height;
    Object.assign(this.camera,{left:-halfWidth,right:halfWidth,top:halfHeight,bottom:-halfHeight});this.camera.updateProjectionMatrix();
    const cx=offset+halfWidth;
    this.camera.position.set(cx+210,focusY+265,1100);this.camera.lookAt(cx,focusY,0);
    this.sun.position.set(cx-270,720,360);this.sun.target.position.set(cx,0,0);
    let j=game.ragdoll.joints;
    if(inMenu){
      const bounce=Math.sin(time*2)*.6;
      const pose={hip:[0,54],chest:[0,79],head:[0,96],elbowL:[4,61],elbowR:[6,61],handL:[7,40],handR:[8,40],kneeL:[-3,29],kneeR:[5,29],footL:[-5,5],footR:[7,5]};
      j=Object.fromEntries(Object.entries(pose).map(([id,[x,y]])=>[id,{x,y:K_FLOOR-y-bounce}]));
    }
    const point=(id,z=0)=>[j[id].x,K_FLOOR-j[id].y,z];
    for(const limb of this.limbs)this.poseLimb(limb,j,inMenu,game.player.specialPose);
    const hip=new THREE.Vector3(...point('hip')),chest=new THREE.Vector3(...point('chest')),dir=chest.clone().sub(hip);
    this.torso.position.copy(hip).add(chest).multiplyScalar(.5);this.torso.quaternion.setFromUnitVectors(this.up,dir.clone().normalize());this.torso.scale.set(this.bodyDepth,(dir.length()+7)/2,this.bodyWidth);
    this.hips.position.copy(hip).addScaledVector(dir.clone().normalize(),-2);this.hips.quaternion.copy(this.torso.quaternion);
    this.placeRod(this.neck,point('chest'),point('head'),4.2);
    this.headGroup.position.set(...point('head'));this.headGroup.rotation.set(0,0,Math.atan2(j.chest.x-j.head.x,j.chest.y-j.head.y));this.headGroup.rotateY(Math.PI/2);
    for(const side of ['L','R']){const f=j['foot'+side],k=j['knee'+side];this.jointMeshes['foot'+side].mesh.rotation.z=Math.atan2(f.x-k.x,f.y-k.y);}
    // Twist the entire articulated model around its own hip-to-chest axis.
    // Simulation coordinates stay in the original 2D movement plane.
    const turn=new THREE.Quaternion().setFromAxisAngle(dir.clone().normalize(),inMenu?Math.sin(time*.7)*.12:game.player.twist||0);
    this.person.matrix.makeTranslation(hip.x,hip.y,hip.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(turn)).multiply(new THREE.Matrix4().makeTranslation(-hip.x,-hip.y,-hip.z));
    this.person.matrixWorldNeedsUpdate=true;
    this.barIndicators.forEach((m,i)=>{m.material.color.set(game.visited.has(i)?'#bcf3ac':'#9aafa6');m.material.emissive.set(game.visited.has(i)?'#3b6b2d':'#000000');});
    const positions=this.trailGeometry.attributes.position;for(let i=0;i<trail.length;i++)positions.setXYZ(i,trail[i].x,K_FLOOR-trail[i].y,-12);positions.needsUpdate=true;this.trailGeometry.setDrawRange(0,trail.length);this.trailLine.visible=trail.length>1;
    this.drawCrash(game);
    if(inMenu){
      const rect=this.previewCanvas.getBoundingClientRect();
      if(this.previewWidth!==rect.width||this.previewHeight!==rect.height){this.previewWidth=rect.width;this.previewHeight=rect.height;this.previewRenderer.setSize(rect.width,rect.height,false);}
      const half=67,aspect=rect.width/Math.max(1,rect.height);
      Object.assign(this.previewCamera,{left:-half*aspect,right:half*aspect,top:half,bottom:-half});this.previewCamera.updateProjectionMatrix();
      this.previewCamera.position.set(320,85,240);this.previewCamera.lookAt(0,53,0);
      this.sun.position.set(120,280,180);this.sun.target.position.set(0,55,0);
      const background=this.scene.background;this.scene.background=null;this.world.visible=false;this.trailLine.visible=false;this.crashEffects.visible=false;
      this.previewRenderer.render(this.scene,this.previewCamera);
      this.world.visible=true;this.scene.background=background;this.labels.replaceChildren();this.targetGuide.hidden=true;return;
    }
    this.renderer.render(this.scene,this.camera);
    this.targetGuide.hidden=true;
    if(this.mobile&&document.body.dataset.screen==='play'&&!game.ended){
      const index=game.bars.findIndex((_,i)=>!game.visited.has(i));
      const target=index<0?{x:game.mat.x+game.mat.w/2,y:K_FLOOR-10}:game.bars[index];
      const v=new THREE.Vector3(target.x,K_FLOOR-target.y,0).project(this.camera);
      if(Math.abs(v.x)>.86||Math.abs(v.y)>.8){
        this.targetGuide.hidden=false;
        this.targetGuide.style.left=`${clamp(v.x*.5+.5,.10,.90)*100}%`;
        this.targetGuide.style.top=`${clamp(-v.y*.5+.5,.18,.68)*100}%`;
        const arrow=Math.abs(v.x)>.86?(v.x>0?'→':'←'):(v.y>0?'↑':'↓');
        this.targetGuide.textContent=`${index<0?(game.water?'WATER':'FINISH'):String(index+1).padStart(2,'0')} ${arrow}`;
      }
    }
    this.labels.replaceChildren();for(const p of particles){const v=new THREE.Vector3(p.x,K_FLOOR-p.y,0).project(this.camera),el=document.createElement('span');el.textContent=p.label;el.style.left=`${(v.x*.5+.5)*100}%`;el.style.top=`${(-v.y*.5+.5)*100}%`;el.style.opacity=Math.min(1,p.life);this.labels.appendChild(el);}
  }
}


