// imageProcessor.ts
import * as PIXI from 'pixi.js';
import Cropper from 'cropperjs';
import { generatePattern } from './patternGenerator';
import { GRID_WIDTH, GRID_HEIGHT } from './constants';

let cropper: Cropper | null = null;

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
  const downloadBtn: HTMLButtonElement | null = document.getElementById('downloadBtn') as HTMLButtonElement;
  const container: HTMLElement | null = document.getElementById('container');
  const loadingIndicator: HTMLElement | null = document.getElementById('loadingIndicator');

  if (!imagePreview || !downloadBtn || !container || !loadingIndicator) {
    console.error('Required DOM elements are missing', {
      imagePreview,
      downloadBtn,
      container,
      loadingIndicator,
    });
    alert('Failed to initialize image preview. Please check the DOM.');
    return;
  }

  loadingIndicator.classList.remove('hidden');

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
        autoCropArea: 1,
        movable: false,
        zoomable: false,
        scalable: false,
        cropBoxResizable: true,
      });
      console.log('Cropper initialized successfully');
      loadingIndicator.classList.add('hidden');
    } catch (error) {
      console.error('Failed to initialize Cropper:', error);
      alert('Failed to initialize cropping tool. Please try again.');
      loadingIndicator.classList.add('hidden');
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
        const rawPixels = app.renderer.extract.pixels(renderTexture);
        const pixels = rawPixels instanceof Uint8ClampedArray ? rawPixels : new Uint8ClampedArray(rawPixels);

        console.log('Pixels length:', pixels.length);
        console.log('First few pixels:', pixels.slice(0, 16));

        console.log('Stage before generatePattern:', {
          scale: app.stage.scale,
          position: { x: app.stage.x, y: app.stage.y },
          children: app.stage.children.length,
          bounds: app.stage.getBounds(),
        });

        generatePattern(app, pixels);
        console.log('Pattern generated successfully');

        updateStageTransform();

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
    loadingIndicator.classList.add('hidden');
  };
  img.src = URL.createObjectURL(file);
}