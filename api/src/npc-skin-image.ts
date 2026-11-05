import sharp from 'sharp';

/** Normalize a real PNG decoder's output; palette, grayscale and interlaced PNGs are valid skins too. */
export async function normalizeNpcSkin(encoded:string, requested:'auto'|'slim'|'wide'='auto') {
 if(!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))throw Error('PNG_BASE64_INVALID');
 const input=Buffer.from(encoded,'base64');
 if(input.length>512_000||input.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('PNG_64X64_REQUIRED');
 const image=sharp(input,{limitInputPixels:4096,failOn:'warning'});
 const info=await image.metadata();
 if(info.format!=='png'||info.width!==64||info.height!==64||(info.pages??1)!==1)throw Error('PNG_64X64_REQUIRED');
 const pixels=await image.ensureAlpha().raw().toBuffer();
 const alpha=(x:number,y:number)=>pixels[(y*64+x)*4+3]??0;
 const unused=[[54,20],[55,20],[54,31],[55,31],[46,52],[47,52],[46,63],[47,63]];
 const hasArm=alpha(44,22)>0||alpha(36,54)>0;
 const model=requested==='auto'?(hasArm&&unused.every(([x,y])=>alpha(x!,y!)===0)?'slim':'wide'):requested;
 const png=await sharp(pixels,{raw:{width:64,height:64,channels:4}}).png({palette:false,compressionLevel:9}).toBuffer();
 return {png,model};
}
