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

// Variables para las piezas capturadas
let capturedWhitePieces = [];
let capturedBlackPieces = [];

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

  // Crear áreas para piezas capturadas
  createCapturedAreas();

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
    Sombras: true,
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
  h.add(effectController, "Sombras").onChange((v) => {
    scene.children.forEach((child) => {
      child.castShadow = v;
    });
  });
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

  // Reiniciar los arrays de piezas capturadas
  capturedWhitePieces = [];
  capturedBlackPieces = [];

  placePieces(piezas);
  createCapturedAreas();
}

// Agregar áreas visuales para las piezas capturadas (opcional)
function createCapturedAreas() {
  // Crear plataformas para las piezas capturadas
  const areaMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888,
    roughness: 0.7,
    metalness: 0.2,
  });

  // Área para piezas blancas capturadas (izquierda)
  const whiteAreaGeometry = new THREE.BoxGeometry(2, 0.05, 8);
  const whiteArea = new THREE.Mesh(whiteAreaGeometry, areaMaterial);
  whiteArea.position.set(-6.5, -0.1, 0);
  whiteArea.receiveShadow = true;
  piezas.add(whiteArea);

  // Área para piezas negras capturadas (derecha)
  const blackAreaGeometry = new THREE.BoxGeometry(2, 0.05, 8);
  const blackArea = new THREE.Mesh(blackAreaGeometry, areaMaterial);
  blackArea.position.set(6.5, -0.1, 0);
  blackArea.receiveShadow = true;
  piezas.add(blackArea);

  // Etiquetas para las áreas (opcional)
  // Puedes crear geometrías de texto o utilizar sprites con texturas
  // para indicar "Piezas blancas" y "Piezas negras"
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
  highlight.position.set(x - 3.5, 0.08, z - 3.5);

  highlight.userData = {
    type: "highlight",
    file: x,
    rank: z,
  };

  scene.add(highlight);
  highlightedSquares.push(highlight);
}

function highlightPossibleMoves(piece) {
  if (!effectController.mostrarAyudas) return;

  const file = piece.userData.file;
  const rank = piece.userData.rank;
  const type = piece.userData.pieceType;
  const color = piece.userData.color;

  // Función para comprobar si hay una pieza en una posición específica
  function isPieceAt(x, z) {
    let result = { occupied: false, pieceColor: null };

    piezas.children.forEach((child) => {
      if (
        child.userData &&
        child.userData.type === "piece" &&
        child.userData.file === x &&
        child.userData.rank === z
      ) {
        result.occupied = true;
        result.pieceColor = child.userData.color;
      }
    });

    return result;
  }

  // Función para verificar si un movimiento es válido considerando obstáculos
  function isValidMove(x, z) {
    // Verificar límites del tablero
    if (x < 0 || x >= 8 || z < 0 || z >= 8) {
      return false;
    }

    const pieceAtTarget = isPieceAt(x, z);

    // Si está ocupado por una pieza del mismo color, no es válido
    if (pieceAtTarget.occupied && pieceAtTarget.pieceColor === color) {
      return false;
    }

    return true;
  }

  // Función para resaltar una casilla si el movimiento es válido
  function highlightIfValid(x, z, captureOnly = false) {
    const pieceAtTarget = isPieceAt(x, z);

    // Si es un movimiento de captura y no hay pieza para capturar, o si se requiere captura pero no hay pieza enemiga
    if (captureOnly && !pieceAtTarget.occupied) {
      return false;
    }

    // Si es un movimiento de captura y hay una pieza amiga, no es válido
    if (pieceAtTarget.occupied && pieceAtTarget.pieceColor === color) {
      return false;
    }

    // Si la casilla está ocupada por una pieza enemiga
    if (pieceAtTarget.occupied && pieceAtTarget.pieceColor !== color) {
      highlightSquare(x, z, 0xff0000); // Destacar en rojo las capturas posibles
      return true; // Encontró una pieza enemiga
    } else if (!captureOnly) {
      highlightSquare(x, z, 0x00ff00); // Destacar en verde los movimientos normales
    }

    return pieceAtTarget.occupied; // Devuelve true si encontró una pieza (para detener la búsqueda en esa dirección)
  }

  // Función para verificar movimientos en línea (torre, alfil, reina)
  function checkLineMovements(directions) {
    directions.forEach((dir) => {
      for (let i = 1; i < 8; i++) {
        const newFile = file + dir.x * i;
        const newRank = rank + dir.y * i;

        // Si salimos del tablero, detenemos la búsqueda en esta dirección
        if (newFile < 0 || newFile >= 8 || newRank < 0 || newRank >= 8) {
          break;
        }

        // Comprobamos si la casilla está ocupada
        const pieceAtTarget = isPieceAt(newFile, newRank);

        if (pieceAtTarget.occupied) {
          // Si hay una pieza enemiga, podemos capturarla y terminamos esta dirección
          if (pieceAtTarget.pieceColor !== color) {
            highlightSquare(newFile, newRank, 0xff0000);
          }
          break; // Detenemos la búsqueda en esta dirección porque hay una pieza bloqueando
        } else {
          // Si no hay pieza, podemos movernos allí
          highlightSquare(newFile, newRank, 0x00ff00);
        }
      }
    });
  }

  // Lógica específica para cada tipo de pieza
  switch (type) {
    case "pawn":
      const direction = color === "white" ? 1 : -1;
      const startRank = color === "white" ? 1 : 6;

      // Verificar movimiento hacia adelante (solo si no hay piezas)
      const frontSquare = isPieceAt(file, rank + direction);
      if (!frontSquare.occupied) {
        highlightSquare(file, rank + direction, 0x00ff00);

        // Verificar doble movimiento desde posición inicial
        if (rank === startRank) {
          const doubleSquare = isPieceAt(file, rank + 2 * direction);
          if (!doubleSquare.occupied) {
            highlightSquare(file, rank + 2 * direction, 0x00ff00);
          }
        }
      }

      // Verificar capturas diagonales
      const leftDiag = isPieceAt(file - 1, rank + direction);
      if (leftDiag.occupied && leftDiag.pieceColor !== color) {
        highlightSquare(file - 1, rank + direction, 0xff0000);
      }

      const rightDiag = isPieceAt(file + 1, rank + direction);
      if (rightDiag.occupied && rightDiag.pieceColor !== color) {
        highlightSquare(file + 1, rank + direction, 0xff0000);
      }
      break;

    case "rook":
      // Movimientos horizontales y verticales
      checkLineMovements([
        { x: 1, y: 0 }, // Derecha
        { x: -1, y: 0 }, // Izquierda
        { x: 0, y: 1 }, // Arriba
        { x: 0, y: -1 }, // Abajo
      ]);
      break;

    case "bishop":
      // Movimientos diagonales
      checkLineMovements([
        { x: 1, y: 1 }, // Diagonal superior derecha
        { x: 1, y: -1 }, // Diagonal inferior derecha
        { x: -1, y: 1 }, // Diagonal superior izquierda
        { x: -1, y: -1 }, // Diagonal inferior izquierda
      ]);
      break;

    case "knight":
      // Movimientos en L (los caballos pueden saltar sobre otras piezas)
      const knightMoves = [
        { x: 1, y: 2 },
        { x: 2, y: 1 },
        { x: -1, y: 2 },
        { x: -2, y: 1 },
        { x: 1, y: -2 },
        { x: 2, y: -1 },
        { x: -1, y: -2 },
        { x: -2, y: -1 },
      ];

      knightMoves.forEach((move) => {
        const newFile = file + move.x;
        const newRank = rank + move.y;

        if (isValidMove(newFile, newRank)) {
          const pieceAtTarget = isPieceAt(newFile, newRank);
          if (pieceAtTarget.occupied) {
            highlightSquare(newFile, newRank, 0xff0000); // Captura
          } else {
            highlightSquare(newFile, newRank, 0x00ff00); // Movimiento normal
          }
        }
      });
      break;

    case "queen":
      // Combina movimientos de torre y alfil
      checkLineMovements([
        { x: 1, y: 0 }, // Derecha
        { x: -1, y: 0 }, // Izquierda
        { x: 0, y: 1 }, // Arriba
        { x: 0, y: -1 }, // Abajo
        { x: 1, y: 1 }, // Diagonal superior derecha
        { x: 1, y: -1 }, // Diagonal inferior derecha
        { x: -1, y: 1 }, // Diagonal superior izquierda
        { x: -1, y: -1 }, // Diagonal inferior izquierda
      ]);
      break;

    case "king":
      // Movimientos de un cuadrado en todas direcciones
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (dx === 0 && dz === 0) continue;

          const newFile = file + dx;
          const newRank = rank + dz;

          if (isValidMove(newFile, newRank)) {
            const pieceAtTarget = isPieceAt(newFile, newRank);
            if (pieceAtTarget.occupied) {
              highlightSquare(newFile, newRank, 0xff0000); // Captura
            } else {
              highlightSquare(newFile, newRank, 0x00ff00); // Movimiento normal
            }
          }
        }
      }
      break;
  }
}

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

  // Filtrar los highlights de las intersecciones
  let validIntersects = [];
  for (let i = 0; i < intersects.length; i++) {
    let obj = intersects[i].object;

    // Verificar si el objeto o algún padre es un highlight
    let isHighlight = false;
    let current = obj;

    while (current) {
      if (current.userData && current.userData.type === "highlight") {
        isHighlight = true;
        break;
      }
      current = current.parent;
    }

    // Si no es un highlight, lo agregamos a las intersecciones válidas
    if (!isHighlight) {
      validIntersects.push(intersects[i]);
    }
  }

  if (validIntersects.length > 0) {
    // Encontrar el objeto padre (pieza o cuadrado)
    let selectedObject = validIntersects[0].object;
    while (selectedObject.parent && !selectedObject.userData.type) {
      selectedObject = selectedObject.parent;
    }

    // Si no encontramos un objeto con metadatos, salimos
    if (!selectedObject.userData || !selectedObject.userData.type) return;

    // Si hacemos click en una pieza
    if (selectedObject.userData.type === "piece") {
      // CASO 1: Si no hay pieza seleccionada, seleccionamos esta
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
      }
      // CASO 2: Ya hay una pieza seleccionada
      else {
        // 2.1: Si se clickea la misma pieza, deseleccionarla
        if (selectedPiece === selectedObject) {
          animateUnselectionPiece(selectedPiece);
          clearHighlights();
          selectedPiece = null;
          cameraControls.enabled = true;
        }
        // 2.2: Es una pieza diferente
        else {
          // Verificar si la pieza clickeada está en una posición válida para capturar
          const targetFile = selectedObject.userData.file;
          const targetRank = selectedObject.userData.rank;

          // Comprobar si es un movimiento válido (está resaltado)
          let isValidMove = false;
          highlightedSquares.forEach((highlight) => {
            if (
              Math.abs(highlight.position.x - (targetFile - 3.5)) < 0.1 &&
              Math.abs(highlight.position.z - (targetRank - 3.5)) < 0.1
            ) {
              isValidMove = true;
            }
          });

          // Si es un movimiento válido y es una pieza enemiga (diferente color)
          if (
            isValidMove &&
            selectedPiece.userData.color !== selectedObject.userData.color
          ) {
            // Capturar la pieza
            veriftCapture(selectedPiece, targetFile, targetRank);

            // Mover la pieza seleccionada a esa posición
            movePieceToField(selectedPiece, targetFile, targetRank);

            // Actualizar metadatos de la pieza
            selectedPiece.userData.file = targetFile;
            selectedPiece.userData.rank = targetRank;
            selectedPiece.userData.moved = true;

            // Limpiar selección
            animateUnselectionPiece(selectedPiece);
            clearHighlights();
            selectedPiece = null;
            cameraControls.enabled = true;
          }
          // Si no es un movimiento válido o es una pieza del mismo color, cambiar selección
          else {
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
        // Verificar si hay una pieza en el destino para capturarla
        veriftCapture(selectedPiece, targetFile, targetRank);

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
      cameraControls.enabled = true;
    }
  } else {
    // Si hacemos clic en el vacío y hay una pieza seleccionada, la deseleccionamos
    if (selectedPiece) {
      animateUnselectionPiece(selectedPiece);
      clearHighlights();
      selectedPiece = null;
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

function moveToCapturedArea(capturedPiece) {
  // Determinar la posición final según el color y número de piezas capturadas
  const pieceColor = capturedPiece.userData.color;
  const pieceType = capturedPiece.userData.pieceType;

  // Coordenadas para el área de piezas capturadas
  let targetX, targetY, targetZ;

  if (pieceColor === "white") {
    // Piezas blancas capturadas van a la izquierda del tablero
    capturedWhitePieces.push(capturedPiece);
    const index = capturedWhitePieces.length - 1;

    // Configurar posición según la cantidad de piezas capturadas
    targetX = -6 - (index % 2); // 2 columnas
    targetZ = -3 + Math.floor(index / 2) * 0.7; // Filas de piezas
    targetY = 0.1; // Altura estándar
  } else {
    // Piezas negras capturadas van a la derecha del tablero
    capturedBlackPieces.push(capturedPiece);
    const index = capturedBlackPieces.length - 1;

    // Configurar posición según la cantidad de piezas capturadas
    targetX = 6 + (index % 2); // 2 columnas
    targetZ = -3 + Math.floor(index / 2) * 0.7; // Filas de piezas
    targetY = 0.1; // Altura estándar
  }

  // Calcular una ruta de arco para la animación
  const startY = capturedPiece.position.y;
  const midY = 2; // Altura máxima del arco

  // Animar el movimiento con una trayectoria en arco
  new TWEEN.Tween({ t: 0 })
    .to({ t: 1 }, 1000)
    .onUpdate(function (obj) {
      // Calcular la posición actual en la trayectoria
      const t = obj.t;

      // Interpolación de posiciones con un arco para la altura
      capturedPiece.position.x =
        capturedPiece.position.x * (1 - t) + targetX * t;

      // Arco parabólico para la altura (y)
      // Forma simplificada de una curva de Bézier cuadrática
      capturedPiece.position.y =
        startY * (1 - t) * (1 - t) + midY * 2 * (1 - t) * t + targetY * t * t;

      capturedPiece.position.z =
        capturedPiece.position.z * (1 - t) + targetZ * t;

      // Escalar la pieza a un tamaño más pequeño
      const scale = 1 - 0.4 * t; // Reducir al 60% del tamaño original
      capturedPiece.scale.set(scale, scale, scale);
    })
    .easing(TWEEN.Easing.Cubic.Out)
    .start()
    .onComplete(() => {
      // Actualizar metadatos de la pieza
      capturedPiece.userData.captured = true;
      capturedPiece.userData.file = -1; // Indicar que ya no está en el tablero
      capturedPiece.userData.rank = -1;
    });
}

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
      // En vez de eliminar la pieza, la movemos al área de capturadas
      moveToCapturedArea(child);
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
