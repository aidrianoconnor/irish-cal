// 3D horizon viewer: the observer starts at the centre of a flat circular plain,
// with columns marking the cardinal and sub-cardinal directions.
// left / right arrow keys turn, up / down arrow keys move forward / back,
// and holding the right mouse button (or dragging a finger on a touch screen) gives free look.
// the on-screen buttons do the same as the arrow keys, plus a reset to the centre facing south
//
// scene orientation: north is -Z, east is +X, up is +Y
// headings / azimuths are in degrees clockwise from north

import * as THREE from 'three';

var EYE_HEIGHT = 1.6;
var GROUND_RADIUS = 60;
var COLUMN_DISTANCE = 20;
var TURN_SPEED = 90; // degrees per second
var MOVE_SPEED = 6; // units per second
var EDGE_MARGIN = 2; // how close the observer can walk to the edge of the plain
var LOOK_SENSITIVITY = 0.15; // degrees per pixel of mouse movement
var MAX_PITCH = 85; // how far up / down the observer can look, in degrees
var RESET_HEADING = 180; // the observer starts (and resets to) looking south
var SKY_RADIUS = 500;
var SKY_TOP_COLOR = '#3f9cff'; // daylight blue
var SKY_BOTTOM_COLOR = '#000000'; // night

var DIRECTIONS = [
    { label: 'N', azimuth: 0, cardinal: true },
    { label: 'NE', azimuth: 45, cardinal: false },
    { label: 'E', azimuth: 90, cardinal: true },
    { label: 'SE', azimuth: 135, cardinal: false },
    { label: 'S', azimuth: 180, cardinal: true },
    { label: 'SW', azimuth: 225, cardinal: false },
    { label: 'W', azimuth: 270, cardinal: true },
    { label: 'NW', azimuth: 315, cardinal: false }
];

// position on the plain at the given azimuth and distance from the centre
function azimuthToXZ(azimuth, distance) {
    var rad = THREE.MathUtils.degToRad(azimuth);
    return { x: Math.sin(rad) * distance, z: -Math.cos(rad) * distance };
}

// scene setup

var container = document.getElementById('scene');

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, EYE_HEIGHT, 0);
camera.rotation.order = 'YXZ';

// lighting for the ground and columns (the sky dome is unlit, so isn't affected):
// the hemisphere light is the ambient fill, lighting everything from all around with no position;
// the directional light gives the columns some shading
scene.add(new THREE.HemisphereLight('#cfe6ff', '#3d6b2a', 1.6));
var sunLight = new THREE.DirectionalLight('#ffffff', 1.4);
sunLight.position.set(30, 50, 20);
scene.add(sunLight);

// sky dome: a sphere seen from the inside, coloured with a gradient from
// daylight blue at its top pole to night black at its bottom pole.
// the colours are part of the sphere, so rotating it (e.g. for the time of day) moves the gradient with it
function makeSkyDome() {
    var geometry = new THREE.SphereGeometry(SKY_RADIUS, 64, 64);
    var positions = geometry.attributes.position;
    var colors = new Float32Array(positions.count * 3);
    var bottom = new THREE.Color(SKY_BOTTOM_COLOR);
    var top = new THREE.Color(SKY_TOP_COLOR);
    var color = new THREE.Color();

    for(var i = 0; i < positions.count; i++) {
        var t = ((positions.getY(i) / SKY_RADIUS) + 1) / 2; // 0 at the bottom pole, 1 at the top
        color.lerpColors(bottom, top, t);
        color.toArray(colors, i * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    var dome = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.BackSide, // draw the inside surface, which is the side we're looking at
        depthWrite: false
    }));
    dome.renderOrder = -1; // drawn first, behind everything else
    return dome;
}

var skyDome = makeSkyDome();
scene.add(skyDome);

var ground = new THREE.Mesh(
    new THREE.CircleGeometry(GROUND_RADIUS, 128),
    new THREE.MeshStandardMaterial({ color: '#3f8a34', roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// direction columns and labels

function makeLabelSprite(text) {
    var canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    var context = canvas.getContext('2d');
    context.font = 'bold 96px Arial, Helvetica, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineWidth = 10;
    context.strokeStyle = 'rgba(0, 17, 34, .8)';
    context.strokeText(text, 128, 68);
    context.fillStyle = '#ffffff';
    context.fillText(text, 128, 68);

    var texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
    sprite.scale.set(3, 1.5, 1);
    return sprite;
}

function makeDirectionMarker(direction) {
    var height = direction.cardinal ? 2.4 : 1.6;
    var marker = new THREE.Group();

    var column = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.35, height, 24),
        new THREE.MeshStandardMaterial({ color: direction.cardinal ? '#ffffff' : '#d4d4d4', roughness: .8 })
    );
    column.position.y = height / 2;
    marker.add(column);

    var label = makeLabelSprite(direction.label);
    label.position.y = height + 1.1;
    marker.add(label);

    var pos = azimuthToXZ(direction.azimuth, COLUMN_DISTANCE);
    marker.position.set(pos.x, 0, pos.z);
    return marker;
}

for(var i = 0; i < DIRECTIONS.length; i++) {
    scene.add(makeDirectionMarker(DIRECTIONS[i]));
}

// turning and moving

var heading = 0;
var pitch = 0; // degrees above (+) or below (-) the horizon

// held controls, from the arrow keys and from the on-screen buttons
var turnDirection = { key: 0, button: 0 }; // 1 = right, -1 = left
var moveDirection = { key: 0, button: 0 }; // 1 = forward, -1 = back

function updateHeadingDisplay() {
    var nearest = DIRECTIONS[Math.round(heading / 45) % 8].label;
    var text = ('00' + (Math.round(heading) % 360)).slice(-3) + '° ' + nearest;
    var roundedPitch = Math.round(pitch);
    if(roundedPitch != 0) {
        text += ' · ' + Math.abs(roundedPitch) + '° ' + (roundedPitch > 0 ? 'up' : 'down');
    }
    document.querySelector('#heading .deg').textContent = text;
}

function setHeading(newHeading) {
    heading = ((newHeading % 360) + 360) % 360;
    camera.rotation.y = -THREE.MathUtils.degToRad(heading);
    updateHeadingDisplay();
}

function setPitch(newPitch) {
    pitch = THREE.MathUtils.clamp(newPitch, -MAX_PITCH, MAX_PITCH);
    camera.rotation.x = THREE.MathUtils.degToRad(pitch);
    updateHeadingDisplay();
}

function isTypingTarget(target) {
    return target && (target.tagName == 'INPUT' || target.tagName == 'TEXTAREA' || target.tagName == 'SELECT');
}

// moves the observer along the ground, keeping them on the plain
function moveObserver(distance) {
    var step = azimuthToXZ(heading, distance);
    var x = camera.position.x + step.x;
    var z = camera.position.z + step.z;

    var maxDistance = GROUND_RADIUS - EDGE_MARGIN;
    var fromCentre = Math.sqrt((x * x) + (z * z));
    if(fromCentre > maxDistance) {
        x *= maxDistance / fromCentre;
        z *= maxDistance / fromCentre;
    }

    camera.position.x = x;
    camera.position.z = z;
}

// back to the centre of the plain, looking level towards the south
function resetView() {
    camera.position.set(0, EYE_HEIGHT, 0);
    setHeading(RESET_HEADING);
    setPitch(0);
}

var ARROW_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
var heldKeys = {};

function updateKeyControls() {
    turnDirection.key = (heldKeys.ArrowRight ? 1 : 0) - (heldKeys.ArrowLeft ? 1 : 0);
    moveDirection.key = (heldKeys.ArrowUp ? 1 : 0) - (heldKeys.ArrowDown ? 1 : 0);
}

window.addEventListener('keydown', function(e) {
    if(ARROW_KEYS.indexOf(e.key) > -1 && !isTypingTarget(e.target)) {
        heldKeys[e.key] = true;
        updateKeyControls();
        e.preventDefault();
    }
});

window.addEventListener('keyup', function(e) {
    if(ARROW_KEYS.indexOf(e.key) > -1) {
        heldKeys[e.key] = false;
        updateKeyControls();
    }
});

// stop turning / moving / looking if the window loses focus while a key or button is held
window.addEventListener('blur', function() {
    heldKeys = {};
    updateKeyControls();
    turnDirection.button = 0;
    moveDirection.button = 0;
    endFreeLook();
});

// on-screen buttons: turn / move while held
function bindHoldButton(id, control, dir) {
    var button = document.getElementById(id);
    button.addEventListener('pointerdown', function(e) {
        control.button = dir;
        button.setPointerCapture(e.pointerId);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function(type) {
        button.addEventListener(type, function() {
            control.button = 0;
        });
    });
}
bindHoldButton('turnLeft', turnDirection, -1);
bindHoldButton('turnRight', turnDirection, 1);
bindHoldButton('moveForward', moveDirection, 1);
bindHoldButton('moveBack', moveDirection, -1);

document.getElementById('reset').addEventListener('click', resetView);

// clicking the scene hands the arrow keys back to turning
renderer.domElement.addEventListener('pointerdown', function() {
    if(isTypingTarget(document.activeElement)) {
        document.activeElement.blur();
    }
});

// free look: hold the right mouse button and move the mouse, or drag with a finger on a touch screen.
// the mouse turns the view the way it moves; a finger drags the scene, so the view moves the other way
var look = null; // the pointer doing the looking: { id, x, y, touch }

renderer.domElement.addEventListener('pointerdown', function(e) {
    var isMouse = (e.pointerType == 'mouse');
    if(look || (isMouse ? e.button != 2 : !e.isPrimary)) {
        return;
    }
    look = { id: e.pointerId, x: e.clientX, y: e.clientY, touch: !isMouse };
    renderer.domElement.setPointerCapture(e.pointerId);
    if(isMouse) {
        renderer.domElement.style.cursor = 'grabbing';
    }
});

renderer.domElement.addEventListener('pointermove', function(e) {
    if(!look || e.pointerId != look.id) {
        return;
    }
    // with several mouse buttons held, releasing the right one doesn't fire pointerup
    if(!look.touch && !(e.buttons & 2)) {
        endFreeLook();
        return;
    }

    var dx = e.clientX - look.x;
    var dy = e.clientY - look.y;
    look.x = e.clientX;
    look.y = e.clientY;

    if(look.touch) {
        // scaled so the scene stays under the finger
        var degPerPixel = camera.fov / window.innerHeight;
        setHeading(heading - (dx * degPerPixel));
        setPitch(pitch + (dy * degPerPixel));
    } else {
        setHeading(heading + (dx * LOOK_SENSITIVITY));
        setPitch(pitch - (dy * LOOK_SENSITIVITY));
    }
});

function endFreeLook() {
    look = null;
    renderer.domElement.style.cursor = '';
}

['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function(type) {
    renderer.domElement.addEventListener(type, function(e) {
        if(look && e.pointerId == look.id && (look.touch || type != 'pointerup' || e.button == 2)) {
            endFreeLook();
        }
    });
});

// keep the browser's right-click menu from getting in the way of free look
renderer.domElement.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

// observer location and time

var observer = { lat: 0, lon: 0, date: new Date() };

var latInput = document.getElementById('lat');
var lonInput = document.getElementById('lon');
var dateInput = document.getElementById('date');
var timeInput = document.getElementById('time');

function initObserverInputs() {
    var now = new Date();
    dateInput.value = now.toISOString().slice(0, 10);
    timeInput.value = now.toISOString().slice(11, 16);
}

function readNumberInput(input, min, max) {
    var value = parseFloat(input.value);
    var valid = !isNaN(value) && value >= min && value <= max;
    input.classList.toggle('invalid', !valid);
    return valid ? value : null;
}

// reads the form into the observer state; invalid fields are flagged and left unchanged
function readObserverInputs() {
    var lat = readNumberInput(latInput, -90, 90);
    var lon = readNumberInput(lonInput, -180, 180);
    var date = new Date(dateInput.value + 'T' + timeInput.value + ':00Z');
    var dateValid = !isNaN(date.getTime());
    dateInput.classList.toggle('invalid', !dateValid);
    timeInput.classList.toggle('invalid', !dateValid);

    if(lat !== null) observer.lat = lat;
    if(lon !== null) observer.lon = lon;
    if(dateValid) observer.date = date;

    onObserverChange(observer);
}

// hook for things that depend on where / when the observer is (sun, moon, stars...)
function onObserverChange(obs) {
}

document.getElementById('observer').addEventListener('input', readObserverInputs);
document.getElementById('observer').addEventListener('submit', function(e) {
    e.preventDefault();
    if(document.activeElement) document.activeElement.blur();
});

// render loop

var lastTime = null;

function animate(time) {
    // capped so a stalled frame (e.g. a background tab) doesn't cause a big jump
    var dt = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    var turn = turnDirection.key || turnDirection.button;
    if(turn) {
        setHeading(heading + (turn * TURN_SPEED * dt));
    }
    var move = moveDirection.key || moveDirection.button;
    if(move) {
        moveObserver(move * MOVE_SPEED * dt);
    }

    // the sky is infinitely far away, so it stays centred on the observer as they walk
    skyDome.position.copy(camera.position);

    renderer.render(scene, camera);
}

window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

initObserverInputs();
readObserverInputs();
resetView();
renderer.setAnimationLoop(animate);
