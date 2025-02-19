/**
 * EscenaAnimada.js
 * 
 * Practica AGM #2. Escena basica con interfaz y animacion
 * Se trata de añadir un interfaz de usuario que permita 
 * disparar animaciones sobre los objetos de la escena con Tween
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
let cameraControls, effectController;
let esferaCubo,cubo,esfera;
let angulo = 0;
/*******************
 * TO DO: Variables globales de la aplicacion
 *******************/
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
    * TO DO: Completar el motor de render y el canvas
    *******************/
    document.getElementById('container').appendChild( renderer.domElement );

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
}

function loadScene()
{
    material = new THREE.MeshNormalMaterial( {wireframe:false} );

    /*******************
    * TO DO: Misma escena que en la practica anterior
    *******************/
    
    //copiar y pegar de la P1_Escena.js

    /*******************
    * TO DO: Construir un suelo en el plano XZ
    *******************/
    const suelo = new THREE.Mesh( new THREE.PlaneGeometry(10,10, 10,10), material );
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
        const figura = new THREE.Mesh(geometrias[i], material);
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
            scene.add(objeto);
            objeto.position.y = 1;
            objeto.name = 'soldado';
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
    
    }, undefined, function ( error ) {
        console.error( error );
    } );

    /*******************
    * TO DO: Añadir a la escena unos ejes
    *******************/
    scene.add( new THREE.AxesHelper(1) );

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
    *******************/
   
    // Definicion de los controles
    effectController = {
        animar: () => {
            animando = !animando;
            if (animando) iniciarAnimacion()},
        radioPentagono: 5,
        alambrico: false
    };
   
    // Creacion interfaz
    const gui = new GUI();

    // Construccion del menu
	const h = gui.addFolder("mis controles");
    h.add(effectController, "animar").name("Iniciar/Detener Animación");
    h.add(effectController, "radioPentagono", 1, 10, 0.1).name("Radio del Pentágono");
    h.add(effectController, "alambrico").name("Modo Alámbrico").onChange(actualizarMaterial);

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


    // cubo.position.set( -1-effectController.separacion/2, 0, 0 );
    // esfera.position.set( 1+effectController.separacion/2, 0, 0 );
    // cubo.material.setValues( { color: effectController.colorsuelo } );
    // esferaCubo.rotation.y = effectController.giroY * Math.PI/180;
    TWEEN.update();
}

function render(delta)
{
    requestAnimationFrame( render );
    update(delta);
    renderer.render( scene, camera );
}