import {describe,it,expect} from 'vitest';
import {makeSfxWave,SFX_TYPES} from './sfx';
describe('sonoplastia procedural local',()=>{
  it('gera WAV PCM sem baixar gravações de terceiros',()=>{
    expect(SFX_TYPES.length).toBe(9);
    for(const kind of SFX_TYPES){
      const {wav,durationFrames}=makeSfxWave(kind);
      expect(wav.toString('ascii',0,4)).toBe('RIFF');
      expect(wav.toString('ascii',8,12)).toBe('WAVE');
      expect(wav.readUInt32LE(24)).toBe(16000);
      expect(durationFrames).toBeGreaterThan(0);
      expect(durationFrames).toBeLessThanOrEqual(30);
      expect(wav.length).toBeGreaterThan(44);
    }
  });
  it('o mesmo efeito é determinístico e permite cachê',()=>{
    expect(makeSfxWave('soft-whoosh').wav.equals(makeSfxWave('soft-whoosh').wav)).toBe(true);
  });
});
