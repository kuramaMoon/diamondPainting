import * as PIXI from 'pixi.js';
import { processImage } from './imageProcessor';
import { downloadCanvas } from './ui';

// Initialize Pixi.js application
const app = new PIXI.Application({
  width: 622,
  height: 880,
  backgroundColor: 0xffffff,
});

// Ensure the ticker is running
app.ticker.start();

// Debug log to confirm ticker is running
app.ticker.add(() => {
  console.log('Ticker running, frame count:', app.ticker.count);
});

// Store a reference to the canvas
const canvas = app.view as HTMLCanvasElement;

const container = document.getElementById('container');
if (container) {
  container.appendChild(canvas);
} else {
  console.error('Container element not found');
  throw new Error('Cannot proceed without container element');
}

// Zoom and pan variables
let zoomLevel = 1;
const zoomStep = 0.1;
const minZoom = 0.5;
const maxZoom = 3;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let initialStageX = 0;
let initialStageY = 0;

// Function to update the stage scale and position
function updateStageTransform() {
  app.stage.scale.set(zoomLevel, zoomLevel);
  const bounds = app.stage.getBounds();
  app.stage.x = Math.max(Math.min(app.stage.x, 0), -bounds.width * zoomLevel + app.renderer.width);
  app.stage.y = Math.max(Math.min(app.stage.y, 0), -bounds.height * zoomLevel + app.renderer.height);
  app.renderer.render(app.stage);
}

// Function to update the zoom level display
function updateZoomDisplay() {
  const zoomLevelSpan = document.getElementById('zoomLevel') as HTMLSpanElement;
  if (zoomLevelSpan) {
    zoomLevelSpan.textContent = `Zoom: ${(zoomLevel * 100).toFixed(0)}%`;
  }
}

// Zoom in function
function zoomIn() {
  zoomLevel = Math.min(zoomLevel + zoomStep, maxZoom);
  updateStageTransform();
  updateZoomDisplay();
  console.log('Zoom level:', zoomLevel);
}

// Zoom out function
function zoomOut() {
  zoomLevel = Math.max(zoomLevel - zoomStep, minZoom);
  updateStageTransform();
  updateZoomDisplay();
  console.log('Zoom level:', zoomLevel);
}

// Mouse wheel zoom
canvas.addEventListener('wheel', (event: WheelEvent) => {
  event.preventDefault();
  const mouseX = event.offsetX;
  const mouseY = event.offsetY;

  const worldPosBefore = app.stage.toLocal(new PIXI.Point(mouseX, mouseY));

  if (event.deltaY < 0) {
    zoomIn();
  } else {
    zoomOut();
  }

  const worldPosAfter = app.stage.toLocal(new PIXI.Point(mouseX, mouseY));
  app.stage.x += (worldPosAfter.x - worldPosBefore.x) * zoomLevel;
  app.stage.y += (worldPosAfter.y - worldPosBefore.y) * zoomLevel;

  updateStageTransform();
});

// Panning (dragging) functionality
canvas.addEventListener('mousedown', (event: MouseEvent) => {
  if (zoomLevel > 1) {
    isDragging = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    initialStageX = app.stage.x;
    initialStageY = app.stage.y;
    canvas.style.cursor = 'grabbing';
  }
});

canvas.addEventListener('mousemove', (event: MouseEvent) => {
  if (isDragging) {
    const dx = event.clientX - dragStartX;
    const dy = event.clientY - dragStartY;
    app.stage.x = initialStageX + dx;
    app.stage.y = initialStageY + dy;
    updateStageTransform();
  }
});

canvas.addEventListener('mouseup', () => {
  isDragging = false;
  canvas.style.cursor = 'default';
});

canvas.addEventListener('mouseleave', () => {
  isDragging = false;
  canvas.style.cursor = 'default';
});

// Keyboard controls for zooming
document.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === '+' || event.key === '=') {
    zoomIn();
  } else if (event.key === '-' || event.key === '_') {
    zoomOut();
  }
});

// Event listeners for buttons
const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
const zoomInBtn = document.getElementById('zoomInBtn') as HTMLButtonElement;
const zoomOutBtn = document.getElementById('zoomOutBtn') as HTMLButtonElement;

if (generateBtn) {
  generateBtn.removeEventListener('click', handleGenerateClick);
  generateBtn.addEventListener('click', handleGenerateClick);
} else {
  console.error('Generate button not found');
}

function handleGenerateClick() {
  if (!container?.contains(canvas)) {
    console.warn('Canvas was removed from container. Reattaching...');
    container?.appendChild(canvas);
  }
  zoomLevel = 1;
  app.stage.x = 0;
  app.stage.y = 0;
  updateStageTransform();
  updateZoomDisplay();
  console.log('Stage after reset:', {
    scale: app.stage.scale,
    position: { x: app.stage.x, y: app.stage.y },
    children: app.stage.children.length,
  });
  processImage(app, updateStageTransform);
}

if (downloadBtn) {
  downloadBtn.removeEventListener('click', handleDownloadClick);
  downloadBtn.addEventListener('click', handleDownloadClick);
} else {
  console.error('Download button not found');
}

function handleDownloadClick() {
  downloadCanvas(app);
}

if (zoomInBtn) {
  zoomInBtn.addEventListener('click', zoomIn);
} else {
  console.error('Zoom In button not found');
}

if (zoomOutBtn) {
  zoomOutBtn.addEventListener('click', zoomOut);
} else {
  console.error('Zoom Out button not found');
}

// Initialize the zoom display
updateZoomDisplay();