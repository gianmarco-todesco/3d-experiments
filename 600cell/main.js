let canvas, engine, scene, camera;
let tet;



window.onload = function() {
    canvas = document.getElementById("renderCanvas"); 
    engine = new BABYLON.Engine(canvas, true); 
    scene = new BABYLON.Scene(engine);
    camera = new BABYLON.ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 2, 10, new BABYLON.Vector3(0,0,0), scene);
    camera.attachControl(canvas, true);

    var light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), scene);
    var light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 1, -1), scene);            
    light2.parent = camera;

    populateScene();

    scene.onPointerObservable.add((pointerInfo) => {
      switch (pointerInfo.type) {
          case BABYLON.PointerEventTypes.POINTERDOWN:
              onPointerDown(pointerInfo);
              break;
      }
    });

    engine.runRenderLoop(function () {scene.render();});
    window.addEventListener("resize", function () { engine.resize(); });

    processData();
};

function onPointerDown(e) {
  if(e.pickInfo.pickedMesh) {
    let mesh = e.pickInfo.pickedMesh;
    let faceIndex = e.pickInfo.subMeshFaceId;
    console.log(mesh, faceIndex);
    if(mesh.name == "tet" || mesh.name == "tet-inst") {
      foo(e.pickInfo.pickedMesh, e.pickInfo.subMeshFaceId);
    }
  }
}

function createGrid() {   
  var Color4 = BABYLON.Color4;
  var Vector3 = BABYLON.Vector3;
   
  var m = 50;
  var r = 5;
  var pts = [];
  var colors = [];
  var c1 = new Color4(0.7,0.7,0.7,0.5);
  var c2 = new Color4(0.5,0.5,0.5,0.25);
  var cRed   = new Color4(0.8,0.1,0.1);
  var cGreen = new Color4(0.1,0.8,0.1);
  var cBlue  = new Color4(0.1,0.1,0.8);
  
  var color = c1;
  function line(x0,y0,z0, x1,y1,z1) { 
      pts.push([new Vector3(x0,y0,z0), new Vector3(x1,y1,z1)]); 
      colors.push([color,color]); 
  }
  
  for(var i=0;i<=m;i++) {
      if(i*2==m) continue;
      color = (i%5)==0 ? c1 : c2;
      var x = -r+2*r*i/m;        
      line(x,0,-r, x,0,r);
      line(-r,0,x, r,0,x);
  }
  
  var r1 = r + 1;
  var a1 = 0.2;
  var a2 = 0.5;
  
  // x axis
  color = cRed;
  line(-r1,0,0, r1,0,0); 
  line(r1,0,0, r1-a2,0,a1);
  line(r1,0,0, r1-a2,0,-a1);
      
  // z axis
  color = cBlue;
  line(0,0,-r1, 0,0,r1); 
  line(0,0,r1, a1,0,r1-a2);
  line(0,0,r1,-a1,0,r1-a2);
  
  // y axis
  color = cGreen;
  line(0,-r1,0, 0,r1,0); 
  line(0,r1,0, a1,r1-a2,0);
  line(0,r1,0,-a1,r1-a2,0);
  line(0,r1,0, 0,r1-a2,a1);
  line(0,r1,0, 0,r1-a2,-a1);
  
  ppts = pts;
  ccolors = colors;
  lines = BABYLON.MeshBuilder.CreateLineSystem(
      "lines", {
              lines: pts,
              colors: colors,
              
      }, 
      scene);
  return lines;    
}

function createDot(p,color) {
  let dot = BABYLON.MeshBuilder.CreateSphere('a',{diameter:0.1},scene);
  dot.position.copyFrom(p);
  let mat = dot.material = new BABYLON.StandardMaterial('amat',scene);
  mat.diffuseColor.copyFrom(color);
  return dot;
}

function createTetMesh() {
    let tet = new BABYLON.Mesh("tet", scene);

    let pts = [];
    for(let i=0; i<3; i++) {
      let phi = -Math.PI*2*i/3;
      pts.push(new BABYLON.Vector3(Math.cos(phi), 0, Math.sin(phi)));
    }
    let edgeLength = BABYLON.Vector3.Distance(pts[0], pts[1]);
    let height = edgeLength * Math.sqrt(2/3);
    pts.push(new BABYLON.Vector3(0,height,0));

    let positions = [];
    let indices = [];
    let normals = [];
    let uvs = [];

    let d = 0.1;
    let uvs0 = [d,d, 1-d,d, 0.5,d + Math.sqrt(3)/2 * (1-2*d)];
    

    [[0,1,2],[0,2,3],[0,3,1],[3,2,1]].forEach(([a,b,c]) => {
        let center = pts[a].add(pts[b]).add(pts[c]).scale(1/3);
        let nrm = center.clone().normalize();
        [a,b,c].forEach(j => {
            let p = pts[j];
            positions.push(p.x,p.y,p.z);
            normals.push(nrm.x,nrm.y,nrm.z);
        });
        uvs.push(...uvs0);
    });
    indices.push(0,1,2, 3,4,5, 6,7,8, 9,10,11);
    
    let vd = new BABYLON.VertexData();

    vd.positions = positions;
    vd.indices = indices;  
    vd.normals = normals;  
    vd.uvs = uvs;
    console.log(uvs);

    vd.applyToMesh(tet);

    let mat = tet.material = new BABYLON.StandardMaterial('tetmat', scene);
    mat.diffuseColor.set(0.8,0.8,0.8);
    var dtex = new BABYLON.DynamicTexture('tettex', 512, scene);   
    mat.diffuseTexture = dtex;
    let ctx = dtex.getContext();
    let tpts = uvs0.map(x => x * 512);

    ctx.beginPath();
    ctx.moveTo(tpts[0], 512 - tpts[1]);
    ctx.lineTo(tpts[2], 512 - tpts[3]);
    ctx.lineTo(tpts[4], 512 - tpts[5]);
    ctx.lineTo(tpts[0], 512 - tpts[1]);
    ctx.fillStyle = "orange";
    ctx.fill();
    ctx.strokeStyle = "black";
    ctx.lineWidth=15;
    ctx.stroke();

    dtex.update();

    tet.pts = pts;

    let dot;
    dot = createDot(pts[0], new BABYLON.Color3(1,0,0));
    dot.parent = tet;
    dot = createDot(pts[1], new BABYLON.Color3(0,1,0));
    dot.parent = tet;
    dot = createDot(pts[2], new BABYLON.Color3(0,0,1));
    dot.parent = tet;
    dot = createDot(pts[3], new BABYLON.Color3(0,1,1));
    dot.parent = tet;
    
    return tet;
}

function foo(mesh, faceIndex){
  let matrix = mesh.computeWorldMatrix(true);
  let pts = [[0,1,2],[0,2,3],[0,3,1],[3,2,1]][faceIndex]
    .map(j=> BABYLON.Vector3.TransformCoordinates(tet.pts[j],matrix));
  
  let c = pts[0].add(pts[1]).add(pts[2]).scale(1/3);
  let e0 = pts[0].subtract(c).normalize();
  let e1 = pts[2].subtract(c);
  e1 = e1.subtract(e0.scale(BABYLON.Vector3.Dot(e1,e0))).normalize();
  e2 = BABYLON.Vector3.Cross(e0,e1).normalize();
  
  let destMatrix = BABYLON.Matrix.FromValues(
    e0.x,e0.y,e0.z,0,
    e2.x,e2.y,e2.z,0,
    -e1.x,-e1.y,-e1.z,0,
    c.x,c.y,c.z,1
  );


  if(true)
  {
    let inst = tet.createInstance('tet-inst');
    inst.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(destMatrix);
    inst.position.copyFrom(destMatrix.getTranslation());
    return;
  }
  



  let red = new BABYLON.Color4(1,0,0,1);
  let green = new BABYLON.Color4(0,1,0,1);
  let blue = new BABYLON.Color4(0,0,1,1);
  
  let lines = BABYLON.MeshBuilder.CreateLineSystem(
      "lines", {
              lines: [
                [new BABYLON.Vector3(0,0,0), new BABYLON.Vector3(2,0,0)],
                [new BABYLON.Vector3(0,0,0), new BABYLON.Vector3(0,2,0)],
                [new BABYLON.Vector3(0,0,0), new BABYLON.Vector3(0,0,2)],
                
              ],
              colors: [
                [red,red],
                [green,green],
                [blue,blue]
                
              ]            
      }, 
      scene);
    // q.parent = tet;
    lines.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(destMatrix);
    lines.position.copyFrom(destMatrix.getTranslation());

 
  
  
  // tet.position.copyFrom(c.scale(-1));
}


function populateScene() {
  tet = createTetMesh();
  createGrid();
  //foo();


}

let cells;

function processData()
{
  cells = new Array(600);
  let tb = {};  
  for(let i=0; i<600; i++) {
    for(let j=0; j<4; j++) {
      let f = cells_faces[i*4+j];
      if(tb[f]) tb[f].push(i);
      else tb[f] = [i];
    }
  }
  for(let i=0; i<600; i++) {
    cells[i] = [];
    for(let j=0; j<4; j++) {
      let cc = tb[cells_faces[i*4+j]];
      let other;
      if(cc[0] == i) other = cc[1];
      else if(cc[1] == i) other = cc[0];
      else console.error(i);
      cells[i].push(other);
    }
  }

}