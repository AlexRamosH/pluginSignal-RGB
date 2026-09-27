import os
import re

ASAR_PATH = r"C:\Program Files\SyncLight\resources\app.asar"
OUTPUT_FILE = "synclight_driver_code.txt"

def extract_driver():
    if not os.path.exists(ASAR_PATH):
        print(f"[!] No existe: {ASAR_PATH}")
        return

    print("[*] Abriendo app.asar...")
    with open(ASAR_PATH, "rb") as f:
        content = f.read()

    # Patrones clave del driver y del módulo de envío
    targets = [
        b"turnOffLight",
        b"setSectionLED",
        b"87396:",          # Módulo de setSyncScreen
        b"setSyncScreen",
    ]

    matches = []
    for tgt in targets:
        for m in re.finditer(re.escape(tgt), content):
            pos = m.start()
            # Agarramos un bloque generoso antes y después
            start = max(0, pos - 400)
            end = min(len(content), pos + 1600)
            matches.append((start, end, tgt.decode()))

    # Fusionar rangos cercanos
    matches.sort(key=lambda x: x[0])
    merged = []
    for m in matches:
        if not merged:
            merged.append(m)
        else:
            prev = merged[-1]
            if m[0] <= prev[1]:
                merged[-1] = (prev[0], max(prev[1], m[1]), prev[2] + " + " + m[2])
            else:
                merged.append(m)

    print(f"[+] Hallados {len(merged)} bloques del controlador.")

    with open(OUTPUT_FILE, "w", encoding="utf-8", errors="ignore") as out:
        for idx, (s, e, tag) in enumerate(merged):
            chunk = content[s:e].decode("utf-8", errors="ignore")
            clean = "".join(c for c in chunk if c.isprintable() or c in "\n\r\t")
            
            banner = f"\n{'='*25} BLOQUE {idx+1}: {tag} {'='*25}\n"
            out.write(banner)
            out.write(clean + "\n")
            
            print(banner)
            print(clean[:700] + "\n... [revisa synclight_driver_code.txt]")

    print(f"\n[✓] Listo. Volcado guardado en: {OUTPUT_FILE}")

if __name__ == "__main__":
    extract_driver()