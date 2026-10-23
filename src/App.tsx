import {useCallback,useEffect,useRef,useState,type ChangeEvent} from 'react';
import {Editor} from './Editor';
import {PrivateSyncPanel} from './components/PrivateSyncPanel';
import {useEditor} from './model/store';
import {parseProject} from './model/project';
import {
  ApiError, listProjects, getProject, createProject, importProject,
  saveProject, duplicateProject, archiveProject,
  type ProjectSummary, type ProjectRecord,
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
    setSync('Salvando...');
    try{
      const updated=await saveProject(current,revision.current);
      baseline.current=JSON.stringify(updated.project);
      revision.current=updated.revision;
      setSync('Salvo no computador');
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
      if(!conflicted.current && JSON.stringify(useEditor.getState().project)!==baseline.current){
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
  const [directory,setDirectory]=useState('');
  const [active,setActive]=useState<ProjectRecord|null>(null);
  const [busy,setBusy]=useState(false);
  const [newName,setNewName]=useState('');
  const [error,setError]=useState('');
  const [loaded,setLoaded]=useState(false);
  const importRef=useRef<HTMLInputElement>(null);

  const refresh=useCallback(async()=>{
    try{
      const data=await listProjects();
      setEntries(data.projects);
      setDirectory(data.directory);
      setLoaded(true);
      setError('');
    }catch(e){setError(asError(e));setLoaded(true);}
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

  if(active)return <ProjectSession key={active.project.id} initial={active} onClose={()=>{setActive(null);void refresh();}}/>;
  return <main className="homeScreen">
    <header className="homeHeader">
      <div className="brand"><span className="brandmark">D</span><div><strong>DARK STUDIO</strong><small>ESTÚDIO DE DOCUMENTÁRIOS</small></div></div>
      <span className="homeVersion">PROJETOS · WINDOWS · v0.5</span>
    </header>
    <section className="homeHero">
      <p className="homeEyebrow">SEU ESTÚDIO INVESTIGATIVO</p>
      <h1>Seus projetos, em um só lugar.</h1>
      <p>Crie um documentário, continue uma edição ou abra um projeto gerado pelo Codex externo. Sem chat de IA dentro do editor.</p>
      <div className="homeCreate">
        <input aria-label="Nome do novo projeto" placeholder="Nome do novo documentário" maxLength={120} value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void create();}}/>
        <button className="primary" disabled={busy||!newName.trim()} onClick={()=>void create()}>+ Criar projeto</button>
        <button disabled={busy} onClick={()=>importRef.current?.click()}>Importar JSON</button>
        <input ref={importRef} className="hidden" type="file" accept=".json,application/json" onChange={e=>void importFile(e)}/>
      </div>
    </section>
    <section className="homeProjects">
      <div className="homeSectionTop"><h2>Projetos recentes</h2><button onClick={()=>void refresh()}>↻ Atualizar</button></div>
      {error && <p role="alert" className="warning">{error}</p>}
      {!loaded && <p>Consultando projetos locais...</p>}
      {loaded && entries.length===0 && <div className="homeEmpty"><strong>Nenhum projeto nesta pasta.</strong><p>Crie o primeiro documentário ou importe um projeto JSON. O Codex local também pode criar arquivos de projeto aqui.</p></div>}
      <div className="projectGrid">{entries.map(entry=><article className="projectTile" key={entry.id}>
        <div className="projectArt"><span>D</span><small>{entry.sceneCount} CENA{entry.sceneCount===1?'':'S'}</small></div>
        <div className="projectInfo"><h3 title={entry.name}>{entry.name}</h3>
        <p>{formatDuration(entry.durationFrames)} · {entry.assetCount} arquivos · {new Date(entry.modifiedAt).toLocaleDateString('pt-BR')}</p>
        <div className="projectActions"><button className="primary" disabled={busy} onClick={()=>void open(entry.id)}>Abrir editor →</button><button disabled={busy} onClick={()=>void act(async()=>{await duplicateProject(entry.id);})}>Duplicar</button><button disabled={busy} onClick={()=>{if(window.confirm('Arquivar projeto? Ele será movido para _archived, sem apagar a mídia.'))void act(async()=>{await archiveProject(entry.id);});}}>Arquivar</button></div>
        </div>
      </article>)}</div>
      <PrivateSyncPanel projects={entries} refresh={()=>{void refresh();}}/>
      <div className="workspaceInfo">
        <strong>Integração com Codex do ChatGPT (fora do editor)</strong>
        <p>Projetos locais ficam em <code>{directory||'%USERPROFILE%\\DarkStudio\\projects'}</code>. O Codex executado no PC pode modificar o arquivo <code>project.json</code>. O editor detecta mudanças externas quando não há edição manual pendente.</p>
        <div className="projectActions">
          <button onClick={()=>{if(directory&&navigator.clipboard)void navigator.clipboard.writeText(directory);}}>Copiar pasta de projetos</button>
          <button onClick={migrate}>Migrar projeto antigo</button>
        </div>
        <p className="homeNote">Codex em nuvem no ChatGPT não acessa automaticamente os arquivos do Windows. Para uso remoto, importe/compartilhe projetos deliberadamente ou configure uma sincronização autorizada. Nada é enviado ao GitHub automaticamente.</p>
      </div>
    </section>
  </main>;
}
