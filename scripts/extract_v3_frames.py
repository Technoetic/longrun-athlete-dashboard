"""Extract complete v3 magic frames (33 DA AD DA AD ...) from Phase 0 logs.

Each frame in the log is a single-line hex dump after "TX : " or "RX : ".
We parse the embedded little-endian length field and verify the full frame
is present (multi-line fragmentation may split it).
"""
import re
import os
import sys

LOGS = [
    r'C:/Users/Admin/Desktop/워치/step_archive/ido_research/hr_save.log',
    r'C:/Users/Admin/Desktop/워치/step_archive/ido_research/hr_off.log',
    r'C:/Users/Admin/Desktop/워치/step_archive/ido_research/gatt_discovery.log',
    r'C:/Users/Admin/Desktop/워치/step_archive/ido_research/binding_handshake.log',
]

MAGIC = bytes.fromhex('33DAADDAAD')


def parse_line(line):
    """Extract hex payload from a protocol.c TX/RX log line."""
    m = re.search(r'\]\s*(TX|RX)\s*:\s*([0-9A-Fa-f][0-9A-Fa-f ]+?)\s*$', line)
    if not m:
        return None
    direction = m.group(1)
    hex_part = m.group(2).replace(' ', '')
    if len(hex_part) % 2 != 0:
        return None
    try:
        return direction, bytes.fromhex(hex_part)
    except ValueError:
        return None


frames = []  # list of (log, lineno, direction, raw_bytes)
seen = set()

for log in LOGS:
    if not os.path.exists(log):
        continue
    with open(log, encoding='utf-8', errors='replace') as f:
        for lineno, line in enumerate(f, 1):
            parsed = parse_line(line)
            if not parsed:
                continue
            direction, data = parsed
            # Find magic and try to parse length
            idx = data.find(MAGIC)
            if idx < 0:
                continue
            remaining = data[idx:]
            # Frame header: 5 magic + 1 version + 2 length LE + ...
            # Empirically: total_frame_bytes = len_field + 3 (based on 3 sample frames)
            if len(remaining) < 10:
                continue
            ver = remaining[5]
            if ver != 0x01:
                continue
            len_field = int.from_bytes(remaining[6:8], 'little')
            total = len_field + 3
            if len(remaining) < total or total < 10:
                continue
            frame = remaining[:total]
            # dedupe
            key = (total, frame.hex())
            if key in seen:
                continue
            seen.add(key)
            frames.append((os.path.basename(log), lineno, direction, frame))

print(f"Unique v3 frames extracted: {len(frames)}")
print()
for i, (log, ln, d, frame) in enumerate(frames[:40]):
    payload_len = int.from_bytes(frame[6:8], 'little')
    crc = frame[-2:]
    print(f"[{i:3}] {log}:{ln} {d} len_field={payload_len:3} total={len(frame):3}  crc={crc.hex()}")
    print(f"       {frame.hex()}")
    print()

# Save for CRC brute force
import json
out = [{"log": log, "lineno": ln, "dir": d, "hex": frame.hex()}
       for (log, ln, d, frame) in frames]
with open(r'C:/Users/Admin/Desktop/워치/step_archive/ido_research/v3_frames.json', 'w') as f:
    json.dump(out, f, indent=2)
print(f"saved {len(out)} frames to v3_frames.json")
