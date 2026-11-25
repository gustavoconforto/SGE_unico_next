// The CMC-7 line printed (magnetic ink) at the bottom of a Brazilian cheque, typed or read by a scanner.
// 30 digits: banco(3) agência(4) DV2 | compensação(3) número(6) tipificação(1) | DV1 conta(10) DV3.
// Not in Django.

/** Modulo 10 check digit, weights 2,1 from the right (Luhn). */
function mod10(payload: string): string {
  let sum = 0;
  for (let i = 0; i < payload.length; i++) {
    let d = Number(payload[payload.length - 1 - i]);
    if (i % 2 === 0) d = d * 2 > 9 ? d * 2 - 9 : d * 2;
    sum += d;
  }
  return String((10 - (sum % 10)) % 10);
}

export type Cmc7 = { bank: string; branch: string; number: string; account: string };

/** Splits a CMC-7 line (separators like "<" or spaces ignored); null unless it has 30 digits whose check digits match. */
export function parseCmc7(raw: string): Cmc7 | null {
  const d = raw.replace(/\D/g, "");
  if (d.length !== 30) return null;
  // DV2 (8th) checks group 2, DV1 (19th) checks banco + agência, DV3 (30th) checks the conta
  if (mod10(d.slice(8, 18)) !== d[7] || mod10(d.slice(0, 7)) !== d[18] || mod10(d.slice(19, 29)) !== d[29]) return null;
  return {
    bank: d.slice(0, 3),
    branch: d.slice(3, 7),
    number: d.slice(11, 17),
    account: d.slice(19, 29).replace(/^0+(?=\d)/, ""),
  };
}

/** Typed something that looks like a whole CMC-7 line (30 digits or more). */
export const looksLikeCmc7 = (raw: string) => raw.replace(/\D/g, "").length >= 30;
