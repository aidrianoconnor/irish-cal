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
var MOON_DISTANCE = 400; // inside the sky dome
var MOON_SIZE_SCALE = 6; // the real moon (about 0.5 deg across) is drawn this many times larger so it's easy to see

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

// unit vector towards a point in the sky at the given azimuth and altitude (degrees)
function skyDirection(azimuth, altitude) {
    var az = THREE.MathUtils.degToRad(azimuth);
    var alt = THREE.MathUtils.degToRad(altitude);
    return new THREE.Vector3(Math.cos(alt) * Math.sin(az), Math.sin(alt), -Math.cos(alt) * Math.cos(az));
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

// lighting for the ground and columns (the sky dome is unlit, so isn't affected), set from the sun by setSun:
// the hemisphere light is the ambient fill, lighting everything from all around with no position;
// the directional light is the sunlight, shining from the sun's direction
var ambientLight = new THREE.HemisphereLight();
scene.add(ambientLight);
var sunLight = new THREE.DirectionalLight('#fff6e8');
scene.add(sunLight);

// sky dome: a sphere seen from the inside, coloured by a shader from the sun's position.
// each point's colour depends on its height above the horizon, how high the sun is
// (day / twilight / night) and how close it is to the sun (the bright haze around it).
// the colours come from world directions, so the dome itself can later be rotated (e.g. for stars)
// without moving the daylight around
var SKY_VERTEX_SHADER = [
    'varying vec3 vDirection;',
    'void main() {',
    '    vDirection = normalize(mat3(modelMatrix) * position);',
    '    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
].join('\n');

var SKY_FRAGMENT_SHADER = [
    'uniform vec3 sunDirection;',
    'uniform vec3 dayZenith;',
    'uniform vec3 dayHorizon;',
    'uniform vec3 nightZenith;',
    'uniform vec3 nightHorizon;',
    'uniform vec3 twilightGlow;',
    'varying vec3 vDirection;',
    '',
    'void main() {',
    '    vec3 dir = normalize(vDirection);',
    '    float height = clamp(dir.y, 0.0, 1.0);', // 0 at (and below) the horizon, 1 straight up
    '    float sunHeight = sunDirection.y;',
    '    float toSun = max(dot(dir, sunDirection), 0.0);',
    '',
    // day: pale, hazy horizon deepening to a rich blue overhead, brightest around the sun
    '    vec3 day = mix(dayHorizon, dayZenith, pow(height, 0.5));',
    '    day += vec3(1.0, 0.96, 0.88) * ((0.18 * pow(toSun, 24.0)) + (0.5 * pow(toSun, 400.0)));',
    '',
    // night: near black overhead, with a faint glow along the horizon
    '    vec3 night = mix(nightHorizon, nightZenith, pow(height, 0.35));',
    '',
    // 0 once the sun is ~10 deg below the horizon (night), 1 once it's ~12 deg above (day)
    '    float daylight = smoothstep(-0.17, 0.2, sunHeight);',
    '    vec3 color = mix(night, day, daylight);',
    '',
    // twilight: a warm glow low in the sky on the sun's side, while it's near the horizon
    '    float twilight = smoothstep(-0.3, -0.03, sunHeight) * (1.0 - smoothstep(0.0, 0.25, sunHeight));',
    '    vec2 flatDir = normalize(dir.xz + vec2(1e-5));',
    '    vec2 flatSun = normalize(sunDirection.xz + vec2(1e-5));',
    '    float sunSide = pow((dot(flatDir, flatSun) + 1.0) / 2.0, 3.0);',
    '    color += twilightGlow * twilight * sunSide * pow(1.0 - height, 4.0);',
    '',
    // a touch of noise to stop the dark gradients from banding
    '    float noise = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);',
    '    color += (noise - 0.5) / 255.0;',
    '',
    '    gl_FragColor = vec4(color, 1.0);',
    '}'
].join('\n');

// shader colours are written straight to the screen, so these are given as sRGB (the same as CSS colours)
function srgbColor(css) {
    return new THREE.Color().setStyle(css, THREE.SRGBColorSpace).convertLinearToSRGB();
}

function makeSkyDome() {
    var material = new THREE.ShaderMaterial({
        uniforms: {
            sunDirection: { value: new THREE.Vector3(0, 1, 0) },
            dayZenith: { value: srgbColor('#1d58c0') },
            dayHorizon: { value: srgbColor('#b4d0ec') },
            nightZenith: { value: srgbColor('#010209') },
            nightHorizon: { value: srgbColor('#0a1024') },
            twilightGlow: { value: srgbColor('#ff7a33') }
        },
        vertexShader: SKY_VERTEX_SHADER,
        fragmentShader: SKY_FRAGMENT_SHADER,
        side: THREE.BackSide, // draw the inside surface, which is the side we're looking at
        depthWrite: false
    });

    var dome = new THREE.Mesh(new THREE.SphereGeometry(SKY_RADIUS, 64, 64), material);
    dome.renderOrder = -1; // drawn first, behind everything else
    return dome;
}

var skyDome = makeSkyDome();
scene.add(skyDome);

// the same day / night measure as the sky shader, for the lights
function daylightAmount(sunAltitude) {
    return THREE.MathUtils.smoothstep(Math.sin(THREE.MathUtils.degToRad(sunAltitude)), -0.17, 0.2);
}

var DAY_AMBIENT = { sky: new THREE.Color('#cfe6ff'), ground: new THREE.Color('#3d6b2a'), intensity: 1.6 };
var NIGHT_AMBIENT = { sky: new THREE.Color('#5a6a9a'), ground: new THREE.Color('#141c14'), intensity: 0.3 };

// places the sun (degrees: azimuth clockwise from north, altitude above the horizon),
// updating the sky colours and the lighting to match
function setSun(azimuth, altitude) {
    var direction = skyDirection(azimuth, altitude);

    skyDome.material.uniforms.sunDirection.value.copy(direction);

    var daylight = daylightAmount(altitude);
    ambientLight.color.lerpColors(NIGHT_AMBIENT.sky, DAY_AMBIENT.sky, daylight);
    ambientLight.groundColor.lerpColors(NIGHT_AMBIENT.ground, DAY_AMBIENT.ground, daylight);
    ambientLight.intensity = THREE.MathUtils.lerp(NIGHT_AMBIENT.intensity, DAY_AMBIENT.intensity, daylight);

    sunLight.position.copy(direction).multiplyScalar(100);
    sunLight.intensity = 1.4 * THREE.MathUtils.smoothstep(altitude, -2, 6); // fades out as the sun sets

    moon.material.uniforms.daylight.value = daylight;
}

// the moon: a ball lit from the sun's direction, so it shows the right phase (and the lit side
// points towards the sun) without any phase calculations. it has its own shading rather than
// using the scene's lights, so it stays bright at night. the shadowed side glows very faintly
// (like earthshine) so that even a new moon can just be made out.
// the ball is drawn as a flat disc that always faces the observer, with the sphere's surface worked
// out exactly for each pixel; a triangulated sphere lets light leak around its outline near new moon.
// drawn larger than life (see MOON_SIZE_SCALE), and like the sky dome it's kept a fixed distance
// from the observer so it seems infinitely far away
var MOON_VERTEX_SHADER = [
    'varying vec2 vDisc;',
    'varying mat3 vDiscToWorld;',
    'void main() {',
    '    vDisc = position.xy;', // -1 to 1 across the disc
    '    vDiscToWorld = mat3(modelMatrix);', // the disc's orientation (modelMatrix isn't available to fragment shaders)
    '    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
].join('\n');

var MOON_FRAGMENT_SHADER = [
    'uniform vec3 sunDirection;',
    'uniform float daylight;',
    'uniform vec3 litColor;',
    'uniform vec3 shadowColor;',
    'varying vec2 vDisc;',
    'varying mat3 vDiscToWorld;',
    '',
    'void main() {',
    '    float r = length(vDisc);',
    '    float edge = fwidth(r);',
    '    float coverage = 1.0 - smoothstep(1.0 - edge, 1.0, r);', // smooth, anti-aliased outline
    '    if(coverage <= 0.0) discard;',
    '',
    // the sphere's surface normal at this point, facing the observer, turned into world space
    '    vec3 normal = normalize(vDiscToWorld * vec3(vDisc, sqrt(max(0.0, 1.0 - (r * r)))));',
    '',
    // 1 on the sunlit half, 0 on the shadowed half, with a narrow soft edge between them.
    // (the real moon's lit side is fairly evenly bright, so there's no gradual shading across it)
    '    float lit = smoothstep(0.0, 0.04, dot(normal, sunDirection));',
    '',
    // by day the whole moon is a little washed out, and the shadowed side fainter still
    '    float litOpacity = mix(1.0, 0.8, daylight);',
    '    float shadowOpacity = mix(0.18, 0.16, daylight);',
    '',
    '    gl_FragColor = vec4(mix(shadowColor, litColor, lit), mix(shadowOpacity, litOpacity, lit) * coverage);',
    '}'
].join('\n');

var moon = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
        uniforms: {
            sunDirection: { value: skyDome.material.uniforms.sunDirection.value }, // shared with the sky
            daylight: { value: 0 },
            litColor: { value: srgbColor('#f4f1e6') },
            shadowColor: { value: srgbColor('#aab4cc') }
        },
        vertexShader: MOON_VERTEX_SHADER,
        fragmentShader: MOON_FRAGMENT_SHADER,
        transparent: true
    })
);
var moonOffset = new THREE.Vector3(); // from the observer to the moon
scene.add(moon);

// places the moon (degrees: azimuth clockwise from north, altitude above the horizon, apparent diameter)
function setMoon(azimuth, altitude, diameter) {
    moonOffset.copy(skyDirection(azimuth, altitude)).multiplyScalar(MOON_DISTANCE);
    moon.scale.setScalar(MOON_DISTANCE * Math.tan(THREE.MathUtils.degToRad(diameter * MOON_SIZE_SCALE / 2)));
    moon.visible = altitude > -(diameter * MOON_SIZE_SCALE / 2); // hidden once it's set below the horizon
}


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

// e.g. "045° NE"
function formatHeading(azimuth) {
    var nearest = DIRECTIONS[Math.round(azimuth / 45) % 8].label;
    return ('00' + (Math.round(azimuth) % 360)).slice(-3) + '° ' + nearest;
}

function updateHeadingDisplay() {
    var text = formatHeading(heading);
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

// updates everything that depends on where / when the observer is
function onObserverChange(obs) {
    // calcSunPosition and calcMoonPosition are from sun.js and moon.js, loaded as regular scripts before this module
    var sun = calcSunPosition(obs.date, obs.lat, obs.lon);
    setSun(sun.azimuth, sun.altitude);
    document.getElementById('sunPosition').textContent = formatSkyPosition(sun);

    var moonPos = calcMoonPosition(obs.date, obs.lat, obs.lon);
    setMoon(moonPos.azimuth, moonPos.altitude, moonPos.diameter);
    document.getElementById('moonPosition').textContent = formatSkyPosition(moonPos);

    var phase = calcMoonIllumination(obs.date);
    document.getElementById('moonPhase').textContent = phase.name + ' · ' + Math.round(phase.illumination * 100) + '% lit';
}

// e.g. "174° S · 36° above the horizon"
function formatSkyPosition(pos) {
    var alt = Math.round(pos.altitude);
    return formatHeading(pos.azimuth) + ' · ' + Math.abs(alt) + '° ' + (alt >= 0 ? 'above' : 'below') + ' the horizon';
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
    moon.position.copy(camera.position).add(moonOffset);
    moon.lookAt(camera.position); // the moon's disc always faces the observer

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
