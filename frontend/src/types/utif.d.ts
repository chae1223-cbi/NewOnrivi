declare module 'utif' {
  type Frame = {t256:number[];t257:number[];width?:number;height?:number;data?:Uint8Array};
  const UTIF: {
    decode(buffer:ArrayBuffer):Frame[];
    decodeImage(buffer:ArrayBuffer,frame:Frame):void;
    toRGBA8(frame:Frame):Uint8Array;
  };
  export default UTIF;
}
