import * as PIXI from 'pixi.js';

export function showLegend(colorMap: { [key: string]: number }): void {
  const legend = document.getElementById('legend');
  if (!legend) {
    console.error('Legend element not found');
    return;
  }

  legend.innerHTML = '<h3>Color Legend</h3>';
  for (const [color, number] of Object.entries(colorMap)) {
    const [r, g, b] = color.split(',').map(Number);
    const colorDiv = document.createElement('div');
    colorDiv.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    colorDiv.style.width = '20px';
    colorDiv.style.height = '20px';
    colorDiv.style.display = 'inline-block';
    colorDiv.style.marginRight = '10px';

    const text = document.createElement('span');
    text.textContent = `Color ${number}`;

    const entry = document.createElement('div');
    entry.appendChild(colorDiv);
    entry.appendChild(text);

    legend.appendChild(entry);
  }
}

export function downloadCanvas(app: PIXI.Application): void {
  const canvas = app.view as HTMLCanvasElement;
  const link = document.createElement('a');
  link.download = 'diamond-painting-pattern.png';
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}