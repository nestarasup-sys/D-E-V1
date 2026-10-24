param(
  [ValidateSet('List','Synthesize')][string]$Action='List',
  [string]$InputPath='',
  [string]$OutputDirectory='',
  [string]$VoiceName='',
  [ValidateRange(-10,10)][int]$Rate=1
)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Speech
$synth=New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $voices=@($synth.GetInstalledVoices() | Where-Object {$_.Enabled} | ForEach-Object {
    @{ name=$_.VoiceInfo.Name; culture=$_.VoiceInfo.Culture.Name; gender=$_.VoiceInfo.Gender.ToString() }
  })
  if($Action -eq 'List'){
    @{engine='windows-sapi'; voices=$voices} | ConvertTo-Json -Depth 4 -Compress
    exit 0
  }
  if(-not $InputPath -or -not $OutputDirectory){throw 'Caminhos de entrada e saida obrigatorios.'}
  $parsed=Get-Content -Path $InputPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $lines=New-Object 'System.Collections.Generic.List[string]'
  foreach($item in $parsed){ [void]$lines.Add([string]$item) }
  if($lines.Count -lt 1 -or $lines.Count -gt 200){throw 'Quantidade de falas invalida.'}
  if($VoiceName){
    $selected=@($voices | Where-Object {$_.name -eq $VoiceName})
    if($selected.Count -ne 1){throw 'A voz solicitada nao esta instalada no Windows.'}
    $synth.SelectVoice($VoiceName)
  }else{
    $pt=@($voices | Where-Object {$_.culture -eq 'pt-BR'})
    if($pt.Count -lt 1){throw 'Nenhuma voz pt-BR instalada. Instale uma voz brasileira ou escolha outra explicitamente.'}
    $synth.SelectVoice($pt[0].name)
  }
  $synth.Rate=$Rate
  $format=[System.Speech.AudioFormat.SpeechAudioFormatInfo]::new(
    16000,[System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,
    [System.Speech.AudioFormat.AudioChannel]::Mono)
  for($i=0;$i -lt $lines.Count;$i++){
    $line=[string]$lines[$i]
    if(-not $line.Trim() -or $line.Length -gt 1600){throw 'Texto de narracao vazio ou excessivo.'}
    $path=Join-Path $OutputDirectory ('part-'+$i+'.wav')
    $synth.SetOutputToWaveFile($path,$format)
    try{$synth.Speak($line)}finally{$synth.SetOutputToNull()}
  }
  @{engine='windows-sapi';voice=$synth.Voice.Name;files=$lines.Count} | ConvertTo-Json -Compress
}finally{$synth.Dispose()}
