import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {buildPilotProject} from './pilot';
import {parseProject} from './project';
import {applyOperations} from './operations';

describe('legendas opcionais com destaque por palavra',()=>{
  it('aceita alinhamento explícito e preserva narrador/timeline',()=>{
    const original=buildPilotProject({newId:randomUUID});
    const c=original.captions[0];
    const words=[
      {text:'Toda',startFrame:c.startFrame,endFrame:c.startFrame+12},
      {text:'história',startFrame:c.startFrame+12,endFrame:c.startFrame+29},
    ];
    const next=applyOperations(original,[{type:'updateCaption',captionId:c.id,changes:{words}}]);
    expect(next.captions[0].words).toEqual(words);
    expect(next.shots).toEqual(original.shots);
    expect(next.clips).toEqual(original.clips);
  });
  it('rejeita tempos que saem da legenda e palavras sobrepostas',()=>{
    const project=buildPilotProject({newId:randomUUID});
    const c=project.captions[0];
    expect(()=>parseProject({...project,captions:[{
      ...c,words:[{text:'erro',startFrame:c.startFrame,endFrame:c.endFrame+1}],
    },...project.captions.slice(1)]})).toThrow();
    expect(()=>parseProject({...project,captions:[{
      ...c,words:[
        {text:'um',startFrame:c.startFrame,endFrame:c.startFrame+16},
        {text:'dois',startFrame:c.startFrame+9,endFrame:c.startFrame+22},
      ],
    },...project.captions.slice(1)]})).toThrow();
  });
  it('continuam válidas legendas antigas sem words[]',()=>{
    const project=buildPilotProject({newId:randomUUID});
    const previous=structuredClone(project);
    previous.captions.forEach(c=>{delete (c as unknown as Record<string,unknown>).words;});
    expect(parseProject(previous).captions.every(c=>c.words.length===0)).toBe(true);
  });
});
