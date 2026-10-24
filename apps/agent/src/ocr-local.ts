/** Offline Portuguese OCR. The traineddata ships in npm; no CDN, web or external process. */
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
import {existsSync} from 'node:fs';
import {createWorker,type Worker} from 'tesseract.js';

export interface OCRWord {text:string;confidence:number;x:number;y:number;width:number;height:number}
export function parseOCRTsv(tsv:string):OCRWord[]{
  const lines=tsv.split(/\r?\n/);if(!lines.length)return [];
  const head=lines[0].split('\t'),idx=(name:string)=>head.indexOf(name);
  const fields=['level','left','top','width','height','conf','text'];
  if(fields.some(x=>idx(x)<0))return [];
  return lines.slice(1).flatMap(row=>{
    const cells=row.split('\t');
    if(cells[idx('level')]!=='5')return [];
    const text=cells.slice(idx('text')).join('\t').trim(),confidence=Number(cells[idx('conf')]);
    const x=Number(cells[idx('left')]),y=Number(cells[idx('top')]);
    const width=Number(cells[idx('width')]),height=Number(cells[idx('height')]);
    if(!text||!Number.isFinite(confidence)||confidence<15||
      ![x,y,width,height].every(Number.isFinite)||width<=0||height<=0)return [];
    return [{text:text.slice(0,200),confidence,x,y,width,height}];
  });
}
export async function createPortugueseOCR():Promise<{
  recognize:(file:string)=>Promise<OCRWord[]>;
  close:()=>Promise<void>;
}>{
  const require=createRequire(import.meta.url);
  const base=dirname(require.resolve('@tesseract.js-data/por/package.json'));
  const langPath=['4.0.0_best_int','4.0.0'].map(folder=>join(base,folder))
    .find(folder=>existsSync(join(folder,'por.traineddata.gz')));
  if(!langPath)throw new Error('Modelo OCR português não instalado localmente.');
  let worker:Worker|undefined;
  try{
    worker=await createWorker('por',1,{
      langPath,cacheMethod:'none',gzip:true,
    });
    const ready=worker;
    return {
      async recognize(file:string){
        const response=await ready.recognize(file,{}, {tsv:true,text:true});
        return parseOCRTsv(response.data.tsv||'');
      },
      async close(){await ready.terminate();},
    };
  }catch(e){if(worker)await worker.terminate().catch(()=>{});throw e;}
}
