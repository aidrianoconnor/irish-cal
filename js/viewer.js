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
renderer.shadowMap.enabled = true; // (shadows from the sun: see sunLight)
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
scene.add(sunLight.target);

// the sun's shadows: the stones and rocks cast them onto the ground. the shadow map covers a square SHADOW_AREA
// across, seen from the sun, which follows the observer (placeSunLight) so there are shadows wherever they walk;
// at a low sun it stretches out along the ground, as the long shadows do
var SHADOW_AREA = 130; // metres
var SUN_LIGHT_DISTANCE = 150; // how far towards the sun the light sits from the observer
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048); // (about 6 cm a texel; 4096 would take 64 MB of graphics memory)
sunLight.shadow.camera.left = sunLight.shadow.camera.bottom = -SHADOW_AREA / 2;
sunLight.shadow.camera.right = sunLight.shadow.camera.top = SHADOW_AREA / 2;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = SUN_LIGHT_DISTANCE * 2;
sunLight.shadow.bias = -0.0003;
sunLight.shadow.normalBias = 0.04; // (stops the ground shadowing itself in speckles)
var sunDirection = new THREE.Vector3(0, 1, 0);

// keeps the sun's light (and so its shadows) centred on the observer, in whole shadow-map texels so the shadows'
// edges don't shimmer as they walk
function placeSunLight() {
    var texel = SHADOW_AREA / sunLight.shadow.mapSize.x;
    var x = Math.round(camera.position.x / texel) * texel, z = Math.round(camera.position.z / texel) * texel;
    sunLight.target.position.set(x, 0, z);
    sunLight.position.set(x, 0, z).addScaledVector(sunDirection, SUN_LIGHT_DISTANCE);
}

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
    'uniform mat3 skyToGalactic;', // turns a direction in the scene into galactic coordinates (set with the stars)
    'uniform float milkyWay;', // 0 (daylight, twilight or a bright moon) to 1 (a dark, moonless night)
    'varying vec3 vDirection;',
    '',
    // smooth random values in 3D (value noise), for the Milky Way's patchiness
    'float hash(vec3 p) {',
    '    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);',
    '}',
    'float valueNoise(vec3 p) {',
    '    vec3 i = floor(p);',
    '    vec3 f = fract(p);',
    '    f = f * f * (3.0 - (2.0 * f));',
    '    return mix(mix(mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x),',
    '                   mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),',
    '               mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),',
    '                   mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);',
    '}',
    '',
    // the Milky Way: an impression of it, not a picture, but in its real place. a soft band along the galactic
    // plane (galactic latitude 0), widest and brightest towards the centre of the galaxy (in Sagittarius, galactic
    // longitude 0), with the bulge around the centre, the dark dust lane of the Great Rift down the middle from
    // Cygnus towards the centre, and patchy star clouds
    'float milkyWayGlow(vec3 dir) {',
    '    vec3 g = skyToGalactic * dir;',
    '    float b = degrees(asin(clamp(g.z, -1.0, 1.0)));',
    '    float l = degrees(atan(g.y, g.x));', // -180 to 180, 0 towards the centre
    '    float centre = exp(-pow(l / 70.0, 2.0));',
    '    float band = exp(-0.5 * pow(b / mix(7.0, 13.0, centre), 2.0)) * (0.55 + (0.45 * centre));',
    '    band += 0.5 * exp(-pow(l / 18.0, 2.0) - pow(b / 9.0, 2.0));',
    '    float rift = exp(-0.5 * pow((b - 1.0) / 2.2, 2.0)) * smoothstep(-20.0, 5.0, l) * (1.0 - smoothstep(55.0, 85.0, l));',
    '    band *= 1.0 - (0.55 * rift);',
    '    float clouds = (0.55 * valueNoise(g * 9.0)) + (0.3 * valueNoise(g * 21.0)) + (0.15 * valueNoise(g * 47.0));',
    '    return band * mix(0.45, 1.25, clouds);',
    '}',
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
    // the Milky Way, only on a dark night, fading out towards the horizon (through more air)
    '    if(milkyWay > 0.0) {',
    '        color += vec3(0.22, 0.24, 0.3) * milkyWayGlow(dir) * milkyWay * smoothstep(0.0, 0.25, dir.y);',
    '    }',
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
            showMoonArcs: { value: 1 },
            skyToGalactic: { value: new THREE.Matrix3() },
            milkyWay: { value: 0 }
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

var DAY_AMBIENT = { sky: new THREE.Color('#cfe6ff'), ground: new THREE.Color('#3d6b2a'), intensity: 1.2 };
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

    sunDirection.copy(direction);
    placeSunLight();
    sunLight.intensity = 2.0 * THREE.MathUtils.smoothstep(altitude, -2, 6); // fades out as the sun sets

    moon.material.uniforms.daylight.value = daylight;

    // the haze takes the sky's colour at the horizon, as the sky shader works it out: night to day, plus the
    // twilight glow averaged all the way round (it's strongest on the sun's side)
    var sky = skyDome.material.uniforms;
    var sunHeight = direction.y;
    var twilight = THREE.MathUtils.smoothstep(sunHeight, -0.3, -0.03) * (1 - THREE.MathUtils.smoothstep(sunHeight, 0, 0.25));
    hazeColor.lerpColors(sky.nightHorizon.value, sky.dayHorizon.value, daylight);
    hazeColor.add(hazeGlow.copy(sky.twilightGlow.value).multiplyScalar(twilight * 0.31));
    scene.fog.color.setRGB(hazeColor.r, hazeColor.g, hazeColor.b, THREE.SRGBColorSpace); // (the sky's colours are sRGB)
}
var hazeColor = new THREE.Color(), hazeGlow = new THREE.Color();

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

// stars: the Bright Star Catalogue's stars down to magnitude 5.5 (BRIGHT_STARS, from stars.js), about what can be
// seen from a dark country site. they're fixed on the celestial sphere, which turns as one with the Earth, so a
// single rotation places them all: precession from J2000 to the date, the sidereal time, then the observer's
// latitude. like the moon they're kept centred on the observer. they fade in with twilight, brightest first,
// dim towards the horizon, and the faintest are washed out by a bright moon

var STAR_DISTANCE = 470; // inside the sky dome, behind the moon's path

// a star's colour from its B-V index: its temperature (Ballesteros' formula), then that temperature's colour
// (an approximation of a blackbody's), mixed halfway to white, as the eye sees star colours only faintly
function starColor(bv) {
    var t = 4600 * ((1 / ((0.92 * bv) + 1.7)) + (1 / ((0.92 * bv) + 0.62))) / 100;
    var r = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -0.1332);
    var g = t <= 66 ? (99.47 * Math.log(t)) - 161.12 : 288.12 * Math.pow(t - 60, -0.0755);
    var b = t >= 66 ? 255 : (t <= 19 ? 0 : (138.52 * Math.log(t - 10)) - 305.04);
    var clamp = function(c) { return THREE.MathUtils.clamp(c, 0, 255) / 255; };
    return new THREE.Color().setRGB(0.5 + (clamp(r) / 2), 0.5 + (clamp(g) / 2), 0.5 + (clamp(b) / 2), THREE.SRGBColorSpace);
}

function makeStars() {
    var count = BRIGHT_STARS.length / 4;
    var positions = new Float32Array(count * 3);
    var magnitudes = new Float32Array(count);
    var colors = new Float32Array(count * 3);
    for(var i = 0; i < count; i++) {
        // J2000 equatorial coordinates: x towards the March equinox, z towards the north celestial pole
        var ra = THREE.MathUtils.degToRad(BRIGHT_STARS[i * 4] / 100);
        var dec = THREE.MathUtils.degToRad(BRIGHT_STARS[(i * 4) + 1] / 100);
        positions[i * 3] = STAR_DISTANCE * Math.cos(dec) * Math.cos(ra);
        positions[(i * 3) + 1] = STAR_DISTANCE * Math.cos(dec) * Math.sin(ra);
        positions[(i * 3) + 2] = STAR_DISTANCE * Math.sin(dec);
        magnitudes[i] = BRIGHT_STARS[(i * 4) + 2] / 100;
        starColor(BRIGHT_STARS[(i * 4) + 3] / 100).toArray(colors, i * 3);
    }
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('magnitude', new THREE.BufferAttribute(magnitudes, 1));
    geometry.setAttribute('starColor', new THREE.BufferAttribute(colors, 3));

    var points = new THREE.Points(geometry, new THREE.ShaderMaterial({
        uniforms: {
            limitingMagnitude: { value: -5 }, // the faintest that can be seen at the moment
            pixelRatio: { value: renderer.getPixelRatio() }
        },
        vertexShader: STAR_VERTEX_SHADER,
        fragmentShader: STAR_FRAGMENT_SHADER,
        transparent: true,
        blending: THREE.AdditiveBlending, // starlight adds to the sky behind it
        depthWrite: false
    }));
    points.matrixAutoUpdate = false; // its matrix is the sky's rotation, set by setStars
    points.frustumCulled = false;
    points.renderOrder = -0.5; // after the sky dome, before the moon (which passes in front)
    return points;
}

var STAR_VERTEX_SHADER = [
    'attribute float magnitude;',
    'attribute vec3 starColor;',
    'uniform float limitingMagnitude;',
    'uniform float pixelRatio;',
    'varying vec3 vColor;',
    'varying float vAlpha;',
    'void main() {',
    '    // the stars are centred on the observer, so their direction up is their altitude',
    '    float sinAltitude = normalize(mat3(modelMatrix) * position).y;',
    '    // light passes through more air near the horizon: roughly a quarter of a magnitude dimmer per air mass',
    '    float airMass = min(1.0 / (max(sinAltitude, 0.0) + 0.04), 12.0);',
    '    float mag = magnitude + (0.25 * (airMass - 1.0));',
    '    // faint stars fade in over the magnitude above the limit; brighter ones are bigger and brighter',
    '    float visible = smoothstep(0.0, 1.0, limitingMagnitude - mag) * step(-0.005, sinAltitude);',
    '    vAlpha = visible * clamp(0.45 + (0.15 * (5.5 - mag)), 0.45, 1.0);',
    '    vColor = starColor;',
    '    // (at least a couple of pixels across, or the soft edge leaves too little of the faintest to see)',
    '    gl_PointSize = (2.2 + (0.6 * max(0.0, 4.5 - mag))) * pixelRatio;',
    '    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);',
    '}'
].join('\n');

var STAR_FRAGMENT_SHADER = [
    'varying vec3 vColor;',
    'varying float vAlpha;',
    'void main() {',
    '    // a soft round point',
    '    float d = length(gl_PointCoord - 0.5) * 2.0;',
    '    float shape = 1.0 - smoothstep(0.45, 1.0, d);',
    '    if(vAlpha * shape < 0.004) discard;',
    '    gl_FragColor = vec4(vColor * vAlpha * shape, 1.0);',
    '}'
].join('\n');

var stars = makeStars();
var starField = new THREE.Group(); // kept centred on the observer
starField.add(stars);
scene.add(starField);

// the faintest star that can be seen, from the sun's altitude (degrees): none in daylight, the brightest from
// about sunset + 6 deg, all of them once it's properly dark (about 15 deg below). a bright moon that's up hides
// up to a magnitude of the faintest
var STAR_LIMITS = [[-3, -2], [-6, 1], [-9, 3], [-12, 4.5], [-15, 5.5]];
function limitingMagnitude(sunAltitude, moonAltitude, moonIllumination) {
    var limit = STAR_LIMITS[STAR_LIMITS.length - 1][1];
    for(var i = 0; i < STAR_LIMITS.length; i++) {
        if(sunAltitude >= STAR_LIMITS[i][0]) {
            var prev = STAR_LIMITS[i - 1];
            limit = prev ? THREE.MathUtils.mapLinear(sunAltitude, prev[0], STAR_LIMITS[i][0], prev[1], STAR_LIMITS[i][1]) : STAR_LIMITS[0][1];
            break;
        }
    }
    return limit - (moonIllumination * THREE.MathUtils.clamp((moonAltitude + 2) / 12, 0, 1));
}

// turns the stars to the observer's sky: J2000 -> the date's equator and equinox (precessionMatrix, astro.js),
// then by the local sidereal time to the observer's meridian, then tilted for their latitude, into the scene's
// axes (x east, y up, z south)
function setStars(obs, sunAltitude, moonAltitude, moonIllumination) {
    var p = precessionMatrix(obs.date);
    var lst = THREE.MathUtils.degToRad(greenwichSiderealTime(obs.date) + obs.lon);
    var phi = THREE.MathUtils.degToRad(obs.lat);
    var precession = new THREE.Matrix4().set(p[0], p[1], p[2], 0, p[3], p[4], p[5], 0, p[6], p[7], p[8], 0, 0, 0, 0, 1);
    var siderealTime = new THREE.Matrix4().makeRotationZ(-lst);
    var local = new THREE.Matrix4().set(
        0, 1, 0, 0,
        Math.cos(phi), 0, Math.sin(phi), 0,
        Math.sin(phi), 0, -Math.cos(phi), 0,
        0, 0, 0, 1
    );
    stars.matrix.copy(local).multiply(siderealTime).multiply(precession);
    stars.matrixWorldNeedsUpdate = true;
    var limit = limitingMagnitude(sunAltitude, moonAltitude, moonIllumination);
    stars.material.uniforms.limitingMagnitude.value = limit;

    // the Milky Way (drawn by the sky shader) uses the same rotation, back from the scene to J2000, then
    // into galactic coordinates. it needs a properly dark sky: faint by a full moon, gone in twilight
    var uniforms = skyDome.material.uniforms;
    uniforms.skyToGalactic.value.setFromMatrix4(stars.matrix).transpose().premultiply(EQUATORIAL_TO_GALACTIC);
    uniforms.milkyWay.value = THREE.MathUtils.clamp((limit - 4) / 1.5, 0, 1);
}

// J2000 equatorial to galactic coordinates (x towards the galactic centre, z towards the north galactic pole)
var EQUATORIAL_TO_GALACTIC = new THREE.Matrix3().set(
    -0.0548755604, -0.8734370902, -0.4838350155,
    0.4941094279, -0.4448296300, 0.7469822445,
    -0.8676661490, -0.1980763734, 0.4559837762
);

// sun and moon arcs, and horizon markers
// the sun's arcs (midsummer, midwinter, the fire festivals, the equinoxes and today) and the limits of
// the moon's range (its major and minor standstills) are circles of constant declination, drawn by the sky shader.
// the moon's path tonight isn't: its declination can shift several degrees in a night, so it's traced from
// its calculated positions and drawn as a line. where each arc meets the horizon, a thin tick and a small
// label mark the rising / setting direction.
// like the moon, the markers and the moon's path are kept centred on the observer, as they mark directions
// rather than places. the sun's and moon's arcs (with their markers) can be shown or hidden separately

var markerLabels = []; // every horizon marker's label, for finding the one under the pointer

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
    // (not faded by the haze over the ground: they're in the sky)
    var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: opacity, depthWrite: false, fog: false }));
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
        new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: opacity * 0.7, fog: false })
    );
    marker.add(tick);

    var label = makeSkyLabel(text, color, 2.8, opacity);
    marker.add(label);
    label.userData.marker = marker;
    markerLabels.push(label);

    // (describe is added below, with what the marker's details panel says)
    marker.userData = { tick: tick, label: label, text: text, color: color, opacity: opacity, azimuth: null };
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
    marker.userData.azimuth = azimuth;
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
    var material = new LineMaterial({ color: MOON_PATH_COLOR, linewidth: 2.2, transparent: true, opacity: opacity, depthWrite: false, fog: false });
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

var moonPass = null; // the moon's current (or next) pass, as found by findMoonPass, for the markers' details

function setMoonPath(obs) {
    clearMoonPath();
    var pass = moonPass = findMoonPass(obs.date, obs.lat, obs.lon);

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
    placeMarkerInfo(); // (closes a marker's details if its arcs were just switched off, or moves them with its label)

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

// the observer panel and the navigation controls can each be collapsed (remembered between visits): the
// observer panel up to its title, the navigation controls down to the heading
var PANELS_KEY = 'irishcal.viewer.panels';
var PANELS = [
    { key: 'observer', panel: document.getElementById('observer'), toggle: document.getElementById('observerToggle'),
      name: 'the observer panel', collapseArrow: '▲', expandArrow: '▼' },
    { key: 'hud', panel: document.getElementById('hud'), toggle: document.getElementById('hudToggle'),
      name: 'the navigation controls', collapseArrow: '▼', expandArrow: '▲' }
];

function setPanelCollapsed(p, collapsed) {
    p.panel.classList.toggle('collapsed', collapsed);
    p.toggle.textContent = collapsed ? p.expandArrow : p.collapseArrow;
    p.toggle.title = (collapsed ? 'Show ' : 'Hide ') + p.name;
    p.toggle.setAttribute('aria-label', p.toggle.title);
    p.toggle.setAttribute('aria-expanded', !collapsed);
}

function savePanels() {
    var collapsed = {};
    PANELS.forEach(function(p) { collapsed[p.key] = p.panel.classList.contains('collapsed'); });
    try {
        localStorage.setItem(PANELS_KEY, JSON.stringify(collapsed));
    } catch(e) {
        // storage unavailable: the panels just open expanded next time
    }
}

function initPanelToggles() {
    var saved = null;
    try {
        saved = JSON.parse(localStorage.getItem(PANELS_KEY));
    } catch(e) {
        // nothing saved, or storage unavailable: start with both expanded
    }
    PANELS.forEach(function(p) {
        setPanelCollapsed(p, !!(saved && saved[p.key]));
        p.toggle.addEventListener('click', function() {
            setPanelCollapsed(p, !p.panel.classList.contains('collapsed'));
            savePanels();
        });
    });
}

// places the moon (degrees: azimuth clockwise from north, altitude above the horizon, apparent diameter)
function setMoon(azimuth, altitude, diameter) {
    moonOffset.copy(skyDirection(azimuth, altitude)).multiplyScalar(MOON_DISTANCE);
    moon.scale.setScalar(MOON_DISTANCE * Math.tan(THREE.MathUtils.degToRad(diameter * MOON_SIZE_SCALE / 2)));
    moon.visible = altitude > -(diameter * MOON_SIZE_SCALE / 2); // hidden once it's set below the horizon
}


// the ground: the walkable plain (GROUND_RADIUS) carries on out to near the horizon, fading into the haze, so the
// ground meets the sky at a true, level horizon (from eye height, a flat ground's horizon is within 0.05 deg of
// level, and the arcs and markers assume a level horizon). it's made of rings of vertices, close together near the
// centre and further apart out towards the horizon, where the haze hides the detail

var GROUND_EXTENT = 450; // inside the sky dome
var GROUND_RINGS = 140;
var GROUND_SEGMENTS = 256;
var GROUND_RING_GROWTH = 0.035; // each ring's gap is this much wider than the last's (about 12 cm at the centre, 2 m by the plain's edge)

function groundRingRadius(ring) {
    return GROUND_EXTENT * (Math.exp(GROUND_RING_GROWTH * ring) - 1) / (Math.exp(GROUND_RING_GROWTH * GROUND_RINGS) - 1);
}

// smooth random values (value noise) on the ground, 0 to 1, the same every time for the same place and seed
function groundHash(ix, iz, seed) {
    var h = Math.sin((ix * 127.1) + (iz * 311.7) + (seed * 74.7)) * 43758.5453;
    return h - Math.floor(h);
}
function groundNoise(x, z, seed) {
    var ix = Math.floor(x), iz = Math.floor(z);
    var fx = x - ix, fz = z - iz;
    fx = fx * fx * (3 - (2 * fx));
    fz = fz * fz * (3 - (2 * fz));
    var a = groundHash(ix, iz, seed), b = groundHash(ix + 1, iz, seed);
    var c = groundHash(ix, iz + 1, seed), d = groundHash(ix + 1, iz + 1, seed);
    return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, fx), THREE.MathUtils.lerp(c, d, fx), fz);
}

// the ground's gentle unevenness, in metres (up to about +/-25 cm): broad swells about 16 m across, smaller ones
// about 6 m and 2.5 m across. flat where the observer starts (the Reset point), and level again out towards the
// horizon so that it stays level; the smallest undulations fade out first, where the rings are too far apart for them
var GROUND_BUMP_HEIGHT = 0.25;
function groundHeight(x, z) {
    var r = Math.sqrt((x * x) + (z * z));
    var fade = THREE.MathUtils.smoothstep(r, 2.5, 8) * (1 - THREE.MathUtils.smoothstep(r, 90, 220));
    if(fade == 0) {
        return 0;
    }
    var bumps = (0.5 * (groundNoise(x / 16, z / 16, 1) - 0.5))
              + (0.35 * (groundNoise(x / 6, z / 6, 2) - 0.5))
              + (0.15 * (groundNoise(x / 2.5, z / 2.5, 3) - 0.5) * (1 - THREE.MathUtils.smoothstep(r, 25, 50)));
    return 2 * GROUND_BUMP_HEIGHT * bumps * fade;
}

function makeGroundGeometry() {
    // vertex 0 is the centre, then each ring's GROUND_SEGMENTS vertices; angles run from east (+x) towards north (-z),
    // so that the triangles face up
    var positions = [0, 0, 0];
    for(var ring = 1; ring <= GROUND_RINGS; ring++) {
        var radius = groundRingRadius(ring);
        for(var seg = 0; seg < GROUND_SEGMENTS; seg++) {
            var angle = (seg / GROUND_SEGMENTS) * Math.PI * 2;
            var x = radius * Math.cos(angle), z = -radius * Math.sin(angle);
            positions.push(x, groundHeight(x, z), z);
        }
    }
    var vertex = function(ring, seg) {
        return ring == 0 ? 0 : 1 + ((ring - 1) * GROUND_SEGMENTS) + (seg % GROUND_SEGMENTS);
    };
    var indices = [];
    for(var seg2 = 0; seg2 < GROUND_SEGMENTS; seg2++) {
        indices.push(0, vertex(1, seg2), vertex(1, seg2 + 1));
    }
    for(var r = 1; r < GROUND_RINGS; r++) {
        for(var s = 0; s < GROUND_SEGMENTS; s++) {
            indices.push(vertex(r, s), vertex(r + 1, s), vertex(r + 1, s + 1));
            indices.push(vertex(r, s), vertex(r + 1, s + 1), vertex(r, s + 1));
        }
    }
    // the fine grain texture repeats every GROUND_GRAIN_SIZE metres, laid flat across the ground
    var uvs = [];
    for(var i = 0; i < positions.length; i += 3) {
        uvs.push(positions[i] / GROUND_GRAIN_SIZE, positions[i + 2] / GROUND_GRAIN_SIZE);
    }
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(positions.length), 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

// the ground's colour varies in patches: between a lush and a drier grass, with patches of bare earth and of
// stone showing through. the patterns at each vertex are worked out once (groundMix, as noise values); the colours
// and how far the bare patches spread come from the season (groundSeason), applied by colourGround
function groundMix(x, z) {
    var r = Math.sqrt((x * x) + (z * z));
    var near = 1 - THREE.MathUtils.smoothstep(r, 25, 50); // (the finest patches fade out where the rings are far apart)
    // clumps of lighter and darker grass, and the dips a little darker (damper), the rises a little lighter
    var clumps = 0.9 + (0.2 * THREE.MathUtils.lerp(0.5, groundNoise(x / 1.6, z / 1.6, 9), near));
    return {
        dry: groundNoise(x / 9, z / 9, 4),
        earth: (0.5 * groundNoise(x / 3.5, z / 3.5, 5)) + (0.5 * near * groundNoise(x / 1.4, z / 1.4, 6)),
        stone: (0.5 * groundNoise(x / 2.5, z / 2.5, 7)) + (0.5 * near * groundNoise(x / 0.9, z / 0.9, 8)),
        shade: clumps * (1 + (0.6 * groundHeight(x, z)))
    };
}

// the ground through the year, at the solstices, equinoxes and fire festivals, by the sun's ecliptic longitude
// (0 at the March equinox, as in setSunArcs; flipped for the southern hemisphere). the grass lags the sun: it's
// freshest around Bealtaine, driest after Lúnasa, and dullest (with the most bare, wet ground) through the winter.
// Irish grass stays green all year, so the changes are in how bright, dry or tawny it is, and how much bare
// ground shows. each: the lush and dry grass colours, how far the mix leans to the dry one, how much further the
// bare earth and stone patches spread, and the earth's colour (darker when wet)
var GROUND_SEASONS = [
    { longitude: 0, name: 'spring equinox', lush: '#4c8134', dry: '#6d8740', dryBias: 0, earthSpread: 0.03, stoneSpread: 0.015, earth: '#62503a' },
    { longitude: 45, name: 'Bealtaine', lush: '#44932f', dry: '#6f9d3d', dryBias: -0.15, earthSpread: -0.01, stoneSpread: 0, earth: '#6a563c' },
    { longitude: 90, name: 'midsummer', lush: '#3f8a34', dry: '#6b8f3c', dryBias: 0, earthSpread: 0, stoneSpread: 0, earth: '#6e5a3e' },
    { longitude: 135, name: 'Lúnasa', lush: '#4b8434', dry: '#918e40', dryBias: 0.15, earthSpread: 0.01, stoneSpread: 0, earth: '#72603f' },
    { longitude: 180, name: 'autumn equinox', lush: '#537c37', dry: '#95813e', dryBias: 0.2, earthSpread: 0.02, stoneSpread: 0.005, earth: '#6a563b' },
    { longitude: 225, name: 'Samhain', lush: '#556f39', dry: '#8e6b3b', dryBias: 0.2, earthSpread: 0.05, stoneSpread: 0.02, earth: '#5f4b35' },
    { longitude: 270, name: 'midwinter', lush: '#4b683b', dry: '#77734f', dryBias: 0.15, earthSpread: 0.07, stoneSpread: 0.04, earth: '#584632' },
    { longitude: 315, name: 'Imbolc', lush: '#4b7039', dry: '#79784c', dryBias: 0.1, earthSpread: 0.06, stoneSpread: 0.03, earth: '#5a4833' }
].map(function(k) {
    return {
        longitude: k.longitude, name: k.name, dryBias: k.dryBias, earthSpread: k.earthSpread, stoneSpread: k.stoneSpread,
        lush: new THREE.Color(k.lush), dry: new THREE.Color(k.dry), earth: new THREE.Color(k.earth)
    };
});
var GROUND_STONE_COLOR = new THREE.Color('#8a857a');

// the ground's look for the observer's date and place: blended between the two nearest of GROUND_SEASONS.
// near the equator, where these seasons don't apply, it settles on a mild all-year green (the spring equinox's)
function groundSeason(obs) {
    var longitude = calcSunEquatorial(obs.date).longitude + (obs.lat < 0 ? 180 : 0);
    longitude = ((longitude % 360) + 360) % 360;
    var i = Math.floor(longitude / 45) % GROUND_SEASONS.length;
    var a = GROUND_SEASONS[i], b = GROUND_SEASONS[(i + 1) % GROUND_SEASONS.length];
    var t = THREE.MathUtils.smoothstep((longitude - a.longitude) / 45, 0, 1);
    var mix = function(key) { return THREE.MathUtils.lerp(a[key], b[key], t); };
    var season = {
        lush: a.lush.clone().lerp(b.lush, t), dry: a.dry.clone().lerp(b.dry, t), earth: a.earth.clone().lerp(b.earth, t),
        dryBias: mix('dryBias'), earthSpread: mix('earthSpread'), stoneSpread: mix('stoneSpread')
    };
    var strength = THREE.MathUtils.smoothstep(Math.abs(obs.lat), 10, 30);
    if(strength < 1) {
        var mild = GROUND_SEASONS[0];
        season.lush.lerpColors(mild.lush, season.lush, strength);
        season.dry.lerpColors(mild.dry, season.dry, strength);
        season.earth.lerpColors(mild.earth, season.earth, strength);
        season.dryBias *= strength;
        season.earthSpread *= strength;
        season.stoneSpread *= strength;
    }
    return season;
}

var groundMixes = []; // one for each vertex of the ground

// colours the ground for a season (from groundSeason)
function colourGround(season) {
    var colors = ground.geometry.attributes.color;
    var c = new THREE.Color();
    var smoothstep = THREE.MathUtils.smoothstep;
    for(var i = 0; i < groundMixes.length; i++) {
        var m = groundMixes[i];
        var dry = THREE.MathUtils.clamp(m.dry + season.dryBias, 0, 1);
        var earth = 0.6 * smoothstep(m.earth, 0.68 - season.earthSpread, 0.76 - season.earthSpread);
        var stone = 0.55 * smoothstep(m.stone, 0.74 - season.stoneSpread, 0.79 - season.stoneSpread);
        c.lerpColors(season.lush, season.dry, dry).lerp(season.earth, earth).lerp(GROUND_STONE_COLOR, stone).multiplyScalar(m.shade);
        colors.setXYZ(i, c.r, c.g, c.b);
    }
    colors.needsUpdate = true;
    // the tussocks are the season's grass, leaning to the drier colour
    if(typeof tussockMaterial !== 'undefined') {
        tussockMaterial.color.lerpColors(season.lush, season.dry, 0.7);
    }
}

// recolours the ground when the season has moved on (by a day or so of the sun's travel), or the hemisphere changed
var groundSeasonKey = null;
function updateGroundSeason(obs) {
    var key = Math.round(calcSunEquatorial(obs.date).longitude) + ':' + Math.round(obs.lat);
    if(key !== groundSeasonKey) {
        groundSeasonKey = key;
        colourGround(groundSeason(obs));
    }
}

// fine grain for the ground up close: a small tile of random light and dark speckles, in two sizes (about 3 and
// 12 cm, big enough not to average away to a flat grey at a little distance), drawn once on a canvas and multiplied
// over the ground's colours
var GROUND_GRAIN_SIZE = 4; // metres
function makeGrainTexture() {
    var size = 128;
    var coarse = [];
    for(var j = 0; j < (size / 4) * (size / 4); j++) {
        coarse.push(Math.random());
    }
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    var context = canvas.getContext('2d');
    var image = context.createImageData(size, size);
    for(var i = 0; i < size * size; i++) {
        var px = i % size, py = Math.floor(i / size);
        var speckle = (0.55 * Math.random()) + (0.45 * coarse[(Math.floor(py / 4) * (size / 4)) + Math.floor(px / 4)]);
        var v = Math.round(255 * (0.7 + (0.3 * speckle)));
        image.data[i * 4] = image.data[(i * 4) + 1] = image.data[(i * 4) + 2] = v;
        image.data[(i * 4) + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    var texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy(); // (stays sharp at low angles)
    return texture;
}

var ground = new THREE.Mesh(makeGroundGeometry(), new THREE.MeshStandardMaterial({
    vertexColors: true, map: makeGrainTexture(), roughness: 1
}));
(function() {
    var positions = ground.geometry.attributes.position;
    for(var i = 0; i < positions.count; i++) {
        groundMixes.push(groundMix(positions.getX(i), positions.getZ(i)));
    }
})();
ground.receiveShadow = true;
scene.add(ground);

// the haze: the ground fades into the colour of the sky at the horizon with distance, as far-off land does through
// the air. its colour follows the sky's (set by setSun); the sky itself, the sun, moon, stars and the sky's labels
// and arcs aren't affected
var HAZE_START = 30;
scene.fog = new THREE.Fog('#000000', HAZE_START, GROUND_EXTENT);

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

// standing stones: each direction is marked by a rough stone, generated from its own fixed random seed, so the
// same eight stones appear every time. each is a slab (broad faces towards the centre, as in stone circles),
// wider at its flared base and narrowing towards an uneven, sloping top, with lumps, a slight lean and twist,
// and lichen. the cardinal directions have the taller stones

// smooth random values in 3D (value noise), 0 to 1, for the stones' shapes and colours
function stoneNoise(x, y, z, seed) {
    var ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    var fx = x - ix, fy = y - iy, fz = z - iz;
    fx = fx * fx * (3 - (2 * fx));
    fy = fy * fy * (3 - (2 * fy));
    fz = fz * fz * (3 - (2 * fz));
    var h = function(dx, dy, dz) {
        var v = Math.sin(((ix + dx) * 127.1) + ((iy + dy) * 269.5) + ((iz + dz) * 311.7) + (seed * 74.7)) * 43758.5453;
        return v - Math.floor(v);
    };
    var lerp = THREE.MathUtils.lerp;
    return lerp(lerp(lerp(h(0, 0, 0), h(1, 0, 0), fx), lerp(h(0, 1, 0), h(1, 1, 0), fx), fy),
                lerp(lerp(h(0, 0, 1), h(1, 0, 1), fx), lerp(h(0, 1, 1), h(1, 1, 1), fx), fy), fz);
}

// a random number from 0 to 1 for a stone's seed and the name of what it's for
function stoneRandom(seed, what) {
    return stoneNoise(seed * 3.1 + what, what * 1.7, seed * 0.9, 99);
}

var STONE_AROUND = 28; // vertices around each ring of a stone
var STONE_LEVELS = 20; // rings from its buried base up to its top
var STONE_BURIED = 0.2; // metres set into the ground
var STONE_COLORS = {
    rock: new THREE.Color('#858279'),
    damp: new THREE.Color('#5d5b54'), // near the ground
    lichen: new THREE.Color('#a9ab8b'),
    paleLichen: new THREE.Color('#c4c3b6')
};

// the stone's geometry, in its own space: y up from ground level, its broad faces along +/-z (towards / away
// from the centre once it's turned into place), with vertex colours
function makeStoneGeometry(seed, cardinal) {
    var height = (cardinal ? 2.3 : 1.5) + (0.35 * stoneRandom(seed, 1));
    var width = (cardinal ? 1.0 : 0.8) + (0.2 * stoneRandom(seed, 2)); // at the base, side to side
    var thickness = width * (0.4 + (0.2 * stoneRandom(seed, 3))); // at the base, front to back
    var taper = 0.55 + (0.2 * stoneRandom(seed, 4)); // how wide the top is compared with the base
    var squareness = 2.6 + (1.4 * stoneRandom(seed, 5)); // 2 is an ellipse, higher is boxier
    var lean = { x: 0.06 * (stoneRandom(seed, 6) - 0.5), z: 0.06 * (stoneRandom(seed, 7) - 0.5) }; // per metre up
    var twist = 0.5 * (stoneRandom(seed, 8) - 0.5); // radians from base to top
    var topSlope = { x: 0.8 * (stoneRandom(seed, 9) - 0.5), z: 0.3 * (stoneRandom(seed, 10) - 0.5) }; // the top's tilt
    var total = height + STONE_BURIED;

    var positions = [], colors = [];
    var color = new THREE.Color();
    var point = function(x, y, z) {
        // lichen grows in patches, more on the upper parts; the base is darker and damp
        var lichen = THREE.MathUtils.smoothstep(stoneNoise(x * 2.2, y * 2.2, z * 2.2, seed + 50), 0.58, 0.72);
        var pale = THREE.MathUtils.smoothstep(stoneNoise(x * 4, y * 4, z * 4, seed + 60), 0.66, 0.78);
        color.copy(STONE_COLORS.rock).multiplyScalar(0.85 + (0.3 * stoneNoise(x * 6, y * 6, z * 6, seed + 70)));
        color.lerp(STONE_COLORS.lichen, 0.7 * lichen * THREE.MathUtils.smoothstep(y, 0.2, 0.9));
        color.lerp(STONE_COLORS.paleLichen, 0.6 * pale * THREE.MathUtils.smoothstep(y, 0.5, 1.4));
        color.lerp(STONE_COLORS.damp, 0.8 * (1 - THREE.MathUtils.smoothstep(y, -0.05, 0.35)));
        positions.push(x, y, z);
        colors.push(color.r, color.g, color.b);
    };

    for(var level = 0; level <= STONE_LEVELS; level++) {
        var v = level / STONE_LEVELS; // 0 at the buried base, 1 at the top
        var y0 = (v * total) - STONE_BURIED;
        // narrowing upwards, flared at the foot, and rounding off only over the last few per cent, so the top is
        // blunt (and sloping) rather than pointed
        var scale = THREE.MathUtils.lerp(1, taper, Math.pow(v, 1.2)) * (1 + (0.12 * (1 - THREE.MathUtils.smoothstep(v, 0, 0.15))));
        if(v > 0.93) {
            scale *= 0.55 + (0.45 * Math.sqrt(Math.max(0, 1 - Math.pow((v - 0.93) / 0.07, 2))));
        }
        var angleTwist = twist * v;
        for(var a = 0; a < STONE_AROUND; a++) {
            var theta = (a / STONE_AROUND) * Math.PI * 2;
            var c = Math.cos(theta), s = Math.sin(theta);
            // a rounded-box outline (a superellipse), then lumps: big ones, and smaller ones
            var r = 1 / Math.pow(Math.pow(Math.abs(c) / (width / 2), squareness) + Math.pow(Math.abs(s) / (thickness / 2), squareness), 1 / squareness);
            var lumps = (0.7 * (stoneNoise(c * 1.2, y0 * 0.9, s * 1.2, seed) - 0.5)) + (0.3 * (stoneNoise(c * 3, y0 * 2.5, s * 3, seed + 10) - 0.5));
            r *= scale * (1 + (0.36 * lumps));
            var x = r * Math.cos(theta + angleTwist), z = r * Math.sin(theta + angleTwist);
            var y = y0 + (v > 0.7 ? ((topSlope.x * x) + (topSlope.z * z)) * THREE.MathUtils.smoothstep(v, 0.7, 1) : 0);
            point(x + (lean.x * Math.max(y, 0)), y, z + (lean.z * Math.max(y, 0)));
        }
    }
    // the very top, closing it off
    var topY = height + (0.04 * (stoneRandom(seed, 11) - 0.5));
    point(lean.x * topY, topY, lean.z * topY);

    var indices = [];
    for(var l = 0; l < STONE_LEVELS; l++) {
        for(var k = 0; k < STONE_AROUND; k++) {
            var i0 = (l * STONE_AROUND) + k, i1 = (l * STONE_AROUND) + ((k + 1) % STONE_AROUND);
            var j0 = i0 + STONE_AROUND, j1 = i1 + STONE_AROUND;
            indices.push(i0, j0, j1, i0, j1, i1); // (facing outwards)
        }
    }
    var apex = positions.length / 3 - 1, lastRing = STONE_LEVELS * STONE_AROUND;
    for(var t = 0; t < STONE_AROUND; t++) {
        indices.push(lastRing + t, apex, lastRing + ((t + 1) % STONE_AROUND));
    }

    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    return geometry;
}

var stoneMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });

function makeDirectionMarker(direction) {
    var marker = new THREE.Group();

    var seed = 1 + (direction.azimuth / 45);
    var stone = new THREE.Mesh(makeStoneGeometry(seed, direction.cardinal), stoneMaterial);
    // broad faces towards the centre (its +z axis turned to point outwards), give or take a little
    stone.rotation.y = -THREE.MathUtils.degToRad(direction.azimuth) + (0.25 * (stoneRandom(seed, 12) - 0.5));
    stone.castShadow = true;
    stone.receiveShadow = true;
    marker.add(stone);

    var label = makeLabelSprite(direction.label);
    label.position.y = stone.geometry.boundingBox.max.y + 1.1;
    marker.add(label);

    var pos = azimuthToXZ(direction.azimuth, COLUMN_DISTANCE);
    // standing on the ground there, set in a little so no gap shows under it on a slope
    marker.position.set(pos.x, groundHeight(pos.x, pos.z) - 0.05, pos.z);
    return marker;
}

for(var i = 0; i < DIRECTIONS.length; i++) {
    scene.add(makeDirectionMarker(DIRECTIONS[i]));
}

// scattered detail on the ground, for a sense of scale: rocks (and tussocks, below). placed from fixed seeds, so the
// same everywhere every time, and drawn as instances (one shape, drawn many times) so that hundreds cost little

// a repeatable sequence of random numbers from 0 to 1 (mulberry32), for placing things
function seededRandom(seed) {
    return function() {
        seed = (seed + 0x6D2B79F5) | 0;
        var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// whether a spot is clear, for something of the given size, of the Reset point (by a few metres, more for bigger
// things) and the standing stones
function clearOfStones(x, z, size) {
    if(Math.sqrt((x * x) + (z * z)) < 3 + (3 * size)) {
        return false;
    }
    for(var d = 0; d < DIRECTIONS.length; d++) {
        var pos = azimuthToXZ(DIRECTIONS[d].azimuth, COLUMN_DISTANCE);
        if(Math.hypot(x - pos.x, z - pos.z) < 1.5 + size) {
            return false;
        }
    }
    return true;
}

// rocks: a few lumpy shapes (a rough ball, flattened, with lumps from noise and the stones' colouring), each drawn
// at many places, sizes and turns, partly sunk into the ground. they gather where the ground has stony patches,
// with a few scattered everywhere; mostly small, with the odd boulder
var ROCK_SHAPES = 4;
var ROCK_TRIES = 9000; // places considered; about 1,000 end up with a rock
var ROCK_REACH = 70; // metres from the centre (beyond, the haze hides them)

function makeRockGeometry(seed) {
    var geometry = new THREE.IcosahedronGeometry(1, 2);
    var positions = geometry.attributes.position;
    var colors = [];
    var color = new THREE.Color();
    var flatten = 0.45 + (0.25 * stoneRandom(seed, 20));
    for(var i = 0; i < positions.count; i++) {
        var x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
        var lump = 1 + (0.45 * (stoneNoise((x * 1.3) + seed, y * 1.3, z * 1.3, seed) - 0.5)) + (0.2 * (stoneNoise(x * 3, y * 3, z * 3, seed + 5) - 0.5));
        positions.setXYZ(i, x * lump, y * lump * flatten, z * lump);
        var lichen = THREE.MathUtils.smoothstep(stoneNoise(x * 2.5, y * 2.5, z * 2.5, seed + 50), 0.6, 0.75) * THREE.MathUtils.smoothstep(y, 0, 0.8);
        color.copy(STONE_COLORS.rock).multiplyScalar(0.85 + (0.3 * stoneNoise(x * 5, y * 5, z * 5, seed + 70)));
        color.lerp(STONE_COLORS.lichen, 0.6 * lichen).lerp(STONE_COLORS.damp, 0.7 * (1 - THREE.MathUtils.smoothstep(y, -0.3, 0.2)));
        colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return { geometry: geometry, flatten: flatten };
}

function scatterRocks() {
    var random = seededRandom(1234);
    var shapes = [];
    for(var s = 0; s < ROCK_SHAPES; s++) {
        shapes.push(makeRockGeometry(200 + s));
    }
    var placed = shapes.map(function() { return []; });
    for(var t = 0; t < ROCK_TRIES; t++) {
        // spread evenly over the area, then kept more often where the ground's stony patches are
        var r = ROCK_REACH * Math.sqrt(random()), a = random() * Math.PI * 2;
        var x = r * Math.cos(a), z = r * Math.sin(a);
        var stony = THREE.MathUtils.smoothstep(groundMix(x, z).stone, 0.62, 0.8);
        var size = 0.1 + (0.4 * Math.pow(random(), 2));
        if(random() < 0.03) {
            size = 0.6 + (0.4 * random()); // the odd boulder
        }
        var keep = random() < 0.06 + (0.8 * stony);
        if(!keep || (r > 50 && size < 0.25) || !clearOfStones(x, z, size)) {
            continue; // (small rocks far off would only flicker)
        }
        placed[Math.floor(random() * ROCK_SHAPES)].push({ x: x, z: z, size: size, turn: random() * Math.PI * 2, tilt: 0.3 * (random() - 0.5), tint: 0.62 + (0.3 * random()) });
    }

    var material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
    var matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), euler = new THREE.Euler(), color = new THREE.Color();
    var count = 0;
    shapes.forEach(function(shape, s) {
        var rocks = placed[s];
        var mesh = new THREE.InstancedMesh(shape.geometry, material, rocks.length);
        rocks.forEach(function(rock, i) {
            // sunk by about a third of its height, so it sits in the ground rather than on it
            var y = groundHeight(rock.x, rock.z) - (0.35 * rock.size * shape.flatten);
            rotation.setFromEuler(euler.set(rock.tilt, rock.turn, rock.tilt * 0.5));
            matrix.compose(new THREE.Vector3(rock.x, y, rock.z), rotation, new THREE.Vector3(rock.size, rock.size, rock.size));
            mesh.setMatrixAt(i, matrix);
            mesh.setColorAt(i, color.setScalar(rock.tint));
        });
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        count += rocks.length;
    });
    return count;
}

var rockCount = scatterRocks();

// tussocks: clumps of grass blades, on the grassier ground (away from the bare earth and stony patches). their
// colour follows the season's grass (set by colourGround), leaning to the drier grass, as tussocks are tawnier than
// the grass around them. each blade is two triangles back to back, both lit as if facing up (like the ground they
// grow from: a double-sided material would light the back faces as if facing down, so half the blades looked black).
// they catch the stones' shadows,
// but don't cast their own (thin blades would only speckle the shadow map)
var TUSSOCK_TRIES = 6000;
var TUSSOCK_REACH = 50; // metres
var TUSSOCK_BLADES = 22;

function makeTussockGeometry(seed) {
    var random = seededRandom(seed);
    var positions = [], normals = [], colors = [];
    for(var b = 0; b < TUSSOCK_BLADES; b++) {
        // each blade a thin triangle from near the clump's middle, leaning outwards, about 1 unit tall
        var angle = random() * Math.PI * 2, from = 0.12 * random();
        var lean = 0.2 + (0.45 * random()), height = 0.55 + (0.45 * random()), width = 0.05 + (0.04 * random());
        var dx = Math.cos(angle), dz = Math.sin(angle);
        var bx = dx * from, bz = dz * from;
        var side = { x: -dz * width, z: dx * width };
        var tip = [bx + (dx * lean * height), height, bz + (dz * lean * height)];
        positions.push(bx - side.x, 0, bz - side.z, bx + side.x, 0, bz + side.z, tip[0], tip[1], tip[2]);
        positions.push(bx + side.x, 0, bz + side.z, bx - side.x, 0, bz - side.z, tip[0], tip[1], tip[2]); // (the back)
        for(var v = 0; v < 6; v++) {
            normals.push(dx * 0.3, 1, dz * 0.3);
        }
        for(var f = 0; f < 2; f++) {
            colors.push(0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 1.1, 1.1, 1.1); // darker at the base
        }
    }
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.normalizeNormals();
    return geometry;
}

var tussockMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });

function scatterTussocks() {
    var random = seededRandom(5678);
    var geometries = [makeTussockGeometry(301), makeTussockGeometry(302), makeTussockGeometry(303)];
    var placed = geometries.map(function() { return []; });
    for(var t = 0; t < TUSSOCK_TRIES; t++) {
        var r = TUSSOCK_REACH * Math.sqrt(random()), a = random() * Math.PI * 2;
        var x = r * Math.cos(a), z = r * Math.sin(a);
        var mix = groundMix(x, z);
        var grassy = (1 - THREE.MathUtils.smoothstep(mix.earth, 0.55, 0.7)) * (1 - THREE.MathUtils.smoothstep(mix.stone, 0.6, 0.72));
        var size = 0.25 + (0.3 * random());
        if(random() > 0.35 * grassy || !clearOfStones(x, z, 0.2)) {
            continue;
        }
        placed[Math.floor(random() * geometries.length)].push({ x: x, z: z, size: size, turn: random() * Math.PI * 2, tint: 0.85 + (0.25 * random()) });
    }
    var matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), color = new THREE.Color();
    var count = 0;
    geometries.forEach(function(geometry, g) {
        var tussocks = placed[g];
        var mesh = new THREE.InstancedMesh(geometry, tussockMaterial, tussocks.length);
        tussocks.forEach(function(tussock, i) {
            rotation.setFromAxisAngle(up, tussock.turn);
            matrix.compose(new THREE.Vector3(tussock.x, groundHeight(tussock.x, tussock.z) - 0.02, tussock.z), rotation,
                new THREE.Vector3(tussock.size, tussock.size, tussock.size));
            mesh.setMatrixAt(i, matrix);
            mesh.setColorAt(i, color.setScalar(tussock.tint));
        });
        mesh.receiveShadow = true;
        scene.add(mesh);
        count += tussocks.length;
    });
    return count;
}

var tussockCount = scatterTussocks();

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

    camera.position.set(x, EYE_HEIGHT + groundHeight(x, z), z); // (following the ground's rises and dips)
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
    setStars(obs, sun.altitude, moonPos.altitude, phase.illumination);
    updateGroundSeason(obs);
    document.getElementById('moonPhase').textContent = phase.name + ' · ' + Math.round(phase.illumination * 100) + '% lit';
    document.getElementById('moonNextPhases').textContent = formatNextPhases(obs.date);
    refreshMarkerInfo(); // (a marker's details depend on the place and time too)
}

// e.g. "Next Full: Sep 26 | Next New: Oct 10", whichever comes first shown first (dates in the chosen time zone)
function formatNextPhases(date) {
    var phases = [
        { name: 'Full', date: calcNextMoonPhase(date, 2) },
        { name: 'New', date: calcNextMoonPhase(date, 0) }
    ].sort(function(a, b) { return a.date - b.date; });
    return phases.map(function(phase) {
        return 'Next ' + phase.name + ': ' + formatShortDate(phase.date);
    }).join(' | ');
}

var MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// e.g. "Sep 26", in the chosen time zone
function formatShortDate(date) {
    var local = new Date(date.getTime() + (timeZoneOffsetAt(date) * MINUTE));
    return MONTH_NAMES[local.getUTCMonth()] + ' ' + local.getUTCDate();
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

// horizon marker details: hovering over a marker's label (or tapping it) shows a small panel beside it with the
// dates and times of what it marks and its bearing, e.g. to point the way with a phone's compass. the panel
// floats over the scene, so nothing else moves

var markerInfo = document.getElementById('markerInfo');
var hoveredMarker = null; // under the mouse
var pinnedMarker = null; // tapped / clicked, shown until something else is tapped
var shownMarker = null;

var COMPASS_POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

// e.g. "049° NE", from true north (16 compass points, finer than the heading's 8, for pointing the way)
function formatBearing(azimuth) {
    var degrees = Math.round(azimuth) % 360;
    return ('00' + degrees).slice(-3) + '° ' + COMPASS_POINTS[Math.round(azimuth / 22.5) % 16];
}

// e.g. "Jun 21, 2027" / "Jan 2025", in the chosen time zone
function formatDateWithYear(date) {
    var local = new Date(date.getTime() + (timeZoneOffsetAt(date) * MINUTE));
    return formatShortDate(date) + ', ' + local.getUTCFullYear();
}
function formatMonthYear(date) {
    var local = new Date(date.getTime() + (timeZoneOffsetAt(date) * MINUTE));
    return MONTH_NAMES[local.getUTCMonth()] + ' ' + local.getUTCFullYear();
}

// e.g. "Europe/Dublin time" or "UTC-5"
function timeZoneLabel() {
    if(timeZoneChoice === TIME_ZONE_AUTO && autoTimeZone && autoTimeZone.indexOf('Etc/') != 0) {
        return autoTimeZone.replace(/_/g, ' ') + ' time';
    }
    return formatTimeZone(timeZoneOffsetAt(observer.date));
}

// the first of eventInYear(year) (a Date) that falls on or after the observer's day
function nextYearlyEvent(eventInYear, obs) {
    var dayStart = localDayWindow(obs.date, obs.lon)[0];
    for(var year = obs.date.getUTCFullYear() - 1; ; year++) {
        var event = eventInYear(year);
        if(event.getTime() >= dayStart) {
            return event;
        }
    }
}

// a row for the sunrise / sunset on the day of a yearly event: its name and date, then the time and bearing
function sunEventRow(name, event, obs, rise) {
    var times = calcSunRiseSet(event, obs.lat, obs.lon);
    var time = rise ? times.rise : times.set;
    var what = rise ? 'Sunrise' : 'Sunset';
    return {
        heading: name + ': ' + formatDateWithYear(time || event),
        text: time ? what + ' ' + formatClockTime(time) + ', bearing ' + formatBearing(calcSunPosition(time, obs.lat, obs.lon).azimuth)
            : 'The sun doesn\'t ' + (rise ? 'rise' : 'set') + ' that day here'
    };
}

// rows for several yearly events sharing a marker (e.g. both equinoxes), soonest first
function sunEventRows(events, obs, rise) {
    return events.map(function(e) {
        return { name: e.name, event: nextYearlyEvent(e.inYear, obs) };
    }).sort(function(a, b) {
        return a.event - b.event;
    }).map(function(e) {
        return sunEventRow(e.name, e.event, obs, rise);
    });
}

// calcSolarEvent (seasons.js): 0 = March equinox, 1 = June solstice, 2 = September equinox, 3 = December solstice
function solarEvent(index) {
    return function(year) { return calcSolarEvent(year, index); };
}

// the fire festivals, as the sun's midpoints between the solstices and equinoxes (see setSunArcs):
// its ecliptic longitude, and the month it falls in (0 = January)
function festivalEvent(longitude, month) {
    return function(year) { return calcSunLongitudeMoment(longitude, new Date(Date.UTC(year, month, 5))); };
}

function describeSolstice(summer, rise) {
    return function(obs) {
        // midsummer is the June solstice in the northern hemisphere, the December one in the southern
        var june = (summer == (obs.lat >= 0));
        return { rows: [sunEventRow(summer ? 'Summer solstice' : 'Winter solstice', nextYearlyEvent(solarEvent(june ? 1 : 3), obs), obs, rise)] };
    };
}

function describeEquinoxes(rise) {
    return function(obs) {
        var north = obs.lat >= 0;
        return { rows: sunEventRows([
            { name: north ? 'Spring equinox' : 'Autumn equinox', inYear: solarEvent(0) },
            { name: north ? 'Autumn equinox' : 'Spring equinox', inYear: solarEvent(2) }
        ], obs, rise) };
    };
}

function describeFestivals(brightHalf, rise) {
    return function(obs) {
        return {
            rows: sunEventRows(brightHalf
                ? [{ name: 'Bealtaine', inYear: festivalEvent(45, 4) }, { name: 'Lúnasa', inYear: festivalEvent(135, 7) }]
                : [{ name: 'Samhain', inYear: festivalEvent(225, 10) }, { name: 'Imbolc', inYear: festivalEvent(315, 1) }], obs, rise),
            notes: ['Taken as the midpoints between the solstices and equinoxes.']
        };
    };
}

function describeToday(rise) {
    return function(obs) {
        return { rows: [sunEventRow('Today', obs.date, obs, rise)] };
    };
}

function describeMoonPass(rise) {
    return function(obs) {
        var t = moonPass && (rise ? moonPass.rise : moonPass.set);
        if(t === null || t === undefined) {
            return { rows: [] };
        }
        // the path's ends are where the moon's centre crosses the horizon; the almanac time (its upper edge, as
        // in the observer panel) is a minute or so different, so that's shown if it's for the same event
        var almanac = calcMoonRiseSet(new Date(t), obs.lat, obs.lon);
        var almanacTime = rise ? almanac.rise : almanac.set;
        var time = (almanacTime && Math.abs(almanacTime - t) < 60 * MINUTE) ? almanacTime : new Date(t);
        return { rows: [{
            heading: formatDateWithYear(time),
            text: (rise ? 'Moonrise ' : 'Moonset ') + formatClockTime(time) + ', bearing ' + formatBearing(calcMoonPosition(time, obs.lat, obs.lon).azimuth)
        }] };
    };
}

// the standstills have no single date: the moon reaches these limits once a month, for a year or so either
// side of each standstill (calcNextStandstill is from moon.js)
var STANDSTILL_CYCLE_MS = 18.6 * 365.25 * 86400000;

function describeStandstill(major, north, rise) {
    return function(obs, marker) {
        var next = calcNextStandstill(obs.date, major ? 'major' : 'minor');
        var last = new Date(next.getTime() - STANDSTILL_CYCLE_MS);
        var way = (rise ? 'rises' : 'sets');
        var side = (north ? 'north' : 'south');
        return {
            rows: [{ heading: 'Bearing ' + formatBearing(marker.userData.azimuth) }],
            noTimes: true,
            notes: [major
                ? 'The farthest ' + side + ' the moon ever ' + way + '. It gets this far once a month for a year or so either side of a major standstill, every 18.6 years.'
                : 'The farthest ' + side + ' the moon ' + way + ' at a minor standstill, when its monthly swing is narrowest (every 18.6 years, between the major ones).',
                'Last: ' + formatMonthYear(last) + ' · next: ' + formatMonthYear(next)]
        };
    };
}

var MARKER_DESCRIPTIONS = [
    [markers.summerRise, describeSolstice(true, true)], [markers.summerSet, describeSolstice(true, false)],
    [markers.winterRise, describeSolstice(false, true)], [markers.winterSet, describeSolstice(false, false)],
    [markers.equinoxRise, describeEquinoxes(true)], [markers.equinoxSet, describeEquinoxes(false)],
    [markers.brightHalfRise, describeFestivals(true, true)], [markers.brightHalfSet, describeFestivals(true, false)],
    [markers.darkHalfRise, describeFestivals(false, true)], [markers.darkHalfSet, describeFestivals(false, false)],
    [markers.todayRise, describeToday(true)], [markers.todaySet, describeToday(false)],
    [moonMarkers.majorNorthRise, describeStandstill(true, true, true)], [moonMarkers.majorNorthSet, describeStandstill(true, true, false)],
    [moonMarkers.majorSouthRise, describeStandstill(true, false, true)], [moonMarkers.majorSouthSet, describeStandstill(true, false, false)],
    [moonMarkers.minorNorthRise, describeStandstill(false, true, true)], [moonMarkers.minorNorthSet, describeStandstill(false, true, false)],
    [moonMarkers.minorSouthRise, describeStandstill(false, false, true)], [moonMarkers.minorSouthSet, describeStandstill(false, false, false)],
    [moonMarkers.tonightRise, describeMoonPass(true)], [moonMarkers.tonightSet, describeMoonPass(false)]
];
MARKER_DESCRIPTIONS.forEach(function(entry) {
    entry[0].userData.describe = entry[1];
});

// fills the details panel for the marker being shown
function refreshMarkerInfo() {
    if(!shownMarker) {
        return;
    }
    var info = shownMarker.userData.describe(observer, shownMarker);
    markerInfo.textContent = '';
    markerInfo.style.setProperty('--accent', '#' + new THREE.Color(shownMarker.userData.color).getHexString());

    var add = function(className, text) {
        var el = document.createElement('div');
        el.className = className;
        el.textContent = text;
        markerInfo.appendChild(el);
    };
    add('title', shownMarker.userData.text);
    info.rows.forEach(function(row) {
        add('row-heading', row.heading);
        if(row.text) {
            add('row', row.text);
        }
    });
    (info.notes || []).forEach(function(note) {
        add('note', note);
    });
    add('footer', (info.noTimes ? '' : 'Times in ' + timeZoneLabel() + '. ')
        + 'Bearings are from true north (a phone compass may need "true north" turned on), for a level horizon.');
}

function showMarkerInfo(marker) {
    if(marker === shownMarker) {
        return;
    }
    if(shownMarker) {
        shownMarker.userData.label.material.opacity = shownMarker.userData.opacity;
    }
    shownMarker = marker;
    markerInfo.hidden = !marker;
    if(marker) {
        marker.userData.label.material.opacity = 1; // brightened, to show which label the details are for
        refreshMarkerInfo();
        placeMarkerInfo();
    }
}

function updateShownMarker() {
    showMarkerInfo(pinnedMarker || hoveredMarker);
}

// whether an object and everything it's in are visible (e.g. not a hidden marker, or the moon's with its arcs off)
function isShown(object) {
    for(; object; object = object.parent) {
        if(!object.visible) {
            return false;
        }
    }
    return true;
}

var raycaster = new THREE.Raycaster();
var pointerPosition = new THREE.Vector2();

// the marker whose label is at the given point on the screen, if any
function markerAt(x, y) {
    pointerPosition.set(((x / window.innerWidth) * 2) - 1, 1 - ((y / window.innerHeight) * 2));
    raycaster.setFromCamera(pointerPosition, camera);
    var hits = raycaster.intersectObjects(markerLabels.filter(isShown), false);
    return hits.length ? hits[0].object.userData.marker : null;
}

// keeps the panel just below its label (or above it, near the bottom of the screen), on screen; hidden if
// the label has gone (e.g. its arcs were switched off, or it's turned out of view)
var labelPosition = new THREE.Vector3();
function placeMarkerInfo() {
    if(!shownMarker) {
        return;
    }
    var label = shownMarker.userData.label;
    if(!isShown(label)) {
        // its marker is gone (its arcs switched off, or it no longer rises / sets here): unpinned too
        pinnedMarker = hoveredMarker = null;
        showMarkerInfo(null);
        return;
    }
    label.getWorldPosition(labelPosition).project(camera);
    var onScreen = labelPosition.z < 1 && Math.abs(labelPosition.x) < 1.1 && Math.abs(labelPosition.y) < 1.1;
    markerInfo.style.visibility = onScreen ? '' : 'hidden';
    if(!onScreen) {
        return;
    }
    var x = (labelPosition.x + 1) / 2 * window.innerWidth;
    var y = (1 - labelPosition.y) / 2 * window.innerHeight;
    var labelHalfHeight = (2.8 / camera.fov) * window.innerHeight / 2;
    var width = markerInfo.offsetWidth, height = markerInfo.offsetHeight, margin = 8;

    var top = y + labelHalfHeight + 6;
    if(top + height > window.innerHeight - margin) {
        top = y - labelHalfHeight - 6 - height;
    }
    markerInfo.style.left = Math.round(THREE.MathUtils.clamp(x - (width / 2), margin, window.innerWidth - width - margin)) + 'px';
    markerInfo.style.top = Math.round(Math.max(margin, top)) + 'px';
}

// hovering with the mouse (not while free-looking)
renderer.domElement.addEventListener('pointermove', function(e) {
    if(e.pointerType != 'mouse' || look) {
        return;
    }
    hoveredMarker = markerAt(e.clientX, e.clientY);
    renderer.domElement.style.cursor = hoveredMarker ? 'pointer' : '';
    updateShownMarker();
});
renderer.domElement.addEventListener('pointerleave', function() {
    hoveredMarker = null;
    updateShownMarker();
});

// a tap or click (a press that barely moves) on a label pins its details; anywhere else unpins them
var press = null;
renderer.domElement.addEventListener('pointerdown', function(e) {
    press = (e.isPrimary && e.button == 0) ? { id: e.pointerId, x: e.clientX, y: e.clientY, time: e.timeStamp } : null;
});
renderer.domElement.addEventListener('pointerup', function(e) {
    if(!press || e.pointerId != press.id) {
        return;
    }
    var moved = Math.hypot(e.clientX - press.x, e.clientY - press.y);
    var isTap = moved < 8 && (e.timeStamp - press.time) < 600;
    press = null;
    if(isTap) {
        var marker = markerAt(e.clientX, e.clientY);
        pinnedMarker = (marker && marker !== pinnedMarker) ? marker : null;
        updateShownMarker();
    }
});
window.addEventListener('keydown', function(e) {
    if(e.key == 'Escape' && pinnedMarker && !locationDialog.open) {
        pinnedMarker = null;
        updateShownMarker();
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
    placeSunLight();
    moon.position.copy(camera.position).add(moonOffset);
    moon.lookAt(camera.position); // the moon's disc always faces the observer
    horizonMarkers.position.copy(camera.position);
    moonPath.position.copy(camera.position);
    starField.position.copy(camera.position);

    renderer.render(scene, camera);
    // (after rendering, so the labels' positions are up to date)
    placeMarkerInfo();
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
initPanelToggles();
initObserverInputs();
readObserverInputs();
resetView();
renderer.setAnimationLoop(animate);
