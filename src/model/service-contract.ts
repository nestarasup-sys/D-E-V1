/**
 * Contrato compilado tanto no frontend como no serviço Node.
 * Sempre incremente PROTOCOL_BUILD ao alterar rotas ou formato de respostas.
 * Isso detecta um serviço antigo que continua vivo depois de atualizar o código.
 */
export const SERVICE_PROTOCOL = 3;
export const SERVICE_VERSION = '0.13.0';
export const SERVICE_BUILD = 'dark-studio-v0.13-service-contract-3';
export const PROJECT_SCHEMA_VERSION = 2;
export const REQUIRED_CAPABILITIES = [
  'projects-v2','proposals-v1','project-history-v1','diagnostics-v1',
  'render-jobs-v1','media-local-v1',
] as const;

export interface ServiceHealth {
  status: 'ready';
  service: 'dark-studio-local';
  apiProtocol: number;
  appVersion: string;
  build: string;
  projectSchemaVersion: number;
  capabilities: string[];
  pid: number;
  startedAt: string;
  workspace: string;
  projectsDirectory: string;
}

export class ServiceCompatibilityError extends Error {
  readonly code = 'SERVICE_INCOMPATIBLE';
  constructor(message:string){super(message);this.name='ServiceCompatibilityError';}
}
/** Reject legacy /health replies that only contain a simple ready flag. */
export function assertServiceCompatibility(value:unknown):ServiceHealth {
  const advice='Feche o serviço antigo na porta 4317 e abra novamente pelo BAT atualizado. Seus projetos ficam preservados.';
  if(!value||typeof value!=='object')throw new ServiceCompatibilityError('Serviço respondeu sem identificação. '+advice);
  const h=value as Record<string,unknown>;
  if(h.status!=='ready'||h.service!=='dark-studio-local')throw new ServiceCompatibilityError(
    'A porta 4317 não responde como um serviço Dark Studio compatível. '+advice);
  if(h.apiProtocol!==SERVICE_PROTOCOL||h.build!==SERVICE_BUILD||
     h.appVersion!==SERVICE_VERSION||h.projectSchemaVersion!==PROJECT_SCHEMA_VERSION){
    throw new ServiceCompatibilityError(
      'Versões incompatíveis: editor '+SERVICE_VERSION+' ('+SERVICE_BUILD+') e serviço '+
      String(h.appVersion??'desconhecido')+' ('+String(h.build??'sem build')+'). '+advice);
  }
  if(!Array.isArray(h.capabilities)||REQUIRED_CAPABILITIES.some(c=>!h.capabilities.includes(c)))
    throw new ServiceCompatibilityError('O serviço não fornece todas as rotas necessárias. '+advice);
  if(typeof h.pid!=='number'||typeof h.startedAt!=='string'||
     typeof h.workspace!=='string'||typeof h.projectsDirectory!=='string')
    throw new ServiceCompatibilityError('Serviço sem identidade de processo e diretório. '+advice);
  return h as unknown as ServiceHealth;
}
