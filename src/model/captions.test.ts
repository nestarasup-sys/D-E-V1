import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {parseSrt,exportSrt} from './captions';
import {starterProject,projectDuration} from './project';
import {applyOperations} from './operations';

const sample='1\r\n00:00:00,000 --> 00:00:01,500\r\nInício da narração.\r\n\r\n2\r\n00:00:01,500 --> 00:00:03,000\r\nPróximo trecho.\r\n';
describe('legendas sincronizadas',()=>{
  it('lê SRT e aplica em uma operação atômica',()=>{
    const cues=parseSrt(sample,30,projectDuration(starterProject),randomUUID);
    expect(cues).toHaveLength(2);
    expect(cues[1].startFrame).toBe(45);
    const next=applyOperations(starterProject,[{type:'replaceCaptions',captions:cues}]);
    expect(next.captions).toHaveLength(2);
    expect(exportSrt(next.captions,30)).toContain('00:00:01,500');
  });
  it('rejeita legendas sobrepostas',()=>{
    expect(()=>parseSrt('00:00:00,000 --> 00:00:02,000\nA\n\n00:00:01,000 --> 00:00:03,000\nB',30,200,randomUUID)).toThrow(/sobrepostas/);
  });
  it('rejeita timestamps inválidos e legendas fora do vídeo',()=>{
    expect(()=>parseSrt('00:00:08,000 --> 00:00:09,000\nMuito tarde',30,100,randomUUID)).toThrow();
    expect(()=>parseSrt('00:00:99,000 --> 00:00:03,000\nInválido',30,500,randomUUID)).toThrow();
  });
  it('não permite guardar legenda fora do projeto',()=>{
    const captions=[{id:randomUUID(),text:'Texto',startFrame:0,endFrame:99999}];
    expect(()=>applyOperations(starterProject,[{type:'replaceCaptions',captions}])).toThrow();
  });
});
