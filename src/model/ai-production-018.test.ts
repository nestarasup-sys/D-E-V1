import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {productionSchema,compileProduction,resyncProduction} from './ai-production';
import {projectSchema} from './project';
import {wavFrames} from '../../apps/agent/src/narration';

const id=()=>randomUUID();
const media=(frames:number)=>({
  asset:{id:id(),name:'voz-'+frames+'.wav',kind:'audio' as const,mime:'audio/wav',
    url:'',durationFrames:frames,
    rights:{status:'unknown' as const,sourceUrl:'',creator:'',licenseName:'',attribution:'',notes:''}},
  frames,
});
function audio(frames:number){
  const a=media(frames);
  a.asset.url='http://127.0.0.1:4317/media/'+a.asset.id;
  return a;
}
const sample={
  format:'darkstudio-production',version:1,title:'Economia e trabalho',
  voice:{engine:'windows-sapi',voice:'',rate:1,pauseMs:350},
  beats:[{
    title:'Trabalhador acorda cedo',narration:'A cidade acorda cedo.',
    plannedFrames:120,purpose:'hook',motionPreset:'subtle-zoom',
    layers:[{kind:'text',name:'A rotina',text:'TODO DIA',x:180,y:160,width:800,height:200}],
    broll:{query:'pessoa indo trabalhar',description:'cidade brasileira',
      purpose:'contextualizar a rotina',provider:'pexels',
      licenseNote:'confirmar licença antes de publicar'},
  },{
    title:'Custo de vida',narration:'O dinheiro parece sumir.',
    plannedFrames:90,purpose:'context',motionPreset:'still',
    layers:[{kind:'character',name:'Trabalhador',x:350,y:180,width:440,height:650,
      behavior:'walk'}],
  }],
};
describe('Dark Studio v0.18: AI Production -> native editable project',()=>{
  it('accepts one AI-friendly JSON without UUIDs/Codex and validates required fields',()=>{
    const parsed=productionSchema.parse(sample);
    expect(parsed.beats[0].layers?.[0].kind).toBe('text');
    expect(productionSchema.safeParse({...sample,beats:[{title:'Sem narracao'}]}).success).toBe(false);
    expect(productionSchema.safeParse({...sample,beats:[{...sample.beats[0],narration:'<script>'}]}).success).toBe(true);
  });
  it('uses measured WAV frames, not the AI-estimated timeline, and keeps B-roll unresolved',()=>{
    const p=compileProduction(sample,[audio(52),audio(86)],id);
    expect(projectSchema.parse(p).id).toBe(p.id);
    expect(p.visualMode).toBe('shots');
    expect(p.scenes.map(s=>s.durationFrames)).toEqual([63,97]);
    expect(p.shots.map(s=>s.startFrame)).toEqual([0,63]);
    expect(p.captions.map(c=>[c.startFrame,c.endFrame])).toEqual([[0,52],[63,149]]);
    expect(p.clips.map(c=>c.durationFrames)).toEqual([52,86]);
    expect(p.shots[0].layers[0].kind).toBe('text');
    expect(p.shots[0].mediaPlan?.query).toBe('pessoa indo trabalhar');
    expect(p.shots[0].kind).toBe('graphic');
    expect(p.productionPlan?.segments).toHaveLength(2);
  });
  it('regenerates speech with updated durations, preserving editable shot and layer IDs',()=>{
    const p=compileProduction(sample,[audio(52),audio(86)],id);
    const first=p.shots[0].layers[0].id,shot=p.shots[0].id;
    const newer=resyncProduction(p,[audio(100),audio(56)],id);
    expect(newer.scenes.map(s=>s.durationFrames)).toEqual([111,67]);
    expect(newer.shots[0].id).toBe(shot);
    expect(newer.shots[0].layers[0].id).toBe(first);
    expect(newer.shots[1].startFrame).toBe(111);
    expect(newer.clips.filter(c=>c.lane==='narration')).toHaveLength(2);
    expect(newer.assets.some(a=>a.id===p.clips[0].assetId)).toBe(false);
    expect(projectSchema.parse(newer).scenes).toHaveLength(2);
  });
  it('rejects fake WAV data or incorrect sampling rate',()=>{
    expect(()=>wavFrames(Buffer.from('fake'))).toThrow(/WAV/);
    const header=Buffer.alloc(46);
    header.write('RIFF',0);header.writeUInt32LE(38,4);
    header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);
    header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);
    header.writeUInt32LE(16000,24);header.writeUInt16LE(32000,28);
    header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);
    header.write('data',36);header.writeUInt32LE(2,40);
    expect(wavFrames(header)).toBe(1);
  });
});
