import type {IncomingMessage,ServerResponse} from 'node:http';
export function json(res:ServerResponse,status:number,data:unknown){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
export async function readJson(req:IncomingMessage,maxBytes=256_000):Promise<unknown>{
  let bytes=0;const chunks:Buffer[]=[];
  for await(const chunk of req){const b=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);bytes+=b.length;if(bytes>maxBytes)throw new Error('JSON acima do limite de tamanho');chunks.push(b);}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
