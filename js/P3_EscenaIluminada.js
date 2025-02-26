/**
 * EscenaIluminada.js
 * 
 * Practica AGM #3. Escena basica con interfaz, animacion e iluminacion
 * Se trata de añadir luces a la escena y diferentes materiales
 * 
 * @author 
 * 
 */

// Modulos necesarios
/*******************
 * TO DO: Cargar los modulos necesarios
 *******************/
import * as THREE from "../lib/three.module.js";
import {GLTFLoader} from "../lib/GLTFLoader.module.js";
import {OrbitControls} from "../lib/OrbitControls.module.js";
import {TWEEN} from "../lib/tween.module.min.js";
import {GUI} from "../lib/lil-gui.module.min.js";

// Variables de consenso
let renderer, scene, camera;

// Otras globales
/*******************
 * TO DO: Variables globales de la aplicacion
 *******************/
let cameraControls, effectController;
let esferaCubo,cubo,esfera,suelo;
let video;

let figuras = [];
let material;
let grupoPentagono = new THREE.Group();
let R, angleStep, pentagonVertices, pentagonLine;
let animando = false;

// Acciones
init();
loadScene();
loadGUI();
render();

function init()
{
    // Motor de render
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    /*******************
    * TO DO: Completar el motor de render, el canvas y habilitar
    * el buffer de sombras
    *******************/
    document.getElementById('container').appendChild( renderer.domElement );
    renderer.antialias = true;
    renderer.shadowMap.enabled = true;

    // Escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0.5,0.5,0.5);
    
    // Camara
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1,1000);
    camera.position.set( 0.5, 2, 7 );
    /*******************
    * TO DO: Añadir manejador de camara (OrbitControls)
    *******************/
    cameraControls = new OrbitControls( camera, renderer.domElement );
    cameraControls.target.set(0,1,0);

    camera.lookAt( new THREE.Vector3(0,1,0) );

    // Luces
    /*******************
     * TO DO: Añadir luces y habilitar sombras
     * - Una ambiental
     * - Una direccional
     * - Una focal
     *******************/
    const ambiental = new THREE.AmbientLight(0x222222, 1);
    scene.add(ambiental);

    const direccional = new THREE.DirectionalLight(0xFFFFFF,0.3);
    direccional.position.set(-1,1,-1);
    direccional.castShadow = true;
    scene.add(direccional);

    const focal = new THREE.SpotLight(0xFFFFFF,1);
    focal.position.set(-2,7,4);
    focal.target.position.set(0,0,0);
    focal.angle= Math.PI/7;
    focal.penumbra = 0.3;
    focal.castShadow= true;
    focal.shadow.camera.far = 20;
    focal.shadow.camera.fov = 80;
    scene.add(focal);

    scene.add(new THREE.CameraHelper(focal.shadow.camera));
}

function loadScene()
{
    // Texturas
    /*******************
     * TO DO: Cargar texturas
     * - De superposición
     * - De entorno
     *******************/
    const path ="./images/";
    const texcubo = new THREE.TextureLoader().load(path+"wood512.jpg");
    const texsuelo = new THREE.TextureLoader().load(path+"r_256.jpg");
    texsuelo.repeat.set(4,3);
    texsuelo.wrapS= texsuelo.wrapT = THREE.MirroredRepeatWrapping;
    const entorno = [ path+"posx.jpg", path+"negx.jpg",
                        path+"posy.jpg", path+"negy.jpg",
                        path+"posz.jpg", path+"negz.jpg"];
    const texesfera = new THREE.CubeTextureLoader().load(entorno);

    // Materiales
    /*******************
     * TO DO: Crear materiales y aplicar texturas
     * - Uno basado en Lambert
     * - Uno basado en Phong
     * - Uno basado en Basic
     *******************/
    const matcubo = new THREE.MeshLambertMaterial({color:'yellow',map:texcubo});
    const matesfera = new THREE.MeshPhongMaterial({color:'white',
                                                    specular:'gray',
                                                    shininess: 30,
                                                    envMap: texesfera });
    const matsuelo = new THREE.MeshStandardMaterial({color:"rgb(150,150,150)",map:texsuelo});

    material = matcubo;
    /*******************
    * TO DO: Misma escena que en la practica anterior
    * cambiando los materiales y activando las sombras
    *******************/

    //copiar y pegar de la P1_Escena.js

    /*******************
     * TO DO: Construir un suelo en el plano XZ
     *******************/
    const suelo = new THREE.Mesh( new THREE.PlaneGeometry(10,10, 10,10), matsuelo );
    suelo.rotation.x = -Math.PI / 2;
    scene.add(suelo);

    /*******************
     * TO DO: Construir una escena con 5 figuras diferentes posicionadas
     * en los cinco vertices de un pentagono regular alredor del origen
     *******************/
    R = 5;
    angleStep = (2 * Math.PI) / 5; // 5 vértices

    // Crear los vértices del pentágono
    pentagonVertices = [];
    for (let i = 0; i < 5; i++) {
        const x = R * Math.cos(i * angleStep);
        const z = R * Math.sin(i * angleStep);
        pentagonVertices.push(new THREE.Vector3(x, 0, z));
    }

    const pentagonGeometry = new THREE.BufferGeometry().setFromPoints(pentagonVertices.concat(pentagonVertices[0])); // Cerramos la figura
    const pentagonMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
    pentagonLine = new THREE.LineLoop(pentagonGeometry, pentagonMaterial);
    scene.add(pentagonLine);

    const geometrias = [
        new THREE.BoxGeometry( 2,2,2 ),
        new THREE.SphereGeometry( 1, 20,20 ),
        new THREE.CylinderGeometry(1, 1, 2, 20),
        new THREE.TetrahedronGeometry(1.5),
        new THREE.TorusGeometry(1, 0.3, 16, 32)
    ]

    grupoPentagono = new THREE.Group();

    // Crear y posicionar las figuras en los vértices
    for (let i = 0; i < 5; i++) {
        const figura = new THREE.Mesh(geometrias[i], matcubo);
        figura.position.copy(pentagonVertices[i]);
        figura.position.y = pentagonLine.position.y + 1;
        figura.scale.set(0.8, 0.8, 0.8);
        grupoPentagono.add(figura);
        figuras.push(figura);
    }
    scene.add(grupoPentagono);

    /*******************
     * TO DO: Añadir a la escena un modelo importado en el centro del pentagono
     *******************/
    const loader = new THREE.ObjectLoader();

    loader.load( 'models/soldado/soldado.json', 
        function(objeto){
            objeto.position.y = 1;
            objeto.name = 'soldado';
            scene.add(objeto);
            
            objeto.castShadow = true;
            objeto.material.setValues( {map:
                new THREE.TextureLoader().load("models/soldado/soldado.png")} );
        }
    )

    // Importar un modelo en gltf
    const glloader = new GLTFLoader();

    //glloader.load( 'models/RobotExpressive.glb', function ( gltf ) {
    glloader.load( 'models/boeing_ch-47/scene.gltf', function ( objeto ) {
        objeto.scene.position.y = 3;
        objeto.scene.rotation.y = -Math.PI/2;
        objeto.scene.scale.set(0.05, 0.05, 0.05);
        console.log("boeing_ch-47");
        scene.add( objeto.scene )

        objeto.castShadow = true;
        objeto.material.setValues( {map:
            new THREE.TextureLoader().load("models/boeing_ch/textures/13___Default_baseColor.png")} );
    
    }, undefined, function ( error ) {
        console.error( error );
    } );

    /*******************
     * TO DO: Añadir a la escena unos ejes
     *******************/
    scene.add( new THREE.AxesHelper(1) );

    /******************
     * TO DO: Crear una habitacion de entorno
     ******************/
    // Habitacion
    const paredes = [];
    paredes.push( new THREE.MeshBasicMaterial({side:THREE.BackSide,
                    map: new THREE.TextureLoader().load(path+"posx.jpg")}) );
    paredes.push( new THREE.MeshBasicMaterial({side:THREE.BackSide,
                    map: new THREE.TextureLoader().load(path+"negx.jpg")}) );
    paredes.push( new THREE.MeshBasicMaterial({side:THREE.BackSide,
                    map: new THREE.TextureLoader().load(path+"posy.jpg")}) );
    paredes.push( new THREE.MeshBasicMaterial({side:THREE.BackSide,
                    map: new THREE.TextureLoader().load(path+"negy.jpg")}) );
    paredes.push( new THREE.MeshBasicMaterial({side:THREE.BackSide,
                    map: new THREE.TextureLoader().load(path+"posz.jpg")}) );
    paredes.push( new THREE.MeshBasicMaterial({side:THREE.BackSide,
                    map: new THREE.TextureLoader().load(path+"negz.jpg")}) );
    const habitacion = new THREE.Mesh( new THREE.BoxGeometry(40,40,40),paredes);
    scene.add(habitacion);

    /******************
     * TO DO: Asociar una textura de vídeo al suelo
     ******************/
    video = document.createElement('video');
    video.src = "./videos/Pixar.mp4";
    video.load();
    video.muted = true;
    video.play();
    const texvideo = new THREE.VideoTexture(video);

    suelo.material = new THREE.MeshBasicMaterial({map:texvideo});

}

function loadGUI()
{
    // Interfaz de usuario
    /*******************
    * TO DO: Crear la interfaz de usuario con la libreria lil-gui.js
    * - Funcion de disparo de animaciones. Las animaciones deben ir
    *   encadenadas
    * - Slider de control de radio del pentagono
    * - Checkbox para alambrico/solido
    * - Checkbox de sombras
    * - Selector de color para cambio de algun material
    * - Boton de play/pause y checkbox de mute
    *******************/
   // Definicion de los controles
    effectController = {
        animar: () => {
            animando = !animando;
            if (animando) iniciarAnimacion()},
        radioPentagono: 5,
        alambrico: false,

		sombras: true,
		play: function(){video.play();},
		pause: function(){video.pause();},
        mute: true,
		colorsuelo: "rgb(150,150,150)"
    };
    
    // Creacion interfaz
    const gui = new GUI();

    // Construccion del menu
    const p2 = gui.addFolder("controles P2" );
    p2.add(effectController, "animar").name("Iniciar/Detener Animación");
    p2.add(effectController, "radioPentagono", 1, 10, 0.1).name("Radio del Pentágono");
    p2.add(effectController, "alambrico").name("Modo Alámbrico").onChange(actualizarMaterial);

    const p3 = gui.addFolder("controles P3" );
    p3.add(effectController, "sombras")
      .onChange(v=>{
        v = !v;
        grupoPentagono.castShadow = v;
    });
    p3.addColor(effectController, "colorsuelo")
     .name("Color moqueta")
     .onChange(c=>{suelo.material.setValues({color:c})});
    const videofolder = gui.addFolder("Control video");
    videofolder.add(effectController,"mute").onChange(v=>{video.muted = v});
	videofolder.add(effectController,"play");
	videofolder.add(effectController,"pause");

}

// Función para iniciar las animaciones encadenadas
function iniciarAnimacion() {
    if (!animando) return;

    figuras.forEach(figura => {
        figura.rotation.y += 0.02;
    });
    grupoPentagono.rotation.y += 0.01;

    requestAnimationFrame(iniciarAnimacion);
}

function actualizarMaterial() {
    const nuevoMaterial = effectController.alambrico
        ? new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true }) 
        : material;

    for (let i = 0; i < grupoPentagono.children.length; i++) {
        grupoPentagono.children[i].material = nuevoMaterial;
    }
}

function update(delta)
{
    /*******************
    * TO DO: Actualizar tween
    *******************/
   // Lectura de controles en GUI (es mejor hacerlo con onChange)
    R = effectController.radioPentagono;
    pentagonVertices = [];
    for (let i = 0; i < 5; i++) {
        const x = R * Math.cos(i * angleStep);
        const z = R * Math.sin(i * angleStep);
        pentagonVertices.push(new THREE.Vector3(x, 0, z));
    }
    pentagonLine.geometry.setFromPoints(pentagonVertices.concat(pentagonVertices[0]));

    for (let i = 0; i < grupoPentagono.children.length; i++) {
        grupoPentagono.children[i].position.copy(pentagonVertices[i]);
    }

    TWEEN.update();
}

function render(delta)
{
    requestAnimationFrame( render );
    update(delta);
    renderer.render( scene, camera );
}