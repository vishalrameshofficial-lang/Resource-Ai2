"""
Local TTS Service.
Synthesizes text to a 8000Hz WAV audio file using native SAPI (Windows), Piper, or pyttsx3.
"""

import sys
import os
import argparse
import wave

def synthesize(text, output_file, voice=None, rate=155):
    # Check if Piper executable is configured
    piper_path = os.getenv("PIPER_PATH")
    piper_model = os.getenv("PIPER_MODEL")
    
    if piper_path and os.path.exists(piper_path) and piper_model and os.path.exists(piper_model):
        import subprocess
        cmd = [piper_path, "--model", piper_model, "--output_file", output_file]
        proc = subprocess.run(cmd, input=text.encode("utf-8"), capture_output=True)
        if proc.returncode == 0 and os.path.exists(output_file) and os.path.getsize(output_file) > 44:
            return True

    # On Windows: Use direct SAPI.SpVoice with SAFT8kHz16BitMono (format type 6)
    # This generates telecom-standard 8000Hz 16-bit mono PCM directly with
    # Microsoft's acoustic band-limiting anti-aliasing filter, avoiding all resampling distortion.
    if sys.platform == "win32":
        try:
            import win32com.client
            speaker = win32com.client.Dispatch("SAPI.SpVoice")
            stream = win32com.client.Dispatch("SAPI.SpFileStream")

            # Voice selection: prefer clear female voice (Zira) or David if requested
            voices = speaker.GetVoices()
            selected_voice = None
            voice_req = (voice or os.getenv("LOCAL_TTS_VOICE", "")).lower()

            for i in range(voices.Count):
                desc = voices.Item(i).GetDescription().lower()
                if voice_req and voice_req in desc:
                    selected_voice = voices.Item(i)
                    break
                elif not voice_req and "zira" in desc:
                    selected_voice = voices.Item(i)

            if selected_voice:
                speaker.Voice = selected_voice
            elif voices.Count > 0:
                speaker.Voice = voices.Item(0)

            # SAPI Rate: integer from -10 to 10. Default 0 is ~150 wpm, 1 is ~175 wpm.
            sapi_rate = 0
            if rate > 170:
                sapi_rate = 1
            elif rate < 130:
                sapi_rate = -1
            speaker.Rate = sapi_rate

            stream.Format.Type = 6  # SAFT8kHz16BitMono (native 8000Hz 16-bit mono)
            stream.Open(output_file, 3)  # SSFMCreateForWrite
            speaker.AudioOutputStream = stream
            speaker.Speak(text)
            stream.Close()

            if os.path.exists(output_file) and os.path.getsize(output_file) > 44:
                return True
        except Exception as win_err:
            sys.stderr.write(f"Direct SAPI 8kHz error, falling back to pyttsx3: {win_err}\n")

    # Fallback to pyttsx3
    try:
        import pyttsx3
        engine = pyttsx3.init()
        engine.setProperty('rate', rate)
        engine.save_to_file(text, output_file)
        engine.runAndWait()
        return os.path.exists(output_file) and os.path.getsize(output_file) > 44
    except Exception as err:
        sys.stderr.write(f"TTS synthesis error: {err}\n")
        return False

def main():
    parser = argparse.ArgumentParser(description="Local TTS Service")
    parser.add_argument("--text", required=True, help="Text to synthesize")
    parser.add_argument("--output", required=True, help="Output WAV path")
    parser.add_argument("--rate", type=int, default=155, help="Speech rate")
    parser.add_argument("--voice", default=None, help="Voice name")
    args = parser.parse_args()

    success = synthesize(args.text, args.output, voice=args.voice, rate=args.rate)
    if success:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
