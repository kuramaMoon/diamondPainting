// src/types/cropper.d.ts
declare module 'cropperjs' {
    class Cropper {
      constructor(element: HTMLImageElement, options: Cropper.Options);
      getCroppedCanvas(options?: Cropper.GetCroppedCanvasOptions): HTMLCanvasElement;
      destroy(): void;
    }
  
    namespace Cropper {
      interface Options {
        aspectRatio?: number;
        viewMode?: number;
        autoCropArea?: number;
        movable?: boolean;
        zoomable?: boolean;
        scalable?: boolean;
        cropBoxResizable?: boolean;
      }
  
      interface GetCroppedCanvasOptions {
        width?: number;
        height?: number;
      }
    }
  
    export default Cropper;
  }