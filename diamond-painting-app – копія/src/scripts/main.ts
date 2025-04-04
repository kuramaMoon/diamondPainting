// main.ts
import * as PIXI from 'pixi.js';
import { processImage } from './imageProcessor/imageProcessor';
import { setupTools } from './imageProcessor/toolsManager';
import { downloadCanvas } from './ui';
import { getLassoToolActive } from './imageProcessor/state'; // Added

// Initialize Pixi.js application
const app = new PIXI.Application({
  width: 867,
  height: 880,
  backgroundColor: 0xffffff,
});

// Store a reference to the canvas
const canvas = app.view as HTMLCanvasElement;

// Append the canvas to the container
const container = document.getElementById('container');
if (!container) {
  console.error('Container element not found');
  throw new Error('Cannot proceed without container element');
}
container.appendChild(canvas);

// File input element
const fileInput = document.getElementById('imageInput') as HTMLInputElement | null;

// Zoom and pan state
interface ZoomPanState {
  zoomLevel: number;
  panX: number;
  panY: number;
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
  initialStageX: number;
  initialStageY: number;
  needsRender: boolean;
}

const state: ZoomPanState = {
  zoomLevel: 1,
  panX: 0,
  panY: 0,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  initialStageX: 0,
  initialStageY: 0,
  needsRender: false,
};

// Constants for zoom
const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

// Check for zoomLevel element during initialization
const zoomLevelSpan = document.getElementById('zoomLevel') as HTMLSpanElement | null;
let hasZoomDisplay = !!zoomLevelSpan;

// Function to update the stage scale and position
function updateStageTransform(): void {
  app.stage.scale.set(state.zoomLevel, state.zoomLevel);
  const bounds = app.stage.getBounds();
  state.panX = Math.max(
    Math.min(state.panX, 0),
    -bounds.width * state.zoomLevel + app.renderer.width
  );
  state.panY = Math.max(
    Math.min(state.panY, 0),
    -bounds.height * state.zoomLevel + app.renderer.height
  );
  app.stage.position.set(state.panX, state.panY);

  if (state.isDragging) {
    app.renderer.render(app.stage);
  } else {
    state.needsRender = true;
  }

  if (hasZoomDisplay) {
    updateZoomDisplay();
  }
}

// Function to update the zoom level display
function updateZoomDisplay(): void {
  if (!zoomLevelSpan) {
    hasZoomDisplay = false;
    return;
  }
  zoomLevelSpan.textContent = `Zoom: ${(state.zoomLevel * 100).toFixed(0)}%`;
}

// Function to reset the view to default zoom and position
function resetView(): void {
  state.zoomLevel = 1;
  state.panX = 0;
  state.panY = 0;
  updateStageTransform();
}

// Zoom in function
function zoomIn(mouseX?: number, mouseY?: number): void {
  state.zoomLevel = Math.min(state.zoomLevel + ZOOM_STEP, MAX_ZOOM);

  if (mouseX !== undefined && mouseY !== undefined) {
    const worldPosBefore = app.stage.toLocal(new PIXI.Point(mouseX, mouseY));
    updateStageTransform();
    const worldPosAfter = app.stage.toLocal(new PIXI.Point(mouseX, mouseY));
    state.panX += (worldPosAfter.x - worldPosBefore.x) * state.zoomLevel;
    state.panY += (worldPosAfter.y - worldPosBefore.y) * state.zoomLevel;
  }

  updateStageTransform();
  console.log('Zoom level:', state.zoomLevel);
}

// Zoom out function
function zoomOut(mouseX?: number, mouseY?: number): void {
  state.zoomLevel = state.zoomLevel <= 0.9 ? 0.9 : Math.max(state.zoomLevel - ZOOM_STEP, MIN_ZOOM);

  if (mouseX !== undefined && mouseY !== undefined) {
    const worldPosBefore = app.stage.toLocal(new PIXI.Point(mouseX, mouseY));
    updateStageTransform();
    const worldPosAfter = app.stage.toLocal(new PIXI.Point(mouseX, mouseY));
    state.panX += (worldPosAfter.x - worldPosBefore.x) * state.zoomLevel;
    state.panY += (worldPosAfter.y - worldPosBefore.y) * state.zoomLevel;
  }

  updateStageTransform();
  console.log('Zoom level:', state.zoomLevel);
}

// Mouse wheel zoom handler
function handleWheel(event: WheelEvent): void {
  event.preventDefault();
  const mouseX = event.offsetX;
  const mouseY = event.offsetY;

  if (event.deltaY < 0) {
    zoomIn(mouseX, mouseY);
  } else {
    zoomOut(mouseX, mouseY);
  }
}

// Panning (dragging) handlers
function handleMouseDown(event: MouseEvent): void {
  // Skip p Wanning if the Lasso tool is active
  if (getLassoToolActive()) {
    return;
  }

  if (state.zoomLevel > 1) {
    state.isDragging = true;
    state.dragStartX = event.clientX;
    state.dragStartY = event.clientY;
    state.initialStageX = state.panX;
    state.initialStageY = state.panY;
    canvas.style.cursor = 'grabbing';
  }
}

function handleMouseMove(event: MouseEvent): void {
  if (state.isDragging) {
    const dx = event.clientX - state.dragStartX;
    const dy = event.clientY - state.dragStartY;
    state.panX = state.initialStageX + dx;
    state.panY = state.initialStageY + dy;
    updateStageTransform();
  }
}

function handleMouseUp(): void {
  state.isDragging = false;
  canvas.style.cursor = 'default';
}

// Keyboard controls for zooming
function handleKeyDown(event: KeyboardEvent): void {
  if (event.key === '+' || event.key === '=') {
    zoomIn();
  } else if (event.key === '-' || event.key === '_') {
    zoomOut();
  } else if (event.key === '0') {
    resetView();
  }
}

// File input handler
function handleFileInputChange(): void {
  console.log('File selected, triggering processImage');
  if (!container) {
    console.error('Container element not found');
    return;
  }
  if (!container.contains(canvas)) {
    console.warn('Canvas was removed from container. Reattaching...');
    container.appendChild(canvas);
  }
  resetView();
  console.log('Stage after reset:', {
    scale: app.stage.scale,
    position: { x: app.stage.x, y: app.stage.y },
    children: app.stage.children.length,
  });
  processImage(app, updateStageTransform);
  if (fileInput) {
    fileInput.value = '';
  }
}

// Download button handler
function handleDownloadClick(): void {
  downloadCanvas(app);
}

// Setup event listeners
function setupEventListeners(): void {
  const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement | null;
  const zoomInBtn = document.getElementById('zoomInBtn') as HTMLButtonElement | null;
  const zoomOutBtn = document.getElementById('zoomOutBtn') as HTMLButtonElement | null;
  const resetViewBtn = document.getElementById('resetViewBtn') as HTMLButtonElement | null;

  if (fileInput) {
    fileInput.addEventListener('change', handleFileInputChange);
  } else {
    console.error('File input element not found');
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', handleDownloadClick);
  } else {
    console.error('Download button not found');
  }

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => zoomIn());
  } else {
    console.error('Zoom In button not found');
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => zoomOut());
  } else {
    console.error('Zoom Out button not found');
  }

  if (resetViewBtn) {
    resetViewBtn.addEventListener('click', resetView);
  } else {
    console.warn('Reset View button not found; add a button with id="resetViewBtn" to enable this feature');
  }

  canvas.addEventListener('wheel', handleWheel);
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mouseleave', handleMouseUp);

  document.addEventListener('keydown', handleKeyDown);
}

// Setup rendering ticker
function setupTicker(): void {
  const ticker = PIXI.Ticker.shared;
  ticker.autoStart = true;
  ticker.add(() => {
    if (state.needsRender && !state.isDragging) {
      app.renderer.render(app.stage);
      state.needsRender = false;
    }
  });
}

// Initialize the application
function initialize(): void {
  setupTools(app);
  setupTicker();
  setupEventListeners();
  updateStageTransform();
}

initialize();