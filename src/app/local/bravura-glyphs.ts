// Unicode ranges extracted from the installed @fontsource/bravura WOFF cmap.
// Keep the full sparse ranges so the page includes every mapped code point.
const FONT_RANGES = `
20 bc-be 215b 2669-266f
e000-e00d e010-e024 e030-e039 e040-e04d e050-e0fc e100-e10a e110-e11d e120-e147 e150-e1cb e1d0-e1e7 e1f0-e203 e210-e234 e240-e251 e260-e26d e270-e27b e280-e285 e290-e29c e2a0-e2a5 e2b0-e2b7 e2c0-e2fb e300-e319 e31c-e335 e340-e367 e370-e387 e390-e3ad e3b0-e3dd e3e0-e3f3 e420-e435 e440-e447 e450-e457 e460-e461 e470-e48f e4a0-e4bd e4c0-e4d6 e4e0-e4f6 e500-e505 e510-e549 e550-e555 e560-e589 e590-e5a8 e5b0-e5c8 e5d0-e60b e610-e62a e630-e63b e640-e64b e650-e677 e680-e69d e6a0-e6b2 e6c0-e6c8 e6d0-e6e4 e6f0-e6fc e700-e701 e710-e71a e720-e72a e730-e734 e740-e748 e750-e75a e760-e767 e770-e80e e810-e821 e830-e849 e850-e85a e860-e86b e870-e87c e880-e88a e890-e89a e8a0-e8d6 e8e0-e8e7 e8f0-e8f8 e900-e90b e910-e94c e950-e961 e970-e9a1 e9b0-e9c5 e9d0-e9d9 e9e0-e9e5 e9f0-e9f8 ea00-ea10 ea20-ea2a ea30-ea41 ea50-eb03 eb10-eb50 eb60-ebb0 ebc0-ebd5 ebe0-ebf6 ec00-ec23 ec30-ec3e ec40-ec46 ec50-ec5a ec60-ec64 ec80-ec86 ec90-ec98 eca0-ecb7 ecc0-ecc2 ecd0-ecdd ece0-eceb ecf0-ecfb ed00-ed03 ed10-ed2e ed30-ed38 ed40-ed47 ed50-ed5e ed60-ed66 ed70 ed80-ed8f eda0-edf1 ee00-ee3f f400-f5fa
1d100-1d126 1d129-1d1e8
`;

const ranges = FONT_RANGES.trim().split(/\s+/).map((range) => {
  const [start, end = start] = range.split("-");
  return [Number.parseInt(start, 16), Number.parseInt(end, 16)] as const;
});

export const BRAVURA_CODE_POINTS = ranges.flatMap(([start, end]) =>
  Array.from({ length: end - start + 1 }, (_, offset) => start + offset),
);
