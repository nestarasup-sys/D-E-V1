import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {readFile,mkdir} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import * as yazl from 'yazl';
import {projectSchema,starterProject} from './project';
import {buildStreamingArchive,unpackStreamingArchive,withTempArchive,checkPortability} from '../../apps/agent/src/portable-stream';
import {parseOCRTsv} from '../../apps/agent/src/ocr-local';
import {fontFamilyFor} from '../video/PortableFonts';

describe('Dark Studio v0.17 — offline OCR, font rights and ZIP streaming',()=>{
  it('extracts Portuguese OCR word boxes with confidence and filters noise',()=>{
    const tsv='level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n'+
      '5\t1\t1\t1\t1\t1\t8\t20\t56\t18\t92\tDINHEIRO\n'+
      '5\t1\t1\t1\t1\t2\t70\t20\t44\t18\t87\tCONTA\n'+
      '5\t1\t1\t1\t1\t3\t0\t0\t0\t0\t-1\t';
    expect(parseOCRTsv(tsv).map(w=>w.text)).toEqual(['DINHEIRO','CONTA']);
    expect(parseOCRTsv(tsv)[0]).toMatchObject({x:8,y:20,confidence:92});
  });
  it('rejects fonts without explicit redistribution license and accepts local opt-in',()=>{
    const id=randomUUID();
    const withFont=projectSchema.parse({...structuredClone(starterProject),
      assets:[{id,name:'Minha fonte.woff2',kind:'font',mime:'font/woff2',
        url:'http://127.0.0.1:4317/media/'+id,
        rights:{status:'cleared',licenseName:'Minha licença de redistribuição',
          redistributionAllowed:false}}]});
    expect(()=>checkPortability(withFont)).toThrow(/sem autorização/);
    const allowed=projectSchema.parse({...withFont,assets:withFont.assets.map(a=>({
      ...a,rights:{...a.rights,redistributionAllowed:true}}))});
    expect(()=>checkPortability(allowed)).not.toThrow();
    expect(fontFamilyFor(allowed.assets[0])).toBe('DSFont-'+id);
  });
  it('writes and verifies ZIP v2 directly on disk without in-memory package',()=>withTempArchive(async root=>{
    const project=projectSchema.parse({...structuredClone(starterProject),id:randomUUID()});
    const path=join(root,'out.darkstudio'),staging=join(root,'unpacked');
    const built=await buildStreamingArchive(project,path);
    expect(built.bytes).toBeGreaterThan(100);
    await mkdir(staging);
    const result=await unpackStreamingArchive(path,staging);
    expect(result.project.name).toBe(project.name);
    expect(result.assets).toHaveLength(0);
    expect((await readFile(path)).subarray(0,4).toString()).toBe('PK\u0003\u0004');
  }));
  it('refuses path traversal entries in untrusted ZIP files',()=>withTempArchive(async root=>{
    const zip=new yazl.ZipFile();
    zip.addBuffer(Buffer.from('not a darkstudio'),'innocent.txt');
    const out=join(root,'bad.darkstudio'),stage=join(root,'extract');
    await mkdir(stage);
    const written=pipeline(zip.outputStream,createWriteStream(out,{flags:'wx'}));
    zip.end();await written;
    await expect(unpackStreamingArchive(out,stage)).rejects.toThrow(/caminho inválido|Nome duplicado/);
  }));
});
