import {assertServiceCompatibility,type ServiceHealth} from '../model/service-contract';
const BASE='http://127.0.0.1:4317';
export {BASE as SERVICE_BASE};
export class ServiceUnavailableError extends Error {
  constructor(message:string){super(message);this.name='ServiceUnavailableError';}
}
let recent:{data:ServiceHealth;time:number}|null=null;
let pending:Promise<ServiceHealth>|null=null;
export async function ensureServiceCompatible(force=false):Promise<ServiceHealth>{
  if(!force&&recent&&Date.now()-recent.time<2500)return recent.data;
  if(pending)return pending;
  pending=(async()=>{
    let response:Response;
    try{response=await fetch(BASE+'/health',{cache:'no-store'});}
    catch{throw new ServiceUnavailableError(
      'O serviço Dark Studio na porta 4317 está desligado. Abra o BAT atualizado para iniciar o serviço local.');}
    if(!response.ok)throw new ServiceUnavailableError('A porta 4317 respondeu HTTP '+response.status+
      '. Pode haver outro programa usando essa porta.');
    let data:unknown;
    try{data=await response.json();}
    catch{throw new ServiceUnavailableError('A porta 4317 não retornou JSON válido; confira o serviço.');}
    const health=assertServiceCompatibility(data);
    recent={data:health,time:Date.now()};
    return health;
  })();
  try{return await pending;}
  finally{pending=null;}
}
/** Testes e recuperação manual podem forçar novo handshake sem reiniciar a janela. */
export function resetServiceCache(){recent=null;}
