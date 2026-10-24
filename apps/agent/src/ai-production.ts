/** v0.18: self-contained audiovisual JSON -> real Windows voice -> saved native project. */
import type {IncomingMessage,ServerResponse} from 'node:http';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {json,readJson} from './http';
import {ProjectRepository} from './project-store';
import {productionSchema,compileProduction,resyncProduction,productionPlanSchema} from '../../../src/model/ai-production';
import {listLocalVoices,synthesizeNarration,rollbackNarration} from './narration';
import type {NarratedAudio,ProducedSound} from '../../../src/model/ai-production';
import {synthesizeSoundtrack,rollbackSoundtrack} from './soundtrack';

const projects=new ProjectRepository();
let active=false;
function problems(error:z.ZodError){
  return error.issues.map(issue=>({
    path:issue.path.join('.')||'(raiz)',code:issue.code,
    description:issue.message,suggestion:'Confira o campo e o Guia JSON v0.18.',
  }));
}
export async function handleProduction(req:IncomingMessage,res:ServerResponse,url:URL):Promise<boolean>{
  if(url.pathname==='/v1/productions/voices'&&req.method==='GET'){
    try{json(res,200,{engine:'windows-sapi',voices:await listLocalVoices()});}
    catch(e){json(res,503,{error:e instanceof Error?e.message:'Vozes não disponíveis'});}
    return true;
  }
  if(url.pathname==='/v1/productions/validate'&&req.method==='POST'){
    try{
      const raw=await readJson(req,4_000_000);
      const result=productionSchema.safeParse(raw);
      json(res,result.success?200:422,result.success?{
        valid:true,beats:result.data.beats.length,
        plannedFrames:result.data.beats.reduce((n,b)=>n+b.plannedFrames,0),
        unresolvedBroll:result.data.beats.filter(b=>!!b.broll).map((b,i)=>({
          query:b.broll!.query,index:i,action:'Selecionar mídia licenciada na biblioteca',
        })),
      }:{valid:false,issues:problems(result.error)});
    }catch(e){json(res,400,{valid:false,error:e instanceof Error?e.message:'JSON inválido'});}
    return true;
  }
  if(url.pathname==='/v1/productions/import'&&req.method==='POST'){
    if(active){json(res,409,{error:'Já existe uma produção em geração. Conclua antes de iniciar outra.'});return true;}
    active=true;let audio:NarratedAudio[]=[],sounds:ProducedSound[]=[];
    try{
      const parsed=productionSchema.parse(await readJson(req,4_000_000));
      audio=await synthesizeNarration(parsed);
      const score=await synthesizeSoundtrack(parsed,audio);
      sounds=score.sounds;
      const project=compileProduction(parsed,audio,randomUUID,sounds);
      const record=await projects.adopt(project);
      json(res,201,{...record,voiceCreated:true,
        alignment:audio.map((a,i)=>({beat:i,status:a.alignment?.status??'unavailable',
          coverage:a.alignment?.coverage??0,reason:a.alignment?.reason??'Sem eventos de palavra'})),
        soundtrackWarnings:score.warnings,unresolvedBroll:parsed.beats
        .flatMap((beat,index)=>beat.broll?[{index,query:beat.broll.query}]:[])});
    }catch(e){
      await rollbackNarration(audio);
      await rollbackSoundtrack(sounds);
      json(res,e instanceof z.ZodError?422:400,{
        error:e instanceof Error?e.message:'Não foi possível montar a produção',
        ...(e instanceof z.ZodError?{issues:problems(e)}:{}),
      });
    }finally{active=false;}
    return true;
  }
  const regenerate=/^\/v1\/productions\/([0-9a-f-]{36})\/regenerate$/.exec(url.pathname);
  if(regenerate&&req.method==='POST'){
    if(active){json(res,409,{error:'Outra geração está em andamento.'});return true;}
    active=true;let audio:NarratedAudio[]=[],sounds:ProducedSound[]=[];
    try{
      const current=await projects.read(regenerate[1]);
      const revision=String(req.headers['if-match']||'');
      if(current.revision!==revision){
        json(res,409,{error:'Projeto foi alterado. Reabra a versão atual antes de regenerar.'});
        return true;
      }
      const plan=current.project.productionPlan?
        productionPlanSchema.parse(current.project.productionPlan):null;
      if(!plan)throw new Error('Este projeto não possui o roteiro original da produção JSON v0.18.');
      const body=z.object({voice:z.object({
        voice:z.string().trim().max(140).optional(),
        rate:z.number().int().min(-10).max(10).optional(),
        pauseMs:z.number().int().min(0).max(2500).optional(),
      }).strict()}).strict().parse(await readJson(req,3000));
      const source=productionSchema.parse({...plan.source,
        voice:{...plan.source.voice,...body.voice}});
      audio=await synthesizeNarration(source);
      const score=await synthesizeSoundtrack(source,audio);
      sounds=score.sounds;
      const rebuilt=resyncProduction(current.project,audio,randomUUID,source,sounds);
      const saved=await projects.save(current.project.id,rebuilt,revision);
      json(res,200,{...saved,voiceRegenerated:true,
        alignment:audio.map((a,i)=>({beat:i,status:a.alignment?.status??'unavailable',
          coverage:a.alignment?.coverage??0,reason:a.alignment?.reason??'Sem eventos'})),
        soundtrackWarnings:score.warnings});
    }catch(e){
      await rollbackNarration(audio);
      await rollbackSoundtrack(sounds);
      json(res,e instanceof z.ZodError?422:400,{
        error:e instanceof Error?e.message:'Falha ao regenerar a voz',
        ...(e instanceof z.ZodError?{issues:problems(e)}:{}),
      });
    }finally{active=false;}
    return true;
  }
  return false;
}
