/**
 * Teste de integração real: compila a composição e produz um MP4 curto.
 * Não usa mídia externa, Codex, servidor local nem caminhos de usuário.
 * O navegador Chromium do Remotion é obtido/configurado pelo próprio renderer.
 */
import {mkdtemp, readFile, rm, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve, join} from 'node:path';
import {bundle} from '@remotion/bundler';
import {selectComposition, renderMedia} from '@remotion/renderer';
import {projectSchema, starterProject} from '../src/model/project';

async function main() {
  const directory = await mkdtemp(join(tmpdir(), 'dark-studio-smoke-'));
  const output = join(directory, 'smoke.mp4');
  try {
    const project = projectSchema.parse({
      ...structuredClone(starterProject),
      id: 'dark-studio-smoke',
      name: 'Render smoke test',
      scenes: [{
        ...starterProject.scenes[0],
        id: 'smoke-scene',
        title: 'SMOKE TEST',
        subtitle: 'Verificacao automatica de video',
        durationFrames: 30,
        imageUrl: '',
      }],
      clips: [],
      assets: [],
      captions:[{id:'737383e1-c605-49db-b9aa-3e312a390b61',startFrame:4,endFrame:28,text:'Legenda de teste na timeline'}],
    });
    console.log('Compilando a composicao Remotion...');
    const serveUrl = await bundle({entryPoint: resolve('src/video/index.ts')});
    const composition = await selectComposition({
      serveUrl,
      id: 'DarkStudio',
      inputProps: {project},
    });
    if (composition.durationInFrames !== 30) {
      throw new Error('Duracao da composicao incorreta: ' + composition.durationInFrames);
    }
    console.log('Renderizando 30 frames em H.264...');
    await renderMedia({
      composition,
      serveUrl,
      inputProps: {project},
      codec: 'h264',
      outputLocation: output,
      concurrency: 1,
      logLevel: 'error',
    });
    const size = (await stat(output)).size;
    const header = await readFile(output);
    // MP4 ISO BMFF contém a marca "ftyp" perto do início.
    if (size < 1024 || !header.subarray(0, 32).toString('latin1').includes('ftyp')) {
      throw new Error('Render nao produziu um MP4 valido (cabecalho/tamanho).');
    }
    console.log('Smoke MP4 aprovado: ' + size + ' bytes, 30 frames.');
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
}

main().catch(error => {
  console.error('Smoke render falhou:', error);
  process.exitCode = 1;
});
