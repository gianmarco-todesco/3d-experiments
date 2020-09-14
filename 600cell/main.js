"use strict";


class Viewer {
  constructor(canvasId) {
    let canvas = this.canvas = document.getElementById(canvasId);
    if(!canvas) throw "canvas not found"; 
    let engine = this.engine = new BABYLON.Engine(canvas, true); 
    let scene = this.scene = new BABYLON.Scene(engine);
    let camera = this.camera = new BABYLON.ArcRotateCamera("Camera", 
      1.2, 1.2, 
      10, 
      new BABYLON.Vector3(0,0,0), 
      scene);
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 50;

    // var light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), scene);
    var light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 0, 0), scene);            
    light2.parent = camera;

    this.populateScene();
    const me = this;
    scene.onPointerObservable.add((pointerInfo) => {
      let pickInfo = pointerInfo.pickInfo;
      switch (pointerInfo.type) {
          case BABYLON.PointerEventTypes.POINTERDOWN:
            // console.log(pointerInfo);
            if(me.onPointerDown) {
                if(pickInfo.pickedMesh)
                    me.onPointerDown(pickInfo.pickedMesh, pickInfo.subMeshFaceId);
              }
              break;
      }
    });

    engine.runRenderLoop(function () {scene.render();});
    window.addEventListener("resize", function () { 
      engine.resize(); 
    });
  }

  populateScene() {

  }


};

// ============================================================================


class Model {

  constructor() {
    this.face_vertices = [[0,1,2,3],[0,2,3,1],[0,3,1,2],[3,2,1,0]];
    this.computeTetGeometry();
    this.cells = [];
    this.cellTable = {};
  }

  addFirstCell() {
    const ii = vertices_by_cells[0];
    let cell = {
      index:0, 
      vertices:[0,1,2,3].map(i => { return {
        index: ii[i],
        pos: this.tet_pts[i]
      }}),
    };
    this.cells = [cell];
    this.cellTable = {0 : cell};
  }

  addCell(cellIndex, faceIndex) {
    let cc = this.cells.filter(c=>c.index==cellIndex);
    if(cc.length != 1) {
      console.error("cell not found", cellIndex);
      return null;
    }
    let cell = cc[0];
    let vertices = this.face_vertices[faceIndex].map(i=>cell.vertices[i]);
    let res = this.findOtherCell(...vertices.map(v=>v.index));
    if(res == null) {
      console.log("other cell not found")
      return null;
    }
    const [otherCellIndex, opposite] = res;
    if(this.cellTable[otherCellIndex] != null) {
      console.warn("other cell is already visible:", otherCellIndex);
      return null;
    }
    let [p0,p1,p2,p3] = vertices.map(v=>v.pos);
    let fc = p0.add(p1).add(p2).scale(1/3);
    let p4 = fc.add(fc.subtract(p3));
    let ii = vertices_by_cells[otherCellIndex];
    cell = {
      index:otherCellIndex, 
      vertices:[0,1,2,3].map(i => { return {
        index: [ii[0],ii[2],ii[1],ii[3]][i],
        pos: [p0,p2,p1,p4][i]}})
    };
    this.cells.push(cell);
    this.cellTable[cell.index] = cell;
    return cell;
  }

  deleteCell(cellIndex) {
    let j = this.cells.findIndex(c=>c.index==cellIndex);
    if(j<0)
    {
      console.error("cell not found:", cellIndex);
      return false;
    }
    if(this.cells.length == 1)
    {
      console.error("can't delete last cell: ", cellIndex);
      return false;
    }
    this.cells.splice(j,1);
    delete this.cellTable[cellIndex];
    return true;
  } 

  // cell_vertices = [a,b,c,d] key = [e,f,g]; return null or d'    
  matchVertices(cell_vertices, key) { 
    let opposite = null;
    let i = 0, j = 0;
    while(i<4 && j<3) {
      if(cell_vertices[i]==key[j]) {i++; j++; }
      else if(cell_vertices[i]<key[j]) {
        if(opposite != null) return null;
        opposite = cell_vertices[i]; 
        i++;
      } else {
        return null;
      }
    }
    if(i==3 && opposite == null) opposite = cell_vertices[i];
    return opposite;
  }
  
  // return [cellindex, d']
  findOtherCell(a,b,c,d) {
    let key = [a,b,c].sort((a,b)=>a-b);
    let res = []
    vertices_by_cells.forEach((vv,i) => {
      let opposite = this.matchVertices(vv, key);
      if(opposite != null) {
        res.push({index:i, vv:vv, opposite:opposite});
      }
    })
    if(res.length != 2) {
      console.log("internal error: expected two cells", res);
      return null;
    }
    let d1 = res[0].opposite;
    let d2 = res[1].opposite;
    if(d1 == d2 || d1!=d && d2!=d)
    {
      console.log("internal error: opposite not found ", res, d);
      return null;
    } 
    if(d1==d) return [res[1].index, d2];
    else return [res[0].index, d1];
  }

  computeTetGeometry() {
    let pts = [];
    for(let i=0; i<3; i++) {
      let phi = -Math.PI*2*i/3;
      pts.push(new BABYLON.Vector3(Math.cos(phi), 0, Math.sin(phi)));
    }
    let edgeLength = BABYLON.Vector3.Distance(pts[0], pts[1]);
    let height = edgeLength * Math.sqrt(2/3);
    pts.push(new BABYLON.Vector3(0,height,0));
    this.tet_pts = pts;
  }

  createMesh(scene) {
    let positions = [];
    let normals = [];
    let uvs = [];
    let indices = [];
    let d = 0.1;
    let uvs0 = [[d,d], [1-d,d], [0.5,d + Math.sqrt(3)/2 * (1-2*d)]]
      .map(([x,y]) => [x * 0.25, y * 0.5]);
    let vCount = 0;
    let faceTable = [];
    this.cells.forEach((cell, cellIndex) => {
      // console.log("new cell")
      let vertices = cell.vertices;
      this.face_vertices.forEach(([a,b,c,d],faceIndex) => {
        let vv=[a,b,c];
        let pts = vv.map(i=>vertices[i].pos);
        let nrm = BABYLON.Vector3.Cross(pts[2].subtract(pts[0]), pts[1].subtract(pts[0])).normalize();
        pts.forEach(p => {
          positions.push(p.x,p.y,p.z);
          normals.push(nrm.x,nrm.y,nrm.z);
        });
        // console.log(uvs0.flatMap(([x,y])=>[x+0.25 * faceIndex, y]));
        uvs.push(...(uvs0.flatMap(([x,y])=>[x+0.25 * faceIndex, y])));
        let i = vCount;
        indices.push(i,i+1,i+2);
        faceTable.push(cellIndex);
        vCount += 3;
      })
    })
    if(this.mesh) this.mesh.dispose();
    let vd = new BABYLON.VertexData();
    vd.positions = positions;
    vd.indices = indices;  
    vd.normals = normals;  
    vd.uvs = uvs;
    let tet = new BABYLON.Mesh("tet-net", scene);
    tet.faceTable = faceTable;
    vd.applyToMesh(tet);
    this.mesh = tet;
    if(!this.material) this.material = this.createMaterial(scene, uvs0);
    tet.material = this.material;
    return tet;
  }


  createMaterial(scene, uvs0) {
    let mat = new BABYLON.StandardMaterial('tetmat', scene);
    mat.diffuseColor.set(0.8,0.8,0.8);
    mat.specularColor.set(0.1,0.1,0.1);
    var dtex = new BABYLON.DynamicTexture('tettex', {width:1024, height:512}, scene);   
    mat.diffuseTexture = dtex;
    let ctx = dtex.getContext();

    //let myCanvas = document.getElementById("mycanvas");
    //ctx = myCanvas.getContext('2d');
    for(let i=0; i<4; i++) {
      let tpts = uvs0.map(([x,y]) => [x * 1024 + i*256, 512 - y * 512]);
      console.log(tpts);
      ctx.beginPath();
      ctx.moveTo(tpts[2][0], tpts[2][1]);
      for(let j=0;j<=2;j++)
        ctx.lineTo(tpts[j][0], tpts[j][1]);
      ctx.closePath();
      ctx.fillStyle = "orange";
      ctx.fill();
      ctx.strokeStyle = "black";
      ctx.lineWidth=15;
      ctx.stroke();
  
      ctx.font = 'bold 120px monospace';
      // const font = "bold 44px monospace";
      // dtex.drawText("ABCD"[0],100,100, font, "black", null, false, false);
      ctx.fillStyle = "black";
      ctx.fillText("ABCD"[i], tpts[0][0]+65, tpts[0][1] - 20);
  
    }

    dtex.update();
    return mat;

  }

  highlightCell(scene, cellIndex) {
    let j = this.cells.findIndex(c=>c.index == cellIndex);
    if(j<0) { console.warn("cell not found: ", cellIndex); return; }
    let pts = this.cells[j].vertices.map(v=>v.pos);
    let ii = this.cells[j].vertices.map(v=>v.index);
    let cellCenter = pts[0].add(pts[1]).add(pts[2]).add(pts[3]).scale(0.25);
    pts = pts.map(p => BABYLON.Vector3.Lerp(cellCenter, p, 1.1));
    let lines = [[pts[0],pts[1],pts[2],pts[3],pts[0]],[pts[0],pts[2]],[pts[3],pts[1]]];
    if(this.cage) 
      this.cage = BABYLON.MeshBuilder.CreateLineSystem("ls", {
          lines: lines, 
          instance: this.cage});
    else
      this.cage = BABYLON.MeshBuilder.CreateLineSystem("ls", {
          lines: lines, 
          updatable: true}, 
          scene);

    if(this.labels === undefined) {
      let labels = this.labels = [];
      for(let i=0;i<4;i++)
        labels.push(this.createLabel(scene));
    }
    for(let i=0; i<4; i++) {
      let label = this.labels[i];
      label.position.copyFrom(BABYLON.Vector3.Lerp(cellCenter, pts[i], 1.1));
      let tex = label.texture;
      tex.getContext().clearRect(0,0,64,64);
      tex.drawText("#"+"01234"[i], 10, 30, "bold 32px monospace", 'white', null, true, false);
      tex.drawText(ii[i], 10, 60, "bold 32px monospace", 'white', null, true, false);
      tex.update();  
    }
    

    


  }


  createLabel(scene) {
    let pvt = new BABYLON.Mesh("",scene);
    var m = BABYLON.Mesh.CreatePlane('', .4, scene);
    m.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL
    m.parent = pvt;    
    var tex = new BABYLON.DynamicTexture('', {width:64, height:64}, scene);   
    tex.hasAlpha = true;
    m.material = new BABYLON.StandardMaterial('', scene);
    m.material.diffuseTexture = tex;
    // m.material.useAlphaFromDiffuseTexture = true;
    m.material.diffuseColor.set(1,1,1);
    m.material.specularColor.set(0,0,0);
    pvt.texture = tex;
    return pvt;
  }
};


// ============================================================================

let viewer;
let model;
let tet;
let currentIndex;

function onModelChanged() {
  model.createMesh(viewer.scene);
  let boundingSphere = model.mesh.getBoundingInfo().boundingSphere;
  viewer.camera.setTarget(boundingSphere.center);  
  updateCellNumber();
}

function updateCellNumber() {
  let span = document.getElementById('cell-number');
  span.textContent = model.cells.length;
}

function highlightCurrentCell() {
  model.highlightCell(viewer.scene, currentIndex);
}

function addCell(cellIndex, faceIndex) {
  let cell = model.addCell(cellIndex, faceIndex);
  if(cell) {
    onModelChanged();
    setCurrentIndex(cell.index);
  }
}

function deleteCell(cellIndex) {
  model.deleteCell(cellIndex);
  onModelChanged();
  setCurrentIndex(model.cells[model.cells.length-1].index);
}

function addCellToCurrent(faceIndex) {
  addCell(currentIndex, faceIndex);
}

function deleteCurrentCell() {
  if(typeof(currentIndex) == "number") {
    deleteCell(currentIndex);
  }
}

function setCurrentIndex(index) {
  if(currentIndex == index) return;
  currentIndex = index;
  highlightCurrentCell();
}

window.onload = function() {
  viewer = new Viewer('renderCanvas');
  model = new Model();
  // model.createTetMesh(viewer.scene);
  model.addFirstCell();
  currentIndex = 0;
  highlightCurrentCell();
  tet = model.createMesh(viewer.scene);  

  viewer.onPointerDown = (mesh, faceIndex) => {
    if(mesh.name == "tet-net" && mesh.faceTable !== undefined) {
      console.log("face:", faceIndex);
      let cellIndex = mesh.faceTable[faceIndex];
      console.log("cell-index:", cellIndex);
      if(0<=cellIndex && cellIndex<model.cells.length) {
        setCurrentIndex(model.cells[cellIndex].index);
      }
    }
  }
}


