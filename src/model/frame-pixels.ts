/** Raster measurements of REAL rendered RGBA pixels. They are warnings, not OCR or proof of quality. */
export interface RasterFrame {width:number;height:number;data:Uint8Array}
const luminosity=(r:number,g:number,b:number)=>(.2126*r+.7152*g+.0722*b)/255;
export function pixelChange(a:RasterFrame,b:RasterFrame):number {
  if(a.width!==b.width||a.height!==b.height)throw new Error('Frames raster incompatíveis.');
  let delta=0,samples=0;
  for(let y=0;y<a.height;y+=4)for(let x=0;x<a.width;x+=4){
    const i=(y*a.width+x)*4;
    delta+=(Math.abs(a.data[i]-b.data[i])+Math.abs(a.data[i+1]-b.data[i+1])+
      Math.abs(a.data[i+2]-b.data[i+2]))/(3*255);
    samples++;
  }
  return samples?delta/samples:0;
}
export function rasterMetrics(frame:RasterFrame):{
  luminanceSpread:number;edgeActivity:number;darkPercent:number;
}{
  const {width,height,data}=frame;
  if(width<4||height<4||data.length<width*height*4)throw new Error('PNG inválido.');
  let sum=0,sum2=0,dark=0,n=0,edges=0,edgeN=0;
  const nearEdge=(x:number,y:number)=>
    x<width*.035||x>width*.965||y<height*.035||y>height*.965;
  for(let y=1;y<height-1;y+=3)for(let x=1;x<width-1;x+=3){
    const i=(y*width+x)*4;
    const l=luminosity(data[i],data[i+1],data[i+2]);
    sum+=l;sum2+=l*l;if(l<.12)dark++;n++;
    if(nearEdge(x,y)){
      const k=i+4;
      const other=luminosity(data[k],data[k+1],data[k+2]);
      if(Math.abs(l-other)>.19)edges++;
      edgeN++;
    }
  }
  return {luminanceSpread:Math.sqrt(Math.max(0,sum2/n-(sum/n)**2)),
    edgeActivity:edgeN?edges/edgeN:0,darkPercent:dark/n};
}
export function regionContrast(frame:RasterFrame,box:{x:number;y:number;width:number;height:number}):number {
  const {width,height,data}=frame;
  const sx=Math.max(0,Math.floor(box.x)),sy=Math.max(0,Math.floor(box.y));
  const ex=Math.min(width,Math.ceil(box.x+box.width)),ey=Math.min(height,Math.ceil(box.y+box.height));
  let hi=0,lo=1,n=0;
  for(let y=sy;y<ey;y+=3)for(let x=sx;x<ex;x+=3){
    const i=(y*width+x)*4,l=luminosity(data[i],data[i+1],data[i+2]);
    hi=Math.max(hi,l);lo=Math.min(lo,l);n++;
  }
  return n?hi-lo:0;
}
