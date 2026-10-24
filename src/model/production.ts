import type {Project} from './project';
export type ProductionPhase='research'|'script'|'voice'|'captions'|'visual'|'qa'|'export';
export type PhaseStatus='pending'|'ready'|'review'|'proposed'|'completed';
export interface ProductionStep {
  id:ProductionPhase;
  title:string;
  status:PhaseStatus;
  explanation:string;
  nextAction:string;
}
export interface ProductionInputs {
  project:Project;
  availableNarration:boolean;
  pendingProposals:number;
  diagnosticErrors:number;
  diagnosticWarnings:number;
  completedRenders:number;
  interruptedRenders:number;
}
export interface ProductionOverview {
  projectId:string;
  revision:string;
  updatedAt:string;
  steps:ProductionStep[];
  nextAction:string;
  pendingProposals:number;
  completedRenders:number;
  interruptedRenders:number;
  proposedId?:string;
}
export function describeProduction(inputs:ProductionInputs):ProductionStep[] {
  const {project,availableNarration,pendingProposals,diagnosticErrors,
    diagnosticWarnings,completedRenders,interruptedRenders}=inputs;
  const research:PhaseStatus=project.evidence.length===0?'pending':
    project.evidence.every(e=>e.reviewStatus==='verified')?'completed':'review';
  const customScript=project.scenes.some(s=>
    s.title.trim().length>0&&!['NOVO DOCUMENTÁRIO','QUEM CONTROLA A INFORMAÇÃO?'].includes(s.title.trim()));
  const voice=project.clips.some(c=>c.lane==='narration')&&availableNarration;
  const visuals=project.visualMode==='shots'&&project.shots.length>0;
  return [
    {id:'research',title:'Pesquisa e fontes',status:research,
      explanation:!project.evidence.length?'Nenhuma evidência registrada.':
        project.evidence.filter(e=>e.reviewStatus!=='verified').length+' evidências pendentes/rejeitadas.',
      nextAction:research==='completed'?'Fontes cadastradas foram marcadas como conferidas; revise alegações no vídeo.':
        'Codex deve cadastrar fontes, ano, região e alegações. Você confere a veracidade.'},
    {id:'script',title:'Roteiro e capítulos',status:customScript?'completed':'pending',
      explanation:customScript?project.scenes.length+' cenas salvas no projeto.':'Projeto ainda parece um modelo inicial.',
      nextAction:customScript?'Revise a narrativa.':'Codex deve estruturar roteiro/cenas e salvar no disco.'},
    {id:'voice',title:'Narração local',status:voice?'ready':'pending',
      explanation:voice?'Trilha de voz presente e arquivo encontrado.':'Falta narração local válida e acessível.',
      nextAction:voice?'Ouça a pronúncia e a clareza.':'Codex deve gerar/importar e validar o áudio real.'},
    {id:'captions',title:'Legendas e sincronização',
      status:project.captions.length?'review':'pending',
      explanation:project.captions.length+' trechos registrados. Duração não comprova alinhamento semântico.',
      nextAction:project.captions.length?'Ouça e confira trechos representativos.':'Alinhe as legendas ao WAV real.'},
    {id:'visual',title:'Direção visual',
      status:pendingProposals?'proposed':visuals?'ready':'pending',
      explanation:pendingProposals?
        pendingProposals+' proposta(s) no disco aguardando decisão. O projeto salvo não foi alterado.':
        visuals?project.shots.length+' planos no projeto salvo.':'Não há montagem aprovada nem proposta pendente.',
      nextAction:pendingProposals?'Abra Revisar Codex na página inicial e decida a proposta.':
        visuals?'Revise os cortes na timeline.':'Codex pode executar production continue para preparar uma proposta ilustrativa.'},
    {id:'qa',title:'Qualidade e fontes',status:diagnosticErrors?'pending':'review',
      explanation:diagnosticErrors+' erros e '+diagnosticWarnings+' alertas técnicos. A revisão humana ainda é necessária.',
      nextAction:'Confira fontes, contraste, pronúncia, direitos e preview com áudio antes de publicar.'},
    {id:'export',title:'MP4 completo',status:completedRenders?'completed':'pending',
      explanation:completedRenders?completedRenders+' MP4(s) concluídos registrados.':
        interruptedRenders?interruptedRenders+' render(s) interrompidos, com histórico preservado.':
          'Nenhuma exportação concluída registrada para este projeto.',
      nextAction:completedRenders?'Assista ao arquivo COMPLETO e confira o áudio.':
        'Depois da aprovação editorial, exporte o projeto inteiro; um teste de 30 s não conta como episódio pronto.'},
  ];
}
export function nextProductionAction(steps:ProductionStep[]):string{
  const waitingProposal=steps.find(s=>s.id==='visual'&&s.status==='proposed');
  if(waitingProposal)return waitingProposal.nextAction;
  const priority:ProductionPhase[]=['research','script','voice','captions','visual','qa','export'];
  for(const phase of priority){
    const step=steps.find(s=>s.id===phase)!;
    if(step.status==='pending'||step.status==='proposed')return step.nextAction;
  }
  return 'Revise o episódio completo, inclusive fatos, mídia e licenças, antes de publicar.';
}
