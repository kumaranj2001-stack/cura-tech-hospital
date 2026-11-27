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
  const safe = `*${String(value || "CTH000").toUpperCase().replace(/[^0-9A-Z\-. $/+%]/g, "-")}*`;
  let x = 4;
  const bars = [];
  for (const ch of safe) {
    const pattern = CODE39_MAP[ch] || CODE39_MAP["-"];
    for (let i = 0; i < pattern.length; i++) {
      const width = pattern[i] === "w" ? 3 : 1.2;
      if (i % 2 === 0) {
        bars.push(`<rect x="${x.toFixed(1)}" y="2" width="${width}" height="${height}" fill="#0f172a"/>`);
      }
      x += width;
    }
    x += 2; // inter-character gap
  }
  const totalWidth = Math.ceil(x + 4);
  return `
    <div class="barcode-box">
      <svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height + 4}" viewBox="0 0 ${totalWidth} ${height + 4}">
        ${bars.join("")}
      </svg>
      <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:1.2px;margin-top:2px;">${String(value || "")}</div>
    </div>
  `;
}
