import * as THREE from "three";

// Create scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create video element and texture
const video = document.createElement("video");
video.src = "offside.webm";
video.loop = true;
video.muted = true;
video.playsInline = true;
video.addEventListener("loadedmetadata", () => {
	video.play();
});

const videoTexture = new THREE.VideoTexture(video);
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;

// Shader materials
const vertexShader = `
	varying vec2 vUv;
	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`;

const fragmentShader = `
	uniform sampler2D videoTexture;
	uniform vec2 mousePos;
	uniform float time;
	uniform float rippleStrength;
	varying vec2 vUv;

	void main() {
		vec2 uv = vUv;

		// Calculate distance from mouse position
		float dist = distance(mousePos, uv);

		// Create ripple effect with easing
		float ripple = tan(dist * 12.0 - time * 2.0) * cos(dist * 12.0 - time * 2.0) * 0.05;

		// Smooth fade out with custom easing
		float fadeOut = smoothstep(0.4, 0.0, dist);
		fadeOut = smoothstep(0.0, 1.0, fadeOut); // Additional easing
		ripple *= fadeOut;

		// Apply ripple displacement with strength
		vec2 rippleUV = uv + vec2(ripple) * rippleStrength;

		gl_FragColor = texture2D(videoTexture, rippleUV);
	}
`;

// Create plane with custom shader material
const planeGeometry = new THREE.PlaneGeometry(16, 9);
const planeMaterial = new THREE.ShaderMaterial({
	uniforms: {
		videoTexture: {value: videoTexture},
		mousePos: {value: new THREE.Vector2(0.5, 0.5)},
		time: {value: 0.0},
		rippleStrength: {value: 0.0},
	},
	vertexShader: vertexShader,
	fragmentShader: fragmentShader,
	side: THREE.DoubleSide,
});

const plane = new THREE.Mesh(planeGeometry, planeMaterial);
scene.add(plane);

// Position camera
camera.position.z = 4;

// Mouse movement variables
let mouseX = 0;
let mouseY = 0;
let targetRotationX = 0;
let targetRotationY = 0;

// Mouse tracking variables
let isMouseMoving = false;
let mouseTimer;
let targetMousePos = new THREE.Vector2(0.5, 0.5);
let currentMousePos = new THREE.Vector2(0.5, 0.5);

// Add mouse move event listener
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

document.addEventListener("mousemove", (event) => {
	// Update rotation values
	mouseX = (event.clientX - window.innerWidth / 2) / window.innerWidth;
	mouseY = (event.clientY - window.innerHeight / 2) / window.innerHeight;

	// Update mouse position for raycaster
	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

	// Update raycaster
	raycaster.setFromCamera(mouse, camera);
	const intersects = raycaster.intersectObject(plane);

	if (intersects.length > 0) {
		const intersectionPoint = intersects[0].uv;
		targetMousePos.set(intersectionPoint.x, intersectionPoint.y);

		// Reset mouse movement timer
		isMouseMoving = true;
		clearTimeout(mouseTimer);
	}
});

// Handle window resize
window.addEventListener("resize", () => {
	const newWidth = window.innerWidth;
	const newHeight = window.innerHeight;
	camera.aspect = newWidth / newHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(newWidth, newHeight);
});

// Animation loop
function animate() {
	requestAnimationFrame(animate);

	// Update time uniform for ripple animation
	planeMaterial.uniforms.time.value += 0.01;

	// Interpolate current mouse position towards target position
	currentMousePos.x += (targetMousePos.x - currentMousePos.x) * 0.1;
	currentMousePos.y += (targetMousePos.y - currentMousePos.y) * 0.1;
	planeMaterial.uniforms.mousePos.value.copy(currentMousePos);

	// Update ripple strength with easing
	const targetStrength = isMouseMoving ? 1.0 : 0.0;
	planeMaterial.uniforms.rippleStrength.value += (targetStrength - planeMaterial.uniforms.rippleStrength.value) * 0.015;

	// Smooth rotation based on mouse position
	targetRotationY = mouseX * 0.2;
	targetRotationX = -mouseY * 0.2;

	plane.rotation.x += (targetRotationX - plane.rotation.x) * 0.05;
	plane.rotation.y += (targetRotationY - plane.rotation.y) * 0.05;

	renderer.render(scene, camera);
}

animate();
