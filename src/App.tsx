import {useCallback,useEffect,useRef,useState,type ChangeEvent} from 'react';
import {Editor} from './Editor';
import {ProjectHistory} from './components/ProjectHistory';
import {ProposalReview} from './components/ProposalReview';
import {ProjectDiagnostics} from './components/ProjectDiagnostics';
import {ProductionPanel} from './components/ProductionPanel';
import {useEditor} from './model/store';
import {parseProject} from './model/project';
import {ensureServiceCompatible} from './services/service-guard';
import type {ServiceHealth} from './model/service-contract';
import {
  ApiError, listProjects, getProject, createProject, createPilotProject, importProject,
  saveProject, duplicateProject, archiveProject,
  type ProjectSummary, type ProjectRecord, type InvalidProject,
} from './services/projects';

const asError=(e:unknown)=>e instanceof Error?e.message:'Erro desconhecido';
function formatDuration(frames:number) {
  const minutes=Math.floor(frames/30/60);
  const seconds=Math.floor(frames/30)%60;
  return String(minutes)+':'+String(seconds).padStart(2,'0');
}

function ProjectSession({initial,onClose}: {initial:ProjectRecord;onClose:()=>void}) {
  const project=useEditor(s=>s.project);
  const id=initial.project.id;
  const baseline=useRef(JSON.stringify(initial.project));
  const revision=useRef(initial.revision);
  const saving=useRef(false);
  const conflicted=useRef(false);
  const [sync,setSync]=useState('Salvo no computador');
  const [reloadAvailable,setReloadAvailable]=useState(false);

  const save=useCallback(async ():Promise<boolean>=>{
    if(saving.current||conflicted.current)return false;
    const current=useEditor.getState().project;
    const raw=JSON.stringify(current);
    if(raw===baseline.current)return true;
    saving.current=true;
    let succeeded=false;
    setSync('Salvando...');
    try{
      const updated=await saveProject(current,revision.current);
      baseline.current=JSON.stringify(updated.project);
      revision.current=updated.revision;
      setSync('Salvo no computador');
      succeeded=true;
      return true;
    }catch(e){
      if(e instanceof ApiError && e.status===409){
        conflicted.current=true;
        setReloadAvailable(true);
        setSync('Conflito: Codex alterou o arquivo. Exporte seu JSON antes de recarregar.');
      }else setSync('Erro ao salvar: '+asError(e));
      return false;
    }finally{
      saving.current=false;
      // Se houve nova digitação enquanto salvava, não deixe a versão nova sem persistir.
      if(succeeded && !conflicted.current && JSON.stringify(useEditor.getState().project)!==baseline.current){
        setTimeout(()=>{void save();},300);
      }
    }
  },[]);

  useEffect(()=>{
    if(JSON.stringify(project)===baseline.current||conflicted.current)return;
    const timer=setTimeout(()=>{void save();},900);
    return()=>clearTimeout(timer);
  },[project,save]);

  useEffect(()=>{
    let cancelled=false;
    const timer=setInterval(async()=>{
      if(cancelled||saving.current||conflicted.current)return;
      if(JSON.stringify(useEditor.getState().project)!==baseline.current)return;
      try{
        const latest=await getProject(id);
        if(cancelled||saving.current||conflicted.current)return;
        if(JSON.stringify(useEditor.getState().project)!==baseline.current)return;
        if(latest.revision!==revision.current){
          revision.current=latest.revision;
          baseline.current=JSON.stringify(latest.project);
          useEditor.getState().openProject(latest.project);
          setSync('Projeto atualizado a partir do disco (edição externa)');
        }
      }catch(e){if(!cancelled)setSync('Falha ao verificar arquivo: '+asError(e));}
    },3500);
    return()=>{cancelled=true;clearInterval(timer);};
  },[id]);

  const reload=async()=>{
    if(!window.confirm('Recarregar a versão do disco? Alterações locais ainda não salvas serão descartadas. Exporte o JSON antes, se quiser preservá-las.'))return;
    try{
      const latest=await getProject(id);
      revision.current=latest.revision;
      baseline.current=JSON.stringify(latest.project);
      conflicted.current=false;
      setReloadAvailable(false);
      useEditor.getState().openProject(latest.project);
      setSync('Recarregado do computador');
    }catch(e){setSync('Falha ao recarregar: '+asError(e));}
  };
  const leave=async()=>{
    if(JSON.stringify(useEditor.getState().project)===baseline.current){onClose();return;}
    const success=await save();
    if(success)onClose();
  };
  return <Editor onHome={()=>void leave()} syncStatus={sync} onReload={reloadAvailable?()=>void reload():undefined}/>;
}

export function App(){
  const [entries,setEntries]=useState<ProjectSummary[]>([]);
  const [service,setService]=useState<ServiceHealth|null>(null);
  const [invalidProjects,setInvalidProjects]=useState<InvalidProject[]>([]);
  const [historyId,setHistoryId]=useState<string|null>(null);
  const [proposalsId,setProposalsId]=useState<string|null>(null);
  const [diagnosticsId,setDiagnosticsId]=useState<string|null>(null);
  const [productionId,setProductionId]=useState<string|null>(null);
  const [directory,setDirectory]=useState('');
  const [active,setActive]=useState<ProjectRecord|null>(null);
  const [busy,setBusy]=useState(false);
  const [newName,setNewName]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [loaded,setLoaded]=useState(false);
  const importRef=useRef<HTMLInputElement>(null);

  const refresh=useCallback(async()=>{
    try{
      const currentService=await ensureServiceCompatible();
      const data=await listProjects();
      setService(currentService);
      setInvalidProjects(data.invalidProjects);
      setEntries(data.projects);
      setDirectory(data.directory);
      setLoaded(true);
      setError('');
    }catch(e){setService(null);setError(asError(e));setLoaded(true);}
  },[]);
  useEffect(()=>{
    if(active)return;
    void refresh();
    const interval=setInterval(()=>void refresh(),5000);
    return()=>clearInterval(interval);
  },[refresh,active]);

  async function act(job:()=>Promise<void>){
    setBusy(true);setError('');
    try{await job();await refresh();}catch(e){setError(asError(e));}
    finally{setBusy(false);}
  }
  async function open(id:string){
    await act(async()=>{
      const loadedProject=await getProject(id);
      useEditor.getState().openProject(loadedProject.project);
      setActive(loadedProject);
    });
  }
  async function create(){
    if(!newName.trim())return;
    await act(async()=>{
      const created=await createProject(newName);
      setNewName('');
      useEditor.getState().openProject(created.project);
      setActive(created);
    });
  }
  async function createPilot(){
    if(!window.confirm('Criar um novo projeto piloto de 30 segundos, com voz sintética instalada no seu Windows, 8 planos animados e legendas locais? O roteiro é apenas demonstrativo.'))return;
    await act(async()=>{
      const pilot=await createPilotProject();
      useEditor.getState().openProject(pilot.project);
      setActive(pilot);
    });
  }
  async function importFile(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file)return;
    await act(async()=>{
      const project=parseProject(JSON.parse(await file.text()));
      const existing=entries.find(p=>p.id===project.id);
      if(existing){
        if(!window.confirm('O JSON tem o mesmo ID de '+existing.name+'. Atualizar este projeto? O Dark Studio fará backup da versão anterior.'))return;
        const current=await getProject(project.id);
        const saved=await saveProject(project,current.revision);
        useEditor.getState().openProject(saved.project);
        setActive(saved);
        return;
      }
      const created=await importProject(project);
      useEditor.getState().openProject(created.project);
      setActive(created);
    });
  }
  function legacy(){
    try{
      const raw=localStorage.getItem('dark-studio:project:v2')??localStorage.getItem('dark-studio:project:v1');
      return raw?parseProject(JSON.parse(raw)):null;
    }catch{return null;}
  }
  function migrate(){
    void act(async()=>{
      const project=legacy();
      if(!project)throw new Error('Não encontramos um projeto v0.1/v0.2 salvo neste navegador.');
      const created=await importProject(project);
      useEditor.getState().openProject(created.project);
      setActive(created);
    });
  }

  async function copyCodexInstruction(entry:ProjectSummary){
    const file=(directory||'%USERPROFILE%\\DarkStudio\\projects')+'\\'+entry.id+'\\project.json';
    const instructions=[
      'Trabalhe como Codex LOCAL no ChatGPT Desktop (Windows). NÃO use GitHub, cloud sync ou repositórios remotos para os dados deste documentário.',
      'Projeto Dark Studio: '+entry.name,
      'ID: '+entry.id,
      'Arquivo local: '+file,
      'Você precisa de acesso local autorizado a esta pasta e ao repositório de código D-E-V1.',
      'Leia AGENTS.md, docs/VISUAL_IDENTITY.md e docs/CODEX_DIRECTOR.md. Use a linguagem arquivo investigativo + gráficos editoriais.',
      'No diretório do código D-E-V1, execute npm run project -- info '+entry.id+' para conhecer a revisão atual.',
      'Para dirigir TODO o episódio: execute npm run project -- direction-template '+entry.id+' <arquivo-direcao.json>, complete o storyboard a partir de roteiro, narração e fontes e faça npm run project -- direct '+entry.id+' <arquivo-direcao.json> <revisao>. Se for apenas um primeiro passe ilustrativo, use npm run project -- auto-direct '+entry.id+' <revisao>. Não aprove nem aplique sem minha revisão no Dark Studio.',
      'Planeje mudanças visuais em geral a cada 2–5 segundos, varie dossiê/documento/gráfico/comparação/mapa esquemático, e sincronize revelações com a voz. Preserve narração, legendas, mídia, IDs e projetos anteriores; não invente números, provas, fotos, manchetes nem licenças. Mantenha as fontes pendentes até conferência humana.',
      'Depois de aprovar a proposta no editor, execute npm run project -- direction-report '+entry.id+' e npm run project -- doctor '+entry.id+'. Mostre o que precisa de revisão editorial antes do MP4.',
      'Se for solicitado exportar MP4, abra npm run dev:service e use npm run project -- render '+entry.id+'.'
    ].join('\n');
    try{
      if(!navigator.clipboard)throw new Error('Área de transferência indisponível neste ambiente.');
      await navigator.clipboard.writeText(instructions);
      setNotice('Instruções locais de '+entry.name+' copiadas para usar no Codex.');
      setError('');
    }catch(e){setError('Falha ao copiar: '+asError(e));}
  }

  if(active)return <ProjectSession key={active.project.id} initial={active} onClose={()=>{setActive(null);void refresh();}}/>;
  return <main className="homeScreen">
    <header className="homeHeader">
      <div className="brand"><span className="brandmark">D</span><div><strong>DARK STUDIO</strong><small>ESTÚDIO DE DOCUMENTÁRIOS</small></div></div>
      <span className="homeVersion">PROJETOS · WINDOWS · v0.14
        {service?' · SERVIÇO COMPATÍVEL '+service.appVersion:' · VERIFIQUE O SERVIÇO'}
      </span>
    </header>
    <section className="homeHero">
      <p className="homeEyebrow">SEU ESTÚDIO INVESTIGATIVO</p>
      <h1>Seus projetos, em um só lugar.</h1>
      <p>Crie um episódio, peça ao Codex local uma direção investigativa completa e revise os planos, movimentos, fontes e a narração no mesmo computador. Nenhum chat ou sincronização com GitHub é necessário.</p>
      <div className="homeCreate">
        <input aria-label="Nome do novo projeto" placeholder="Nome do novo documentário" maxLength={120} value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void create();}}/>
        <button className="primary" disabled={busy||!newName.trim()} onClick={()=>void create()}>+ Criar projeto</button>
        <button disabled={busy} onClick={()=>importRef.current?.click()}>Importar JSON</button>
        <button disabled={busy} onClick={()=>void createPilot()}>▶ Criar piloto audiovisual 30s</button>
        <input ref={importRef} className="hidden" type="file" accept=".json,application/json" onChange={e=>void importFile(e)}/>
      </div>
    </section>
    <section className="homeProjects">
      <div className="homeSectionTop"><h2>Projetos recentes</h2><button onClick={()=>void refresh()}>↻ Atualizar</button></div>
      {error && <p role="alert" className="warning">{error}</p>}
      {service&&<p className="homeNote" role="status">
        Serviço local {service.appVersion}, iniciado {new Date(service.startedAt).toLocaleString('pt-BR')}
        {' · '}PID {service.pid}{' · '}Projetos em {service.projectsDirectory}
      </p>}
      {invalidProjects.length>0&&<div role="alert" className="warning">
        <strong>{invalidProjects.length} projeto(s) com JSON incompatível ou incompleto no disco.</strong>
        {' '}Eles não foram apagados. O Codex deve corrigir o esquema ou verificar qual versão criou esses arquivos.
        {invalidProjects.slice(0,4).map(project=><p key={project.id}>
          {project.id.slice(0,8)}: {project.error}
        </p>)}
      </div>}
      {notice && <p role="status" className="syncSuccess">{notice}</p>}
      {!loaded && <p>Consultando projetos locais...</p>}
      {loaded && entries.length===0 && <div className="homeEmpty"><strong>Nenhum projeto nesta pasta.</strong><p>Crie o primeiro documentário ou importe um projeto JSON. O Codex local também pode criar arquivos de projeto aqui.</p></div>}
      <div className="projectGrid">{entries.map(entry=><article className="projectTile" key={entry.id}>
        <div className="projectArt"><span>D</span><small>{entry.sceneCount} CENA{entry.sceneCount===1?'':'S'}</small></div>
        <div className="projectInfo"><h3 title={entry.name}>{entry.name}</h3>
        <p>{formatDuration(entry.durationFrames)} · {entry.assetCount} arquivos
          {' · '}{new Date(entry.modifiedAt).toLocaleDateString('pt-BR')}</p>
          {(entry.pendingProposals??0)>0&&<p className="homeNote" role="status">
            {entry.pendingProposals} proposta(s) local(is) aguardando revisão ou descarte.
            O projeto salvo permanece inalterado até sua aprovação.
          </p>}
        <div className="projectActions"><button className="primary" disabled={busy} onClick={()=>void open(entry.id)}>Abrir editor →</button><button disabled={busy} onClick={()=>void act(async()=>{await duplicateProject(entry.id);})}>Duplicar</button><button disabled={busy} onClick={()=>void copyCodexInstruction(entry)}>Copiar instrução Codex</button><button disabled={busy} onClick={()=>setHistoryId(entry.id)}>Versões</button><button disabled={busy} onClick={()=>setProposalsId(entry.id)}>Revisar Codex</button><button disabled={busy} onClick={()=>setDiagnosticsId(entry.id)}>Diagnóstico</button><button disabled={busy} onClick={()=>setProductionId(entry.id)}>Produção</button><button disabled={busy} onClick={()=>{if(window.confirm('Arquivar projeto? Ele será movido para _archived, sem apagar a mídia.'))void act(async()=>{await archiveProject(entry.id);});}}>Arquivar</button></div>
        </div>
      </article>)}</div>
      <div className="workspaceInfo">
        <strong>Codex local + Dark Studio: os mesmos arquivos no Windows</strong>
        <p>Os projetos são armazenados apenas em <code>{directory||'%USERPROFILE%\\DarkStudio\\projects'}</code>. No Codex do aplicativo ChatGPT, selecione a execução <b>Local / Este computador</b> e conceda acesso à pasta necessária. Ele pode criar cenas e alterar o <code>project.json</code> por comandos validados. O editor detecta as mudanças sem passar pelo GitHub.</p>
        <div className="projectActions">
          <button onClick={()=>{if(directory&&navigator.clipboard)void navigator.clipboard.writeText(directory);}}>Copiar pasta de projetos</button>
          <button onClick={migrate}>Migrar projeto antigo</button>
        </div>
        <p className="homeNote">GitHub é usado somente para o código do Dark Studio; projetos, roteiros e mídia não são publicados. O Codex local precisa de permissão de leitura/gravação para a pasta de projetos. O conteúdo utilizado pela IA pode ser processado pelos serviços do ChatGPT conforme o modo e as configurações da conta.</p>
      </div>
    </section>
    {historyId&&<ProjectHistory id={historyId} onClose={()=>setHistoryId(null)} onRestored={()=>{void refresh();}}/>}
    {proposalsId&&<ProposalReview projectId={proposalsId} onClose={()=>setProposalsId(null)} onChanged={()=>{void refresh();}}/>}
    {diagnosticsId&&<ProjectDiagnostics projectId={diagnosticsId} onClose={()=>setDiagnosticsId(null)}/>}
    {productionId&&<ProductionPanel projectId={productionId} onClose={()=>setProductionId(null)} onChanged={()=>{void refresh();}}/>}
  </main>;
}
