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
    this.up=new THREE.Vector3(0,1,0);this.mapIndex=-1;
    this.hemi=new THREE.HemisphereLight('#edfaff','#607659',2.5);this.scene.add(this.hemi);
    this.sun=new THREE.DirectionalLight('#fff1d5',3.4);this.sun.castShadow=true;this.sun.shadow.mapSize.set(this.mobile?1024:2048,this.mobile?1024:2048);
    Object.assign(this.sun.shadow.camera,{left:-650,right:650,top:650,bottom:-650,near:10,far:1800});
    this.sun.shadow.bias=-.0003;this.sun.shadow.normalBias=.6;this.sun.shadow.radius=3;this.scene.add(this.sun,this.sun.target);
    const rim=new THREE.DirectionalLight('#b9dcff',1.2);rim.position.set(-300,220,-250);this.scene.add(rim);
    this.world=new THREE.Group();this.scene.add(this.world);this.person=new THREE.Group();this.scene.add(this.person);
    this.makePerson();
    this.makeCrashEffects();
    this.trailGeometry=new THREE.BufferGeometry();this.trailGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(90),3));
    this.trailLine=new THREE.Line(this.trailGeometry,new THREE.LineBasicMaterial({color:'#fff9d7',transparent:true,opacity:.55}));this.trailLine.frustumCulled=false;this.scene.add(this.trailLine);
    this.labels=document.getElementById('effects');this.resize();
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
    const skin=this.material('#dca580',.7),darkSkin=this.material('#c78c6e'),shirt=this.material('#f06c3d',.55),pants=this.material('#263d50',.8),shoe=this.material('#f4f3df',.4),sole=this.material('#789493'),hair=this.material('#293039'),white=this.material('#fff8e6');
    this.limbs=[];this.jointMeshes={};this.sleeves=[];
    const limbGeometry=new THREE.CylinderGeometry(.85,1,1,18);
    for(const side of ['L','R']){
      const z=side==='L'?-7:7;
      for(const [a,b,rad,mat] of [['chest','elbow'+side,4.5,skin],['elbow'+side,'hand'+side,3.8,skin],['hip','knee'+side,6,pants],['knee'+side,'foot'+side,4.5,pants]]){
        const mesh=this.mesh(limbGeometry,mat,this.person);this.limbs.push({mesh,a,b,z,rad});
      }
      for(const [id,rad,mat] of [['elbow'+side,4.4,skin],['hand'+side,4.2,skin],['knee'+side,5.4,pants],['foot'+side,5,shoe]])this.jointMeshes[id]={mesh:this.ball(0,0,z,rad,mat,this.person),z,rad};
      const foot=this.jointMeshes['foot'+side].mesh;foot.scale.set(7,4,5.5);
      const pad=this.block(0,-2.8,0,12,1.4,9,sole,foot);pad.scale.set(1.6,.35,1.5);pad.position.set(0,-.65,0);
      const stripe=this.block(.15,.15,0,.8,.28,1.98,shirt,foot);
      this.ball(-.48,.58,0,.47,pants,foot,1,.6,1.8);
      const sleeve=this.mesh(this.cylinder,shirt,this.person);this.sleeves.push({mesh:sleeve,side,z});
    }
    const profile=[[0,-1],[.66,-1],[.78,-.85],[.76,-.3],[.88,.35],[1,.62],[.89,.85],[.42,1],[0,1]].map(([r,y])=>new THREE.Vector2(r,y));
    this.torso=this.mesh(new THREE.LatheGeometry(profile,24),shirt,this.person);this.torso.scale.set(12,20,9);
    this.hips=this.mesh(this.sphere,pants,this.person);this.hips.scale.set(11,8,9);
    this.neck=this.mesh(this.cylinder,skin,this.person);
    this.headGroup=new THREE.Group();this.person.add(this.headGroup);
    this.ball(0,0,0,10,skin,this.headGroup,1,1.12,.92);
    this.ball(0,6,-1,10,hair,this.headGroup,1.03,.65,.96);
    this.ball(-7,3,0,3,hair,this.headGroup,1,1.5,1);
    this.ball(0,-1,9,2.2,darkSkin,this.headGroup,1,1,1.2);
    for(const x of [-3.8,3.8]){
      this.ball(x,1.6,8.2,1.8,white,this.headGroup,1,.85,.45);
      this.ball(x+.4,1.5,8.95,.9,hair,this.headGroup,1,1,.5);
      this.rod([x-1.6,4.6,8.1],[x+1.4,4.8,8.1],.65,hair,this.headGroup);
      this.ball(Math.sign(x)*9.7,-.4,0,2.3,skin,this.headGroup,.65,1,1);
    }
    this.rod([-2,-4.6,8],[2,-4.8,8],.5,darkSkin,this.headGroup);
    this.ball(-3,10.6,1,5.4,hair,this.headGroup,1,.8,1.2);
    this.ball(3,10.2,0,5,hair,this.headGroup,1,.7,1.2);
    this.rod([-8.3,5.8,4],[8.3,5.8,4],1.3,shirt,this.headGroup);
    this.jersey=new THREE.Group();this.person.add(this.jersey);
    const graphic=document.createElement('canvas');graphic.width=128;graphic.height=192;
    const paint=graphic.getContext('2d');paint.fillStyle='#fff5d6';paint.font='900 120px sans-serif';paint.textAlign='center';paint.fillText('J',64,132);paint.fillRect(20,152,88,8);
    const texture=new THREE.CanvasTexture(graphic);texture.colorSpace=THREE.SRGBColorSpace;
    const badge=new THREE.Mesh(new THREE.PlaneGeometry(12,17),new THREE.MeshStandardMaterial({map:texture,transparent:true,roughness:.85,side:THREE.DoubleSide}));badge.rotation.y=Math.PI/2;this.jersey.add(badge);
    this.person.matrixAutoUpdate=false;
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
    this.world.clear();for(const m of materials)m.dispose();for(const t of textures)t.dispose();
  }
  buildMap(game){
    this.clearWorld();this.mapIndex=game.mapIndex;const coast=this.mapIndex===1,sunset=this.mapIndex===2;
    const sky=sunset?'#eea9a4':coast?'#69cdeb':'#8edcdb';this.scene.background=new THREE.Color(sky);this.scene.fog=new THREE.Fog(sky,1500,3500);
    this.sun.color.set(sunset?'#ffc592':'#fff2d8');this.sun.intensity=sunset?3.8:3.4;
    this.hemi.groundColor.set(sunset?'#8e786a':coast?'#779994':'#6c8869');
    const length=game.mat.x+game.mat.w+280;
    const ground=this.material(coast?'#e9ca8b':sunset?'#b3a176':'#88bb69');this.block(length/2,-28,-200,length+2400,30,2500,ground);
    const concrete=this.material('#d9d7c9'),edge=this.material('#8caaa1'),deck=this.material(sunset?'#d9b99b':coast?'#c4c8b6':'#bcc9ad');
    this.block(length/2,-13,0,length+240,20,170,concrete);this.block(length/2,-2,0,length+200,3,145,deck);
    this.block(length/2,-5,78,length+230,13,6,edge);
    const lane=this.material('#eaf0d4');for(const z of [-57,57])this.block(length/2,.1,z,length+150,.4,1.8,lane);
    const seam=this.material('#a6b59c');for(let x=-80;x<length+160;x+=70)this.block(x,-.1,0,.7,.5,140,seam);
    if(coast){
      const sea=this.material('#729eac',.25,.25);this.block(length/2,-10,-610,length+2200,2,720,sea);
      const foam=this.material('#bdd8d5');for(let i=0;i<16;i++)this.block(i*180-400,-8.7,-430-(i%4)*90,80+(i%3)*30,.3,2,foam);
      const dock=this.material('#ac967a');for(let i=0;i<20;i++)this.block(700+i*17,-5,-320,14,4,160,dock);
    }else{
      const hill=this.material(sunset?'#a3a497':'#9db49b');
      for(let i=0;i<12;i++)this.ball(i*240-650,-45,-680-(i%3)*100,150+(i%4)*20,hill,this.world,1.9,1,1.5);
    }
    const stone=this.material('#c3c8b8'),dark=this.material('#50665f');
    for(let i=0;i<Math.ceil(length/240)+5;i++){
      const x=i*250-350,z=-190-(i%3)*65;this.makeTree(x,z,135+(i%3)*25,coast?'coast':sunset?'sunset':'garden');
      if(i%2===0){this.block(x+75,8,-120,63,6,23,stone);for(const dx of [-22,22])this.block(x+75+dx,0,-120,4,17,20,dark);}
    }
    const backWall=this.material(sunset?'#c7b3a0':'#b8c6b2');this.block(length/2,16,-110,length+450,35,8,backWall);
    this.block(length/2,36,-110,length+470,5,15,concrete);
    const steel=this.material('#d6e4df',.27,.7),frame=this.material(coast?'#40747e':sunset?'#715f56':'#476f60',.4,.35),rubber=this.material('#324d45'),bolt=this.material('#f4e7c4',.3,.65);
    this.barIndicators=[];
    game.bars.forEach((b,i)=>{
      const y=K_FLOOR-b.y;
      for(const z of [-38,38]){
        this.rod([b.x,2,z],[b.x,y+6,z],4.5,frame);
        this.block(b.x,3,z,34,6,22,rubber);
        for(const dx of [-11,11])this.ball(b.x+dx,7,z,2,bolt);
        this.rod([b.x,10,z],[b.x,62,z],6.5,rubber);
        this.rod([b.x,y-8,z],[b.x,y+5,z],6,steel);
      }
      this.rod([b.x,y,-45],[b.x,y,45],3.6,steel);
      const gripMat=this.material('#d8b98a',.88);this.rod([b.x,y,-20],[b.x,y,20],3.9,gripMat);
      const indicator=this.ball(b.x,y+8,39,3.2,this.material('#a8b6ac'));this.barIndicators.push(indicator);
      const label=this.label(String(i+1).padStart(2,'0'),'#426158',12);label.position.set(b.x,y+25,0);this.world.add(label);
    });
    const mat=game.mat,foam=this.material('#69a28f',.9),top=this.material('#95c5a4',.95);
    this.block(mat.x+mat.w/2,-9,0,mat.w,17,117,foam);this.block(mat.x+mat.w/2,0,0,mat.w-6,2,111,top);
    for(const z of [-48,48])this.block(mat.x+mat.w/2,1.2,z,mat.w-22,.35,1.6,lane);
    const finish=this.label('ALASTULO','#355e50',15);finish.position.set(mat.x+mat.w/2,25,-48);this.world.add(finish);
  }
  resize(){const r=this.canvas.getBoundingClientRect();this.width=r.width;this.height=r.height;this.renderer.setSize(r.width,r.height,false);const half=240*r.width/r.height;Object.assign(this.camera,{left:-half,right:half,top:240,bottom:-240});this.camera.updateProjectionMatrix();}
  draw(game,offset,trail,particles,focusY=160,viewHeight=480){
    if(this.mapIndex!==game.mapIndex)this.buildMap(game);
    const halfHeight=viewHeight/2,halfWidth=halfHeight*this.width/this.height;
    Object.assign(this.camera,{left:-halfWidth,right:halfWidth,top:halfHeight,bottom:-halfHeight});this.camera.updateProjectionMatrix();
    const cx=offset+halfWidth;
    this.camera.position.set(cx+210,focusY+265,1100);this.camera.lookAt(cx,focusY,0);
    this.sun.position.set(cx-270,720,360);this.sun.target.position.set(cx,0,0);
    const j=game.ragdoll.joints,point=(id,z=0)=>[j[id].x,K_FLOOR-j[id].y,z];
    for(const limb of this.limbs)this.placeRod(limb.mesh,point(limb.a,limb.z),point(limb.b,limb.z),limb.rad);
    for(const sleeve of this.sleeves){const start=point('chest',sleeve.z),end=point('elbow'+sleeve.side,sleeve.z);this.placeRod(sleeve.mesh,start,start.map((v,i)=>v+(end[i]-v)*.38),5.8);}
    for(const [id,{mesh,z}] of Object.entries(this.jointMeshes))mesh.position.set(...point(id,z));
    const hip=new THREE.Vector3(...point('hip')),chest=new THREE.Vector3(...point('chest')),dir=chest.clone().sub(hip);
    this.torso.position.copy(hip).add(chest).multiplyScalar(.5);this.torso.quaternion.setFromUnitVectors(this.up,dir.clone().normalize());this.torso.scale.set(11.5,dir.length()*.69,8.5);
    this.hips.position.copy(hip);this.hips.quaternion.copy(this.torso.quaternion);
    this.jersey.position.copy(this.torso.position).add(new THREE.Vector3(11,0,0).applyQuaternion(this.torso.quaternion));this.jersey.quaternion.copy(this.torso.quaternion);
    this.placeRod(this.neck,point('chest'),point('head'),4.2);
    this.headGroup.position.set(...point('head'));this.headGroup.rotation.set(0,0,Math.atan2(j.chest.x-j.head.x,j.chest.y-j.head.y));this.headGroup.rotateY(Math.PI/2);
    for(const side of ['L','R']){const f=j['foot'+side],k=j['knee'+side];this.jointMeshes['foot'+side].mesh.rotation.z=Math.atan2(f.x-k.x,f.y-k.y);}
    // Twist the entire articulated model around its own hip-to-chest axis.
    // Simulation coordinates stay in the original 2D movement plane.
    const turn=new THREE.Quaternion().setFromAxisAngle(dir.clone().normalize(),game.player.twist||0);
    this.person.matrix.makeTranslation(hip.x,hip.y,hip.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(turn)).multiply(new THREE.Matrix4().makeTranslation(-hip.x,-hip.y,-hip.z));
    this.person.matrixWorldNeedsUpdate=true;
    this.barIndicators.forEach((m,i)=>{m.material.color.set(game.visited.has(i)?'#bcf3ac':'#9aafa6');m.material.emissive.set(game.visited.has(i)?'#3b6b2d':'#000000');});
    const positions=this.trailGeometry.attributes.position;for(let i=0;i<trail.length;i++)positions.setXYZ(i,trail[i].x,K_FLOOR-trail[i].y,-12);positions.needsUpdate=true;this.trailGeometry.setDrawRange(0,trail.length);this.trailLine.visible=trail.length>1;
    this.drawCrash(game);
    this.renderer.render(this.scene,this.camera);
    this.labels.replaceChildren();for(const p of particles){const v=new THREE.Vector3(p.x,K_FLOOR-p.y,0).project(this.camera),el=document.createElement('span');el.textContent=p.label;el.style.left=`${(v.x*.5+.5)*100}%`;el.style.top=`${(-v.y*.5+.5)*100}%`;el.style.opacity=Math.min(1,p.life);this.labels.appendChild(el);}
  }
}


