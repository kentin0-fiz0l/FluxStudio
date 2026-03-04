export function quantizeFrame(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): { indexedPixels: Uint8Array; palette: Uint8Array } {
  const colorMap = new Map<number, [number, number, number, number]>();
  const step = Math.max(1, Math.floor((width * height) / 4096));
  for (let i = 0; i < data.length; i += 4 * step) {
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    if (!colorMap.has(key)) {
      colorMap.set(key, [data[i], data[i + 1], data[i + 2], 1]);
    } else {
      colorMap.get(key)![3]++;
    }
  }

  type ColorBox = { colors: [number, number, number, number][] };
  const boxes: ColorBox[] = [{ colors: Array.from(colorMap.values()) }];

  while (boxes.length < 256) {
    let bestIdx = 0;
    let bestRange = -1;
    for (let bi = 0; bi < boxes.length; bi++) {
      const box = boxes[bi];
      if (box.colors.length < 2) continue;
      for (let ch = 0; ch < 3; ch++) {
        let min = 255, max = 0;
        for (const c of box.colors) {
          if (c[ch] < min) min = c[ch];
          if (c[ch] > max) max = c[ch];
        }
        const range = max - min;
        if (range > bestRange) {
          bestRange = range;
          bestIdx = bi;
        }
      }
    }
    if (bestRange <= 0) break;

    const box = boxes[bestIdx];
    let splitCh = 0, splitRange = 0;
    for (let ch = 0; ch < 3; ch++) {
      let min = 255, max = 0;
      for (const c of box.colors) {
        if (c[ch] < min) min = c[ch];
        if (c[ch] > max) max = c[ch];
      }
      if (max - min > splitRange) {
        splitRange = max - min;
        splitCh = ch;
      }
    }

    box.colors.sort((a, b) => a[splitCh] - b[splitCh]);
    const mid = Math.floor(box.colors.length / 2);
    boxes.splice(bestIdx, 1, { colors: box.colors.slice(0, mid) }, { colors: box.colors.slice(mid) });
  }

  const palette = new Uint8Array(256 * 3);
  const paletteColors: [number, number, number][] = [];
  for (let bi = 0; bi < Math.min(boxes.length, 256); bi++) {
    const box = boxes[bi];
    let r = 0, g = 0, b = 0, total = 0;
    for (const c of box.colors) {
      r += c[0] * c[3];
      g += c[1] * c[3];
      b += c[2] * c[3];
      total += c[3];
    }
    const pr = total > 0 ? Math.round(r / total) : 0;
    const pg = total > 0 ? Math.round(g / total) : 0;
    const pb = total > 0 ? Math.round(b / total) : 0;
    palette[bi * 3] = pr;
    palette[bi * 3 + 1] = pg;
    palette[bi * 3 + 2] = pb;
    paletteColors.push([pr, pg, pb]);
  }

  const pixelCount = width * height;
  const indexedPixels = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const off = i * 4;
    const pr = data[off], pg = data[off + 1], pb = data[off + 2];
    let bestDist = Infinity, bestPi = 0;
    for (let pi = 0; pi < paletteColors.length; pi++) {
      const [cr, cg, cb] = paletteColors[pi];
      const dist = (pr - cr) ** 2 + (pg - cg) ** 2 + (pb - cb) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        bestPi = pi;
        if (dist === 0) break;
      }
    }
    indexedPixels[i] = bestPi;
  }

  return { indexedPixels, palette };
}

export function lzwEncode(indexedPixels: Uint8Array, minCodeSize: number): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  const output: number[] = [];

  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  const maxCode = 4096;

  const codeTable = new Map<string, number>();
  function resetTable() {
    codeTable.clear();
    for (let i = 0; i < clearCode; i++) {
      codeTable.set(String(i), i);
    }
    codeSize = minCodeSize + 1;
    nextCode = eoiCode + 1;
  }

  let curByte = 0;
  let curBit = 0;
  const bytes: number[] = [];

  function writeBits(code: number, size: number) {
    curByte |= (code << curBit);
    curBit += size;
    while (curBit >= 8) {
      bytes.push(curByte & 0xff);
      curByte >>= 8;
      curBit -= 8;
    }
  }

  resetTable();
  writeBits(clearCode, codeSize);

  if (indexedPixels.length === 0) {
    writeBits(eoiCode, codeSize);
    if (curBit > 0) bytes.push(curByte & 0xff);
    for (let i = 0; i < bytes.length; ) {
      const blockSize = Math.min(255, bytes.length - i);
      output.push(blockSize);
      for (let j = 0; j < blockSize; j++) output.push(bytes[i + j]);
      i += blockSize;
    }
    output.push(0);
    return new Uint8Array(output);
  }

  let current = String(indexedPixels[0]);

  for (let i = 1; i < indexedPixels.length; i++) {
    const pixel = indexedPixels[i];
    const combined = current + ',' + pixel;

    if (codeTable.has(combined)) {
      current = combined;
    } else {
      writeBits(codeTable.get(current)!, codeSize);

      if (nextCode < maxCode) {
        codeTable.set(combined, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) {
          codeSize++;
        }
      } else {
        writeBits(clearCode, codeSize);
        resetTable();
      }

      current = String(pixel);
    }
  }

  writeBits(codeTable.get(current)!, codeSize);
  writeBits(eoiCode, codeSize);
  if (curBit > 0) bytes.push(curByte & 0xff);

  for (let i = 0; i < bytes.length; ) {
    const blockSize = Math.min(255, bytes.length - i);
    output.push(blockSize);
    for (let j = 0; j < blockSize; j++) output.push(bytes[i + j]);
    i += blockSize;
  }
  output.push(0);

  return new Uint8Array(output);
}

export function encodeGif(
  frames: { indexedPixels: Uint8Array; palette: Uint8Array }[],
  width: number,
  height: number,
  delayCs: number,
): Uint8Array {
  const parts: Uint8Array[] = [];

  function pushBytes(...bytes: number[]) {
    parts.push(new Uint8Array(bytes));
  }

  parts.push(new TextEncoder().encode('GIF89a'));

  pushBytes(
    width & 0xff, (width >> 8) & 0xff,
    height & 0xff, (height >> 8) & 0xff,
    0xf7,
    0,
    0,
  );

  parts.push(frames[0].palette);

  pushBytes(0x21, 0xff, 0x0b);
  parts.push(new TextEncoder().encode('NETSCAPE2.0'));
  pushBytes(0x03, 0x01, 0x00, 0x00, 0x00);

  for (const frame of frames) {
    pushBytes(
      0x21, 0xf9, 0x04,
      0x00,
      delayCs & 0xff, (delayCs >> 8) & 0xff,
      0x00,
      0x00,
    );

    pushBytes(
      0x2c,
      0x00, 0x00, 0x00, 0x00,
      width & 0xff, (width >> 8) & 0xff,
      height & 0xff, (height >> 8) & 0xff,
      0x00,
    );

    const minCodeSize = 8;
    pushBytes(minCodeSize);

    parts.push(lzwEncode(frame.indexedPixels, minCodeSize));
  }

  pushBytes(0x3b);

  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}
