// 3D horizon viewer: the observer starts at the centre of a flat circular plain,
// with columns marking the cardinal and sub-cardinal directions.
// left / right arrow keys turn, up / down arrow keys move forward / back,
// and holding the right mouse button (or dragging a finger on a touch screen) gives free look.
// the on-screen buttons do the same as the arrow keys, plus a reset to the centre facing south
//
// scene orientation: north is -Z, east is +X, up is +Y
// headings / azimuths are in degrees clockwise from north

import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

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
var SUMMER_ARC_COLOR = '#ffc94d'; // warm gold
var WINTER_ARC_COLOR = '#a9c6ff'; // cool silver-blue
var TODAY_ARC_COLOR = '#ffffff';
var FESTIVAL_ARC_COLOR = '#ff8a3d'; // ember orange
var EQUINOX_ARC_COLOR = '#d6e4d2'; // soft pale green-grey
var MOON_PATH_COLOR = '#d9d2ff'; // pale lavender-silver
var MOON_STANDSTILL_COLOR = '#b3a2f0'; // lavender
var MOON_PATH_DISTANCE = 450; // the moon's path is drawn just inside the sky dome, behind the moon
var MOON_ORBIT_INCLINATION = 5.145; // degrees, the tilt of the moon's orbit to the ecliptic
var MOON_MEAN_PARALLAX = 0.9507; // degrees, how much lower the moon sits seen from the Earth's surface (at the horizon)
var MARKER_DISTANCE = 300; // horizon markers sit in the sky, inside the moon's distance
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
    'uniform float latitude;', // the observer's, in radians
    'uniform vec3 arcDeclinations;', // degrees: local midsummer, local midwinter, today
    'uniform float sunHourAngle;', // degrees, 0 at solar noon, negative in the morning
    'uniform vec3 summerArcColor;',
    'uniform vec3 winterArcColor;',
    'uniform vec3 todayArcColor;',
    'uniform float festivalDeclination;', // degrees: the Bealtaine / Lúnasa arc (Samhain / Imbolc is the same, south)
    'uniform vec3 festivalArcColor;',
    'uniform vec3 equinoxArcColor;',
    'uniform vec2 moonStandstills;', // degrees: the major and minor standstill limits (north; south is the same)
    'uniform float moonParallax;', // degrees
    'uniform vec3 moonStandstillColor;',
    'uniform float showSunArcs;', // 1 to show, 0 to hide
    'uniform float showMoonArcs;',
    'varying vec3 vDirection;',
    '',
    // how much the atmosphere lifts things near the horizon (degrees), Bennett's formula as in astro.js
    'float refraction(float altitude) {',
    '    if(altitude < -1.0) return 0.0;',
    '    return (1.02 / tan(radians(altitude + (10.3 / (altitude + 5.11))))) / 60.0;',
    '}',
    '',
    // 1 on a line of the given half width (in pixels) where value == target, fading to 0 either side
    'float line(float value, float target, float degPerPixel, float halfWidth) {',
    '    float pixels = abs(value - target) / max(degPerPixel, 1e-6);',
    '    return 1.0 - smoothstep(halfWidth - 0.5, halfWidth + 0.5, pixels);',
    '}',
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
    // sun arcs: the sun's daily path at the solstices and today. each is a circle of constant
    // declination, so find this point's declination and hour angle for the observer's latitude
    // (taking out the refraction lift first, so the arcs meet the horizon where the sun appears to)
    '    float apparentAlt = degrees(asin(clamp(dir.y, -1.0, 1.0)));',
    '    float trueAlt = radians(apparentAlt - refraction(apparentAlt));',
    '    vec2 compass = length(dir.xz) > 1e-5 ? normalize(dir.xz) : vec2(0.0, -1.0);',
    '    vec3 trueDir = vec3(compass.x * cos(trueAlt), sin(trueAlt), compass.y * cos(trueAlt));',
    // (north is -z, east +x) the celestial pole, and the celestial equator where it crosses the meridian
    '    vec3 pole = vec3(0.0, sin(latitude), -cos(latitude));',
    '    vec3 equatorSouth = vec3(0.0, cos(latitude), sin(latitude));',
    '    float declination = degrees(asin(clamp(dot(trueDir, pole), -1.0, 1.0)));',
    '    float hourAngle = degrees(atan(-trueDir.x, dot(trueDir, equatorSouth)));', // increases westwards
    '    float degPerPixel = fwidth(declination);',
    '',
    '    float aboveHorizon = smoothstep(-0.5, 0.0, apparentAlt);',
    '',
    // the moon's standstill limits: the same idea, but also taking out the moon's parallax (which makes it
    // look lower than it would from the Earth's centre), so the arcs line up with where the moon appears.
    // the major standstill is solid and thin, the minor one dashed; drawn beneath the sun's arcs
    '    float moonTrueAlt = trueAlt + radians(moonParallax * cos(radians(apparentAlt)));',
    '    vec3 moonDir = vec3(compass.x * cos(moonTrueAlt), sin(moonTrueAlt), compass.y * cos(moonTrueAlt));',
    '    float moonDeclination = degrees(asin(clamp(dot(moonDir, pole), -1.0, 1.0)));',
    '    float moonDegPerPixel = fwidth(moonDeclination);',
    '    float majorArc = 0.45 * max(line(moonDeclination, moonStandstills.x, moonDegPerPixel, 0.6),',
    '                                line(moonDeclination, -moonStandstills.x, moonDegPerPixel, 0.6));',
    '    float minorArc = 0.4 * step(0.5, fract(hourAngle / 4.0)) * max(line(moonDeclination, moonStandstills.y, moonDegPerPixel, 0.6),',
    '                                                                   line(moonDeclination, -moonStandstills.y, moonDegPerPixel, 0.6));',
    '    color = mix(color, moonStandstillColor, max(majorArc, minorArc) * aboveHorizon * showMoonArcs);',
    '',
    '    aboveHorizon *= showSunArcs;', // everything below is the sun's
    '    float summerArc = 0.45 * line(declination, arcDeclinations.x, degPerPixel, 0.6);',
    '    float winterArc = 0.45 * line(declination, arcDeclinations.y, degPerPixel, 0.6);',
    // the fire festival arcs are fainter and dashed (dashes 3 deg of hour angle long), the equinox arc faint and thin
    '    float dash = step(0.5, fract(hourAngle / 6.0));',
    '    float festivalArc = 0.4 * dash * max(line(declination, festivalDeclination, degPerPixel, 0.6),',
    '                                         line(declination, -festivalDeclination, degPerPixel, 0.6));',
    '    float equinoxArc = 0.3 * line(declination, 0.0, degPerPixel, 0.5);',
    '    color = mix(color, equinoxArcColor, equinoxArc * aboveHorizon);',
    '    color = mix(color, festivalArcColor, festivalArc * aboveHorizon);',
    // today's arc is stronger, and brighter along the part of the path the sun has still to travel
    '    float ahead = smoothstep(-0.5, 0.5, hourAngle - sunHourAngle);',
    '    float todayArc = mix(0.5, 0.9, ahead) * line(declination, arcDeclinations.z, degPerPixel, 1.1);',
    '    color = mix(color, summerArcColor, summerArc * aboveHorizon);',
    '    color = mix(color, winterArcColor, winterArc * aboveHorizon);',
    '    color = mix(color, todayArcColor, todayArc * aboveHorizon);',
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
            twilightGlow: { value: srgbColor('#ff7a33') },
            latitude: { value: 0 },
            arcDeclinations: { value: new THREE.Vector3() },
            sunHourAngle: { value: 0 },
            summerArcColor: { value: srgbColor(SUMMER_ARC_COLOR) },
            winterArcColor: { value: srgbColor(WINTER_ARC_COLOR) },
            todayArcColor: { value: srgbColor(TODAY_ARC_COLOR) },
            festivalDeclination: { value: 0 },
            festivalArcColor: { value: srgbColor(FESTIVAL_ARC_COLOR) },
            equinoxArcColor: { value: srgbColor(EQUINOX_ARC_COLOR) },
            moonStandstills: { value: new THREE.Vector2() },
            moonParallax: { value: MOON_MEAN_PARALLAX },
            moonStandstillColor: { value: srgbColor(MOON_STANDSTILL_COLOR) },
            showSunArcs: { value: 1 },
            showMoonArcs: { value: 1 }
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

// sun and moon arcs, and horizon markers
// the sun's arcs (midsummer, midwinter, the fire festivals, the equinoxes and today) and the limits of
// the moon's range (its major and minor standstills) are circles of constant declination, drawn by the sky shader.
// the moon's path tonight isn't: its declination can shift several degrees in a night, so it's traced from
// its calculated positions and drawn as a line. where each arc meets the horizon, a thin tick and a small
// label mark the rising / setting direction.
// like the moon, the markers and the moon's path are kept centred on the observer, as they mark directions
// rather than places. the sun's and moon's arcs (with their markers) can be shown or hidden separately

// a small text label for the sky, about heightDeg tall as seen from the observer at MARKER_DISTANCE
function makeSkyLabel(text, color, heightDeg, opacity) {
    var fontSize = 44;
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    var font = 'bold ' + fontSize + 'px Arial, Helvetica, sans-serif';
    context.font = font;
    canvas.width = Math.ceil(context.measureText(text).width) + 16;
    canvas.height = Math.round(fontSize * 1.5);

    context.font = font; // resizing the canvas resets its context
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineWidth = 6;
    context.lineJoin = 'round'; // sharp (mitred) corners spike out of letters like M and W
    context.strokeStyle = 'rgba(0, 17, 34, .7)';
    context.strokeText(text, canvas.width / 2, canvas.height / 2);
    context.fillStyle = color;
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    var texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    // labels are mostly transparent, so they mustn't hide what's behind them from the depth buffer
    var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: opacity, depthWrite: false }));
    var height = MARKER_DISTANCE * Math.tan(THREE.MathUtils.degToRad(heightDeg));
    sprite.scale.set(height * canvas.width / canvas.height, height, 1);
    return sprite;
}

function markerHeight(altitude) {
    return MARKER_DISTANCE * Math.tan(THREE.MathUtils.degToRad(altitude));
}

// a marker facing north (azimuth 0), added to the given group; setMarkerAzimuth turns it to face
// the right way, and setMarkerRow sets how high its label sits.
// labels sit above the direction columns' labels (which reach about 7.5 deg above the horizon)
function makeHorizonMarker(group, text, color, labelAltitude, opacity) {
    var marker = new THREE.Group();

    // the tick starts a little below the horizon so it meets the edge of the plain
    var tick = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, markerHeight(-2), -MARKER_DISTANCE), new THREE.Vector3()]),
        new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: opacity * 0.7 })
    );
    marker.add(tick);

    var label = makeSkyLabel(text, color, 2.8, opacity);
    marker.add(label);

    marker.userData = { tick: tick, label: label };
    setMarkerRow(marker, labelAltitude);
    group.add(marker);
    return marker;
}

function setMarkerRow(marker, labelAltitude) {
    marker.userData.label.position.set(0, markerHeight(labelAltitude), -MARKER_DISTANCE);
    var tickPositions = marker.userData.tick.geometry.attributes.position;
    tickPositions.setXYZ(1, 0, markerHeight(labelAltitude - 1.2), -MARKER_DISTANCE);
    tickPositions.needsUpdate = true;
    marker.userData.tick.geometry.computeBoundingSphere();
}

function setMarkerAzimuth(marker, azimuth) {
    marker.visible = (azimuth !== null);
    if(marker.visible) {
        marker.rotation.y = -THREE.MathUtils.degToRad(azimuth);
    }
}

var horizonMarkers = new THREE.Group();
scene.add(horizonMarkers);
var sunMarkerGroup = new THREE.Group();
var moonMarkerGroup = new THREE.Group();
horizonMarkers.add(sunMarkerGroup, moonMarkerGroup);

// the labels sit in rows so that neighbouring markers (as little as ~15 deg apart) don't overlap.
// the sun's: solstices and equinoxes, today, then the fire festivals. the moon's use the same heights
// when shown on their own, and move up above the sun's when both are shown
var MARKER_ROWS = { seasons: 8, today: 11.2, festivals: 14.4 };
var MOON_MARKER_ROWS = { major: 8, tonight: 11.2, minor: 14.4 };
var MOON_MARKER_ROWS_RAISE = 9.6; // added to the moon's rows when the sun's markers are shown too

var markers = {
    summerRise: makeHorizonMarker(sunMarkerGroup, 'Midsummer sunrise', SUMMER_ARC_COLOR, MARKER_ROWS.seasons, 0.75),
    summerSet: makeHorizonMarker(sunMarkerGroup, 'Midsummer sunset', SUMMER_ARC_COLOR, MARKER_ROWS.seasons, 0.75),
    winterRise: makeHorizonMarker(sunMarkerGroup, 'Midwinter sunrise', WINTER_ARC_COLOR, MARKER_ROWS.seasons, 0.75),
    winterSet: makeHorizonMarker(sunMarkerGroup, 'Midwinter sunset', WINTER_ARC_COLOR, MARKER_ROWS.seasons, 0.75),
    equinoxRise: makeHorizonMarker(sunMarkerGroup, 'Equinox sunrise', EQUINOX_ARC_COLOR, MARKER_ROWS.seasons, 0.6),
    equinoxSet: makeHorizonMarker(sunMarkerGroup, 'Equinox sunset', EQUINOX_ARC_COLOR, MARKER_ROWS.seasons, 0.6),
    brightHalfRise: makeHorizonMarker(sunMarkerGroup, 'Bealtaine / Lúnasa sunrise', FESTIVAL_ARC_COLOR, MARKER_ROWS.festivals, 0.7),
    brightHalfSet: makeHorizonMarker(sunMarkerGroup, 'Bealtaine / Lúnasa sunset', FESTIVAL_ARC_COLOR, MARKER_ROWS.festivals, 0.7),
    darkHalfRise: makeHorizonMarker(sunMarkerGroup, 'Samhain / Imbolc sunrise', FESTIVAL_ARC_COLOR, MARKER_ROWS.festivals, 0.7),
    darkHalfSet: makeHorizonMarker(sunMarkerGroup, 'Samhain / Imbolc sunset', FESTIVAL_ARC_COLOR, MARKER_ROWS.festivals, 0.7),
    todayRise: makeHorizonMarker(sunMarkerGroup, 'Sunrise', TODAY_ARC_COLOR, MARKER_ROWS.today, 0.95),
    todaySet: makeHorizonMarker(sunMarkerGroup, 'Sunset', TODAY_ARC_COLOR, MARKER_ROWS.today, 0.95)
};

// the moon's standstill markers come in northern and southern pairs, both labelled the same:
// over a couple of weeks at a standstill the moon rises at (or near) both
var moonMarkers = {
    majorNorthRise: makeHorizonMarker(moonMarkerGroup, 'Major standstill moonrise', MOON_STANDSTILL_COLOR, MOON_MARKER_ROWS.major, 0.75),
    majorNorthSet: makeHorizonMarker(moonMarkerGroup, 'Major standstill moonset', MOON_STANDSTILL_COLOR, MOON_MARKER_ROWS.major, 0.75),
    majorSouthRise: makeHorizonMarker(moonMarkerGroup, 'Major standstill moonrise', MOON_STANDSTILL_COLOR, MOON_MARKER_ROWS.major, 0.75),
    majorSouthSet: makeHorizonMarker(moonMarkerGroup, 'Major standstill moonset', MOON_STANDSTILL_COLOR, MOON_MARKER_ROWS.major, 0.75),
    minorNorthRise: makeHorizonMarker(moonMarkerGroup, 'Minor standstill moonrise', MOON_STANDSTILL_COLOR, MOON_MARKER_ROWS.minor, 0.65),
    minorNorthSet: makeHorizonMarker(moonMarkerGroup, 'Minor standstill moonset', MOON_STANDSTILL_COLOR, MOON_MARKER_ROWS.minor, 0.65),
    minorSouthRise: makeHorizonMarker(moonMarkerGroup, 'Minor standstill moonrise', MOON_STANDSTILL_COLOR, MOON_MARKER_ROWS.minor, 0.65),
    minorSouthSet: makeHorizonMarker(moonMarkerGroup, 'Minor standstill moonset', MOON_STANDSTILL_COLOR, MOON_MARKER_ROWS.minor, 0.65),
    tonightRise: makeHorizonMarker(moonMarkerGroup, 'Moonrise', MOON_PATH_COLOR, MOON_MARKER_ROWS.tonight, 0.95),
    tonightSet: makeHorizonMarker(moonMarkerGroup, 'Moonset', MOON_PATH_COLOR, MOON_MARKER_ROWS.tonight, 0.95)
};

// where things at the observer's (apparent) horizon really are, in degrees of altitude:
// the sun's centre is lifted above it by refraction; the moon's is also lowered by parallax
// (it's close enough that seen from the Earth's surface it sits about 0.95 deg lower than from its centre)
function sunHorizonAltitude() {
    return -atmosphericRefraction(0);
}
function moonHorizonAltitude() {
    return MOON_MEAN_PARALLAX - atmosphericRefraction(0);
}

// azimuth (degrees) where a point at the given declination crosses the horizon altitude h0, as seen from
// the given latitude, with the rising azimuth east of north and the setting one mirrored in the west;
// null if it never rises or never sets there
function riseAzimuth(declination, latitude, h0) {
    var cosA = (Math.sin(THREE.MathUtils.degToRad(declination)) - (Math.sin(THREE.MathUtils.degToRad(latitude)) * Math.sin(THREE.MathUtils.degToRad(h0))))
             / (Math.cos(THREE.MathUtils.degToRad(latitude)) * Math.cos(THREE.MathUtils.degToRad(h0)));
    if(!(Math.abs(cosA) <= 1)) {
        return null;
    }
    return THREE.MathUtils.radToDeg(Math.acos(cosA));
}

function setArcMarkers(riseMarker, setMarker, declination, latitude, h0) {
    var az = riseAzimuth(declination, latitude, h0);
    setMarkerAzimuth(riseMarker, az);
    setMarkerAzimuth(setMarker, az === null ? null : 360 - az);
}

// the sun's arcs and markers for the observer's place and time
// (trueObliquity, calcSunEquatorial, greenwichSiderealTime and atmosphericRefraction are from astro.js / sun.js)
function setSunArcs(obs) {
    // at the solstices the sun's declination is the tilt of the Earth's axis, north or south;
    // "midsummer" is the local one, so in the southern hemisphere it's the December solstice
    var tilt = earthTilt(obs.date);
    var summer = obs.lat >= 0 ? tilt : -tilt;
    var sun = calcSunEquatorial(obs.date);

    // the sun's hour angle: 0 at solar noon, negative before, positive after
    var hourAngle = (((greenwichSiderealTime(obs.date) + obs.lon - sun.ra) % 360) + 540) % 360 - 180;

    // the fire festivals, taken as the solar midpoints between the solstices and equinoxes: the sun is
    // 45 deg along the ecliptic from an equinox, so its declination is asin(sin(tilt) * sin(45 deg)), about 16.3 deg.
    // Bealtaine and Lúnasa share the northern arc, Samhain and Imbolc the southern one (whichever hemisphere
    // the observer is in, as the festivals are dates rather than local seasons)
    var festival = THREE.MathUtils.radToDeg(Math.asin(Math.sin(THREE.MathUtils.degToRad(tilt)) * Math.SQRT1_2));

    var uniforms = skyDome.material.uniforms;
    uniforms.latitude.value = THREE.MathUtils.degToRad(obs.lat);
    uniforms.arcDeclinations.value.set(summer, -summer, sun.dec);
    uniforms.festivalDeclination.value = festival;
    uniforms.sunHourAngle.value = hourAngle;

    var h0 = sunHorizonAltitude();
    setArcMarkers(markers.summerRise, markers.summerSet, summer, obs.lat, h0);
    setArcMarkers(markers.winterRise, markers.winterSet, -summer, obs.lat, h0);
    setArcMarkers(markers.equinoxRise, markers.equinoxSet, 0, obs.lat, h0);
    setArcMarkers(markers.brightHalfRise, markers.brightHalfSet, festival, obs.lat, h0);
    setArcMarkers(markers.darkHalfRise, markers.darkHalfSet, -festival, obs.lat, h0);
    setArcMarkers(markers.todayRise, markers.todaySet, sun.dec, obs.lat, h0);
}

function earthTilt(date) {
    return trueObliquity((dateToJD(date) - 2451545.0) / 36525);
}

// the moon's path: its current pass across the sky if it's up, otherwise its next one.
// drawn as two lines, dimmer for the part it has already travelled, brighter for the part still to come
var moonPath = new THREE.Group();
scene.add(moonPath);
var moonPathLines = [];

function makeMoonPathLine(points, opacity) {
    var geometry = new LineGeometry();
    geometry.setPositions(points);
    var material = new LineMaterial({ color: MOON_PATH_COLOR, linewidth: 2.2, transparent: true, opacity: opacity, depthWrite: false });
    material.resolution.set(window.innerWidth, window.innerHeight);
    var line = new Line2(geometry, material);
    line.computeLineDistances();
    moonPath.add(line);
    moonPathLines.push(line);
}

function clearMoonPath() {
    moonPathLines.forEach(function(line) {
        moonPath.remove(line);
        line.geometry.dispose();
        line.material.dispose();
    });
    moonPathLines = [];
}

var MINUTE = 60000;

// the moment (within a minute) between t1 and t2 when the moon crosses the horizon
function findMoonHorizonCrossing(t1, t2, lat, lon) {
    var up1 = calcMoonPosition(new Date(t1), lat, lon).altitude > 0;
    while(t2 - t1 > MINUTE) {
        var mid = (t1 + t2) / 2;
        if((calcMoonPosition(new Date(mid), lat, lon).altitude > 0) == up1) {
            t1 = mid;
        } else {
            t2 = mid;
        }
    }
    return (t1 + t2) / 2;
}

// the moon's current (or next) pass: { rise, set } times in ms, either of which may be null if it doesn't
// rise / set within the search window (e.g. at high latitudes); null if it doesn't come up at all
function findMoonPass(date, lat, lon) {
    var STEP = 10 * MINUTE;
    var now = date.getTime();
    var altitude = function(t) { return calcMoonPosition(new Date(t), lat, lon).altitude; };
    var t;

    var start = now;
    if(altitude(now) <= 0) {
        // not up: look ahead for the next moonrise
        for(t = now + STEP; t <= now + (26 * 60 * MINUTE) && altitude(t) <= 0; t += STEP) {}
        if(t > now + (26 * 60 * MINUTE)) {
            return null;
        }
        start = t;
    }

    var rise = null, set = null;
    for(t = start - STEP; t >= start - (20 * 60 * MINUTE); t -= STEP) {
        if(altitude(t) <= 0) {
            rise = findMoonHorizonCrossing(t, t + STEP, lat, lon);
            break;
        }
    }
    for(t = start + STEP; t <= start + (20 * 60 * MINUTE); t += STEP) {
        if(altitude(t) <= 0) {
            set = findMoonHorizonCrossing(t - STEP, t, lat, lon);
            break;
        }
    }
    return { rise: rise, set: set, windowStart: start - (20 * 60 * MINUTE), windowEnd: start + (20 * 60 * MINUTE) };
}

function moonPathPoint(t, lat, lon) {
    var pos = calcMoonPosition(new Date(t), lat, lon);
    return skyDirection(pos.azimuth, Math.max(pos.altitude, 0)).multiplyScalar(MOON_PATH_DISTANCE);
}

function moonPathPoints(from, to, lat, lon) {
    var STEP = 5 * MINUTE;
    var points = [];
    for(var t = from; t < to; t += STEP) {
        points.push(moonPathPoint(t, lat, lon));
    }
    points.push(moonPathPoint(to, lat, lon));
    var flat = [];
    points.forEach(function(p) { flat.push(p.x, p.y, p.z); });
    return flat;
}

function setMoonPath(obs) {
    clearMoonPath();
    var pass = findMoonPass(obs.date, obs.lat, obs.lon);

    setMarkerAzimuth(moonMarkers.tonightRise, pass && pass.rise !== null ? calcMoonPosition(new Date(pass.rise), obs.lat, obs.lon).azimuth : null);
    setMarkerAzimuth(moonMarkers.tonightSet, pass && pass.set !== null ? calcMoonPosition(new Date(pass.set), obs.lat, obs.lon).azimuth : null);
    if(!pass) {
        return;
    }

    var from = pass.rise !== null ? pass.rise : pass.windowStart;
    var to = pass.set !== null ? pass.set : pass.windowEnd;
    var now = obs.date.getTime();
    if(now > from) {
        makeMoonPathLine(moonPathPoints(from, Math.min(now, to), obs.lat, obs.lon), 0.45);
    }
    if(now < to) {
        makeMoonPathLine(moonPathPoints(Math.max(now, from), to, obs.lat, obs.lon), 0.85);
    }
}

// the moon's arcs and markers for the observer's place and time.
// the moon's orbit is tilted about 5.1 deg to the ecliptic, so over its 18.6 year cycle the limit of its
// monthly swing north and south varies between tilt - 5.1 (minor standstill, ~18.3 deg) and
// tilt + 5.1 (major standstill, ~28.6 deg). these are the widest the moon can reach at each
function setMoonArcs(obs) {
    var tilt = earthTilt(obs.date);
    var major = tilt + MOON_ORBIT_INCLINATION;
    var minor = tilt - MOON_ORBIT_INCLINATION;
    skyDome.material.uniforms.moonStandstills.value.set(major, minor);

    var h0 = moonHorizonAltitude();
    setArcMarkers(moonMarkers.majorNorthRise, moonMarkers.majorNorthSet, major, obs.lat, h0);
    setArcMarkers(moonMarkers.majorSouthRise, moonMarkers.majorSouthSet, -major, obs.lat, h0);
    setArcMarkers(moonMarkers.minorNorthRise, moonMarkers.minorNorthSet, minor, obs.lat, h0);
    setArcMarkers(moonMarkers.minorSouthRise, moonMarkers.minorSouthSet, -minor, obs.lat, h0);

    setMoonPath(obs);
}

// showing / hiding the sun's and moon's arcs (and their markers), remembered between visits where possible
var ARC_TOGGLES_KEY = 'irishcal.viewer.arcs';
var sunArcsToggle = document.getElementById('showSunArcs');
var moonArcsToggle = document.getElementById('showMoonArcs');

function applyArcToggles() {
    var showSun = sunArcsToggle.checked;
    var showMoon = moonArcsToggle.checked;

    skyDome.material.uniforms.showSunArcs.value = showSun ? 1 : 0;
    skyDome.material.uniforms.showMoonArcs.value = showMoon ? 1 : 0;
    sunMarkerGroup.visible = showSun;
    moonMarkerGroup.visible = showMoon;
    moonPath.visible = showMoon;

    var raise = showSun ? MOON_MARKER_ROWS_RAISE : 0;
    setMarkerRow(moonMarkers.majorNorthRise, MOON_MARKER_ROWS.major + raise);
    setMarkerRow(moonMarkers.majorNorthSet, MOON_MARKER_ROWS.major + raise);
    setMarkerRow(moonMarkers.majorSouthRise, MOON_MARKER_ROWS.major + raise);
    setMarkerRow(moonMarkers.majorSouthSet, MOON_MARKER_ROWS.major + raise);
    setMarkerRow(moonMarkers.minorNorthRise, MOON_MARKER_ROWS.minor + raise);
    setMarkerRow(moonMarkers.minorNorthSet, MOON_MARKER_ROWS.minor + raise);
    setMarkerRow(moonMarkers.minorSouthRise, MOON_MARKER_ROWS.minor + raise);
    setMarkerRow(moonMarkers.minorSouthSet, MOON_MARKER_ROWS.minor + raise);
    setMarkerRow(moonMarkers.tonightRise, MOON_MARKER_ROWS.tonight + raise);
    setMarkerRow(moonMarkers.tonightSet, MOON_MARKER_ROWS.tonight + raise);

    try {
        localStorage.setItem(ARC_TOGGLES_KEY, JSON.stringify({ sun: showSun, moon: showMoon }));
    } catch(e) {
        // storage can be unavailable (e.g. private browsing); the toggles still work for this visit
    }
}

function initArcToggles() {
    try {
        var saved = JSON.parse(localStorage.getItem(ARC_TOGGLES_KEY));
        if(saved) {
            sunArcsToggle.checked = saved.sun !== false;
            moonArcsToggle.checked = saved.moon !== false;
        }
    } catch(e) {
        // nothing saved, or storage unavailable: keep the defaults
    }
    sunArcsToggle.addEventListener('change', applyArcToggles);
    moonArcsToggle.addEventListener('change', applyArcToggles);
    applyArcToggles();
}

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
    context.lineJoin = 'round'; // sharp (mitred) corners spike out of letters like M and W
    context.strokeStyle = 'rgba(0, 17, 34, .8)';
    context.strokeText(text, 128, 68);
    context.fillStyle = '#ffffff';
    context.fillText(text, 128, 68);

    var texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    // (mostly transparent, so it mustn't hide what's behind it from the depth buffer)
    var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
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
    // (not while the location dialog is open over the view)
    if(ARROW_KEYS.indexOf(e.key) > -1 && !isTypingTarget(e.target) && !locationDialog.open) {
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
var timeZoneInput = document.getElementById('timeZone');
var timeZoneNote = document.getElementById('timeZoneNote');

// the last latitude / longitude used, so the viewer reopens at the same place (the date and time always
// start at now)
var LOCATION_KEY = 'irishcal.viewer.location';
var TIME_ZONE_KEY = 'irishcal.viewer.timezone';

// the time zones offered, as offsets from UTC in minutes: every offset in use around the world
// (fixed offsets, so summer time is a matter of picking the next one along, e.g. UTC+1 for Ireland in summer)
var TIME_ZONE_OFFSETS = [
    -720, -660, -600, -570, -540, -480, -420, -360, -300, -240, -210, -180, -120, -60,
    0, 60, 120, 180, 210, 240, 270, 300, 330, 345, 360, 390, 420, 480, 525, 540, 570, 600, 630, 660,
    720, 765, 780, 840
];

// the date and time fields are in the chosen time zone: 'auto' (worked out from the location, with its summer
// time rules), or one of the fixed offsets above (minutes ahead of UTC)
var TIME_ZONE_AUTO = 'auto';
var timeZoneChoice = TIME_ZONE_AUTO;
var autoTimeZone = null; // the named time zone at the observer's location, e.g. "Europe/Dublin"

// the named time zone at a place, from tz-lookup (js/lib/tz-lookup, loaded as a regular script before this
// module). it's approximate near borders, and out at sea gives nautical time (e.g. "Etc/GMT+2", which is UTC-2)
function lookUpTimeZone(lat, lon) {
    try {
        return tzlookup(lat, lon);
    } catch(e) {
        return null;
    }
}

// a named time zone's offset from UTC (minutes) at the given moment, from the browser's own time zone rules;
// null if the browser doesn't know the zone
var zoneFormats = {};
function namedZoneOffset(zone, date) {
    try {
        if(!zoneFormats[zone]) {
            zoneFormats[zone] = new Intl.DateTimeFormat('en-US', {
                timeZone: zone, hourCycle: 'h23',
                year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric'
            });
        }
        var parts = {};
        zoneFormats[zone].formatToParts(date).forEach(function(part) { parts[part.type] = parseInt(part.value, 10); });
        var wallClock = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
        return Math.round((wallClock - (Math.floor(date.getTime() / MINUTE) * MINUTE)) / MINUTE);
    } catch(e) {
        return null;
    }
}

// the chosen time zone's offset from UTC (minutes) at the given moment
function timeZoneOffsetAt(date) {
    if(timeZoneChoice !== TIME_ZONE_AUTO) {
        return timeZoneChoice;
    }
    var offset = autoTimeZone ? namedZoneOffset(autoTimeZone, date) : null;
    return offset !== null ? offset : Math.round(observer.lon / 15) * 60; // (nautical time if the zone isn't known)
}

// the moment meant by a date and time in the chosen zone (given in ms, as if they were UTC). the offset can
// depend on the moment itself (summer time), so it's found in two steps
function wallClockToDate(wallClock) {
    var guess = wallClock - (timeZoneOffsetAt(new Date(wallClock)) * MINUTE);
    return new Date(wallClock - (timeZoneOffsetAt(new Date(guess)) * MINUTE));
}

// the "Auto" choice shows the offset it works out, and a note under the time says which zone it's from
function updateTimeZoneDisplay() {
    var choice = timeZoneChoice;
    timeZoneChoice = TIME_ZONE_AUTO; // (what "Auto" gives, even while a fixed offset is chosen)
    timeZoneInput.options[0].text = 'Auto (' + formatTimeZone(timeZoneOffsetAt(observer.date)) + ')';
    timeZoneChoice = choice;

    timeZoneNote.hidden = timeZoneChoice !== TIME_ZONE_AUTO;
    timeZoneNote.textContent = !autoTimeZone ? 'Time zone unknown here: nautical time'
        : autoTimeZone.indexOf('Etc/') == 0 ? 'At sea: nautical time'
        : autoTimeZone.replace(/_/g, ' ') + ' time, from the location';
}

// e.g. "UTC", "UTC-5", "UTC+5:30"
function formatTimeZone(offset) {
    if(offset == 0) {
        return 'UTC';
    }
    var minutes = Math.abs(offset) % 60;
    return 'UTC' + (offset < 0 ? '-' : '+') + Math.floor(Math.abs(offset) / 60) + (minutes ? ':' + ('0' + minutes).slice(-2) : '');
}

// fills the date and time fields with the given moment, in the chosen time zone
function writeDateTimeInputs(date) {
    var local = new Date(date.getTime() + (timeZoneOffsetAt(date) * MINUTE)).toISOString();
    dateInput.value = local.slice(0, 10);
    timeInput.value = local.slice(11, 16);
}

function initObserverInputs() {
    try {
        var saved = JSON.parse(localStorage.getItem(LOCATION_KEY));
        if(saved && Math.abs(saved.lat) <= 90 && Math.abs(saved.lon) <= 180) {
            latInput.value = saved.lat;
            lonInput.value = saved.lon;
        }
    } catch(e) {
        // nothing saved, or storage unavailable: start at the default (Newgrange)
    }

    timeZoneInput.add(new Option('Auto', TIME_ZONE_AUTO));
    TIME_ZONE_OFFSETS.forEach(function(offset) {
        timeZoneInput.add(new Option(formatTimeZone(offset), offset));
    });
    try {
        var savedZone = parseInt(localStorage.getItem(TIME_ZONE_KEY), 10);
        if(TIME_ZONE_OFFSETS.indexOf(savedZone) > -1) {
            timeZoneChoice = savedZone;
        }
    } catch(e) {
        // nothing saved (or 'auto' saved), or storage unavailable: work it out from the location
    }
    timeZoneInput.value = timeZoneChoice;

    // start at now, in the time zone at the starting location
    observer.lat = parseFloat(latInput.value);
    observer.lon = parseFloat(lonInput.value);
    autoTimeZone = lookUpTimeZone(observer.lat, observer.lon);
    writeDateTimeInputs(new Date());
}

function saveLocation() {
    try {
        localStorage.setItem(LOCATION_KEY, JSON.stringify({ lat: observer.lat, lon: observer.lon }));
    } catch(e) {
        // storage unavailable: the location just won't be remembered
    }
}

// sets the latitude / longitude fields (e.g. from the Google Maps dialog) and updates the view
function setLocation(lat, lon) {
    latInput.value = lat;
    lonInput.value = lon;
    readObserverInputs();
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
    if(lat !== null) observer.lat = lat;
    if(lon !== null) observer.lon = lon;

    // moving into another time zone (when it's worked out from the location) re-writes the date and time in
    // the new zone, so the moment itself doesn't change, as when the time zone is changed by hand
    var zone = lookUpTimeZone(observer.lat, observer.lon);
    if(zone !== autoTimeZone) {
        autoTimeZone = zone;
        if(timeZoneChoice === TIME_ZONE_AUTO) {
            writeDateTimeInputs(observer.date);
        }
    }

    // (the fields are in the chosen time zone, so converted back to UTC)
    var date = wallClockToDate(new Date(dateInput.value + 'T' + timeInput.value + ':00Z').getTime());
    var dateValid = !isNaN(date.getTime());
    dateInput.classList.toggle('invalid', !dateValid);
    timeInput.classList.toggle('invalid', !dateValid);
    if(dateValid) observer.date = date;
    updateTimeZoneDisplay();

    if(lat !== null || lon !== null) {
        saveLocation();
    }
    onObserverChange(observer);
}

// updates everything that depends on where / when the observer is
function onObserverChange(obs) {
    // calcSunPosition and calcMoonPosition are from sun.js and moon.js, loaded as regular scripts before this module
    var sun = calcSunPosition(obs.date, obs.lat, obs.lon);
    setSun(sun.azimuth, sun.altitude);
    // calcSunRiseSet / calcMoonRiseSet give the times on the observer's local day
    document.getElementById('sunPosition').textContent = formatSkyPosition(sun) + ' | ' + formatRiseSet(calcSunRiseSet(obs.date, obs.lat, obs.lon));
    setSunArcs(obs);

    var moonPos = calcMoonPosition(obs.date, obs.lat, obs.lon);
    setMoon(moonPos.azimuth, moonPos.altitude, moonPos.diameter);
    document.getElementById('moonPosition').textContent = formatSkyPosition(moonPos) + ' | ' + formatRiseSet(calcMoonRiseSet(obs.date, obs.lat, obs.lon));
    setMoonArcs(obs);

    var phase = calcMoonIllumination(obs.date);
    document.getElementById('moonPhase').textContent = phase.name + ' · ' + Math.round(phase.illumination * 100) + '% lit';
}

// e.g. "Rise: 6:13am | Set: 6:22pm" (in the chosen time zone, like the observer's time), with "none" for a missing event
// (the moon skips a rise or set about once a month) and "up / down all day" where it never crosses the horizon
function formatRiseSet(times) {
    if(times.alwaysAbove) {
        return 'Up all day';
    }
    if(times.alwaysBelow) {
        return 'Down all day';
    }
    return 'Rise: ' + formatClockTime(times.rise) + ' | Set: ' + formatClockTime(times.set);
}

// e.g. "6:13am", in the chosen time zone
function formatClockTime(date) {
    if(!date) {
        return 'none';
    }
    var local = new Date(date.getTime() + (timeZoneOffsetAt(date) * MINUTE));
    var hours = local.getUTCHours();
    return ((hours % 12) || 12) + ':' + ('0' + local.getUTCMinutes()).slice(-2) + (hours < 12 ? 'am' : 'pm');
}

// e.g. "174° S · 36° above the horizon"
function formatSkyPosition(pos) {
    var alt = Math.round(pos.altitude);
    return formatHeading(pos.azimuth) + ' · ' + Math.abs(alt) + '° ' + (alt >= 0 ? 'above' : 'below') + ' the horizon';
}

document.getElementById('observer').addEventListener('input', function(e) {
    // the arc toggles and time zone live in the same panel, but have their own handlers
    if(e.target !== sunArcsToggle && e.target !== moonArcsToggle && e.target !== timeZoneInput) {
        readObserverInputs();
    }
});
// changing the time zone re-writes the date and time in the new zone, so the moment itself doesn't change
// (e.g. 12:00pm UTC becomes 7:00am in UTC-5)
timeZoneInput.addEventListener('change', function() {
    timeZoneChoice = timeZoneInput.value === TIME_ZONE_AUTO ? TIME_ZONE_AUTO : parseInt(timeZoneInput.value, 10);
    try {
        localStorage.setItem(TIME_ZONE_KEY, timeZoneChoice);
    } catch(e) {
        // storage unavailable: the time zone just won't be remembered
    }
    writeDateTimeInputs(observer.date);
    readObserverInputs();
});

document.getElementById('observer').addEventListener('submit', function(e) {
    e.preventDefault();
    if(document.activeElement) document.activeElement.blur();
});

// the "how to get your lat / long" dialog: paste coordinates or a Google Maps link, read by
// parseMapsLocation (from location.js, loaded as a regular script before this module)

var locationDialog = document.getElementById('locationDialog');
var locationPaste = document.getElementById('locationPaste');
var locationResult = document.getElementById('locationResult');
var locationApply = document.getElementById('locationApply');
var pastedLocation = null; // { lat, lon } read from the paste field, if it could be

function openLocationDialog() {
    locationPaste.value = '';
    showPastedLocation();
    // open the map where the observer is now, to make finding a nearby spot easier
    document.getElementById('mapsLink').href = 'https://www.google.com/maps/@' + observer.lat + ',' + observer.lon + ',15z';
    // (the time zone only follows the location when it's on Auto)
    document.getElementById('locationTimeZoneNote').textContent = timeZoneChoice === TIME_ZONE_AUTO
        ? 'The time zone will be updated automatically for the new location. Be sure to check it\'s right, especially near a border.'
        : 'The time zone is set by hand (' + formatTimeZone(timeZoneChoice) + '), so it won\'t change with the location.';
    locationDialog.showModal();
    locationPaste.focus();
}

function showPastedLocation() {
    var text = locationPaste.value.trim();
    var parsed = text ? parseMapsLocation(text) : null;
    pastedLocation = (parsed && !parsed.error) ? parsed : null;
    locationApply.disabled = !pastedLocation;
    locationResult.classList.toggle('found', !!pastedLocation);
    locationResult.classList.toggle('error', !!(parsed && parsed.error));
    locationResult.textContent = !parsed ? ''
        : pastedLocation ? 'Found: latitude ' + pastedLocation.lat + ', longitude ' + pastedLocation.lon
        : parsed.error;
}

document.getElementById('findLocation').addEventListener('click', openLocationDialog);
locationPaste.addEventListener('input', showPastedLocation);
document.getElementById('locationForm').addEventListener('submit', function(e) {
    e.preventDefault();
    if(pastedLocation) {
        setLocation(pastedLocation.lat, pastedLocation.lon);
        locationDialog.close();
    }
});
document.getElementById('locationCancel').addEventListener('click', function() {
    locationDialog.close();
});
document.getElementById('locationDefault').addEventListener('click', function() {
    setLocation(latInput.defaultValue, lonInput.defaultValue); // the values in the page's HTML
    locationDialog.close();
});
// clicking the dimmed backdrop (outside the dialog's box) closes it too
locationDialog.addEventListener('click', function(e) {
    if(e.target === locationDialog) {
        var box = locationDialog.getBoundingClientRect();
        if(e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) {
            locationDialog.close();
        }
    }
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
    horizonMarkers.position.copy(camera.position);
    moonPath.position.copy(camera.position);

    renderer.render(scene, camera);
}

window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    // the moon's path lines are sized in pixels, so need to know the screen size
    moonPathLines.forEach(function(line) {
        line.material.resolution.set(window.innerWidth, window.innerHeight);
    });
});

initArcToggles();
initObserverInputs();
readObserverInputs();
resetView();
renderer.setAnimationLoop(animate);
