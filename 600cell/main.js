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

    // var light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), scene);
    var light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 0, 0), scene);            
    light2.parent = camera;

    this.populateScene();
    const me = this;
    scene.onPointerObservable.add((pointerInfo) => {
      switch (pointerInfo.type) {
          case BABYLON.PointerEventTypes.POINTERDOWN:
              me.onPointerDown(pointerInfo);
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

  onPointerDown() {

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
        index: ii[i],
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
    let uvs0 = [d,d, 1-d,d, 0.5,d + Math.sqrt(3)/2 * (1-2*d)];
    let vCount = 0;
    this.cells.forEach(cell => {
      console.log("new cell")
      let vertices = cell.vertices;
      this.face_vertices.forEach(([a,b,c,d]) => {
        let vv=[a,b,c];
        let pts = vv.map(i=>vertices[i].pos);
        let nrm = BABYLON.Vector3.Cross(pts[2].subtract(pts[0]), pts[1].subtract(pts[0])).normalize();
        pts.forEach(p => {
          positions.push(p.x,p.y,p.z);
          normals.push(nrm.x,nrm.y,nrm.z);
        });
        uvs.push(...uvs0);
        let i = vCount;
        indices.push(i,i+1,i+2);
        vCount += 3;
      })
    })

    if(this.mesh) this.mesh.dispose();
    let vd = new BABYLON.VertexData();
    vd.positions = positions;
    vd.indices = indices;  
    vd.normals = normals;  
    vd.uvs = uvs;
    let tet = new BABYLON.Mesh("tet", scene);
    vd.applyToMesh(tet);
    this.mesh = tet;
    if(!this.material) this.material = this.createMaterial(scene, uvs0);
    tet.material = this.material;
    return tet;
  }

  createTetMesh(scene) {
    const pts = this.tet_pts;
    let positions = [];
    let normals = [];
    let uvs = [];
    let indices = [];
    let d = 0.1;
    let uvs0 = [d,d, 1-d,d, 0.5,d + Math.sqrt(3)/2 * (1-2*d)];


    this.face_vertices.forEach(([a,b,c,d]) => {
      // let center = pts[a].add(pts[b]).add(pts[c]).scale(1/3);
      let nrm = BABYLON.Vector3.Cross(pts[c].subtract(pts[a]), pts[b].subtract(pts[a])).normalize();
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

    let tet = new BABYLON.Mesh("tet", scene);
    vd.applyToMesh(tet);

    tet.material = this.createMaterial(scene, uv0);

    return tet;
  }


  createMaterial(scene, uvs0) {
    let mat = new BABYLON.StandardMaterial('tetmat', scene);
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
    return mat;

  }

  highlightCell(scene, cellIndex) {
    let j = this.cells.findIndex(c=>c.index == cellIndex);
    if(j<0) { console.warn("cell not found: ", cellIndex); return; }
    let pts = this.cells[j].vertices.map(v=>v.pos);
    let cellCenter = pts[0].add(pts[1]).add(pts[2]).add(pts[3]).scale(0.25);
    pts = pts.map(p => BABYLON.Vector3.Lerp(cellCenter, p, 1.1));
    let lines = [[pts[0],pts[1],pts[2],pts[3]],[pts[0],pts[2]],[pts[3],pts[1]]];
    if(this.cage) 
      this.cage = BABYLON.MeshBuilder.CreateLineSystem("ls", {lines: lines, instance: this.cage}, scene);
    else
      this.cage = BABYLON.MeshBuilder.CreateLineSystem("ls", {lines: lines}, scene);
  }
};


// ============================================================================

let viewer;
let model;
let tet;
let currentIndex;

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
    model.createMesh(viewer.scene);
    currentIndex = cell.index;
    updateCellNumber();
    highlightCurrentCell();
  }
}

function deleteCell(cellIndex) {
  model.deleteCell(cellIndex);
  model.createMesh(viewer.scene);
  updateCellNumber();
  highlightCurrentCell();
}

function addCellToCurrent(faceIndex) {
  addCell(currentIndex, faceIndex);
}

function deleteCurrentCell() {
  if(typeof(currentIndex) == "number") {
    deleteCell(currentIndex);
    currentIndex = model.cells[model.cells.length-1].index;
  }
}


window.onload = function() {
  viewer = new Viewer('renderCanvas');
  model = new Model();
  // model.createTetMesh(viewer.scene);
  model.addFirstCell();
  currentIndex = 0;
  tet = model.createMesh(viewer.scene);  
}


