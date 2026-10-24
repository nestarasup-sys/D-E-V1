/** CI raster proof of articulated SVGs, changing economic graphs and pixel QA. Synthetic only. */
import {randomUUID} from 'node:crypto';
import {projectSchema,starterProject} from '../src/model/project';
import {compileDirection} from '../src/model/direction';
import {inspectRenderedFrames} from '../apps/agent/src/frame-qa';

async function main(){
  const source=randomUUID();
  const project=projectSchema.parse({
    ...structuredClone(starterProject),id:randomUUID(),visualMode:'legacy',shots:[],
    scenes:[{...starterProject.scenes[0],durationFrames:180}],
    assets:[],clips:[],captions:[],
    evidence:[{id:source,claim:'Amostra de teste sintética, não publicar',
      sourceTitle:'Fixture de teste',sourceUrl:'',notes:'Valores não factuais',
      reviewStatus:'pending'}],
  });
  const base={kind:'chart',name:'Economia simulada',x:110,y:140,width:1550,height:730,
    sourceEvidenceId:source,values:[100,-60,-25],labels:['Renda','Aluguel','Outros'],
    chartStages:[{frame:0,values:[0,0,0],easing:'linear'},
      {frame:59,values:[100,-60,-25],easing:'linear'}]};
  const plan=compileDirection(project,{version:1,title:'Teste v0.16',
    beats:[
      {startFrame:0,durationFrames:60,purpose:'hook',title:'Pessoa articulada',motionPreset:'still',
        layers:[{kind:'character',name:'Trabalhador',x:500,y:190,width:450,height:700,
          rigKeys:[{frame:0,pose:{leftArm:-80,rightArm:20,head:-12,smile:-.3},easing:'linear'},
            {frame:59,pose:{leftArm:75,rightArm:-45,head:20,smile:1},easing:'linear'}]}]},
      {startFrame:60,durationFrames:60,purpose:'data',title:'Cascata',motionPreset:'still',
        layers:[{...base,chartType:'waterfall'}]},
      {startFrame:120,durationFrames:60,purpose:'data',title:'Fluxos',motionPreset:'still',
        layers:[{...base,chartType:'cashflow'}]},
    ],
  },randomUUID);
  if(plan.preview.shots.length!==3||plan.report.coveragePercent!==100)
    throw Error('Direção autoral inválida.');
  const report=await inspectRenderedFrames(plan.preview);
  if(report.samples.length<6||report.samples.some(s=>!Number.isFinite(s.luminanceSpread)||
    !Number.isFinite(s.edgeActivity)))throw Error('Análise dos pixels rasterizados inválida.');
  console.log(JSON.stringify({ok:true,version:'v0.16',shots:3,
    frames:report.frames,metrics:report.samples,issues:report.issues.length,
    method:report.method},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
