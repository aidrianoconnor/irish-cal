// 3D horizon viewer: the observer stands at the centre of a flat circular plain,
// with columns marking the cardinal and sub-cardinal directions, and turns with the arrow keys
//
// scene orientation: north is -Z, east is +X, up is +Y
// headings / azimuths are in degrees clockwise from north

import * as THREE from 'three';

var EYE_HEIGHT = 1.6;
var GROUND_RADIUS = 60;
var COLUMN_DISTANCE = 20;
var TURN_SPEED = 90; // degrees per second

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
scene.background = new THREE.Color('#6ea8e0');

var camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, EYE_HEIGHT, 0);
camera.rotation.order = 'YXZ';

scene.add(new THREE.HemisphereLight('#cfe6ff', '#3d6b2a', 1.6));
var sunLight = new THREE.DirectionalLight('#ffffff', 1.4);
sunLight.position.set(30, 50, 20);
scene.add(sunLight);

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

// turning

var heading = 0;
var turnDirection = { key: 0, button: 0 };

function setHeading(newHeading) {
    heading = ((newHeading % 360) + 360) % 360;
    camera.rotation.y = -THREE.MathUtils.degToRad(heading);

    var nearest = DIRECTIONS[Math.round(heading / 45) % 8].label;
    document.querySelector('#heading .deg').textContent = ('00' + (Math.round(heading) % 360)).slice(-3) + '° ' + nearest;
}

function isTypingTarget(target) {
    return target && (target.tagName == 'INPUT' || target.tagName == 'TEXTAREA' || target.tagName == 'SELECT');
}

var heldKeys = {};

function updateKeyTurn() {
    turnDirection.key = (heldKeys.ArrowRight ? 1 : 0) - (heldKeys.ArrowLeft ? 1 : 0);
}

window.addEventListener('keydown', function(e) {
    if((e.key == 'ArrowLeft' || e.key == 'ArrowRight') && !isTypingTarget(e.target)) {
        heldKeys[e.key] = true;
        updateKeyTurn();
        e.preventDefault();
    }
});

window.addEventListener('keyup', function(e) {
    if(e.key == 'ArrowLeft' || e.key == 'ArrowRight') {
        heldKeys[e.key] = false;
        updateKeyTurn();
    }
});

// stop turning if the window loses focus while a key is held
window.addEventListener('blur', function() {
    heldKeys = {};
    turnDirection.key = 0;
    turnDirection.button = 0;
});

// on-screen turn buttons, for touch screens
function bindTurnButton(id, dir) {
    var button = document.getElementById(id);
    button.addEventListener('pointerdown', function(e) {
        button.setPointerCapture(e.pointerId);
        turnDirection.button = dir;
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function(type) {
        button.addEventListener(type, function() {
            turnDirection.button = 0;
        });
    });
}
bindTurnButton('turnLeft', -1);
bindTurnButton('turnRight', 1);

// clicking the scene hands the arrow keys back to turning
renderer.domElement.addEventListener('pointerdown', function() {
    if(isTypingTarget(document.activeElement)) {
        document.activeElement.blur();
    }
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

    renderer.render(scene, camera);
}

window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

initObserverInputs();
readObserverInputs();
setHeading(0);
renderer.setAnimationLoop(animate);
