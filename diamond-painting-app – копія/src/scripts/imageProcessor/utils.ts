// utils.ts
export function getDisplayNumber(index: number): string {
    if (index <= 9) {
      return index.toString(); // 1 to 9
    }
    // Adjust index for letter-based numbering (A starts at 10)
    const adjustedIndex = index - 9; // 10 becomes 1, 11 becomes 2, etc.
    let result = '';
    let num = adjustedIndex;
  
    while (num > 0) {
      num--; // Adjust for 1-based indexing (A is 1, not 0)
      const charCode = (num % 26) + 65; // 65 is ASCII for 'A'
      result = String.fromCharCode(charCode) + result;
      num = Math.floor(num / 26);
    }
  
    return result; // 10 -> A, 11 -> B, ..., 35 -> Z, 36 -> AA, 37 -> AB, ...
  }
  
  export function findClosestColor(
    r: number,
    g: number,
    b: number,
    colors: { rgb: [number, number, number] }[]
  ): { rgb: [number, number, number] } {
    let minDistance = Infinity;
    let closestColor: { rgb: [number, number, number] } = { rgb: [0, 0, 0] };
  
    for (const color of colors) {
      const [cr, cg, cb] = color.rgb;
      const distance = Math.sqrt(
        (r - cr) ** 2 +
        (g - cg) ** 2 +
        (b - cb) ** 2
      );
  
      if (distance < minDistance) {
        minDistance = distance;
        closestColor = color;
      }
    }
  
    return closestColor;
  }