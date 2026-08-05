// QR Code generator - client-side Reed-Solomon, no third-party API
const QRCode = (function () {
  const GF256 = (function () {
    const exp = new Array(512), log = new Array(256);
    let x = 1;
    for (let i = 0; i < 255; i++) {
      exp[i] = x; log[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) exp[i] = exp[i - 255];
    return { exp, log };
  })();

  function rsEncode(data, ecLen) {
    const gen = new Array(ecLen).fill(0);
    gen[0] = 1;
    for (let i = 0; i < ecLen; i++) {
      for (let j = ecLen - 1; j > 0; j--) {
        gen[j] = gen[j - 1] ^ GF256.exp[(GF256.log[gen[j]] + i) % 255];
      }
      gen[0] = GF256.exp[(GF256.log[gen[0] || 1] + i) % 255];
    }
    const res = new Array(ecLen).fill(0);
    for (let i = 0; i < data.length; i++) {
      const factor = data[i] ^ res[0];
      res.shift(); res.push(0);
      if (factor) for (let j = 0; j < ecLen; j++) {
        res[j] ^= GF256.exp[(GF256.log[factor] + GF256.log[gen[ecLen - 1 - j]]) % 255];
      }
    }
    return res;
  }

  // QR version sizes (modules per side)
  const SIZES = [21, 25, 29, 33, 37, 41, 45, 49, 53, 57, 61, 65, 69, 73, 77, 81, 85, 89, 93, 97, 101, 105, 109, 113, 117, 121, 125, 129, 133, 137, 141, 145, 149, 153, 157, 161, 165, 169, 173, 177];
  // Capacity per version (L ec level) - byte mode
  const CAP_L = [17, 32, 53, 78, 106, 134, 154, 192, 230, 271, 321, 367, 425, 458, 520, 586, 644, 718, 792, 858, 929, 1003, 1091, 1171, 1273, 1367, 1465, 1528, 1628, 1732, 1840, 1952, 2068, 2188, 2303, 2431, 2563, 2699, 2809, 2953];
  const EC_L = [7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 28, 28, 28, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30];

  function pickVersion(text) {
    for (let v = 0; v < 40; v++) {
      if (text.length <= CAP_L[v]) return v;
    }
    return 39;
  }

  function generate(text) {
    const v = pickVersion(text);
    const size = SIZES[v];
    const matrix = new Array(size);
    for (let i = 0; i < size; i++) matrix[i] = new Array(size).fill(null);

    // Finder patterns
    function placeFinder(r, c) {
      for (let i = -1; i <= 7; i++) {
        for (let j = -1; j <= 7; j++) {
          const rr = r + i, cc = c + j;
          if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
          let val = false;
          if (i >= 0 && i <= 6 && j >= 0 && j <= 6) {
            if (i === 0 || i === 6 || j === 0 || j === 6) val = true;
            if (i >= 2 && i <= 4 && j >= 2 && j <= 4) val = true;
          }
          matrix[rr][cc] = val;
        }
      }
    }
    placeFinder(0, 0); placeFinder(0, size - 7); placeFinder(size - 7, 0);

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
      if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0;
      if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0;
    }

    // Encode data
    const bytes = [];
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code < 128) bytes.push(code);
      else if (code < 2048) { bytes.push(0xc0 | (code >> 6)); bytes.push(0x80 | (code & 0x3f)); }
      else { bytes.push(0xe0 | (code >> 12)); bytes.push(0x80 | ((code >> 6) & 0x3f)); bytes.push(0x80 | (code & 0x3f)); }
    }

    const bits = [];
    // Mode indicator (0100 = byte mode)
    bits.push(0, 1, 0, 0);
    // Char count (8 bits for v1-9, 16 for v10+)
    const ccBits = v < 9 ? 8 : 16;
    const len = bytes.length;
    for (let i = ccBits - 1; i >= 0; i--) bits.push((len >> i) & 1);
    // Data
    for (const b of bytes) for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);

    // Terminator + padding
    const totalBits = SIZES[v] * SIZES[v] - 192 - 2 * (size - 16) - 4; // rough
    const ecLen = EC_L[v];
    const dataCap = CAP_L[v] + 2 + (v < 9 ? 1 : 2); // mode + count
    while (bits.length < dataCap * 8 && bits.length < totalBits) bits.push(0);

    // Convert to bytes
    const dataBytes = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8 && i + j < bits.length; j++) b = (b << 1) | bits[i + j];
      dataBytes.push(b);
    }
    // Pad with 0xEC, 0x11
    while (dataBytes.length < CAP_L[v] + 2 + (v < 9 ? 1 : 2)) {
      dataBytes.push(0xec); if (dataBytes.length < CAP_L[v] + 2 + (v < 9 ? 1 : 2)) dataBytes.push(0x11);
    }

    const ecBytes = rsEncode(dataBytes.slice(0, CAP_L[v]), ecLen);
    const allBytes = dataBytes.concat(ecBytes);

    // Place data bits in matrix (zigzag)
    let bitIdx = 0;
    const allBits = [];
    for (const b of allBytes) for (let i = 7; i >= 0; i--) allBits.push((b >> i) & 1);

    let upward = true;
    for (let col = size - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      for (let i = 0; i < size; i++) {
        const row = upward ? size - 1 - i : i;
        for (let j = 0; j < 2; j++) {
          const c = col - j;
          if (matrix[row][c] === null) {
            matrix[row][c] = allBits[bitIdx++] || false;
          }
        }
      }
      upward = !upward;
    }

    // Apply mask 0 (i mod 2 = 0)
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (matrix[r][c] !== null && (r + c) % 2 === 0 && !isReserved(r, c, size)) {
          matrix[r][c] = !matrix[r][c];
        }
      }
    }

    return matrix;
  }

  function isReserved(r, c, size) {
    const inFinder = (r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8);
    const inTiming = r === 6 || c === 6;
    return inFinder || inTiming;
  }

  function toDataURL(text, scale = 8) {
    const matrix = generate(text);
    const size = matrix.length;
    const canvas = document.createElement('canvas');
    canvas.width = size * scale; canvas.height = size * scale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (matrix[r][c]) ctx.fillRect(c * scale, r * scale, scale, scale);
      }
    }
    return canvas.toDataURL();
  }

  return { generate, toDataURL };
})();
if (typeof window !== 'undefined') window.QRCode = QRCode;
if (typeof module !== 'undefined' && module.exports) module.exports = { QRCode };
