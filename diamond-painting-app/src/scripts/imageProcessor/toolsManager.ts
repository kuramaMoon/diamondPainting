// toolsManager.ts
import * as PIXI from 'pixi.js';
import { getCells, getGlobalPixels, getColorMap, getSelectedCells, setSelectedCells, getLassoToolActive, setLassoToolActive, Cell } from './state';
import { findClosestColor } from './utils';
import { GRID_WIDTH, GRID_HEIGHT, SCALE } from './constants';

let cleverSelectActive = false;
let lassoPoints: PIXI.Point[] = [];
let lassoGraphics: PIXI.Graphics | null = null;

// Function to check if a point is inside a polygon (lasso selection)
function isPointInPolygon(x: number, y: number, polygon: PIXI.Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Function to highlight selected cells
function highlightSelectedCells(app: PIXI.Application) {
  const selectedCells = getSelectedCells();
  const cells: Cell[][] = getCells();
  selectedCells.forEach(cellKey => {
    const [x, y] = cellKey.split(',').map(Number);
    const cell = cells[y]?.[x];
    if (cell) {
      cell.square.lineStyle(2, 0xFF0000, 1); // Red border
      cell.square.drawRect(x * SCALE, y * SCALE, SCALE, SCALE);
    }
  });
  app.renderer.render(app.stage);
}

// Function to clear selection
function clearSelection(app: PIXI.Application) {
  setSelectedCells(new Set<string>());
  const cells: Cell[][] = getCells();
  const colorMap = getColorMap();

  // Skip if cells or colorMap is empty (not initialized yet)
  if (!cells.length || !Object.keys(colorMap).length) {
    return;
  }

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const cell = cells[y]?.[x];
      if (cell) {
        cell.square.clear();
        const [r, g, b] = cell.isBackground
          ? [(cell.fillColor >> 16) & 0xFF, (cell.fillColor >> 8) & 0xFF, cell.fillColor & 0xFF]
          : colorMap[`${(cell.fillColor >> 16) & 0xFF},${(cell.fillColor >> 8) & 0xFF},${cell.fillColor & 0xFF}`]?.rgb || [0, 0, 0];
        cell.square.beginFill((r << 16) + (g << 8) + b);
        cell.square.drawRect(x * SCALE, y * SCALE, SCALE, SCALE);
        cell.square.endFill();
      }
    }
  }
  app.renderer.render(app.stage);
}

// Flood-fill algorithm to select adjacent cells with the same number (or color)
function floodFillSelect(x: number, y: number, targetNumber: string | null, targetColor: number, visited: Set<string>) {
  if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return;

  const cellKey = `${x},${y}`;
  if (visited.has(cellKey)) return;

  const cells = getCells();
  const cell = cells[y]?.[x];
  if (!cell) return;

  const cellNumber = cell.text ? cell.text.text : null;
  const cellColor = cell.fillColor;

  if (cellNumber !== targetNumber || cellColor !== targetColor) return;

  visited.add(cellKey);
  const selectedCells = getSelectedCells();
  selectedCells.add(cellKey);
  setSelectedCells(selectedCells);

  floodFillSelect(x + 1, y, targetNumber, targetColor, visited);
  floodFillSelect(x - 1, y, targetNumber, targetColor, visited);
  floodFillSelect(x, y + 1, targetNumber, targetColor, visited);
  floodFillSelect(x, y - 1, targetNumber, targetColor, visited);
}

export function setupTools(app: PIXI.Application) {
  const lassoToolBtn = document.getElementById('lassoToolBtn') as HTMLButtonElement;
  const cleverSelectBtn = document.getElementById('cleverSelectBtn') as HTMLButtonElement;
  const lassoActions = document.getElementById('lassoActions') as HTMLDivElement;
  const removeNumbersBtn = document.getElementById('removeNumbersBtn') as HTMLButtonElement;
  const addNumbersBtn = document.getElementById('addNumbersBtn') as HTMLButtonElement;

  if (!lassoToolBtn || !cleverSelectBtn || !lassoActions || !removeNumbersBtn || !addNumbersBtn) {
    console.error('Tool elements not found in DOM');
    return;
  }

  // Reset tool state
  setLassoToolActive(false);
  cleverSelectActive = false;
  lassoPoints = [];
  if (lassoGraphics) {
    app.stage.removeChild(lassoGraphics);
    lassoGraphics.destroy();
    lassoGraphics = null;
  }
  setSelectedCells(new Set<string>());
  // Only call clearSelection if cells and colorMap are populated
  const cells = getCells();
  const colorMap = getColorMap();
  if (cells.length && Object.keys(colorMap).length) {
    clearSelection(app);
  }

  // Toggle lasso tool
  lassoToolBtn.addEventListener('click', () => {
    const newLassoToolActive = !getLassoToolActive();
    setLassoToolActive(newLassoToolActive);
    cleverSelectActive = false;
    lassoToolBtn.classList.toggle('active', newLassoToolActive);
    cleverSelectBtn.classList.remove('active');
    if (!newLassoToolActive) {
      if (lassoGraphics) {
        app.stage.removeChild(lassoGraphics);
        lassoGraphics.destroy();
        lassoGraphics = null;
      }
      lassoPoints = [];
      clearSelection(app);
      lassoActions.style.display = 'none';
    } else {
      lassoActions.style.display = 'block';
    }
  });

  // Toggle clever select tool
  cleverSelectBtn.addEventListener('click', () => {
    cleverSelectActive = !cleverSelectActive;
    setLassoToolActive(false);
    cleverSelectBtn.classList.toggle('active', cleverSelectActive);
    lassoToolBtn.classList.remove('active');
    if (!cleverSelectActive) {
      if (lassoGraphics) {
        app.stage.removeChild(lassoGraphics);
        lassoGraphics.destroy();
        lassoGraphics = null;
      }
      lassoPoints = [];
      clearSelection(app);
      lassoActions.style.display = 'none';
    } else {
      lassoActions.style.display = 'block';
    }
  });

  app.stage.interactive = true;
  let isDrawing = false;

  app.stage.on('pointerdown', (event: PIXI.FederatedPointerEvent) => {
    const localPoint = app.stage.toLocal(event.global);
    const localX = localPoint.x;
    const localY = localPoint.y;

    if (getLassoToolActive()) {
      isDrawing = true;
      lassoPoints = [];
      lassoPoints.push(new PIXI.Point(localX, localY));
      if (lassoGraphics) {
        app.stage.removeChild(lassoGraphics);
        lassoGraphics.destroy();
      }
      lassoGraphics = new PIXI.Graphics();
      app.stage.addChild(lassoGraphics);
    } else if (cleverSelectActive) {
      const gridX = Math.floor(localX / SCALE);
      const gridY = Math.floor(localY / SCALE);

      if (gridX < 0 || gridX >= GRID_WIDTH || gridY < 0 || gridY >= GRID_HEIGHT) return;

      const cells = getCells();
      const cell = cells[gridY]?.[gridX]; // Fixed: Replaced 'x' with 'gridX'
      if (!cell) return;

      if (!event.ctrlKey) {
        clearSelection(app);
        setSelectedCells(new Set<string>());
      }

      const targetNumber = cell.text ? cell.text.text : null;
      const cellColor = cell.fillColor;

      const visited = new Set<string>();
      floodFillSelect(gridX, gridY, targetNumber, cellColor, visited);

      highlightSelectedCells(app);
    }
  });

  app.stage.on('pointermove', (event: PIXI.FederatedPointerEvent) => {
    if (!getLassoToolActive() || !isDrawing || !lassoGraphics) return;

    const localPoint = app.stage.toLocal(event.global);
    const localX = localPoint.x;
    const localY = localPoint.y;

    lassoPoints.push(new PIXI.Point(localX, localY));

    // Redraw the lasso path
    lassoGraphics.clear();
    if (lassoPoints.length < 2) return; // Need at least 2 points to draw a line
    lassoGraphics.lineStyle(2, 0x0000FF, 1);
    lassoGraphics.moveTo(lassoPoints[0].x, lassoPoints[0].y);
    for (let i = 1; i < lassoPoints.length; i++) {
      lassoGraphics.lineTo(lassoPoints[i].x, lassoPoints[i].y);
    }
    app.renderer.render(app.stage);
  });

  app.stage.on('pointerup', () => {
    if (!getLassoToolActive() || !isDrawing || !lassoGraphics) return;
    isDrawing = false;

    // Redraw the lasso path and close it
    lassoGraphics.clear();
    if (lassoPoints.length < 3) return; // Need at least 3 points to form a closed shape
    lassoGraphics.lineStyle(2, 0x0000FF, 1);
    lassoGraphics.beginFill(0x0000FF, 0.1); // Optional: Add a semi-transparent fill for better visibility
    lassoGraphics.moveTo(lassoPoints[0].x, lassoPoints[0].y);
    for (let i = 1; i < lassoPoints.length; i++) {
      lassoGraphics.lineTo(lassoPoints[i].x, lassoPoints[i].y);
    }
    lassoGraphics.lineTo(lassoPoints[0].x, lassoPoints[0].y);
    lassoGraphics.closePath();
    lassoGraphics.endFill();
    app.renderer.render(app.stage);

    setSelectedCells(new Set<string>());
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const cellCenterX = x * SCALE + SCALE / 2;
        const cellCenterY = y * SCALE + SCALE / 2;
        if (isPointInPolygon(cellCenterX, cellCenterY, lassoPoints)) {
          const selectedCells = getSelectedCells();
          selectedCells.add(`${x},${y}`);
          setSelectedCells(selectedCells);
        }
      }
    }

    highlightSelectedCells(app);
  });

  removeNumbersBtn.addEventListener('click', () => {
    const selectedCells = getSelectedCells();
    const cells = getCells();
    selectedCells.forEach(cellKey => {
      const [x, y] = cellKey.split(',').map(Number);
      const cell = cells[y]?.[x];
      if (cell && cell.text) {
        cell.text.visible = false;
        cell.isBackground = true;
      }
    });
    clearSelection(app);
    lassoActions.style.display = 'none';
    setLassoToolActive(false);
    cleverSelectActive = false;
    lassoToolBtn.classList.remove('active');
    cleverSelectBtn.classList.remove('active');
    if (lassoGraphics) {
      app.stage.removeChild(lassoGraphics);
      lassoGraphics.destroy();
      lassoGraphics = null;
    }
    lassoPoints = [];
  });

  addNumbersBtn.addEventListener('click', () => {
    const globalPixels = getGlobalPixels();
    const expectedLength = GRID_WIDTH * GRID_HEIGHT * 4;
    if (globalPixels.length !== expectedLength) {
      console.error('Pixel data not available or invalid length');
      return;
    }

    const cells = getCells();
    const colorMap = getColorMap();
    const selectedCells = getSelectedCells();
    selectedCells.forEach(cellKey => {
      const [x, y] = cellKey.split(',').map(Number);
      const cell = cells[y]?.[x];
      if (cell && cell.isBackground) {
        const index = (y * GRID_WIDTH + x) * 4;
        const r = globalPixels[index];
        const g = globalPixels[index + 1];
        const b = globalPixels[index + 2];
        const closestColor = findClosestColor(r, g, b, Object.values(colorMap).map(info => ({ rgb: info.rgb })));
        const colorKey = `${closestColor.rgb[0]},${closestColor.rgb[1]},${closestColor.rgb[2]}`;
        const colorInfo = colorMap[colorKey];

        if (colorInfo) {
          const renderR = colorInfo.rgb[0];
          const renderG = colorInfo.rgb[1];
          const renderB = colorInfo.rgb[2];

          cell.square.clear();
          const fillColor = (renderR << 16) + (renderG << 8) + renderB;
          cell.square.beginFill(fillColor);
          cell.square.drawRect(x * SCALE, y * SCALE, SCALE, SCALE);
          cell.square.endFill();
          cell.fillColor = fillColor;

          const luminance = 0.2126 * (renderR / 255) + 0.7152 * (renderG / 255) + 0.0722 * (renderB / 255);
          const textColor = luminance < 0.5 ? '#ffffff' : '#000000';

          if (!cell.text) {
            cell.text = new PIXI.Text(colorInfo.number, {
              fontFamily: 'Roboto Mono, Courier New, monospace',
              fontSize: SCALE * 0.8,
              fontWeight: 'bold',
              fill: textColor,
              align: 'center',
              dropShadow: true,
              dropShadowColor: '#000000',
              dropShadowDistance: 0.5,
              dropShadowAlpha: 0.3,
            });
            cell.text.anchor.set(0.5, 0.5);
            cell.text.x = x * SCALE + SCALE / 2;
            cell.text.y = y * SCALE + SCALE / 2;
            app.stage.addChild(cell.text);
          }
          cell.text.visible = true;
          cell.text.text = colorInfo.number;
          cell.text.style.fill = textColor;
          cell.isBackground = false;
        }
      }
    });
    clearSelection(app);
    lassoActions.style.display = 'none';
    setLassoToolActive(false);
    cleverSelectActive = false;
    lassoToolBtn.classList.remove('active');
    cleverSelectBtn.classList.remove('active');
    if (lassoGraphics) {
      app.stage.removeChild(lassoGraphics);
      lassoGraphics.destroy();
      lassoGraphics = null;
    }
    lassoPoints = [];
  });
}