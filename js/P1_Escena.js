/**
 * Escena.js
 * 
 * Practica AGM #1. Escena basica en three.js
 * Seis objetos organizados en un grafo de escena con
 * transformaciones, animacion basica y modelos importados
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

// Variables de consenso
let renderer, scene, camera;

// Otras globales
/*******************
 * TO DO: Variables globales de la aplicacion
 *******************/
let figuras = [];
let grupoPentagono = new THREE.Group();

// Acciones
init();
loadScene();
render();

function init()
{
    // Motor de render
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    /*******************
    * TO DO: Completar el motor de render y el canvas
    *******************/
    document.body.appendChild( renderer.domElement );

    // Escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0.5,0.5,0.5);
    
    // Camara
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1,1000);
    camera.position.set( 0.5, 2, 7 );
    camera.lookAt( new THREE.Vector3(0,1,0) );
}

function loadScene()
{
    const material = new THREE.MeshNormalMaterial( );

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
    const R = 5;
    const angleStep = (2 * Math.PI) / 5; // 5 vértices

    // Crear los vértices del pentágono
    const pentagonVertices = [];
    for (let i = 0; i < 5; i++) {
        const x = R * Math.cos(i * angleStep);
        const z = R * Math.sin(i * angleStep);
        pentagonVertices.push(new THREE.Vector3(x, 0, z));
    }

    const pentagonGeometry = new THREE.BufferGeometry().setFromPoints(pentagonVertices.concat(pentagonVertices[0])); // Cerramos la figura
    const pentagonMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const pentagonLine = new THREE.LineLoop(pentagonGeometry, pentagonMaterial);
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

function update()
{
    /*******************
    * TO DO: Modificar el angulo de giro de cada objeto sobre si mismo
    * y del conjunto pentagonal sobre el objeto importado
    *******************/
    figuras.forEach(figura => {
        figura.rotation.y += 0.02;
    });
    grupoPentagono.rotation.y += 0.01;

}

function render()
{
    requestAnimationFrame( render );
    update();
    renderer.render( scene, camera );
}