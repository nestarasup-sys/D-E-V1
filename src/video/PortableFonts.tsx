import {useEffect,useMemo,useState} from 'react';
import {continueRender,delayRender} from 'remotion';
import type {Asset} from '../model/project';

/** Same @font-face rules in Player and MP4; only validated local URLs/IDs are allowed. */
export function fontFamilyFor(asset:Pick<Asset,'id'>){return 'DSFont-'+asset.id;}
const formats:Record<string,string>={
  'font/woff2':'woff2','font/woff':'woff','font/ttf':'truetype','font/otf':'opentype',
};
export function PortableFonts({assets}:{assets:readonly Asset[]}){
  const fonts=useMemo(()=>assets.filter(a=>a.kind==='font'&&
    /^http:\/\/127\.0\.0\.1:4317\/media\/[0-9a-f-]{36}$/.test(a.url)&&formats[a.mime]),[assets]);
  const css=fonts.map(a=>'@font-face{font-family:"'+fontFamilyFor(a)+'";src:url("'+
    a.url+'") format("'+formats[a.mime]+'");font-display:block;}').join('\n');
  const [handle]=useState(()=>fonts.length?delayRender('Carregando fontes locais incorporadas'):null);
  useEffect(()=>{
    if(handle===null)return;
    let ended=false;
    const timeout=setTimeout(()=>{if(!ended){ended=true;continueRender(handle);}},15000);
    void Promise.all(fonts.map(a=>document.fonts.load('32px "'+fontFamilyFor(a)+'"')))
      .catch(()=>{}).finally(()=>{if(!ended){ended=true;clearTimeout(timeout);continueRender(handle);}});
    return()=>{if(!ended){ended=true;clearTimeout(timeout);continueRender(handle);}};
  },[fonts,handle]);
  return <style>{css}</style>;
}
