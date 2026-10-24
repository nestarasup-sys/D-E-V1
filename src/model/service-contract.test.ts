import {describe,expect,it} from 'vitest';
import {assertServiceCompatibility,ServiceCompatibilityError,SERVICE_BUILD,
  SERVICE_PROTOCOL,SERVICE_VERSION,PROJECT_SCHEMA_VERSION,REQUIRED_CAPABILITIES} from './service-contract';
const good={
  status:'ready',service:'dark-studio-local',
  apiProtocol:SERVICE_PROTOCOL,appVersion:SERVICE_VERSION,build:SERVICE_BUILD,
  projectSchemaVersion:PROJECT_SCHEMA_VERSION,capabilities:[...REQUIRED_CAPABILITIES],
  pid:123,startedAt:'2026-10-23T22:00:00Z',workspace:'C:\\D-E-V1',
  projectsDirectory:'C:\\Users\\test\\DarkStudio\\projects',
};
describe('handshake entre app e serviço local',()=>{
  it('aceita apenas serviço com build/capacidades compatíveis',()=>{
    expect(assertServiceCompatibility(good).pid).toBe(123);
  });
  it('detecta a resposta ready antiga sem aceitar o serviço por engano',()=>{
    expect(()=>assertServiceCompatibility({status:'ready',mode:'local-project-service'}))
      .toThrow(ServiceCompatibilityError);
  });
  it('identifica versões antigas mesmo quando a API parece responder',()=>{
    expect(()=>assertServiceCompatibility({...good,build:'um-build-anterior'})).toThrow(/Versões incompatíveis/);
    expect(()=>assertServiceCompatibility({...good,apiProtocol:SERVICE_PROTOCOL-1})).toThrow(/Versões incompatíveis/);
  });
  it('exige rotas e informações de identificação',()=>{
    expect(()=>assertServiceCompatibility({...good,capabilities:['projects-v2']})).toThrow(/rotas/);
    expect(()=>assertServiceCompatibility({...good,pid:undefined})).toThrow(/identidade/);
  });
});
