import * as PIXI from 'pixi.js';
import { showLegend } from './ui';
import Cropper from 'cropperjs';

const GRID_WIDTH: number = 70;
const GRID_HEIGHT: number = 100;
const MAX_COLORS: number = 20;
const SCALE: number = 9;

interface ColorMap {
  [key: string]: number;
}

function reduceColors(pixels: Uint8ClampedArray): number[][] {
  const colorCounts: { [key: string]: number } = {};
  for (let i: number = 0; i < pixels.length; i += 4) {
    const r: number = pixels[i];
    const g: number = pixels[i + 1];
    const b: number = pixels[i + 2];
    const quantizedR: number = Math.round(r / 32) * 32;
    const quantizedG: number = Math.round(g / 32) * 32;
    const quantizedB: number = Math.round(b / 32) * 32;
    const key: string = `${quantizedR},${quantizedG},${quantizedB}`;
    colorCounts[key] = (colorCounts[key] || 0) + 1;
  }

  const sortedColors: [string, number][] = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);
  const topColors: number[][] = sortedColors.slice(0, MAX_COLORS).map(([key]) => key.split(',').map(Number));
  return topColors;
}

function assignNumbersToColors(colors: number[][]): ColorMap {
  const colorMap: ColorMap = {};
  colors.forEach((color: number[], index: number) => {
    const key: string = color.join(',');
    colorMap[key] = index + 1;
  });
  return colorMap;
}

function findClosestColor(r: number, g: number, b: number, colors: number[][]): number[] {
  let closestColor = colors[0];
  let minDistance = Infinity;

  for (const color of colors) {
    const [cr, cg, cb] = color;
    const distance = Math.sqrt(
      (r - cr) ** 2 +
      (g - cg) ** 2 +
      (b - cb) ** 2
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = color;
    }
  }

  return closestColor;
}

let cropper: Cropper | null = null;

// Add a type for the updateStageTransform callback
type UpdateStageTransformCallback = () => void;

export function processImage(app: PIXI.Application, updateStageTransform: UpdateStageTransformCallback): void {
  console.log('processImage called');

  const fileInput: HTMLInputElement | null = document.getElementById('imageInput') as HTMLInputElement;
  const file: File | undefined = fileInput?.files?.[0];
  if (!file) {
    alert('Please upload an image');
    return;
  }

  const imagePreview: HTMLElement | null = document.getElementById('imagePreview');
  const generateBtn: HTMLButtonElement | null = document.getElementById('generateBtn') as HTMLButtonElement;
  const downloadBtn: HTMLButtonElement | null = document.getElementById('downloadBtn') as HTMLButtonElement;
  const container: HTMLElement | null = document.getElementById('container');

  if (!imagePreview || !generateBtn || !downloadBtn || !container) {
    console.error('Required DOM elements are missing', {
      imagePreview,
      generateBtn,
      downloadBtn,
      container,
    });
    alert('Failed to initialize image preview. Please check the DOM.');
    return;
  }

  imagePreview.innerHTML = '';

  const previewImage = document.createElement('img');
  previewImage.id = 'previewImage';
  previewImage.alt = 'Image Preview';
  imagePreview.appendChild(previewImage);

  const cropControls = document.createElement('div');
  cropControls.id = 'cropControls';
  const cropBtn = document.createElement('button');
  cropBtn.id = 'cropBtn';
  cropBtn.textContent = 'Crop Image';
  const cancelCropBtn = document.createElement('button');
  cancelCropBtn.id = 'cancelCropBtn';
  cancelCropBtn.textContent = 'Cancel';
  cropControls.appendChild(cropBtn);
  cropControls.appendChild(cancelCropBtn);
  imagePreview.appendChild(cropControls);

  const canvas = app.view as HTMLCanvasElement;

  console.log('Container before cropping:', container, container.children);

  imagePreview.style.display = 'block';
  generateBtn.classList.add('hidden');
  downloadBtn.classList.add('hidden');
  fileInput.classList.add('hidden');

  const img: HTMLImageElement = new Image();
  img.onload = () => {
    console.log('Image loaded, initializing Cropper');
    previewImage.src = img.src;

    if (cropper) {
      cropper.destroy();
      cropper = null;
    }

    try {
      cropper = new Cropper(previewImage, {
        aspectRatio: GRID_WIDTH / GRID_HEIGHT,
        viewMode: 1,
        autoCropArea: 0.8,
        movable: false,
        zoomable: false,
        scalable: false,
        cropBoxResizable: true,
      });
      console.log('Cropper initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Cropper:', error);
      alert('Failed to initialize cropping tool. Please try again.');
      return;
    }

    cropBtn.onclick = () => {
      console.log('Crop button clicked');
      if (!cropper) {
        console.error('Cropper not initialized');
        return;
      }

      const croppedCanvas = cropper.getCroppedCanvas({
        width: GRID_WIDTH,
        height: GRID_HEIGHT,
      });

      cropper.destroy();
      cropper = null;

      imagePreview.style.display = 'none';
      generateBtn.classList.remove('hidden');
      downloadBtn.classList.remove('hidden');
      fileInput.classList.remove('hidden');

      if (!container.contains(canvas)) {
        console.warn('Canvas was removed from container. Reattaching...');
        container.appendChild(canvas);
      }

      console.log('Container after cropping:', container, container.children);

      try {
        const texture: PIXI.Texture = PIXI.Texture.from(croppedCanvas);
        const sprite: PIXI.Sprite = new PIXI.Sprite(texture);
        sprite.width = GRID_WIDTH;
        sprite.height = GRID_HEIGHT;

        const renderTexture: PIXI.RenderTexture = PIXI.RenderTexture.create({ width: GRID_WIDTH, height: GRID_HEIGHT });
        app.renderer.render(sprite, { renderTexture });
        const pixels: Uint8ClampedArray = app.renderer.plugins.extract.pixels(renderTexture);
        console.log('Pixels length:', pixels.length);
        console.log('First few pixels:', pixels.slice(0, 16));

        // Debug the stage state before generating the pattern
        console.log('Stage before generatePattern:', {
          scale: app.stage.scale,
          position: { x: app.stage.x, y: app.stage.y },
          children: app.stage.children.length,
          bounds: app.stage.getBounds(),
        });

        generatePattern(app, pixels);
        console.log('Pattern generated successfully');

        // Update the stage transform after generating the pattern to account for new bounds
        updateStageTransform();

        // Debug the stage state after generating the pattern
        console.log('Stage after generatePattern and updateStageTransform:', {
          scale: app.stage.scale,
          position: { x: app.stage.x, y: app.stage.y },
          children: app.stage.children.length,
          bounds: app.stage.getBounds(),
        });
      } catch (error) {
        console.error('Error processing cropped image or generating pattern:', error);
        alert('Failed to process the cropped image or generate pattern. Please try again.');
      }
    };

    cancelCropBtn.onclick = () => {
      console.log('Cancel button clicked');
      if (cropper) {
        cropper.destroy();
        cropper = null;
      }
      imagePreview.style.display = 'none';
      generateBtn.classList.remove('hidden');
      downloadBtn.classList.remove('hidden');
      fileInput.classList.remove('hidden');
      previewImage.src = '';

      if (!container.contains(canvas)) {
        console.warn('Canvas was removed from container. Reattaching...');
        container.appendChild(canvas);
      }

      console.log('Container after canceling:', container, container.children);
    };
  };
  img.onerror = () => {
    alert('Failed to load the image. Please try a different file.');
  };
  img.src = URL.createObjectURL(file);
}

export function generatePattern(app: PIXI.Application, pixels: Uint8ClampedArray): void {
  const colors: number[][] = reduceColors(pixels);
  const colorMap: ColorMap = assignNumbersToColors(colors);
  console.log('colorMap:', colorMap);

  app.stage.removeChildren();
  for (let y: number = 0; y < GRID_HEIGHT; y++) {
    for (let x: number = 0; x < GRID_WIDTH; x++) {
      const index: number = (y * GRID_WIDTH + x) * 4;
      const r: number = pixels[index];
      const g: number = pixels[index + 1];
      const b: number = pixels[index + 2];

      const quantizedR: number = Math.round(r / 32) * 32;
      const quantizedG: number = Math.round(g / 32) * 32;
      const quantizedB: number = Math.round(b / 32) * 32;
      let colorKey: string = `${quantizedR},${quantizedG},${quantizedB}`;
      let number: number = colorMap[colorKey];

      if (number === undefined || number === null) {
        console.warn(`Color key ${colorKey} not found in colorMap, finding closest color`);
        const closestColor = findClosestColor(quantizedR, quantizedG, quantizedB, colors);
        colorKey = closestColor.join(',');
        number = colorMap[colorKey];
        console.log(`Closest color for ${quantizedR},${quantizedG},${quantizedB}: ${colorKey}, number: ${number}`);
      }

      const square: PIXI.Graphics = new PIXI.Graphics();
      square.beginFill((r << 16) + (g << 8) + b);
      square.drawRect(x * SCALE, y * SCALE, SCALE, SCALE);
      square.endFill();
      app.stage.addChild(square);

      if (number === undefined || number === null) {
        console.warn(`Number still undefined for colorKey ${colorKey}`);
        continue;
      }

      const luminance = 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
      const textColor = luminance < 0.5 ? '#ffffff' : '#000000';

      const text: PIXI.Text = new PIXI.Text(number.toString(), {
        fontFamily: 'Roboto Mono, Courier New, monospace',
        fontSize: SCALE * 0.7, // Increased font size for better legibility
        fontWeight: 'bold',
        fill: textColor,
        align: 'center',
        dropShadow: true,
        dropShadowColor: '#000000',
        dropShadowDistance: 0.5, // Reduced distance for subtler shadow
        dropShadowAlpha: 0.3, // Reduced alpha for less blur
      });

      // Center the text in the cell using anchor
      text.anchor.set(0.5, 0.5);
      text.x = x * SCALE + SCALE / 2; // Center of the cell horizontally
      text.y = y * SCALE + SCALE / 2; // Center of the cell vertically
      text.visible = true;
      app.stage.addChild(text);
    }
  }

  showLegend(colorMap);

  app.renderer.render(app.stage);
}