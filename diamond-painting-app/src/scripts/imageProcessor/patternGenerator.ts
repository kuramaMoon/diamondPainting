// patternGenerator.ts
import * as PIXI from 'pixi.js';
import { showLegend } from '../ui';
import { PREDEFINED_COLORS } from '../../assets/components/diamond_colors';
import { findClosestColor, getDisplayNumber } from './utils'; // Import getDisplayNumber
import { setCells, setGlobalPixels, setColorMap } from './state';
import { GRID_WIDTH, GRID_HEIGHT, SCALE, MAX_COLORS } from './constants';
import { Cell, ColorInfo } from './state';

type ColorMap = { [key: string]: ColorInfo };

// Function to assign numbers to the colors that are actually used, limited to MAX_COLORS
function assignNumbersToColors(colorFrequencies: Map<string, number>): ColorMap {
  const colorMap: ColorMap = {};
  let currentNumber = 1;

  // Sort colors by frequency (descending)
  const sortedColors = Array.from(colorFrequencies.entries())
    .sort((a, b) => b[1] - a[1]) // Sort by frequency
    .slice(0, Math.min(MAX_COLORS, colorFrequencies.size)); // Limit to MAX_COLORS

  // Create a set of allowed color keys
  const allowedColors = new Set(sortedColors.map(([key]) => key));

  // Iterate over PREDEFINED_COLORS to maintain order, but only include allowed colors
  PREDEFINED_COLORS.forEach(({ number, rgb }) => {
    const [r, g, b] = rgb;
    const key = `${r},${g},${b}`;
    if (allowedColors.has(key)) {
      const displayNumber = getDisplayNumber(currentNumber); // 1 to 9, then A, B, ...
      colorMap[key] = {
        number: displayNumber, // Use the new numbering system (e.g., "A" instead of "10")
        pictureNumber: number, // Still store the predefined number (e.g., '3713')
        rgb: [r, g, b],
      };
      currentNumber++;
    }
  });

  return colorMap;
}

export function generatePattern(app: PIXI.Application, pixels: Uint8ClampedArray): void {
  // Track the frequency of each predefined color used in the image
  const colorFrequencies = new Map<string, number>();

  // Map PREDEFINED_COLORS to the format expected by findClosestColor
  const colorsForQuantization = PREDEFINED_COLORS.map(color => ({ rgb: color.rgb }));

  // First pass: Quantize colors and count frequencies
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const index = (y * GRID_WIDTH + x) * 4;
      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];

      const closestColor = findClosestColor(r, g, b, colorsForQuantization);
      const [quantizedR, quantizedG, quantizedB] = closestColor.rgb;
      const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;

      // Increment the frequency of this color
      colorFrequencies.set(colorKey, (colorFrequencies.get(colorKey) || 0) + 1);
    }
  }

  // Assign numbers to the most frequent colors, limited to MAX_COLORS
  const colorMap = assignNumbersToColors(colorFrequencies);
  setColorMap(colorMap);
  setGlobalPixels(pixels);
  console.log('colorMap:', colorMap);

  app.stage.removeChildren();
  let totalCells = GRID_WIDTH * GRID_HEIGHT;

  const newCells: Cell[][] = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null));

  // Second pass: Generate the pattern using the quantized colors
  for (let y: number = 0; y < GRID_HEIGHT; y++) {
    for (let x: number = 0; x < GRID_WIDTH; x++) {
      const index: number = (y * GRID_WIDTH + x) * 4;
      const r: number = pixels[index];
      const g: number = pixels[index + 1];
      const b: number = pixels[index + 2];

      const closestColor = findClosestColor(r, g, b, colorsForQuantization);
      const quantizedR: number = closestColor.rgb[0];
      const quantizedG: number = closestColor.rgb[1];
      const quantizedB: number = closestColor.rgb[2];

      const colorKey: string = `${quantizedR},${quantizedG},${quantizedB}`;
      const colorInfo = colorMap[colorKey];

      // If the color isn't in the colorMap (due to MAX_COLORS limit), use the original pixel color and mark as background
      let renderR: number, renderG: number, renderB: number;
      let isBackground = false;
      let displayNumber: string | undefined;
      let textColor: string | undefined;

      if (!colorInfo) {
        renderR = r;
        renderG = g;
        renderB = b;
        isBackground = true;
      } else {
        renderR = colorInfo.rgb[0];
        renderG = colorInfo.rgb[1];
        renderB = colorInfo.rgb[2];
        displayNumber = colorInfo.number; // Use the new numbering (e.g., "A" instead of "10")
        const luminance = 0.2126 * (renderR / 255) + 0.7152 * (renderG / 255) + 0.0722 * (renderB / 255);
        textColor = luminance < 0.5 ? '#ffffff' : '#000000';
      }

      const square = new PIXI.Graphics();
      const fillColor = (renderR << 16) + (renderG << 8) + renderB;
      square.beginFill(fillColor);
      square.drawRect(x * SCALE, y * SCALE, SCALE, SCALE);
      square.endFill();
      app.stage.addChild(square);

      let text: PIXI.Text | undefined;
      if (!isBackground && displayNumber && textColor) {
        text = new PIXI.Text(displayNumber, { // Display "A" instead of "3713"
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

        text.anchor.set(0.5, 0.5);
        text.x = x * SCALE + SCALE / 2;
        text.y = y * SCALE + SCALE / 2;
        text.visible = true;
        app.stage.addChild(text);
      }

      newCells[y][x] = { x, y, square, text, isBackground, fillColor };
    }
  }

  setCells(newCells);
  console.log(`Total cells: ${totalCells}`);

  app.stage.visible = true;
  showLegend(colorMap);
}