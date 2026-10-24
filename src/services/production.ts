import {SERVICE_BASE,ensureServiceCompatible} from './service-guard';
export interface ProductionStep {
  id:'research'|'script'|'voice'|'captions'|'visual'|'qa'|'export';
  title:string;status:'pending'|'ready'|'review'|'proposed'|'completed';
  explanation:string;nextAction:string;
}
export interface ProductionOverview {
  projectId:string;revision:string;updatedAt:string;
  steps:ProductionStep[];nextAction:string;
  pendingProposals:number;completedRenders:number;interruptedRenders:number;proposedId?:string;
}
async function call(id:string,path:string,init?:RequestInit):Promise<unknown>{
  await ensureServiceCompatible();
  const response=await fetch(SERVICE_BASE+'/v1/projects/'+encodeURIComponent(id)+'/production'+path,init);
  let data:unknown;
  try{data=await response.json();}catch{throw new Error('Serviço retornou estado de produção inválido.');}
  if(!response.ok){
    throw new Error(typeof data==='object'&&data!==null&&'error'in data?
      String(data.error):'Erro HTTP '+response.status);
  }
  return data;
}
export async function getProduction(id:string):Promise<{state:ProductionOverview;checkpoint:ProductionOverview|null}>{
  return await call(id,'') as {state:ProductionOverview;checkpoint:ProductionOverview|null};
}
export async function advanceProduction(id:string):Promise<ProductionOverview>{
  const result=await call(id,'/continue',{method:'POST'}) as {state:ProductionOverview};
  return result.state;
}
export async function saveProductionCheckpoint(id:string):Promise<ProductionOverview>{
  const result=await call(id,'/checkpoint',{method:'POST'}) as {state:ProductionOverview};
  return result.state;
}
