/**
 * AjedrezScene.js
 *
 * Escena 3D de un tablero de ajedrez con piezas, iluminación,
 * cámaras múltiples y controles interactivos
 *
 */

// Módulos necesarios
import * as THREE from "../lib/three.module.js";
import { GLTFLoader } from "../lib/GLTFLoader.module.js";
import { OrbitControls } from "../lib/OrbitControls.module.js";
import { TWEEN } from "../lib/tween.module.min.js";
import { GUI } from "../lib/lil-gui.module.min.js";

// Variables estándar
let renderer, scene, camera;

// Otras globales
let cameraControls, effectController;
let tablero, piezas;
let alzado, planta, perfil;
let boardSize = 8; // Tamaño del tablero: 8x8
let selectedPiece = null;
let highlightedSquares = [];
const L = 10; // Tamaño para las cámaras ortográficas

// Acciones
init();
loadScene();
setupGUI();
render();

function setCameras(ar) {
  let camaraOrto;

  // Construir las cámaras ortográficas
  if (ar > 1)
    camaraOrto = new THREE.OrthographicCamera(
      -L * ar,
      L * ar,
      L,
      -L,
      -100,
      100
    );
  else
    camaraOrto = new THREE.OrthographicCamera(
      -L,
      L,
      L / ar,
      -L / ar,
      -100,
      100
    );

  alzado = camaraOrto.clone();
  alzado.position.set(0, 0, 15);
  alzado.lookAt(0, 0, 0);

  perfil = camaraOrto.clone();
  perfil.position.set(15, 0, 0);
  perfil.lookAt(0, 0, 0);

  planta = camaraOrto.clone();
  planta.position.set(0, 15, 0);
  planta.lookAt(0, 0, 0);
  planta.up = new THREE.Vector3(0, 0, -1);
}

function init() {
  // Instanciar el motor de render
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("container").appendChild(renderer.domElement);
  renderer.antialias = true;
  renderer.shadowMap.enabled = true;
  renderer.setClearColor(0x2a2a2a);
  renderer.autoClear = false;

  // Instanciar el nodo raíz de la escena
  scene = new THREE.Scene();

  // Instanciar la cámara perspectiva y su control
  const ar = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(75, ar, 0.1, 100);
  camera.position.set(0, 8, 10);
  cameraControls = new OrbitControls(camera, renderer.domElement);
  cameraControls.target.set(0, 0, 0);
  camera.lookAt(0, 0, 0);

  // Instanciar cámaras ortográficas
  setCameras(ar);

  // Luces
  const ambiental = new THREE.AmbientLight(0x444444);
  scene.add(ambiental);

  const direccional = new THREE.DirectionalLight(0xffffff, 0.5);
  direccional.position.set(-5, 10, -5);
  direccional.castShadow = true;
  direccional.shadow.camera.left = -10;
  direccional.shadow.camera.right = 10;
  direccional.shadow.camera.top = 10;
  direccional.shadow.camera.bottom = -10;
  direccional.shadow.mapSize.width = 2048;
  direccional.shadow.mapSize.height = 2048;
  scene.add(direccional);

  const focal = new THREE.SpotLight(0xffffff, 0.8);
  focal.position.set(5, 12, 5);
  focal.target.position.set(0, 0, 0);
  focal.angle = Math.PI / 6;
  focal.penumbra = 0.2;
  focal.castShadow = true;
  focal.shadow.camera.far = 20;
  focal.shadow.camera.fov = 80;
  scene.add(focal);

  // Eventos
  window.addEventListener("resize", updateAspectRatio);
  renderer.domElement.addEventListener("dblclick", onDoubleClick);
  renderer.domElement.addEventListener("click", onSingleClick);
}

function createChessBoard() {
  const boardGroup = new THREE.Group();

  // Crear base del tablero
  const baseGeometry = new THREE.BoxGeometry(8.5, 0.5, 8.5);
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0x5d4037,
    roughness: 0.7,
    metalness: 0.2,
  });
  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  base.position.y = -0.3;
  base.receiveShadow = true;
  boardGroup.add(base);

  // Crear casillas del tablero
  const squareGeometry = new THREE.BoxGeometry(1, 0.1, 1);

  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      const isWhite = (i + j) % 2 === 0;
      const squareMaterial = new THREE.MeshStandardMaterial({
        color: isWhite ? 0xf5f5dc : 0x4b3621,
        roughness: 0.5,
        metalness: 0.1,
      });

      const square = new THREE.Mesh(squareGeometry, squareMaterial);
      square.position.set(i - 3.5, 0, j - 3.5);
      square.receiveShadow = true;
      square.userData = {
        type: "square",
        file: i,
        rank: j,
      };
      boardGroup.add(square);
    }
  }

  // Borde del tablero con letras y números
  const borderMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    roughness: 0.7,
    metalness: 0.2,
  });

  // Crear bordes
  const borderWidth = 0.5;
  const borderHeight = 0.2;

  // Bordes horizontales
  for (let side = 0; side < 2; side++) {
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(8 + borderWidth * 2, borderHeight, borderWidth),
      borderMaterial
    );
    border.position.set(0, 0, side === 0 ? -4.25 : 4.25);
    border.receiveShadow = true;
    boardGroup.add(border);
  }

  // Bordes verticales
  for (let side = 0; side < 2; side++) {
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(borderWidth, borderHeight, 8),
      borderMaterial
    );
    border.position.set(side === 0 ? -4.25 : 4.25, 0, 0);
    border.receiveShadow = true;
    boardGroup.add(border);
  }

  return boardGroup;
}

function createPiece(type, color, position) {
  const pieceGroup = new THREE.Group();
  let meshMaterial;

  if (color === "white") {
    meshMaterial = new THREE.MeshStandardMaterial({
      color: 0xfaf0e6,
      roughness: 0.3,
      metalness: 0.2,
    });
  } else {
    meshMaterial = new THREE.MeshStandardMaterial({
      color: 0x2f4f4f,
      roughness: 0.3,
      metalness: 0.2,
    });
  }

  let geometry;
  let height = 0;

  switch (type) {
    case "pawn":
      geometry = new THREE.CylinderGeometry(0.2, 0.25, 0.5, 16);
      height = 0.25;
      break;
    case "rook":
      geometry = new THREE.BoxGeometry(0.4, 0.7, 0.4);
      height = 0.35;
      break;
    case "knight":
      // Cuerpo del caballo
      const knightBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.25, 0.6, 16),
        meshMaterial
      );
      knightBody.position.y = 0.3;

      // Cabeza del caballo (simplificada)
      const knightHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 16, 16),
        meshMaterial
      );
      knightHead.position.set(0.1, 0.6, 0);

      pieceGroup.add(knightBody);
      pieceGroup.add(knightHead);
      height = 0;
      break;
    case "bishop":
      geometry = new THREE.ConeGeometry(0.25, 0.8, 16);
      height = 0.4;
      break;
    case "queen":
      // Base de la reina
      const queenBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.35, 0.6, 16),
        meshMaterial
      );
      queenBase.position.y = 0.3;

      // Corona de la reina
      const queenCrown = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 16, 16),
        meshMaterial
      );
      queenCrown.position.y = 0.75;

      pieceGroup.add(queenBase);
      pieceGroup.add(queenCrown);
      height = 0;
      break;
    case "king":
      // Base del rey
      const kingBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.35, 0.6, 16),
        meshMaterial
      );
      kingBase.position.y = 0.3;

      // Corona del rey
      const kingCrown = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 16, 16),
        meshMaterial
      );
      kingCrown.position.y = 0.75;

      // Cruz del rey
      const crossVertical = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.3, 0.08),
        meshMaterial
      );
      crossVertical.position.y = 1.05;

      const crossHorizontal = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.08, 0.08),
        meshMaterial
      );
      crossHorizontal.position.y = 0.95;

      pieceGroup.add(kingBase);
      pieceGroup.add(kingCrown);
      pieceGroup.add(crossVertical);
      pieceGroup.add(crossHorizontal);
      height = 0;
      break;
  }

  if (geometry) {
    const mesh = new THREE.Mesh(geometry, meshMaterial);
    mesh.position.y = height;
    pieceGroup.add(mesh);
  }

  // Configurar posición y sombras
  pieceGroup.position.set(position.x - 3.5, 0.1, position.z - 3.5);
  pieceGroup.userData = {
    type: "piece",
    pieceType: type,
    color: color,
    file: position.x,
    rank: position.z,
    moved: false,
  };

  // Aplicar sombras
  pieceGroup.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return pieceGroup;
}

function placePieces(group) {
  // Crear piezas blancas
  const whitePieces = [
    createPiece("rook", "white", { x: 0, z: 0 }),
    createPiece("knight", "white", { x: 1, z: 0 }),
    createPiece("bishop", "white", { x: 2, z: 0 }),
    createPiece("queen", "white", { x: 3, z: 0 }),
    createPiece("king", "white", { x: 4, z: 0 }),
    createPiece("bishop", "white", { x: 5, z: 0 }),
    createPiece("knight", "white", { x: 6, z: 0 }),
    createPiece("rook", "white", { x: 7, z: 0 }),
  ];

  // Crear peones blancos
  for (let i = 0; i < 8; i++) {
    whitePieces.push(createPiece("pawn", "white", { x: i, z: 1 }));
  }

  // Crear piezas negras
  const blackPieces = [
    createPiece("rook", "black", { x: 0, z: 7 }),
    createPiece("knight", "black", { x: 1, z: 7 }),
    createPiece("bishop", "black", { x: 2, z: 7 }),
    createPiece("queen", "black", { x: 3, z: 7 }),
    createPiece("king", "black", { x: 4, z: 7 }),
    createPiece("bishop", "black", { x: 5, z: 7 }),
    createPiece("knight", "black", { x: 6, z: 7 }),
    createPiece("rook", "black", { x: 7, z: 7 }),
  ];

  // Crear peones negros
  for (let i = 0; i < 8; i++) {
    blackPieces.push(createPiece("pawn", "black", { x: i, z: 6 }));
  }

  // Añadir piezas a la escena
  whitePieces.forEach((piece) => group.add(piece));
  blackPieces.forEach((piece) => group.add(piece));
}

function loadScene() {
  // Crear grupo para todos los elementos
  piezas = new THREE.Group();
  scene.add(piezas);

  // Crear y añadir tablero
  tablero = createChessBoard();
  piezas.add(tablero);

  placePieces(piezas);

  // Añadir ejes para referencia (opcional)
  //scene.add(new THREE.AxesHelper(5));

  // Habitacion
  const path = "./images/";
  const paredes = [];
  paredes.push(
    new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      map: new THREE.TextureLoader().load(path + "posx.jpg"),
    })
  );
  paredes.push(
    new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      map: new THREE.TextureLoader().load(path + "negx.jpg"),
    })
  );
  paredes.push(
    new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      map: new THREE.TextureLoader().load(path + "posy.jpg"),
    })
  );
  paredes.push(
    new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      map: new THREE.TextureLoader().load(path + "negy.jpg"),
    })
  );
  paredes.push(
    new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      map: new THREE.TextureLoader().load(path + "posz.jpg"),
    })
  );
  paredes.push(
    new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      map: new THREE.TextureLoader().load(path + "negz.jpg"),
    })
  );
  const habitacion = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), paredes);
  scene.add(habitacion);
}

function setupGUI() {
  // Definición de los controles
  effectController = {
    mensaje: "Ajedrez 3D",
    rotarTablero: 0.0,
    colorClaro: "rgb(245, 245, 220)",
    colorOscuro: "rgb(75, 54, 33)",
    reiniciarPosicion: function () {
      resetPieces();
    },
    nivelLuz: 0.5,
    mostrarAyudas: true,
  };

  // Creación interfaz
  const gui = new GUI();

  // Construcción del menú
  const h = gui.addFolder("Control de Tablero");
  h.add(effectController, "mensaje").name("Aplicación");
  h.add(effectController, "rotarTablero", -180.0, 180.0, 1.0).name(
    "Rotar tablero"
  );
  h.addColor(effectController, "colorClaro")
    .name("Color casillas claras")
    .onChange((c) => {
      tablero.children.forEach((child) => {
        if (child.userData && child.userData.type === "square") {
          if ((child.userData.file + child.userData.rank) % 2 === 0) {
            child.material.color.set(c);
          }
        }
      });
    });
  h.addColor(effectController, "colorOscuro")
    .name("Color casillas oscuras")
    .onChange((c) => {
      tablero.children.forEach((child) => {
        if (child.userData && child.userData.type === "square") {
          if ((child.userData.file + child.userData.rank) % 2 !== 0) {
            child.material.color.set(c);
          }
        }
      });
    });
  h.add(effectController, "nivelLuz", 0.1, 1.0, 0.1)
    .name("Nivel de luz")
    .onChange((v) => {
      scene.children.forEach((child) => {
        if (child.isLight && child.type !== "AmbientLight") {
          child.intensity = v;
        }
      });
    });
  h.add(effectController, "mostrarAyudas").name("Mostrar ayudas de movimiento");
  h.add(effectController, "reiniciarPosicion").name("Reiniciar tablero");
}

function resetPieces() {
  // Limpiar selecciones y resaltados
  clearHighlights();
  selectedPiece = null;

  // Eliminar TODAS las piezas existentes
  const piecesToRemove = [];
  piezas.children.forEach((child) => {
    if (child !== tablero) {
      piecesToRemove.push(child);
    }
  });

  // Eliminar las piezas del grupo
  piecesToRemove.forEach((piece) => piezas.remove(piece));

  // Asegurarse de que no queden piezas en la escena que fueron capturadas
  scene.children.forEach((child) => {
    if (child.userData && child.userData.type === "piece") {
      scene.remove(child);
    }
  });

  placePieces(piezas);
}

function updateAspectRatio() {
  const ar = window.innerWidth / window.innerHeight;

  // Dimensiones del canvas
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Reajuste de la relación de aspecto de las cámaras
  camera.aspect = ar;
  camera.updateProjectionMatrix();

  if (ar > 1) {
    alzado.left = planta.left = perfil.left = -L * ar;
    alzado.right = planta.right = perfil.right = L * ar;
  } else {
    alzado.top = planta.top = perfil.top = L / ar;
    alzado.bottom = planta.bottom = perfil.bottom = -L / ar;
  }

  alzado.updateProjectionMatrix();
  perfil.updateProjectionMatrix();
  planta.updateProjectionMatrix();
}

function clearHighlights() {
  // Eliminar todos los cuadrados resaltados
  highlightedSquares.forEach((highlight) => {
    scene.remove(highlight);
  });
  highlightedSquares = [];
}

function highlightSquare(x, z, color) {
  const highlightGeometry = new THREE.PlaneGeometry(1, 1);
  const highlightMaterial = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  });

  const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
  highlight.rotation.x = -Math.PI / 2;
  highlight.position.set(x - 3.5, 0.01, z - 3.5);

  scene.add(highlight);
  highlightedSquares.push(highlight);
}

function highlightPossibleMoves(piece) {
  if (!effectController.mostrarAyudas) return;

  const file = piece.userData.file;
  const rank = piece.userData.rank;
  const type = piece.userData.pieceType;
  const color = piece.userData.color;

  // Ejemplo básico de lógica de movimiento (simplificada)
  switch (type) {
    case "pawn":
      const direction = color === "white" ? 1 : -1;
      const startRank = color === "white" ? 1 : 6;

      // Movimiento hacia adelante
      highlightSquare(file, rank + direction, 0x00ff00);

      // Doble movimiento desde posición inicial
      if (rank === startRank) {
        highlightSquare(file, rank + 2 * direction, 0x00ff00);
      }
      break;

    case "rook":
      // Movimientos horizontales y verticales
      for (let i = 0; i < 8; i++) {
        if (i !== file) highlightSquare(i, rank, 0x00ff00);
        if (i !== rank) highlightSquare(file, i, 0x00ff00);
      }
      break;

    case "bishop":
      // Movimientos diagonales (simplificados)
      for (let i = 1; i < 8; i++) {
        if (file + i < 8 && rank + i < 8)
          highlightSquare(file + i, rank + i, 0x00ff00);
        if (file - i >= 0 && rank + i < 8)
          highlightSquare(file - i, rank + i, 0x00ff00);
        if (file + i < 8 && rank - i >= 0)
          highlightSquare(file + i, rank - i, 0x00ff00);
        if (file - i >= 0 && rank - i >= 0)
          highlightSquare(file - i, rank - i, 0x00ff00);
      }
      break;

    case "knight":
      // Movimientos en L
      const knightMoves = [
        { x: 1, z: 2 },
        { x: 2, z: 1 },
        { x: -1, z: 2 },
        { x: -2, z: 1 },
        { x: 1, z: -2 },
        { x: 2, z: -1 },
        { x: -1, z: -2 },
        { x: -2, z: -1 },
      ];

      knightMoves.forEach((move) => {
        const newFile = file + move.x;
        const newRank = rank + move.z;
        if (newFile >= 0 && newFile < 8 && newRank >= 0 && newRank < 8) {
          highlightSquare(newFile, newRank, 0x00ff00);
        }
      });
      break;

    case "queen":
      // Combina movimientos de torre y alfil
      for (let i = 0; i < 8; i++) {
        if (i !== file) highlightSquare(i, rank, 0x00ff00);
        if (i !== rank) highlightSquare(file, i, 0x00ff00);
      }

      for (let i = 1; i < 8; i++) {
        if (file + i < 8 && rank + i < 8)
          highlightSquare(file + i, rank + i, 0x00ff00);
        if (file - i >= 0 && rank + i < 8)
          highlightSquare(file - i, rank + i, 0x00ff00);
        if (file + i < 8 && rank - i >= 0)
          highlightSquare(file + i, rank - i, 0x00ff00);
        if (file - i >= 0 && rank - i >= 0)
          highlightSquare(file - i, rank - i, 0x00ff00);
      }
      break;

    case "king":
      // Movimientos de un cuadrado en todas direcciones
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (dx === 0 && dz === 0) continue;

          const newFile = file + dx;
          const newRank = rank + dz;
          if (newFile >= 0 && newFile < 8 && newRank >= 0 && newRank < 8) {
            highlightSquare(newFile, newRank, 0x00ff00);
          }
        }
      }
      break;
  }
}

// Modificación de la función onSingleClick
function onSingleClick(event) {
  // 1. Capturar la posición de click
  let x = event.clientX;
  let y = event.clientY;

  // 2. Normalizar las coordenadas de click
  x = (x / window.innerWidth) * 2 - 1;
  y = -(y / window.innerHeight) * 2 + 1;

  // 3. Crear el rayo e intersectar con la escena
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    // Encontrar el objeto padre (pieza o cuadrado)
    let selectedObject = intersects[0].object;
    while (selectedObject.parent && !selectedObject.userData.type) {
      selectedObject = selectedObject.parent;
    }

    // Si no encontramos un objeto con metadatos, salimos
    if (!selectedObject.userData || !selectedObject.userData.type) return;

    // Si hacemos click en una pieza
    if (selectedObject.userData.type === "piece") {
      // Si no hay pieza seleccionada, seleccionamos esta
      if (!selectedPiece) {
        selectedPiece = selectedObject;
        // Destacar la pieza seleccionada
        animatePiece(selectedPiece);
        // Mostrar posibles movimientos
        highlightSquare(
          selectedPiece.userData.file,
          selectedPiece.userData.rank,
          0x0000ff
        );
        highlightPossibleMoves(selectedPiece);

        // Desactivar temporalmente los controles de cámara mientras se selecciona una pieza
        //cameraControls.enabled = false;
      } else {
        // Si ya hay una pieza seleccionada
        if (selectedPiece === selectedObject) {
          // Si se clickea la misma pieza, deseleccionarla
          animateUnselectionPiece(selectedPiece);
          clearHighlights();
          selectedPiece = null;

          // Reactivar los controles de cámara
          cameraControls.enabled = true;
        } else {
          // Si clickeamos otra pieza diferente, cambiamos la selección
          animateUnselectionPiece(selectedPiece);
          clearHighlights();
          selectedPiece = selectedObject;
          animatePiece(selectedPiece);
          highlightSquare(
            selectedPiece.userData.file,
            selectedPiece.userData.rank,
            0x0000ff
          );
          highlightPossibleMoves(selectedPiece);
        }
      }
    }
    // Si hacemos click en un cuadrado y hay una pieza seleccionada
    else if (selectedObject.userData.type === "square" && selectedPiece) {
      const targetFile = selectedObject.userData.file;
      const targetRank = selectedObject.userData.rank;

      // Comprobar si el movimiento es a un cuadrado válido (resaltado)
      let isValidMove = false;
      highlightedSquares.forEach((highlight) => {
        if (
          Math.abs(highlight.position.x - (targetFile - 3.5)) < 0.1 &&
          Math.abs(highlight.position.z - (targetRank - 3.5)) < 0.1
        ) {
          isValidMove = true;
        }
      });

      if (isValidMove) {
        // Mover la pieza al nuevo cuadrado
        movePieceToField(selectedPiece, targetFile, targetRank);

        // Actualizar metadatos de la pieza
        selectedPiece.userData.file = targetFile;
        selectedPiece.userData.rank = targetRank;
        selectedPiece.userData.moved = true;
      }

      // Limpiar selección
      animateUnselectionPiece(selectedPiece);
      clearHighlights();
      selectedPiece = null;

      // Reactivar los controles de cámara
      cameraControls.enabled = true;
    }
  } else {
    // Si hacemos clic en el vacío y hay una pieza seleccionada, la deseleccionamos
    if (selectedPiece) {
      animateUnselectionPiece(selectedPiece);
      clearHighlights();
      selectedPiece = null;

      // Reactivar los controles de cámara
      cameraControls.enabled = true;
    }
  }
}

// Nueva función para animar la selección de una ficha
function animatePiece(ficha) {
  // Elevar la ficha y añadir un efecto para mostrar que está seleccionada
  new TWEEN.Tween(ficha.position)
    .to({ y: 1.2 }, 200) // Elevamos la ficha más para que sea más visible
    .easing(TWEEN.Easing.Cubic.Out)
    .start();
}

// Nueva función para animar la deselección de una ficha
function animateUnselectionPiece(ficha) {
  // Devolver la ficha a su altura normal
  new TWEEN.Tween(ficha.position)
    .to({ y: 0.1 }, 200) // Valor ajustado para el ajedrez
    .easing(TWEEN.Easing.Cubic.Out)
    .start();
}

// Nueva función para mover la ficha a una casilla
function movePieceToField(ficha, targetFile, targetRank) {
  // Animar el movimiento a la casilla
  new TWEEN.Tween(ficha.position)
    .to(
      {
        x: targetFile - 3.5,
        y: 0.1, // Altura normal de las piezas sobre el tablero
        z: targetRank - 3.5,
      },
      500
    ) // Puedes ajustar la velocidad o usar el valor de effectController.velocidadAnimacion si lo defines
    .easing(TWEEN.Easing.Cubic.Out)
    .start()
    .onComplete(() => {
      // Verificar si hay otras piezas en esa casilla (captura)
      veriftCapture(ficha, targetFile, targetRank);
    });
}

// Nueva función para verificar si hay piezas para capturar
function veriftCapture(movesPiece, file, rank) {
  piezas.children.forEach((child) => {
    // Si es una pieza diferente pero está en la misma casilla, la capturamos
    if (
      child !== movesPiece &&
      child !== tablero &&
      child.userData &&
      child.userData.type === "piece" &&
      child.userData.file === file &&
      child.userData.rank === rank
    ) {
      // Animación de captura (hacer desaparecer la pieza)
      new TWEEN.Tween(child.position)
        .to({ y: -5 }, 300)
        .start()
        .onComplete(() => {
          // Remover la pieza capturada de la escena
          piezas.remove(child);
        });
    }
  });
}

function onDoubleClick(event) {
  // 1. Capturar la posición de doble click
  let x = event.clientX;
  let y = event.clientY;

  // 2. Detectar la zona de click (para las diferentes vistas)
  let derecha = false,
    abajo = false;
  let cam = null;

  if (x > window.innerWidth / 2) {
    derecha = true;
    x -= window.innerWidth / 2;
  }
  if (y > window.innerHeight / 2) {
    abajo = true;
    y -= window.innerHeight / 2;
  }

  // Determinar qué cámara recibe el evento
  if (derecha)
    if (abajo) cam = camera;
    else cam = perfil;
  else if (abajo) cam = planta;
  else cam = alzado;

  // 3. Normalizar las coordenadas de click
  x = (x * 4) / window.innerWidth - 1;
  y = -((y * 4) / window.innerHeight) + 1;

  // 4. Construir el rayo y detectar intersecciones
  const rayo = new THREE.Raycaster();
  rayo.setFromCamera(new THREE.Vector2(x, y), cam);

  const intersects = rayo.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    // Encontrar el objeto padre
    let selectedObject = intersects[0].object;
    while (selectedObject.parent && !selectedObject.userData.type) {
      selectedObject = selectedObject.parent;
    }

    // Animar la pieza seleccionada
    if (selectedObject.userData && selectedObject.userData.type === "piece") {
      // Ejemplo: hacer que la pieza salte
      new TWEEN.Tween(selectedObject.position)
        .to({ y: [1, 0.1] }, 1000)
        .interpolation(TWEEN.Interpolation.Bezier)
        .easing(TWEEN.Easing.Bounce.Out)
        .start();
    }
  }
}

function update() {
  // Actualizar rotación del tablero según GUI
  piezas.rotation.y = (effectController.rotarTablero * Math.PI) / 180;

  // Actualizar animaciones
  TWEEN.update();
}

function render() {
  requestAnimationFrame(render);
  update();

  // Limpieza del canvas una vez por frame
  renderer.clear();

  // // Configurar los viewports
  // // Vista superior (alzado)
  // renderer.setViewport(
  //   0,
  //   window.innerHeight / 2,
  //   window.innerWidth / 2,
  //   window.innerHeight / 2
  // );
  // renderer.render(scene, alzado);

  // // Vista planta
  // renderer.setViewport(0, 0, window.innerWidth / 2, window.innerHeight / 2);
  // renderer.render(scene, planta);

  // // Vista lateral (perfil)
  // renderer.setViewport(
  //   window.innerWidth / 2,
  //   window.innerHeight / 2,
  //   window.innerWidth / 2,
  //   window.innerHeight / 2
  // );
  // renderer.render(scene, perfil);

  // // Vista perspectiva (principal)
  // renderer.setViewport(
  //   window.innerWidth / 2,
  //   0,
  //   window.innerWidth / 2,
  //   window.innerHeight / 2
  // );
  renderer.render(scene, camera);
}
