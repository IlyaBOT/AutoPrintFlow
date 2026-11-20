import sharp from "sharp";
import { writePsdUint8Array, type Layer } from "ag-psd";
import { PRINT_DPI } from "./constants";

export async function pngImageData(png: Buffer) {
  const { data, info } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    width: info.width,
    height: info.height,
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
  };
}
export async function writeLayeredPsd(params: {
  width: number;
  height: number;
  composite: Buffer;
  background: Buffer;
  layers: Array<{ name: string; png: Buffer; left: number; top: number }>;
}) {
  const children: Layer[] = [
    {
      name: "Print background",
      imageData: await pngImageData(params.background),
      left: 0,
      top: 0,
    },
  ];
  for (const layer of params.layers)
    children.push({
      name: layer.name,
      left: layer.left,
      top: layer.top,
      imageData: await pngImageData(layer.png),
    });
  const psd = writePsdUint8Array(
    {
      width: params.width,
      height: params.height,
      children,
      imageData: await pngImageData(params.composite),
      imageResources: {
        resolutionInfo: {
          horizontalResolution: PRINT_DPI,
          horizontalResolutionUnit: "PPI",
          widthUnit: "Centimeters",
          verticalResolution: PRINT_DPI,
          verticalResolutionUnit: "PPI",
          heightUnit: "Centimeters",
        },
      },
    },
    { generateThumbnail: false, noBackground: true },
  );
  return Buffer.from(psd.buffer, psd.byteOffset, psd.byteLength);
}
