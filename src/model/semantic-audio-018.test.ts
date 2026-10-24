import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {alignSpeechProgress,matchSpokenWord} from './speech-alignment';
import {makeMusicWave} from '../../apps/agent/src/soundtrack';
import {scoreBroll} from './broll-relevance';
import {compileProduction,resyncProduction,productionSchema,type ProducedSound} from './ai-production';

const id=()=>randomUUID();
function audio(frames:number,text:string){
  const assetId=id();const spoken=text.match(/\S+/g)||[];
  const times=spoken.map((word,i)=>{
    const from=text.indexOf(word,i===0?0:text.indexOf(spoken[i-1])+spoken[i-1].length);
    return from+'\t'+word.length+'\t'+(200+i*400);
  }).join('\n');
  return {asset:{id:assetId,name:'locucao.wav',kind:'audio' as const,mime:'audio/wav',
    url:'http://127.0.0.1:4317/media/'+assetId,durationFrames:frames,
    rights:{status:'unknown' as const,sourceUrl:'',creator:'',licenseName:'',attribution:'',notes:''}},
    frames,alignment:alignSpeechProgress(text,times,frames)};
}
describe('v0.18 real word timing and semantic cues',()=>{
  it('converts native audio positions to 30-fps words without proportional guesses',()=>{
    const text='O salário chegou hoje';
    const report=alignSpeechProgress(text,'0\t1\t0\n2\t7\t430\n10\t6\t890\n17\t4\t1350',60);
    expect(report.status).toBe('aligned');
    expect(report.words.map(w=>w.startFrame)).toEqual([0,13,27,41]);
    expect(matchSpokenWord(report.words,'SALÁRIO')).toBe(13);
    expect(matchSpokenWord(report.words,'inexistente')).toBeNull();
  });
  it('refuses missing and zeroed acoustic timestamps rather than inventing word positions',()=>{
    expect(alignSpeechProgress('O salário chegou','',60).words).toEqual([]);
    expect(alignSpeechProgress('O salário chegou','0\t1\t0\n2\t7\t0\n10\t6\t0',60).status)
      .toBe('unavailable');
  });
  it('produces real procedural PCM music with correct WAV structure',()=>{
    const wav=makeMusicWave(60,'tension');
    expect(wav.toString('ascii',0,4)).toBe('RIFF');
    expect(wav.toString('ascii',8,12)).toBe('WAVE');
    expect(wav.readUInt32LE(40)).toBe(64000);
  });
  it('compiles word-triggered animation and a semantic SFX at the acoustic timestamp',()=>{
    const text='O salário chegou hoje';
    const parsed=productionSchema.parse({format:'darkstudio-production',version:1,
      title:'Teste acústico',voice:{engine:'windows-sapi',rate:1,pauseMs:200,voice:''},
      soundDesign:'explicit',
      beats:[{title:'Trabalho',plannedFrames:90,purpose:'context',narration:text,
        layers:[{kind:'text',name:'Salário',x:70,y:100,width:900,height:210,
          text:'SALÁRIO',wordCue:{word:'salário'}}],
        soundEffects:[{sound:'document-click',word:'salário'}],
      }]});
    const speech=audio(60,text);
    expect(speech.alignment.status).toBe('aligned');
    const fxId=id();
    const sound:ProducedSound={beatIndex:0,lane:'sfx',word:'salário',occurrence:1,
      offsetFrames:0,frames:14,volume:.4,asset:{
        id:fxId,name:'click.wav',kind:'audio',mime:'audio/wav',
        url:'http://127.0.0.1:4317/media/'+fxId,durationFrames:14,
        rights:{status:'cleared',sourceUrl:'',creator:'Dark Studio',
          licenseName:'Dark Studio Procedural Audio',attribution:'',notes:''},
      }};
    const project=compileProduction(parsed,[speech],id,[sound]);
    expect(project.captions[0].words).toHaveLength(4);
    expect(project.shots[0].layers[0].cueWord).toBe('salário');
    expect(project.shots[0].layers[0].cueCaptionId).toBe(project.captions[0].id);
    expect(project.clips.find(c=>c.lane==='sfx')?.startFrame).toBe(
      project.captions[0].words.find(w=>w.text.toLowerCase().includes('salário'))?.startFrame);
    const next=resyncProduction(project,[audio(85,text)],id,parsed,[sound]);
    expect(next.captions[0].words).toHaveLength(4);
    expect(next.shots[0].layers[0].id).toBe(project.shots[0].layers[0].id);
  });
  it('chooses B-roll only when title, duration, resolution and rights metadata support it',()=>{
    const good=scoreBroll({query:'worker walking city',
      page:'https://www.pexels.com/video/worker-walking-city-123456/',
      seconds:15,width:1920,height:1080,creator:'Photographer',
      source:'pexels',licenseUrl:'https://www.pexels.com/license/'},8);
    expect(good.eligible).toBe(true);
    const bad=scoreBroll({query:'worker walking city',
      page:'https://www.pexels.com/video/ocean-waves-123456/',
      seconds:2,width:320,height:180,creator:'',
      source:'pexels',licenseUrl:'https://www.pexels.com/license/'},8);
    expect(bad.eligible).toBe(false);
    expect(bad.reasons.length).toBeGreaterThan(1);
  });
});
