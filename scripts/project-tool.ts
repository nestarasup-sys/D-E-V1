/**
 * Interface LOCAL de automação para Codex no ChatGPT Desktop (modo Local).
 * Nenhuma operação acessa GitHub ou envia projetos à nuvem.
 *
 * npm run project -- path
 * npm run project -- list
 * npm run project -- info <id>
 * npm run project -- show <id>
 * npm run project -- create "Título"
 * npm run project -- import <projeto.json>
 * npm run project -- apply <id> <operacoes.json> [revisao]
 * npm run project -- replace <id> <projeto.json> <revisao>
 * npm run project -- render <id>
 */
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {compileDirection,makeAutomaticDirection,reviewVisualDirection} from '../src/model/direction';
import {PRESET_CATALOG,PRESET_COUNT,PRESET_CATEGORIES,instantiatePreset} from '../src/model/presets';
import {layerKinds,layerBehaviors} from '../src/model/layers';
import {ProjectRepository} from '../apps/agent/src/project-store';
import {ProposalRepository} from '../apps/agent/src/proposals';
import {ProductionCoordinator} from '../apps/agent/src/production';
import {assertServiceCompatibility} from '../src/model/service-contract';
import {diagnoseProject,runtimeDiagnostics} from '../apps/agent/src/diagnostics';
import {mediaExistsFor,importGeneratedWave} from '../apps/agent/src/media';
import {makeSfxWave,SFX_TYPES,type SfxType} from '../apps/agent/src/sfx';
import {applyOperations} from '../src/model/operations';
import {parseProject} from '../src/model/project';

const repository=new ProjectRepository();
const proposalStore=new ProposalRepository(repository);
const production=new ProductionCoordinator(repository,proposalStore);
const [command,...args]=process.argv.slice(2);
const api='http://127.0.0.1:4317';

async function requireServiceCompatible():Promise<void>{
  let response:Response;
  try{response=await fetch(api+'/health',{signal:AbortSignal.timeout(3000)});}
  catch{throw new Error('Serviço local indisponível. Inicie o Dark Studio pelo BAT atualizado.');}
  if(!response.ok)throw new Error('Porta 4317 respondeu HTTP '+response.status);
  assertServiceCompatibility(await response.json() as unknown);
}
function requireArgument(value:string|undefined,label:string):string {
  if (!value)throw new Error('Parâmetro obrigatório: '+label);
  return value;
}
async function readLocalJson(file:string):Promise<unknown> {
  const data=await readFile(resolve(file),'utf8');
  return JSON.parse(data) as unknown;
}
async function renderProject(id:string) {
  await requireServiceCompatible();
  const {project}=await repository.read(id);
  let response:Response;
  try{
    response=await fetch(api+'/v1/export',{method:'POST',
      headers:{'Content-Type':'application/json'},body:JSON.stringify(project)});
  }catch{
    throw new Error('O serviço de renderização local não está aberto. Execute npm run dev:service em outro terminal.');
  }
  const job=await response.json() as {id?:string,error?:string};
  if(!response.ok||!job.id)throw new Error(job.error||'Falha ao iniciar o render.');
  console.log('Render local iniciado: '+job.id);
  while(true){
    await new Promise(resolve=>setTimeout(resolve,1500));
    const check=await fetch(api+'/v1/export/'+job.id);
    if(!check.ok)throw new Error('Não foi possível consultar o andamento do render.');
    const status=await check.json() as {state:string,progress?:number,outputPath?:string,error?:string};
    if(status.state==='completed'){
      console.log('MP4 salvo em: '+status.outputPath);
      return;
    }
    if(status.state==='failed'||status.state==='interrupted')throw new Error(status.error||'Render interrompido.');
    if(status.state==='rendering')console.log('Renderizando '+Math.round((status.progress||0)*100)+'%');
  }
}
async function main() {
  switch(command){
    case 'path': {
      console.log(repository.root);
      return;
    }
    case 'list': {
      console.log('Projetos no Windows: '+repository.root);
      for(const p of await repository.list()){
        console.log(p.id+' | '+p.name+' | '+p.sceneCount+' cenas');
      }
      return;
    }
    case 'pilot': {
      await requireServiceCompatible();
      let response:Response;
      try{response=await fetch(api+'/v1/projects/pilot',{method:'POST'});}
      catch{throw new Error('Serviço local desligado. Abra npm run dev:service antes de gerar o piloto.');}
      const data=await response.json() as {project?:{id:string},path?:string,error?:string};
      if(!response.ok||!data.project)throw new Error(data.error||'Falha ao gerar piloto.');
      console.log('Piloto de 30s com voz local e 8 planos: '+data.path);
      console.log('ID: '+data.project.id);
      return;
    }
    case 'create': {
      const name=args.join(' ').trim();
      if(!name)throw new Error('Informe um nome para o documentário.');
      const created=await repository.create(name);
      console.log('Criado: '+created.path);
      console.log('ID: '+created.project.id);
      return;
    }
    case 'info': {
      const record=await repository.read(requireArgument(args[0],'UUID do projeto'));
      console.log('ID: '+record.project.id);
      console.log('Nome: '+record.project.name);
      console.log('Arquivo: '+record.path);
      console.log('Revisão: '+record.revision);
      console.log('Cenas: '+record.project.scenes.length);
      return;
    }
    case 'show': {
      const record=await repository.read(requireArgument(args[0],'UUID do projeto'));
      console.log(JSON.stringify(record.project,null,2));
      console.error('Revisão: '+record.revision);
      return;
    }
    case 'validate': {
      const record=await repository.read(requireArgument(args[0],'UUID do projeto'));
      console.log('Projeto válido: '+record.project.name+' ('+record.project.scenes.length+' cenas)');
      return;
    }
    case 'import': {
      const input=await readLocalJson(requireArgument(args[0],'caminho do JSON'));
      const created=await repository.import(input);
      console.log('Projeto importado localmente: '+created.path);
      console.log('ID: '+created.project.id);
      return;
    }
    case 'service-info': {
      await requireServiceCompatible();
      const info=await (await fetch(api+'/health')).json() as unknown;
      console.log(JSON.stringify(info,null,2));return;
    }
    case 'production': {
      const id=requireArgument(args[0],'UUID do projeto');
      const action=args[1]||'status';
      const state=action==='continue'?await production.continue(id):
        action==='checkpoint'?await production.checkpoint(id):
        action==='status'?await production.assess(id):null;
      if(!state)throw new Error('Ações de produção: status | checkpoint | continue');
      console.log(JSON.stringify(state,null,2));
      return;
    }
    case 'sfx': {
      if(!args[0]||args[0]==='list'){
        console.log(JSON.stringify({offline:true,types:SFX_TYPES},null,2));return;
      }
      const kind=requireArgument(args[0],'tipo de efeito') as SfxType;
      if(!SFX_TYPES.includes(kind))throw new Error('Efeito desconhecido: '+kind);
      const id=requireArgument(args[1],'UUID do projeto');
      const expected=requireArgument(args[2],'revisão atual');
      const frame=Number(requireArgument(args[3],'frame inicial'));
      const volume=args[4]===undefined?.18:Number(args[4]);
      const saved=await repository.read(id);
      if(saved.revision!==expected)throw new Error('O projeto mudou; consulte info novamente.');
      if(!Number.isInteger(frame)||frame<0||frame>=saved.project.scenes.reduce((n,s)=>n+s.durationFrames,0))
        throw new Error('Frame inicial fora do episódio.');
      if(!Number.isFinite(volume)||volume<0||volume>1)throw new Error('Volume de 0 a 1.');
      const {wav,durationFrames}=makeSfxWave(kind);
      const asset=await importGeneratedWave(wav,{name:'dark-studio-'+kind+'.wav',durationFrames});
      const maxDuration=saved.project.scenes.reduce((n,s)=>n+s.durationFrames,0)-frame;
      const clip={
        id:randomUUID(),assetId:asset.id,lane:'sfx' as const,
        startFrame:frame,durationFrames:Math.min(durationFrames,maxDuration),
        trimStartFrames:0,volume,volumeKeyframes:[],
      };
      const proposal=await proposalStore.create(id,[
        {type:'addAsset',asset},
        {type:'addClip',clip},
      ],expected);
      console.log('Efeito local sintetizado. Proposta pendente: '+proposal.id);
      console.log('Abra Revisar Codex no Dark Studio; não apliquei automaticamente.');
      return;
    }
    case 'presets': {
      const category=args.join(' ').toLocaleLowerCase('pt-BR');
      const filtered=category?PRESET_CATALOG.filter(p=>
        p.category.toLocaleLowerCase('pt-BR').includes(category)||
        p.id.includes(category)):PRESET_CATALOG;
      console.log(JSON.stringify({count:filtered.length,total:PRESET_COUNT,
        categories:PRESET_CATEGORIES,presets:filtered.map(p=>({
          id:p.id,title:p.title,category:p.category,recipe:p.recipe,
          description:p.description,
        })),layerKinds,animationBehaviors:layerBehaviors},null,2));
      return;
    }
    case 'composition-example': {
      const presetId=requireArgument(args[0],'ID da composição');
      const destination=resolve(requireArgument(args[1],'destino JSON local'));
      const layers=instantiatePreset(presetId,{title:'EXEMPLO EDITÁVEL',durationFrames:150},randomUUID)
        .map(({id:_id,...layer})=>layer);
      await writeFile(destination,JSON.stringify({
        note:'Demonstração. Copie estas camadas para direction.beats[i].layers (sem presetId).',
        durationFrames:150,
        layers,
      },null,2)+'\n',{flag:'wx'});
      console.log('Blueprint totalmente editável salvo em '+destination);
      return;
    }
    case 'direction-template': {
      const id=requireArgument(args[0],'UUID do projeto');
      const file=resolve(requireArgument(args[1],'arquivo de direção .json'));
      const current=await repository.read(id);
      const direction=makeAutomaticDirection(current.project);
      await writeFile(file,JSON.stringify(direction,null,2)+'\n',{flag:'wx',encoding:'utf8'});
      console.log('Rascunho ilustrativo salvo LOCALMENTE em: '+file);
      console.log('Edite as composições, dados e IDs de fontes conforme roteiro e evidências.');
      console.log('Revisão para futura proposta: '+current.revision);
      return;
    }
    case 'direct': {
      const id=requireArgument(args[0],'UUID do projeto');
      const input=requireArgument(args[1],'arquivo da direção JSON');
      const expected=requireArgument(args[2],'revisão de info');
      const current=await repository.read(id);
      if(current.revision!==expected)throw new Error('Conflito: o projeto mudou. Refaça a direção a partir da versão atual.');
      const plan=await readLocalJson(input);
      const result=compileDirection(current.project,plan,randomUUID);
      const proposal=await proposalStore.create(id,result.operations,expected);
      console.log('Direção visual entregue para APROVAÇÃO no Dark Studio.');
      console.log('Proposta: '+proposal.id+' — '+result.report.shots+' planos, '+result.report.coveragePercent+'% de cobertura.');
      console.log('Nenhuma cena, narração, legenda ou mídia foi alterada.');
      console.log('Relatório editorial: '+JSON.stringify(result.report,null,2));
      return;
    }
    case 'auto-direct': {
      const id=requireArgument(args[0],'UUID do projeto');
      const expected=requireArgument(args[1],'revisão de info');
      const current=await repository.read(id);
      if(current.revision!==expected)throw new Error('Conflito: revisão alterada.');
      const plan=makeAutomaticDirection(current.project);
      const result=compileDirection(current.project,plan,randomUUID);
      const proposal=await proposalStore.create(id,result.operations,expected);
      console.log('Direção ilustrativa AUTOMÁTICA preparada: '+proposal.id);
      console.log('Planos: '+result.report.shots+'. Relatório: '+JSON.stringify(result.report,null,2));
      console.log('Atenção: é um storyboard ilustrativo baseado em texto existente; não pesquisa nem verifica fatos.');
      return;
    }
    case 'direction-report': {
      const id=requireArgument(args[0],'UUID do projeto');
      const current=await repository.read(id);
      const report=reviewVisualDirection(current.project);
      console.log(JSON.stringify(report,null,2));
      if(report.issues.some(item=>item.severity==='error'))process.exitCode=2;
      return;
    }
    case 'preview': {
      const id=requireArgument(args[0],'UUID do projeto');
      const ops=await readLocalJson(requireArgument(args[1],'operações JSON'));
      const revision=requireArgument(args[2],'revisão do projeto');
      const result=await proposalStore.preview(id,ops,revision);
      console.log(JSON.stringify(result,null,2));
      console.log('Nenhum arquivo foi modificado.');
      return;
    }
    case 'propose': {
      const id=requireArgument(args[0],'UUID do projeto');
      const ops=await readLocalJson(requireArgument(args[1],'operações JSON'));
      const revision=requireArgument(args[2],'revisão do projeto');
      const proposal=await proposalStore.create(id,ops,revision);
      console.log('Proposta preparada para revisão no Dark Studio: '+proposal.id);
      console.log(JSON.stringify(proposal.preview,null,2));
      return;
    }
    case 'pending': {
      const id=requireArgument(args[0],'UUID do projeto');
      const pending=await proposalStore.list(id);
      console.log(JSON.stringify(pending.map(p=>({id:p.id,createdAt:p.createdAt,preview:p.preview})),null,2));
      return;
    }
    case 'accept': {
      const result=await proposalStore.accept(requireArgument(args[0],'UUID do projeto'),requireArgument(args[1],'UUID da proposta'));
      console.log('Proposta aplicada com backup local. Revisão: '+result.revision);
      return;
    }
    case 'reject': {
      await proposalStore.reject(requireArgument(args[0],'UUID do projeto'),requireArgument(args[1],'UUID da proposta'));
      console.log('Proposta descartada; projeto preservado.');
      return;
    }
    case 'apply': {
      const id=requireArgument(args[0],'UUID do projeto');
      const file=requireArgument(args[1],'operações JSON');
      const current=await repository.read(id);
      const expected=requireArgument(args[2],'revisão obtida com info');
      if(current.revision!==expected)throw new Error('Conflito: a revisão mudou antes de aplicar. Leia o projeto novamente.');
      const operations=await readLocalJson(file);
      const next=applyOperations(current.project,operations);
      const saved=await repository.save(id,next,current.revision);
      console.log('Edição aplicada (backup local): '+saved.path);
      console.log('Nova revisão: '+saved.revision);
      return;
    }
    case 'replace': {
      const id=requireArgument(args[0],'UUID do projeto');
      const file=requireArgument(args[1],'projeto JSON');
      const expected=requireArgument(args[2],'revisão obtida com info');
      const project=parseProject(await readLocalJson(file));
      const updated=await repository.save(id,project,expected);
      console.log('Projeto atualizado (com backup local): '+updated.path);
      console.log('Nova revisão: '+updated.revision);
      return;
    }
    case 'doctor': {
      console.log('Ambiente local: '+JSON.stringify(runtimeDiagnostics(),null,2));
      if(args[0]){
        const project=(await repository.read(args[0])).project;
        const result=await diagnoseProject(project,mediaExistsFor);
        console.log('Diagnóstico de projeto: '+JSON.stringify(result,null,2));
        if(!result.readyForRender)process.exitCode=2;
      }
      return;
    }
    case 'history': {
      const id=requireArgument(args[0],'UUID do projeto');
      const snapshots=await repository.history(id);
      console.log(JSON.stringify(snapshots,null,2));
      return;
    }
    case 'restore': {
      const id=requireArgument(args[0],'UUID do projeto');
      const revision=requireArgument(args[1],'revisão do histórico');
      const expected=requireArgument(args[2],'revisão atual');
      const result=await repository.restore(id,revision,expected);
      console.log('Projeto restaurado. Nova revisão: '+result.revision);
      return;
    }
    case 'render': {
      await renderProject(requireArgument(args[0],'UUID do projeto'));
      return;
    }
    default:
      throw new Error('Comandos locais: sfx [list|<tipo> <UUID> <revisao> <frame> [volume]] | presets [categoria] | composition-example <preset> <destino.json> | service-info | production <id> [status|checkpoint|continue] | direction-template <id> <destino> | direct <id> <direcao.json> <revisao> | auto-direct <id> <revisao> | direction-report <id> | path | list | create "Título" | info <id> | show <id> | validate <id> | import <json> | apply <id> <ops.json> [revisao] | replace <id> <json> <revisao> | render <id>');
  }
}
main().catch(error=>{
  console.error(error instanceof Error?error.message:String(error));
  process.exitCode=1;
});
