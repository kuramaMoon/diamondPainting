// src/types/pixi.d.ts
import * as PIXI from 'pixi.js';

declare module 'pixi.js' {
  // Augment the PIXI namespace
  namespace PIXI {
    // Extend the Application class
    interface Application {
      view: HTMLCanvasElement;
    }

    // Extend the Renderer interface
    interface Renderer {
      plugins: {
        extract: {
          pixels(renderTexture: PIXI.RenderTexture): Uint8ClampedArray;
        };
      };
      view: HTMLCanvasElement;
    }
  }
}