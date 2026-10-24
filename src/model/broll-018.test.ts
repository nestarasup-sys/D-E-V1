import {describe,it,expect} from 'vitest';
import {candidate,safeVideoUrl} from '../../apps/agent/src/broll';

describe('B-roll v0.18: official catalog and explicit rights',()=>{
  it('rejects arbitrary URLs and local-network URLs before provider download',()=>{
    expect(()=>safeVideoUrl('http://127.0.0.1/file.mp4')).toThrow();
    expect(()=>safeVideoUrl('https://example.com/file.mp4')).toThrow();
    expect(()=>safeVideoUrl('https://player.vimeo.com.evil.invalid/file.mp4')).toThrow();
    expect(safeVideoUrl('https://player.vimeo.com/external/123.mp4').hostname)
      .toBe('player.vimeo.com');
  });
  it('stores original provenance without claiming automatic license approval',()=>{
    const result=candidate({
      id:123,source:'pexels',url:'https://www.pexels.com/video/123/',
      image:'https://images.pexels.com/x.jpg',duration:20,width:1920,height:1080,
      user:{name:'Pessoa Criadora'},
      video_files:[{id:9,file_type:'video/mp4',link:'https://player.vimeo.com/x',width:1920,height:1080}],
    } as never);
    expect(result.creator).toBe('Pessoa Criadora');
    expect(result.licenseUrl).toBe('https://www.pexels.com/license/');
    expect(result.page).toContain('pexels.com/video/');
  });
});
