"use strict";

function assert(condition, message) {
    if (!condition) {
        message = message || "Assertion failed";
        if (typeof Error !== "undefined") {
            throw new Error(message);
        }
        throw message; // Fallback
    }
}

class Viewer {
    constructor(canvasId) {
        let canvas = this.canvas = document.getElementById(canvasId);
        if(!canvas) throw "canvas not found"; 
        let engine = this.engine = new BABYLON.Engine(canvas, true); 
        let scene = this.scene = new BABYLON.Scene(engine);
        let camera = this.camera = new BABYLON.ArcRotateCamera("Camera", 
            -1.44, 1.2, 
            10, 
            new BABYLON.Vector3(0,0,0), 
            scene);
        camera.attachControl(canvas, true);
        camera.wheelPrecision = 50;

        // var light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), scene);
        var light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 0, 0), scene);            
        light2.parent = camera;

        window.addEventListener("resize", function () { engine.resize(); });
    }

    runRenderLoop() {
        let scene = this.scene;
        this.engine.runRenderLoop(function () {scene.render();});
    }

    createGrid() {   
        let scene = this.scene;
        
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
        
        let lines = BABYLON.MeshBuilder.CreateLineSystem(
            "lines", {
                    lines: pts,
                    colors: colors,
                    
            }, 
            scene);
        return lines;    
      }
  
};


let viewer;

window.onload = function() {
    viewer = new Viewer('renderCanvas');
    viewer.createGrid();
    makeModel(viewer.scene, 0.5);
    viewer.runRenderLoop();
}

let model = null;

function showVal(v) {
    let t = v/100;
    makeModel(viewer.scene, t);
}


class Vertex {
    constructor(p) {
        this.index = null;
        this.p = p;
        this.faces = [];
        this.edges = [];
        this.vertices = [];
    }
}

class Edge {
    constructor() {
        this.index = null;
        this.vertices = [];
        this.faces = [];        
    }
    computeMidPoint() {
        return BABYLON.Vector3.Lerp(this.vertices[0].p, this.vertices[1].p, 0.5); 
    }
}

class Face {
    constructor() {
        this.index = null;
        this.points = [];
        this.edges = [];
        this.faces = [];
    }

    computeCenter() {
        let p = new BABYLON.Vector3(0,0,0);
        this.vertices.forEach(v=>p.addInPlace(v.p));
        p.scaleInPlace(1/this.vertices.length);
        return p;
    }
}

class Polyhedron2 {
    constructor() {
        this.vertices = [];
        this.edges = [];
        this.faces = [];        
    }
    
    build(pts, facesVertexIndices) {
        let vertices = this.vertices = pts.map(p=>new Vertex(p));
        this.vertices.forEach((v,i) => v.index=i);
        let vCount = vertices.length;
        let edgeTable = {};
        let faces = this.faces = [];
        let edges = this.edges = [];
        facesVertexIndices.forEach(indices => {
            let face = new Face();
            face.index = faces.length;
            faces.push(face);
            face.vertices = indices.map(i=>vertices[i]);
            let a,b;
            let m = indices.length;
            for(let i=0;i<m;i++) {
                a = indices[i];
                b = indices[(i+1)%m];
                let aa=a, bb=b;
                if(aa<bb) {aa=b;bb=a;}
                let edgeId = bb*vCount + aa;
                let edge = edgeTable[edgeId];
                if(edge === undefined) {
                    edge = new Edge();
                    edge.index = edges.length;
                    edges.push(edge);
                    edgeTable[edgeId] = edge;
                    edge.vertices = [vertices[aa], vertices[bb]];
                }
                edge.faces.push(face);
                face.edges.push(edge);
            }
        });

        this._checkFaces();
        this._checkEdges();

        // for each vertex : table e0.index => [[e1,f1],[e2,f2]]
        let vTable = this.vertices.map(v => ({}));

        this.faces.forEach(face => {
            let m = face.vertices.length;
            for(let i=0; i<m; i++) {
                let i1 = (i+1)%m;
                let e0 = face.edges[i];
                let v = face.vertices[i1];
                let e1 = face.edges[i1];
                let tb = vTable[v.index];
                let q = tb[e0.index];
                if(q === undefined) tb[e0.index] = [[e1,face]];
                else q.push([e1,face]);
                q = tb[e1.index];
                if(q === undefined) tb[e1.index] = [[e0,face]];
                else q.push([e0,face]);
                tb.firstEdge = e0;
            }
        });
        this.vertices.forEach(vertex => {
            let tb = vTable[vertex.index];
            let e0 = tb.firstEdge;
            let touched = {};
            touched[e0.index] = true;
            vertex.edges.push(e0);
            let edge = e0;
            let q = tb[edge.index][0];
            for(;;)
            {
                vertex.faces.push(q[1]);
                let oldEdge = edge;
                edge = q[0];
                if(edge == e0 || touched[edge.index]) break;
                touched[edge.index] = true;
                vertex.edges.push(edge);
                let qq = tb[edge.index];
                if(qq[0][0].index == oldEdge.index) q = qq[1];
                else if(qq[1][0].index == oldEdge.index) q = qq[0];
                else throw "Internal Error";
            }
        })
        this._checkVertices();

    }

    _checkFaces() {
        this.faces.forEach(face => {
            let m = face.vertices.length;
            assert(m == face.edges.length);
            assert(m >= 3);
            for(let i=0;i<m;i++) {
                let i1 = (i+1)%m;
                let va = face.vertices[i];
                let vb = face.vertices[i1];
                assert(va != vb);
                let edge = face.edges[i];
                assert(edge.vertices.indexOf(va)>=0);
                assert(edge.vertices.indexOf(vb)>=0);
            }            
        })
    }
    _checkEdges() {
        this.edges.forEach(edge => {
            assert(edge.vertices.length==2);
            assert(edge.faces.length==2);
            edge.faces.forEach(face => {
                assert(face.edges.indexOf(edge)>=0);
            })            
        })
    }
    _checkVertices() {
        this.vertices.forEach(vertex => {
            let m = vertex.faces.length;
            assert(m == vertex.edges.length);
            assert(m>=3);
            for(let i=0;i<m;i++) {
                let i1 = (i+1)%m;
                let e0 = vertex.edges[i];
                let f = vertex.faces[i];
                let e1 = vertex.edges[i1];
                assert(f.edges.indexOf(e0)>=0);
                assert(f.edges.indexOf(e1)>=0);
                assert(e0.faces.indexOf(f)>=0);
                assert(e1.faces.indexOf(f)>=0);
                assert(e0.vertices.indexOf(vertex)>=0);
                assert(f.vertices.indexOf(vertex)>=0);
            }
        });
    }

    
    catmullClark() {
        this.faces.forEach(face => { face.center = face.computeCenter(); });
        this.edges.forEach(edge => { edge.midPoint = edge.computeMidPoint(); });
        let pts = [];
        let fPts = this.faces.map(face => {
            pts.push(face.center); 
            return pts.length-1;
        });
        let ePts = this.edges.map(edge => {
            pts.push(edge.midPoint.scale(2)
                .add(edge.faces[0].center)
                .add(edge.faces[1].center)
                .scale(0.25));
            return pts.length-1;
        });
        let vPts = this.vertices.map(vertex => {
            let p_old = vertex.p;
            let zero = new BABYLON.Vector3(0,0,0);
            let m = vertex.faces.length;
            let p_f = vertex.faces.reduce(
                (a,b)=>a.add(b.center), zero).scale(1/m);
            let p_e = vertex.edges.reduce(
                (a,b)=>a.add(b.midPoint), zero).scale(1/m);
            let p = p_old.scale((m-3)/m)
                .add(p_f.scale(1/m))
                .add(p_e.scale(2/m))
                
            pts.push(p);
            return pts.length-1;
        });
        let faces = [];
        this.faces.forEach(face => {
            let m = face.vertices.length;
            for(let i=0; i<m; i++) {
                let i1 = (i+1)%m;
                faces.push([
                    vPts[face.vertices[i1].index], 
                    ePts[face.edges[i1].index], 
                    fPts[face.index],
                    ePts[face.edges[i].index]]);
            }
        });
        let q = new Polyhedron2();
        q.build(pts, faces);
        return q;
    }

    createLineSystem(scene, color) {
        let lines = [];
        let colors = [];
        let edgeColor = color || new BABYLON.Color4(0.7,0.7,0.2,1.0);
        this.edges.forEach(edge => {
            let p0 = edge.vertices[0].p;
            let p1 = edge.vertices[1].p;            
            lines.push([p0,p1]);
            colors.push([edgeColor, edgeColor]);
        });
        let lineSystem = BABYLON.MeshBuilder.CreateLineSystem(
            "lines", {lines: lines,colors: colors},  scene);
        return lineSystem;
    }
};


class Polyhedron {
    constructor() {
        this.pts = [];
        this.lines = [];
    }
    createLineSystem(scene) {
        let lines = [];
        let pts = this.pts;
        this.lines.forEach(line => {
            lines.push(line.map(j=>pts[j]));
        })
        return BABYLON.MeshBuilder.CreateLineSystem("lines", { lines: lines }, scene);
    }

    extrude(face, d) {
        let k = this.pts.length;
        let fPts = face.map(j=>this.pts[j]);
        let nrm = BABYLON.Vector3
            .Cross(fPts[1].subtract(fPts[0]), fPts[2].subtract(fPts[0]))
            .normalize();
        let delta = nrm.scale(d);
        fPts.forEach(p => {this.pts.push(delta.add(p))});
        let m = face.length;
        let q = [];
        for(let j=0; j<m; j++) {
            q.push(k+j);
            let j1 = (j+1)%m;
            this.lines.push([face[j],face[j1],k+j1,k+j]);
        }
        this.lines.push(q);

    }
}


function ltime(t, a,b) { return t<=a ? 0 : t>=b ? 1 : (t-a)/(b-a); }

let gh;

function makeModel2(scene, t) {
    console.log(t);
    let pts = [
        [-1,-1,-1],[1,-1,-1],[-1,1,-1],[1,1,-1],
        [-1,-1,1],[1,-1,1],[-1,1,1],[1,1,1]
        ].map(([x,y,z])=>new BABYLON.Vector3(x,y,z));
    let faces = [[0,1,3,2],[4,6,7,5],[1,0,4,5],[3,1,5,7],[2,3,7,6],[0,2,6,4]];
    let ph = new Polyhedron2();
    gh = ph;
    ph.build(pts,faces);
    if(model) model.dispose();
    model = ph.createLineSystem(scene);

    let start = performance.now();
    let ph2 = ph.catmullClark();
    console.log(performance.now()-start);
    ph2.createLineSystem(scene, new BABYLON.Color4(1,0,1,1));

}


function makeModel3(scene, t) {
    let lines = [];
    let matrix = BABYLON.Matrix.Identity();
    let ph = new Polyhedron();


    function addFace(pts) {
        let f = [];
        pts.forEach(([x,y,z])=> {
            let p = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(x,y,z), matrix);
            f.push(ph.pts.length);
            ph.pts.push(p);
        });
        ph.lines.push(f.concat([f[0]]));
        return f;
    }

    function addLines(...lines) {
        lines.forEach(line=>ph.lines.push(line));
    }

    let u = 0.5;
    let quad = [[-u,-u,0],[u,-u,0],[u,u,0],[-u,u,0]];

    let d1 = u/Math.tan(Math.PI/8);
    let d2 = u/Math.tan(Math.PI/6);
    let phi1 = Math.PI/4;
    let phi2 = Math.PI/3;
    
    let d, phi, k;

    let nodeMatrix1 = BABYLON.Matrix.Translation(0,0,t*3);
    let nodeMatrix2 = nodeMatrix1.multiply(BABYLON.Matrix.RotationY(Math.PI));

    let t1 = ltime(t,0.0,0.3);
    d = d1 * (1-t1) + d2 * t1;
    phi = phi1 * (1-t1) + phi2 * t1;


    matrix = BABYLON.Matrix.Translation(0,0,d)
        .multiply(BABYLON.Matrix.RotationY(-phi))
        .multiply(nodeMatrix1);
    let f1 = addFace(quad);

    matrix = BABYLON.Matrix.Translation(0,0,d)
        .multiply(BABYLON.Matrix.RotationY(phi))
        .multiply(nodeMatrix1);
    let f2 = addFace(quad);
        
    addLines([f1[1],f2[0]],[f1[2],f2[3]]);


    matrix = BABYLON.Matrix.Translation(0,0,d)
        .multiply(BABYLON.Matrix.RotationY(-phi))
        .multiply(nodeMatrix2);
    let f3 = addFace(quad);

    matrix = BABYLON.Matrix.Translation(0,0,d)
        .multiply(BABYLON.Matrix.RotationY(phi))
        .multiply(nodeMatrix2);
    let f4 = addFace(quad);
        
    addLines([f3[1],f4[0]],[f3[2],f4[3]]);

    /*


    let nodeMatrix2 = BABYLON.Matrix.Translation(0,0,t).multiply(BABYLON.Matrix.RotationY(Math.PI));
    matrix = BABYLON.Matrix.Translation(0,0,d)
        .multiply(BABYLON.Matrix.RotationY(-phi))
        .multiply(nodeMatrix2);
    addPoints(quad);
    k = 8;
    ph.lines.push([k,k+1,k+2,k+3,k]);

    matrix = BABYLON.Matrix.Translation(0,0,d)
        .multiply(BABYLON.Matrix.RotationY(phi))
        .multiply(nodeMatrix2);
    addPoints(quad);
    k = 12;
    ph.lines.push([k,k+1,k+2,k+3,k]);
    ph.lines=ph.lines.concat([[k-2,k+3],[k-3,k]]);

    */

    if(t<0.5) {
        addLines([f1[0],f4[1]],[f1[3],f4[2]],[f2[1],f3[0]],[f2[2],f3[3]]);


    } else {
        let t2 = ltime(t, 0.5, 0.6);
        let s = u*(2*(1-t2)+1*t2);
        let quad2 = [[-s,-u,0],[s,-u,0],[s,u,0],[-s,u,0]];

        matrix = BABYLON.Matrix.Translation(0,0,d)
            .multiply(BABYLON.Matrix.RotationY(Math.PI))
            .multiply(nodeMatrix1);
        let f5 = addFace(quad2);
        matrix = BABYLON.Matrix.Translation(0,0,d)
            .multiply(BABYLON.Matrix.RotationY(Math.PI))
            .multiply(nodeMatrix2);
        let f6 = addFace(quad2);

        addLines([f5[0],f6[1]],[f5[1],f6[0]],[f5[2],f6[3]],[f5[3],f6[2]]);

        addLines([f1[0],f5[1]],[f1[3],f5[2]], [f2[1],f5[0]], [f2[2],f5[3]]);

        addLines([f3[0],f6[1]],[f3[3],f6[2]], [f4[1],f6[0]], [f4[2],f6[3]]);

        /*
        matrix = BABYLON.Matrix.Translation(0,0,d)
            .multiply(BABYLON.Matrix.RotationY(Math.PI))
            .multiply(nodeMatrix1);
        k = ph.pts.length;
        addPoints(quad);
        ph.lines.push([k,k+1,k+2,k+3,k]);

        matrix = BABYLON.Matrix.Translation(0,0,d)
            .multiply(BABYLON.Matrix.RotationY(Math.PI))
            .multiply(nodeMatrix2);
        k = ph.pts.length;
        addPoints(quad);
        ph.lines.push([k,k+1,k+2,k+3,k]);

        ph.lines=ph.lines.concat([[11,6],[8,5],[14,3],[13,0]]);
        */
    }

    ph.extrude(f1,2);
    ph.extrude(f2,2);
    ph.extrude(f3,2);
    ph.extrude(f4,2);


    if(model) model.dispose();
    model = ph.createLineSystem();
    
}

let cage;

function makeModel(scene, t) {
    let matrix = BABYLON.Matrix.Identity();
    
    let pts = [];
    function addRib(pp) {
        let f = [];
        pp.forEach(([x,y,z])=> {
            let p = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(x,y,z), matrix);
            f.push(pts.length);
            pts.push(p);
        });
        return f;
    }

    let u = 0.5;
    let quad = [[-u,-u,0],[u,-u,0],[u,u,0],[-u,u,0]];

    let d1 = u/Math.tan(Math.PI/8);
    let d2 = u/Math.tan(Math.PI/6);
    let phi1 = Math.PI/4;
    let phi2 = Math.PI/3;
    
    let d, phi, k;

    let nodeMatrix1 = BABYLON.Matrix.Translation(0,0,t*3);
    let nodeMatrix2 = nodeMatrix1.multiply(BABYLON.Matrix.RotationY(Math.PI));

    let t1 = ltime(t,0.0,0.3);
    d = d1 * (1-t1) + d2 * t1;
    phi = phi1 * (1-t1) + phi2 * t1;


    matrix = BABYLON.Matrix.Translation(0,0,d)
        .multiply(BABYLON.Matrix.RotationY(-phi))
        .multiply(nodeMatrix1);
    let r1 = addRib(quad);

    matrix = BABYLON.Matrix.Translation(0,0,d)
        .multiply(BABYLON.Matrix.RotationY(phi))
        .multiply(nodeMatrix1);
    let r2 = addRib(quad);
        

    matrix = BABYLON.Matrix.Translation(0,0,d)
        .multiply(BABYLON.Matrix.RotationY(Math.PI))
        .multiply(nodeMatrix1);
    let r3 = addRib(quad);

    let faces = [];
    faces.push(r1,r2,r3);
    faces.push([r1[1],r2[0],r2[3],r1[2]]);
    faces.push([r2[1],r3[0],r3[3],r2[2]]);
    faces.push([r3[1],r1[0],r1[3],r3[2]]);
    faces.push([r1[3],r1[2],r2[3],r2[2],r3[3],r3[2]]);
    faces.push([r1[1],r1[0],r3[1],r3[0],r2[1],r2[0]]);
    
    

    let ph = new Polyhedron2();
    ph.build(pts, faces);


    let ph2 = ph.catmullClark();
    // ph2 = ph2.catmullClark();

    if(cage) cage.dispose();
    if(model) model.dispose();
    cage = ph.createLineSystem(scene);
    model = ph2.createLineSystem(scene, new BABYLON.Color4(1,0,1,1));
}