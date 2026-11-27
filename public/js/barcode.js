/**
 * Lightweight Code39 SVG Barcode Generator (Zero External Dependencies)
 */
const CODE39_MAP = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn",
  "4": "nnnwwnnnw", "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw",
  "8": "wnnwnnwnn", "9": "nnwwnnwnn", "A": "wnnnnwnnw", "B": "nnwnnwnnw",
  "C": "wnwnnwnnn", "D": "nnnnwwnnw", "E": "wnnnwwnnn", "F": "nnwnwwnnn",
  "G": "nnnnnwwnw", "H": "wnnnnwwnn", "I": "nnwnnwwnn", "J": "nnnnwwwnn",
  "K": "wnnnnnnww", "L": "nnwnnnnww", "M": "wnwnnnnwn", "N": "nnnnwnnww",
  "O": "wnnnwnnwn", "P": "nnwnwnnwn", "Q": "nnnnnnwww", "R": "wnnnnnwwn",
  "S": "nnwnnnwwn", "T": "nnnnwnwwn", "U": "wwnnnnnnw", "V": "nwwnnnnnw",
  "W": "wwwnnnnnn", "X": "nwnnwnnnw", "Y": "wwnnwnnnn", "Z": "nwwnwnnnn",
  "-": "nwnnnnwnw", ".": "wwnnnnwnn", " ": "nwwnnnwnn", "*": "nwnnwnwnn",
  "$": "nwnwnwnnn", "/": "nwnwnnnwn", "+": "nwnnnwnwn", "%": "nnnwnwnwn"
};

export function renderBarcodeSVG(value, height = 38) {
  const safe = `*${String(value || "CVH000").toUpperCase().replace(/[^0-9A-Z\-. $/+%]/g, "-")}*`;
  let x = 4;
  const rects = [];
  const narrow = 1.6;
  const wide = 3.6;

  for (const ch of safe) {
    const pattern = CODE39_MAP[ch] || CODE39_MAP["-"];
    for (let i = 0; i < pattern.length; i++) {
      const w = pattern[i] === "w" ? wide : narrow;
      if (i % 2 === 0) {
        rects.push(`<rect x="${x.toFixed(1)}" y="2" width="${w}" height="${height}" fill="#0f172a"/>`);
      }
      x += w;
    }
    x += narrow;
  }

  const totalW = Math.ceil(x + 4);
  return `
    <div class="barcode-box">
      <svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${height + 4}" viewBox="0 0 ${totalW} ${height + 4}" role="img" aria-label="Barcode ${value}">
        ${rects.join("")}
      </svg>
      <div style="font-family:monospace;font-size:10.5px;letter-spacing:1.2px;margin-top:2px;">${String(value || "")}</div>
    </div>
  `;
}
