// ui.ts
import * as PIXI from 'pixi.js';
import { ColorInfo } from './imageProcessor/state';

type ColorMap = { [key: string]: ColorInfo };

export function showLegend(colorMap: ColorMap): void {
  const legendDiv = document.getElementById('legend') as HTMLDivElement | null;
  if (!legendDiv) {
    console.error('Legend div not found');
    return;
  }

  legendDiv.innerHTML = '';

  Object.entries(colorMap).forEach(([_key, info]) => {
    const [r, g, b] = info.rgb;
    const colorBox = document.createElement('div');
    colorBox.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    colorBox.style.width = '20px';
    colorBox.style.height = '20px';
    colorBox.style.display = 'inline-block';
    colorBox.style.marginRight = '10px';

    const label = document.createElement('span');
    label.textContent = `${info.pictureNumber} - ${info.number}`; // Will now show "3713 - A"

    const legendItem = document.createElement('div');
    legendItem.appendChild(colorBox);
    legendItem.appendChild(label);
    legendItem.style.marginBottom = '5px';

    legendDiv.appendChild(legendItem);
  });
}

export function downloadCanvas(app: PIXI.Application): void {
  // Ensure the stage is visible
  app.stage.visible = true;

  // Force a render to ensure the canvas is up-to-date
  app.renderer.render(app.stage);

  // Use the renderer's view (canvas) to capture the content
  const canvas = app.view as HTMLCanvasElement;

  // Convert the canvas to a data URL
  let dataURL: string;
  try {
    dataURL = canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error converting canvas to data URL:', error);
    alert('Failed to download image. Check the console for details.');
    return;
  }

  // Create a downloadable link
  const link = document.createElement('a');
  link.download = 'diamond-painting-pattern.png';
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}