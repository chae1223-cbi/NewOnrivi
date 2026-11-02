import UTIF from 'utif';
import pako from 'pako';

/** Lossless conversion of uncompressed 24-bit BMP screenshots. */
export function hwpBmpToPng(bytes: Uint8Array): Uint8Array | null {
  if (bytes.length < 54 || bytes[0] !== 66 || bytes[1] !== 77) return null;
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (v.getUint16(28, true) !== 24 || v.getUint32(30, true) !== 0) return null;
  const width=v.getInt32(18,true), signedHeight=v.getInt32(22,true), height=Math.abs(signedHeight);
  const offset=v.getUint32(10,true), stride=Math.ceil(width*3/4)*4;
  if(width<=0 || height<=0 || width*height>40_000_000 || offset+stride*height>bytes.length) throw new Error('HWP BMP 이미지가 손상되었습니다.');
  const rows=new Uint8Array(height*(width*3+1));
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    const src=offset+(signedHeight>0?height-1-y:y)*stride+x*3, dest=y*(width*3+1)+1+x*3;
    rows[dest]=bytes[src+2];rows[dest+1]=bytes[src+1];rows[dest+2]=bytes[src];
  }
  const header=new Uint8Array(13),hv=new DataView(header.buffer);
  hv.setUint32(0,width);hv.setUint32(4,height);header[8]=8;header[9]=2;
  const parts=[new Uint8Array([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',pako.deflate(rows)),chunk('IEND',new Uint8Array())];
  const result=new Uint8Array(parts.reduce((sum,p)=>sum+p.length,0));let pos=0;
  for(const part of parts){result.set(part,pos);pos+=part.length;}return result;
}

function chunk(name: string, data: Uint8Array): Uint8Array {
  const result = new Uint8Array(data.length+12);
  const view = new DataView(result.buffer);
  view.setUint32(0,data.length);
  for (let i=0;i<4;i++) result[i+4]=name.charCodeAt(i);
  result.set(data,8);
  let crc=0xffffffff;
  for(let i=4;i<result.length-4;i++) {
    crc^=result[i];
    for(let bit=0;bit<8;bit++) crc=(crc>>>1)^((crc&1)?0xedb88320:0);
  }
  view.setUint32(result.length-4,(crc^0xffffffff)>>>0);
  return result;
}

/** Convert TIFF bytes into a real PNG, without depending on OS TIFF support. */
export function hwpTiffToPng(bytes: Uint8Array): Uint8Array {
  const buffer = new Uint8Array(bytes).buffer;
  const frames = UTIF.decode(buffer);
  const frame = frames.find(item=>item.t256?.[0] && item.t257?.[0]);
  if (!frame) throw new Error('HWP TIFF 이미지의 크기를 읽지 못했습니다.');
  const width=frame.t256[0],height=frame.t257[0];
  if (width*height>40_000_000) throw new Error('HWP TIFF 이미지가 너무 큽니다.');
  UTIF.decodeImage(buffer,frame);
  const rgba=UTIF.toRGBA8(frame);
  if(rgba.length!==width*height*4) throw new Error('HWP TIFF 이미지를 변환하지 못했습니다.');
  const rows=new Uint8Array(height*(width*4+1));
  for(let y=0;y<height;y++) rows.set(rgba.subarray(y*width*4,(y+1)*width*4),y*(width*4+1)+1);
  const header=new Uint8Array(13);const headerView=new DataView(header.buffer);
  headerView.setUint32(0,width);headerView.setUint32(4,height);header[8]=8;header[9]=6;
  const parts=[new Uint8Array([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',pako.deflate(rows)),chunk('IEND',new Uint8Array())];
  const png=new Uint8Array(parts.reduce((sum,part)=>sum+part.length,0));let offset=0;
  for(const part of parts){png.set(part,offset);offset+=part.length;}
  return png;
}
