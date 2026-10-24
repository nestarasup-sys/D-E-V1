import type {IncomingMessage,ServerResponse} from 'node:http';
import {json,readJson} from './http';
import {inspectRenderedFrames} from './frame-qa';
let busy=false;
export async function handleFrameQa(req:IncomingMessage,res:ServerResponse,url:URL):Promise<boolean>{
  if(url.pathname!=='/v1/qa/frames'||req.method!=='POST')return false;
  if(busy){json(res,429,{error:'Revisão raster já em execução.'});return true;}
  busy=true;
  try{
    const project=await readJson(req,2_000_000);
    json(res,200,await inspectRenderedFrames(project));
  }catch(e){json(res,400,{error:e instanceof Error?e.message:'Falha na revisão de frames'});}
  finally{busy=false;}
  return true;
}
