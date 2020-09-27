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


/*
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
*/


function ltime(t, a,b) { return t<=a ? 0 : t>=b ? 1 : (t-a)/(b-a); }

let gh;

/*
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

    * /

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
        * /
    }

    ph.extrude(f1,2);
    ph.extrude(f2,2);
    ph.extrude(f3,2);
    ph.extrude(f4,2);


    if(model) model.dispose();
    model = ph.createLineSystem();
    
}
*/

let cage;

function extrude(pts, faces, faceIndex, d) {
    let k = pts.length;
    let face = faces[faceIndex];
    let fPts = face.map(j=>pts[j]);
    let nrm = BABYLON.Vector3
        .Cross(fPts[1].subtract(fPts[0]), fPts[2].subtract(fPts[0]))
        .normalize();
    let delta = nrm.scale(d);
    fPts.forEach(p => {pts.push(delta.add(p))});
    let m = face.length;
    let q = [];
    for(let j=0; j<m; j++) {
        q.push(k+j);
        let j1 = (j+1)%m;
        faces.push([face[j],face[j1],k+j1,k+j]);
    }
    faces[faceIndex] = q;
}

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
        .multiply(BABYLON.Matrix.RotationY(-phi))
        .multiply(nodeMatrix2);
    let r4 = addRib(quad);

    matrix = BABYLON.Matrix.Translation(0,0,d)
        .multiply(BABYLON.Matrix.RotationY(phi))
        .multiply(nodeMatrix2);
    let r5 = addRib(quad);


    let faces = [];
    function link(ra,rb) {
        let r = [ra[1],rb[0],rb[3],ra[2]];
        faces.push(r);
        return r;
    }
    function hface(...rs) {
        let m = rs.length;
        let up = [], dn = [];
        for(let i=0; i<m; i++) {
            let i1 = (i+1)%m;
            up.push(rs[i][3]); if(rs[i][2]!=rs[i1][3]) up.push(rs[i][2]);
            dn.push(rs[i][0]); if(rs[i][1]!=rs[i1][0]) dn.push(rs[i][1]);
        }

        faces.push(up, dn.reverse());
    }

    faces.push(r1,r2,r4,r5);
    link(r1,r2);
    link(r4,r5);
    
    if(t<0.35) { 
        let r24 = link(r2,r4); 
        let r51 = link(r5,r1);
        hface(r1,r2);
        hface(r4,r5);
        hface(r24, r51);
    } else {

        let t2 = ltime(t, 0.5, 0.6);
        let s = u*(2*(1-t2)+1*t2);
        let quad2 = [[-s,-u,0],[s,-u,0],[s,u,0],[-s,u,0]];

        matrix = BABYLON.Matrix.Translation(0,0,d)
            .multiply(BABYLON.Matrix.RotationY(Math.PI))
            .multiply(nodeMatrix1);
        let r3 = addRib(quad2);
        matrix = BABYLON.Matrix.Translation(0,0,d)
            .multiply(BABYLON.Matrix.RotationY(Math.PI))
            .multiply(nodeMatrix2);
        let r6 = addRib(quad2);
        // faces.push(r3,r6);
        let r23 = link(r2,r3);
        let r31 = link(r3,r1);

        let r64 = link(r6,r4);
        let r56 = link(r5,r6);
        
        let r2364 = link(r23, r64);
        let r5631 = link(r56,r31);

        hface(r1,r2,r3);
        hface(r4,r5,r6);
        hface(r2364, r5631);
        


    }

    extrude(pts, faces,0, 3);
    extrude(pts, faces,1, 3);
    extrude(pts, faces,2, 3);
    extrude(pts, faces,3, 3);
    

    let ph = new Polyhedron();
    ph.build(pts, faces);
    if(cage) cage.dispose();
    cage = ph.createLineSystem(scene, new BABYLON.Color4(1,1,1,1), true);

    if(model) { model.dispose(); model = null; }

    //if(t<0.5) 
    {
        ph.updateVertices();
        let ph2 = ph.catmullClark();
        ph2.updateVertices();
        ph2 = ph2.catmullClark();

        /*
        model = ph2.createLineSystem(scene, 
            new BABYLON.Color4(0,1,1,1),
            false);
            */
        model = ph2.createMesh(scene);

    }

}