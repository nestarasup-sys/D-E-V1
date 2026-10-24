param(
  [Parameter(Mandatory=$true)][string]$InputPath,
  [Parameter(Mandatory=$true)][string]$OutputDirectory,
  [int]$Rate=2
)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Speech
$lines=Get-Content -Path $InputPath -Raw -Encoding UTF8 | ConvertFrom-Json
$synth=New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $voices=@($synth.GetInstalledVoices() | Where-Object {$_.Enabled})
  if($voices.Count -eq 0) {throw 'Nenhuma voz sintetica instalada no Windows. Instale uma voz do idioma em Configuracoes.'}
  $pt=@($voices | Where-Object {$_.VoiceInfo.Culture.Name -eq 'pt-BR'})
  if($pt.Count -gt 0){$synth.SelectVoice($pt[0].VoiceInfo.Name)}
  $synth.Rate=$Rate
  $format=[System.Speech.AudioFormat.SpeechAudioFormatInfo]::new(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
  for($i=0;$i -lt $lines.Count;$i++){
    $file=Join-Path $OutputDirectory ('part-'+$i+'.wav')
    $synth.SetOutputToWaveFile($file,$format)
    $synth.Speak([string]$lines[$i])
    $synth.SetOutputToNull()
  }
  Write-Output ('Voz utilizada: '+$synth.Voice.Name)
}finally{$synth.Dispose()}
