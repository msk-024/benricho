declare module "imagetracerjs" {
  export interface ImageTracerOptions {
    numberofcolors: number;
    pathomit: number;
    blurradius: number;
    blurdelta: number;
    ltres: number;
    qtres: number;
    strokewidth: number;
    linefilter: boolean;
    scale: number;
    colorsampling: number;
    mincolorratio: number;
    colorquantcycles: number;
  }

  export interface ImageDataLike {
    width: number;
    height: number;
    data: Uint8ClampedArray;
  }

  const ImageTracer: {
    imagedataToSVG(
      imageData: ImageDataLike,
      options?: Partial<ImageTracerOptions> | string,
    ): string;
  };

  export default ImageTracer;
}
