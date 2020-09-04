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

    engine.runRenderLoop(function () {scene.render();});
    window.addEventListener("resize", function () { engine.resize(); });
};

function createTetMesh() {
    let tet = new BABYLON.Mesh("tet", scene);

    let pts = [
        new BABYLON.Vector3(1,1,1),
        new BABYLON.Vector3(-1,-1,1),
        new BABYLON.Vector3(-1,1,-1),
        new BABYLON.Vector3(1,-1,-1)
    ];

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

    return tet;
}

function populateScene() {
    tet = createTetMesh();

}