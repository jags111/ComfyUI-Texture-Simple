import * as THREE from 'three';
import { api } from '../../../scripts/api.js';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as dat from 'three/addons/libs/lil-gui.module.min'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

const visualizer = document.getElementById("visualizer");
const container = document.getElementById("container");
const progressDialog = document.getElementById("progress-dialog");
const progressIndicator = document.getElementById("progress-indicator");



const renderer = new THREE.WebGLRenderer({ antialias: true, extensions: {
    derivatives: true
}});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const pmremGenerator = new THREE.PMREMGenerator(renderer);

// scene
const scene = new THREE.Scene();
scene.background = new THREE.Color( 0x444444 );
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 200 );
camera.position.z = 60;

const ambientLight = new THREE.AmbientLight( 0x000000 );
scene.add( ambientLight );

const light1 = new THREE.DirectionalLight( 0xffffff, 3 );
light1.position.set( 0, 200, 0 );
scene.add( light1 );

const light2 = new THREE.DirectionalLight( 0xffffff, 3 );
light2.position.set( 100, 200, 100 );
scene.add( light2 );

const light3 = new THREE.DirectionalLight( 0xffffff, 3 );
light3.position.set( - 100, - 200, - 100 );
scene.add( light3 );

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.update();
controls.enablePan = true;
controls.enableDamping = true;

// Handle window resize event
window.onresize = function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
};

const clock = new THREE.Clock()

var lastMaps = {
    color: "",
    displacement: "",
    normal: "",
    ao: "",
    metalness: "",
    roughness: "",
    alpha: ""
};
var needUpdate = false;

let isMaterialSideAdded = false;

function frameUpdate(sphere, cube, torus) {
    var currentMaps = {
        color: visualizer.getAttribute("color_map"),
        displacement: visualizer.getAttribute("displacement_map"),
        normal: visualizer.getAttribute("normal_map"),
        ao: visualizer.getAttribute("ao_map"),
        metalness: visualizer.getAttribute("metalness_map"),
        roughness: visualizer.getAttribute("roughness_map"),
        alpha: visualizer.getAttribute("alpha_map")
    };

    if (JSON.stringify(currentMaps) === JSON.stringify(lastMaps)) {
        if (needUpdate) {
            const elapsedTime = clock.getElapsedTime();
            [sphere, cube, torus].forEach(shape => {
                if (shape && shape.rotation) {
                    shape.rotation.y = 0.1 * elapsedTime;
                    shape.rotation.x = -0.15 * elapsedTime;
                }
            });

            controls.update();
            renderer.render(scene, camera);
        }

    } else {
        needUpdate = false;
        scene.clear();
        progressDialog.open = true;
        lastMaps = {...currentMaps};
        main(...Object.values(currentMaps).map(JSON.parse));
        
    }
    requestAnimationFrame(() => frameUpdate(sphere, cube, torus));
    
}


const onProgress = function (xhr) {
    if (xhr.lengthComputable) {
        progressIndicator.value = xhr.loaded / xhr.total * 100;
    }
};

const onError = function (e) {
    console.error(e);
};

async function loadTexture(params) {
    if (!params?.filename) return null;

    const url = api.apiURL('/view?' + new URLSearchParams(params)).replace(/extensions.*\//, "");
    const ext = params.filename.slice(params.filename.lastIndexOf(".") + 1);

    if (ext === "png" || ext === "jpg" || ext === "jpeg") {
        const loader = new THREE.TextureLoader();
        return await loader.loadAsync(url);
    }

    return null;
}

let material;
let sphere, cube, torus;
async function main(colorMapParams, displacementMapParams, normalMapParams, aoMapParams, metalnessMapParams, roughnessMapParams, alphaMapParams) {

    const colorTexture = colorMapParams ? await loadTexture(colorMapParams) : null;
    const displacementTexture = displacementMapParams ? await loadTexture(displacementMapParams) : null;
    const normalTexture = normalMapParams ? await loadTexture(normalMapParams) : null;
    const aoTexture = aoMapParams ? await loadTexture(aoMapParams) : null;
    const metalnessTexture = metalnessMapParams ? await loadTexture(metalnessMapParams) : null;
    const roughnessTexture = roughnessMapParams ? await loadTexture(roughnessMapParams) : null;
    const alphaTexture = alphaMapParams ? await loadTexture(alphaMapParams) : null;

    // MeshStandardMaterial
    material = new THREE.MeshPhysicalMaterial()

    material.metalness = 1
    material.roughness = 1
    // Check if color_map is available
    if (colorTexture) {
     
        colorTexture.colorSpace = THREE.SRGBColorSpace;
        material.map = colorTexture;
    }

    // Check if displacement_map is available
    if (displacementTexture) {
     
        material.displacementMap = displacementTexture;
        material.displacementScale = 0.1
    }

    // Check if normal_map is available
    if (normalTexture) {
     

        material.normalMap = normalTexture;
        material.normalScale.set(0.5, 0.5)
    }

    // Check if ao_map is available
    if (aoTexture) {
     

        material.aoMap = aoTexture;
        material.aoMapIntensity = 1
    }

    // Check if metalness_map is available
    if (metalnessTexture) {


        material.metalnessMap = metalnessTexture;
    }

    // Check if roughness_map is available
    if (roughnessTexture) {
     

        material.roughnessMap = roughnessTexture;
    }

    // Check if alpha_map is available
    if (alphaTexture) {
      

        material.alphaMap = alphaTexture;
        material.transparent = true
    }


    sphere = new THREE.Mesh(
        new THREE.SphereGeometry(10, 32, 32),
        material
    )
    sphere.position.x = - 35
    
    cube = new THREE.Mesh(
        new THREE.BoxGeometry(15, 15, 15, 16, 16, 16),
        material
    )
    
    torus = new THREE.Mesh(
        new THREE.TorusGeometry(10, 3, 64, 32),
        material
    )

    torus.position.x = 35
    
    scene.add(sphere, cube, torus);

    needUpdate = true;

    scene.add(ambientLight);
    scene.add(camera);

    progressDialog.close();

    frameUpdate(sphere, cube, torus, material);    
    
}
const gui = new dat.GUI({ width: 250 });

const params = {
    side: THREE.FrontSide,
    color: '#ffffff', // Default color
    emissive: '#000000', // Default emissive color
    roughness: 1,
    metalness: 0,
    ior: 1.5,
    reflectivity: 0.5,
    iridescence: 0,
    iridescenceIOR: 1.5,
    sheen: 0,
    sheenRoughness: 0.5,
    sheenColor: '#ffffff', // Default sheen color
    clearcoat: 0,
    clearcoatRoughness: 0,
    specularIntensity: 0,
    specularColor: '#ffffff', // Default specular color
    flatShading: false,
    wireframe: false,
    vertexColors: false,
    displacementScale: 0.1,
    normalScale: 0.5,
    aoMapIntensity: 1,
    visibleTorus: true,
    visibleSphere: true,
    visibleCube: true,
    backgroundColor: '#444444',
    opacity: 1,
    transparent: false,
};

const colorFolder = gui.addFolder('Colors');
const visibilityFolder = gui.addFolder('Visibility');
const materialFolder = gui.addFolder('Material');

materialFolder.add(params, 'side', { Front: THREE.FrontSide, Back: THREE.BackSide, Double: THREE.DoubleSide }).name('Material Side').onChange((value) => {
    material.side = parseInt(value);
    needUpdate = true;
});

colorFolder .addColor(params, 'color').name('Material Color').onChange((value) => {
    material.color.set(value);
    needUpdate = true;
});

colorFolder.addColor(params, 'emissive').name('Emissive Color').onChange((value) => {
    material.emissive.set(value);
    needUpdate = true;
});

materialFolder.add(params, 'roughness', 0, 1).name('Roughness').onChange((value) => {
    material.roughness = value;
    needUpdate = true;
});

materialFolder.add(params, 'metalness', 0, 1).name('Metalness').onChange((value) => {
    material.metalness = value;
    needUpdate = true;
});

materialFolder.add(params, 'ior', 1, 2.333).name('Index of Refraction').onChange((value) => {
    material.ior = value;
    needUpdate = true;
});

materialFolder.add(params, 'reflectivity', 0, 1).name('Reflectivity').onChange((value) => {
    material.reflectivity = value;
    needUpdate = true;
});

materialFolder.add(params, 'iridescence', 0, 1).name('Iridescence').onChange((value) => {
    material.iridescence = value;
    needUpdate = true;
});

materialFolder.add(params, 'iridescenceIOR', 1, 2.333).name('Iridescence IOR').onChange((value) => {
    material.iridescenceIOR = value;
    needUpdate = true;
});

materialFolder.add(params, 'sheen', 0, 1).name('Sheen').onChange((value) => {
    material.sheen = value;
    needUpdate = true;
});

colorFolder.addColor(params, 'sheenColor').name('Sheen Color').onChange((value) => {
    material.sheenColor.set(value);
    needUpdate = true;
});

materialFolder.add(params, 'sheenRoughness', 0, 1).name('Sheen Roughness').onChange((value) => {
    material.sheenRoughness = value;
    needUpdate = true;
});

materialFolder.add(params, 'clearcoat', 0, 1).name('Clearcoat').onChange((value) => {
    material.clearcoat = value;
    needUpdate = true;
});

materialFolder.add(params, 'clearcoatRoughness', 0, 1).name('Clearcoat Roughness').onChange((value) => {
    material.clearcoatRoughness = value;
    needUpdate = true;
});

materialFolder.add(params, 'specularIntensity', 0, 1).name('Specular Intensity').onChange((value) => {
    material.specularIntensity = value;
    needUpdate = true;
});

colorFolder.addColor(params, 'specularColor').name('Specular Color').onChange((value) => {
    material.specularColor.set(value);
    needUpdate = true;
});

materialFolder.add(params, 'flatShading').name('Flat Shading').onChange((value) => {
    material.flatShading = value;
    needUpdate = true;
});

materialFolder.add(params, 'wireframe').name('Wireframe').onChange((value) => {
    material.wireframe = value;
    needUpdate = true;
});

materialFolder.add(params, 'vertexColors').name('Vertex Colors').onChange((value) => {
    material.vertexColors = value;
    needUpdate = true;
});

materialFolder.add(params, 'displacementScale', 0, 1).name('Displacement Scale').onChange((value) => {
    material.displacementScale = value;
    needUpdate = true;
});

materialFolder.add(params, 'normalScale', 0, 1).name('Normal Scale').onChange((value) => {
    material.normalScale = value;
    needUpdate = true;
});

materialFolder.add(params, 'aoMapIntensity', 0, 1).name('AO Map Intensity').onChange((value) => {
    material.aoMapIntensity = value;
    needUpdate = true;
});

visibilityFolder.add(params, 'visibleTorus').name('Torus Visibility').onChange((value) => {
    torus.visible = value;
    needUpdate = true;
});

visibilityFolder.add(params, 'visibleSphere').name('Sphere Visibility').onChange((value) => {
    sphere.visible = value;
    needUpdate = true;
});

visibilityFolder.add(params, 'visibleCube').name('Cube Visibility').onChange((value) => {
    cube.visible = value;
    needUpdate = true;
});

colorFolder.addColor(params, 'backgroundColor').name('Background Color').onChange((value) => {
    scene.background.set(value);
    needUpdate = true;
});

materialFolder.add(params, 'opacity', 0, 1).name('Opacity').onChange((value) => {
    material.opacity = value;
    needUpdate = true;
});

materialFolder.add(params, 'transparent').name('Transparent').onChange((value) => {
    material.transparent = value;
    needUpdate = true;
});

document.getElementById('downloadButton').addEventListener('click', download);

function download() {
    const exporter = new GLTFExporter();
    exporter.parse(scene, function (gltfJson) {
      const jsonString = JSON.stringify(gltfJson);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = "scene.glb";
      link.click();
      URL.revokeObjectURL(url);
      console.log("Download requested");
    }, { binary: true });
  }

document.getElementById('screenshotButton').addEventListener('click', takeScreenshot);

function takeScreenshot() {
    renderer.render(scene, camera);
    const dataURL = renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = "screenshot.png";
    link.click();
    console.log("Screenshot taken");
}






main();
