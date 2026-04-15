"""Brute force CRC16 variant for IDOsmart v3 protocol.

Given 100+ complete v3 frames (magic + ver + len + payload + crc), try every
plausible CRC16 parameterization and every input-range slice to find the one
that satisfies all frames simultaneously.

Parameters tested (catalog matching crcmod/python-crc16 standard variants):
  poly  : 16-bit polynomial
  init  : initial value
  refin : reflect input bytes
  refout: reflect output
  xorout: final XOR

Input slice candidates: which bytes of the frame are fed to CRC:
  - whole frame minus CRC
  - starting from magic
  - starting after magic (from ver)
  - starting after magic+ver (from len)
  - starting after magic+ver+len (from cmd)
  - starting after magic+ver+len, excluding trailing CRC

Byte order of CRC in frame: LE (the last 2 bytes interpreted as little-endian)
or BE.
"""
import json
import itertools

with open(r'C:/Users/Admin/Desktop/워치/step_archive/ido_research/v3_frames.json') as f:
    frames_raw = json.load(f)

frames = [bytes.fromhex(x['hex']) for x in frames_raw]
print(f"loaded {len(frames)} frames")

# CRC16 generic implementation
def crc16(data, poly, init, refin, refout, xorout):
    def reflect(b, width):
        result = 0
        for i in range(width):
            if b & (1 << i):
                result |= 1 << (width - 1 - i)
        return result

    crc = init
    for byte in data:
        if refin:
            byte = reflect(byte, 8)
        crc ^= byte << 8
        for _ in range(8):
            if crc & 0x8000:
                crc = ((crc << 1) ^ poly) & 0xFFFF
            else:
                crc = (crc << 1) & 0xFFFF
    if refout:
        crc = reflect(crc, 16)
    return (crc ^ xorout) & 0xFFFF


# Well-known CRC16 parameter sets from the Koopman/Ross catalog
# (https://reveng.sourceforge.io/crc-catalogue/16.htm)
CATALOG = [
    # name,                                   poly, init, refin, refout, xorout
    ("CCITT-FALSE",                           0x1021, 0xFFFF, False, False, 0x0000),
    ("XMODEM",                                0x1021, 0x0000, False, False, 0x0000),
    ("KERMIT",                                0x1021, 0x0000, True,  True,  0x0000),
    ("X-25",                                  0x1021, 0xFFFF, True,  True,  0xFFFF),
    ("MCRF4XX",                               0x1021, 0xFFFF, True,  True,  0x0000),
    ("GENIBUS",                               0x1021, 0xFFFF, False, False, 0xFFFF),
    ("GSM",                                   0x1021, 0x0000, False, False, 0xFFFF),
    ("RIELLO",                                0x1021, 0xB2AA, True,  True,  0x0000),
    ("TMS37157",                              0x1021, 0x89EC, True,  True,  0x0000),
    ("ISO-HDLC",                              0x1021, 0xFFFF, True,  True,  0xFFFF),
    ("AUG-CCITT",                             0x1021, 0x1D0F, False, False, 0x0000),
    ("MODBUS",                                0x8005, 0xFFFF, True,  True,  0x0000),
    ("ARC",                                   0x8005, 0x0000, True,  True,  0x0000),
    ("USB",                                   0x8005, 0xFFFF, True,  True,  0xFFFF),
    ("BUYPASS",                               0x8005, 0x0000, False, False, 0x0000),
    ("DDS-110",                               0x8005, 0x800D, False, False, 0x0000),
    ("CMS",                                   0x8005, 0xFFFF, False, False, 0x0000),
    ("MAXIM",                                 0x8005, 0x0000, True,  True,  0xFFFF),
    ("PROFIBUS",                              0x1DCF, 0xFFFF, False, False, 0xFFFF),
    ("DNP",                                   0x3D65, 0x0000, True,  True,  0xFFFF),
    ("EN-13757",                              0x3D65, 0x0000, False, False, 0xFFFF),
    ("T10-DIF",                               0x8BB7, 0x0000, False, False, 0x0000),
    ("TELEDISK",                              0xA097, 0x0000, False, False, 0x0000),
    ("CDMA2000",                              0xC867, 0xFFFF, False, False, 0x0000),
]


# Input slices: [start_offset, end_offset_from_tail]
# e.g. (0, 2) = whole frame minus last 2 bytes (the CRC)
SLICES = [
    ("whole minus CRC",      lambda f: f[:-2]),
    ("from ver (skip magic)",lambda f: f[5:-2]),
    ("from len",             lambda f: f[6:-2]),
    ("from cmd (skip hdr)",  lambda f: f[8:-2]),
    ("whole + CRC",          lambda f: f),  # CRC over full frame should yield 0 when verified
    ("from ver incl CRC",    lambda f: f[5:]),
    ("from len incl CRC",    lambda f: f[6:]),
]


def check_all(fn, slice_fn, expect_le):
    for frame in frames:
        target = int.from_bytes(frame[-2:], 'little' if expect_le else 'big')
        computed = fn(slice_fn(frame))
        if computed != target:
            return False
    return True


print(f"\ntrying {len(CATALOG)} catalog × {len(SLICES)} slices × 2 endian = {len(CATALOG)*len(SLICES)*2} combinations")
print()

found = []
for (name, poly, init, refin, refout, xorout) in CATALOG:
    fn = lambda d, p=poly, i=init, ri=refin, ro=refout, xo=xorout: crc16(d, p, i, ri, ro, xo)
    for (slice_name, slice_fn) in SLICES:
        for endian_le in (True, False):
            if check_all(fn, slice_fn, endian_le):
                found.append((name, slice_name, 'LE' if endian_le else 'BE',
                              poly, init, refin, refout, xorout))
                print(f"✓ MATCH: {name} | slice='{slice_name}' | {'LE' if endian_le else 'BE'}")

if not found:
    print("✗ No catalog variant matches. Trying exhaustive poly search...")
    # Exhaustive poly search with common inits/xorouts. This is slow (64k polys)
    # but runs once offline.
    import time
    t0 = time.time()
    checked = 0
    for poly in range(0x0001, 0x10000):
        for init in (0x0000, 0xFFFF):
            for refin in (False, True):
                refout = refin  # common constraint
                for xorout in (0x0000, 0xFFFF):
                    checked += 1
                    fn = lambda d, p=poly, i=init, ri=refin, ro=refout, xo=xorout: crc16(d, p, i, ri, ro, xo)
                    # sample check on first 3 frames with first slice
                    for slice_name, slice_fn in SLICES:
                        for endian_le in (True, False):
                            ok = True
                            for frame in frames[:3]:
                                target = int.from_bytes(frame[-2:], 'little' if endian_le else 'big')
                                if fn(slice_fn(frame)) != target:
                                    ok = False
                                    break
                            if ok:
                                # verify on all frames
                                if check_all(fn, slice_fn, endian_le):
                                    found.append((f"CUSTOM poly=0x{poly:04x}",
                                                  slice_name, 'LE' if endian_le else 'BE',
                                                  poly, init, refin, refout, xorout))
                                    print(f"✓ EXHAUSTIVE MATCH: poly=0x{poly:04X} init=0x{init:04X} "
                                          f"refin={refin} refout={refout} xorout=0x{xorout:04X}")
                                    print(f"  slice='{slice_name}' endian={'LE' if endian_le else 'BE'}")
        if poly % 0x1000 == 0:
            print(f"  ... poly=0x{poly:04X} elapsed={time.time()-t0:.1f}s found={len(found)}")

print(f"\ntotal found: {len(found)}")
for f in found:
    print(f"  {f}")
