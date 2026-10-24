import {describe,it,expect} from 'vitest';
import {isPending,processIsAlive} from './job-registry';
describe('histórico local de renders',()=>{
  it('marca como pendentes somente renders em fila, bundle e execução',()=>{
    for(const state of ['queued','bundling','rendering'] as const)
      expect(isPending({id:'teste',state,progress:0})).toBe(true);
    for(const state of ['completed','failed','interrupted'] as const)
      expect(isPending({id:'teste',state,progress:0})).toBe(false);
  });
  it('reconhece processo local e rejeita PID inválido',()=>{
    expect(processIsAlive(process.pid)).toBe(true);
    expect(processIsAlive(0)).toBe(false);
    expect(processIsAlive(undefined)).toBe(false);
  });
});
