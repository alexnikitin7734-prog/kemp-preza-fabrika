# послание Claude на слайд 1: каждая фраза отдельным файлом, потом склейка с паузами и тайминги субтитров
import asyncio, json, subprocess, io, time, array
import edge_tts

FF = r"C:\Users\web-heroes10\Downloads\_ffmpeg\ffmpeg-8.1.1-essentials_build\bin\ffmpeg.exe"
VOICE, RATE, PITCH, GAP = "ru-RU-DmitryNeural", "+8%", "+0Hz", 0.4
ph = json.load(io.open("phrases.json", encoding="utf-8"))

# сервис Dmitry через раз отвечает пустотой — повторяем фразу, пока не отдаст звук
for i, p in enumerate(ph):
    for k in range(15):
        try:
            asyncio.run(edge_tts.Communicate(p["say"].replace(" —", ",").replace("!", "."), VOICE, rate=RATE, pitch=PITCH).save(f"p{i}.mp3"))
            break
        except edge_tts.exceptions.NoAudioReceived:
            time.sleep(4)
    else:
        raise SystemExit(f"фраза {i} не озвучилась")

def dur(f):
    out = subprocess.run([FF.replace("ffmpeg.exe", "ffprobe.exe"), "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", f], capture_output=True, text=True).stdout
    return float(out)

# edge-tts кладёт тишину по краям — срезаем, чтобы паузы между фразами были ровно GAP
TRIM = "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse"
for i in range(len(ph)):
    subprocess.run([FF, "-y", "-i", f"p{i}.mp3", "-af", TRIM, f"p{i}.wav"], check=True, capture_output=True)

t, cues, inputs, chain = 0.3, [], [], ""
for i, p in enumerate(ph):
    d = dur(f"p{i}.wav")
    cues.append({"t": round(t, 2), "end": round(t + d, 2), "text": p["show"].replace(" —", " —")})
    t += d + GAP
    inputs += ["-i", f"p{i}.wav"]
    chain += f"[{i}:a]adelay={int(cues[-1]['t']*1000)}|{int(cues[-1]['t']*1000)}[a{i}];"
chain += "".join(f"[a{i}]" for i in range(len(ph))) + f"amix=inputs={len(ph)}:normalize=0[o]"
subprocess.run([FF, "-y", *inputs, "-filter_complex", chain, "-map", "[o]", "-c:a", "aac", "-b:a", "128k",
                "../media/claude.m4a"], check=True, capture_output=True)
# громкость по 1/20 с — по ней на слайде качаются полоски; js, а не json: с file:// fetch не работает
raw = subprocess.run([FF, "-i", "../media/claude.m4a", "-ac", "1", "-ar", "8000", "-f", "s16le", "-"], capture_output=True).stdout
pcm = array.array("h", raw)
env = [(sum(x * x for x in pcm[k:k + 400]) / 400) ** .5 for k in range(0, len(pcm), 400)]
top = max(env)
env = [round(min(1, e / top * 1.4), 2) for e in env]
io.open("../media/claude.js", "w", encoding="utf-8").write(
    "window.CLAUDE = " + json.dumps({"cues": cues, "fps": 20, "env": env}, ensure_ascii=False) + ";\n")
print(json.dumps(cues, ensure_ascii=False, indent=1), round(t, 1))
