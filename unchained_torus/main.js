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


let viewer;

window.onload = function() {
  viewer = new Viewer('renderCanvas');

  viewer.onPointerDown = (mesh, faceIndex) => {
  }
}

