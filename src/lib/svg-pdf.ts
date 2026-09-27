const PDF_PAGE_WIDTH = 612;
const PDF_PAGE_HEIGHT = 792;
const POINTS_PER_INCH = 72;
const PAGE_MARGIN_INCHES = 0.35;
const RASTER_DPI = 300;

function findFontFaceSource(rules: CSSRuleList, family: string): string | null {
  for (const rule of Array.from(rules)) {
    if (rule.type === CSSRule.FONT_FACE_RULE) {
      const fontFace = rule as CSSFontFaceRule;
      const fontFamily = fontFace.style.getPropertyValue("font-family").replaceAll(/["']/g, "").trim();
      if (fontFamily === family) return fontFace.style.getPropertyValue("src");
    }

    if ("cssRules" in rule) {
      const nestedRules = (rule as CSSGroupingRule).cssRules;
      if (nestedRules) {
        const nestedSource = findFontFaceSource(nestedRules, family);
        if (nestedSource) return nestedSource;
      }
    }
  }

  return null;
}

function findFontUrl(source: string) {
  const urls: string[] = [];
  const expression = /url\(\s*(?:"([^"]+)"|'([^']+)'|([^)'\"]+))\s*\)/gi;
  let match = expression.exec(source);
  while (match) {
    urls.push(match[1] ?? match[2] ?? match[3]);
    match = expression.exec(source);
  }

  return urls.find((url) => /\.woff2?(?:[?#]|$)/i.test(url)) ?? urls[0] ?? null;
}

function encodeBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let start = 0; start < bytes.length; start += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(start, start + chunkSize));
  }
  return btoa(binary);
}

async function embedChordFont(svg: SVGSVGElement) {
  if (!svg.querySelector(".abcjs-chord")) return;

  let fontSource: string | null = null;
  let fontBase = document.baseURI;
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      fontSource = findFontFaceSource(sheet.cssRules, "Bravura Chord Symbols");
      if (fontSource) {
        fontBase = sheet.href ?? document.baseURI;
        break;
      }
    } catch {
      // Ignore stylesheets that the browser does not allow this page to inspect.
    }
  }

  let fontUrl = fontSource ? findFontUrl(fontSource) : null;
  if (!fontUrl) {
    const loadedFont = performance
      .getEntriesByType("resource")
      .find((entry) => /bravura.*\.woff2?(?:[?#]|$)/i.test(entry.name));
    fontUrl = loadedFont?.name ?? null;
  }
  if (!fontUrl) throw new Error("The chord font is unavailable for image export.");

  let fontData: string;
  let fontFormat: string;
  if (fontUrl.startsWith("data:")) {
    const dataUrl = fontUrl;
    const separator = dataUrl.indexOf(",");
    if (separator < 0) throw new Error("The chord font could not be prepared for image export.");
    fontData = dataUrl.slice(separator + 1);
    fontFormat = /woff2/i.test(dataUrl.slice(0, separator)) ? "woff2" : "woff";
  } else {
    const response = await fetch(new URL(fontUrl, fontBase));
    if (!response.ok) throw new Error("The chord font could not be loaded for image export.");
    fontData = encodeBase64(new Uint8Array(await response.arrayBuffer()));
    fontFormat = /\.woff2?(?:[?#]|$)/i.test(fontUrl) && !/\.woff(?:[?#]|$)/i.test(fontUrl) ? "woff2" : "woff";
  }

  const fontStyle = document.createElementNS("http://www.w3.org/2000/svg", "style");
  fontStyle.textContent = `@font-face {
    font-family: "Bravura Chord Symbols";
    font-style: normal;
    font-weight: 400;
    size-adjust: 150%;
    src: url("data:font/${fontFormat};base64,${fontData}") format("${fontFormat}");
  }`;
  svg.insertBefore(fontStyle, svg.firstChild);
}

function getSvgSize(svg: SVGSVGElement, image: HTMLImageElement) {
  const viewBox = svg.viewBox.baseVal;
  const viewBoxValues = svg.getAttribute("viewBox")?.trim().split(/[\s,]+/).map(Number);
  return {
    width: viewBox.width || viewBoxValues?.[2] || image.naturalWidth,
    height: viewBox.height || viewBoxValues?.[3] || image.naturalHeight,
  };
}

export function svgToLetterPage(svg: SVGSVGElement) {
  const margin = PAGE_MARGIN_INCHES * POINTS_PER_INCH;
  const page = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  page.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  page.setAttribute("width", "8.5in");
  page.setAttribute("height", "11in");
  page.setAttribute("viewBox", `0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}`);

  const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  background.setAttribute("width", String(PDF_PAGE_WIDTH));
  background.setAttribute("height", String(PDF_PAGE_HEIGHT));
  background.setAttribute("fill", "#ffffff");
  page.appendChild(background);

  const sheet = svg.cloneNode(true) as SVGSVGElement;
  sheet.setAttribute("x", String(margin));
  sheet.setAttribute("y", String(margin));
  sheet.setAttribute("width", String(PDF_PAGE_WIDTH - margin * 2));
  sheet.setAttribute("height", String(PDF_PAGE_HEIGHT - margin * 2));
  sheet.setAttribute("preserveAspectRatio", "xMidYMin meet");
  page.appendChild(sheet);
  return page;
}

export async function svgToPng(svg: SVGSVGElement) {
  const letterPage = svgToLetterPage(svg);
  await embedChordFont(letterPage);

  const svgBlob = new Blob([new XMLSerializer().serializeToString(letterPage)], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    const image = new Image();
    image.src = svgUrl;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = Math.round((PDF_PAGE_WIDTH / POINTS_PER_INCH) * RASTER_DPI);
    canvas.height = Math.round((PDF_PAGE_HEIGHT / POINTS_PER_INCH) * RASTER_DPI);
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("The browser could not prepare the PNG image.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("The browser could not render the PNG image."));
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function concatenateBytes(chunks: Uint8Array[]) {
  const result = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function createPdf(jpeg: Uint8Array, imageWidth: number, imageHeight: number) {
  const encoder = new TextEncoder();
  const pageContent = encoder.encode("q\n612 0 0 792 0 0 cm\n/Im0 Do\nQ");
  const objects = [
    encoder.encode("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"),
    encoder.encode("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"),
    encoder.encode("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n"),
    concatenateBytes([
      encoder.encode(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),
      jpeg,
      encoder.encode("\nendstream\nendobj\n"),
    ]),
    concatenateBytes([
      encoder.encode(`5 0 obj\n<< /Length ${pageContent.length} >>\nstream\n`),
      pageContent,
      encoder.encode("\nendstream\nendobj\n"),
    ]),
  ];
  const header = encoder.encode("%PDF-1.4\n");
  const offsets: number[] = [];
  let fileOffset = header.length;
  for (const object of objects) {
    offsets.push(fileOffset);
    fileOffset += object.length;
  }

  const xrefOffset = fileOffset;
  const crossReference = encoder.encode(
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((offset) => `${offset.toString().padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
  );
  return new Blob([header, ...objects, crossReference], { type: "application/pdf" });
}

export async function svgToPdf(svg: SVGSVGElement) {
  await embedChordFont(svg);

  const svgBlob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    const image = new Image();
    image.src = svgUrl;
    await image.decode();

    const pageWidth = Math.round((PDF_PAGE_WIDTH / 72) * RASTER_DPI);
    const pageHeight = Math.round((PDF_PAGE_HEIGHT / 72) * RASTER_DPI);
    const margin = Math.round(PAGE_MARGIN_INCHES * RASTER_DPI);
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;
    const size = getSvgSize(svg, image);
    const scale = Math.min(availableWidth / size.width, availableHeight / size.height);
    const drawingWidth = size.width * scale;
    const drawingHeight = size.height * scale;
    const canvas = document.createElement("canvas");
    canvas.width = pageWidth;
    canvas.height = pageHeight;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("The browser could not prepare the PDF page.");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, pageWidth, pageHeight);
    context.drawImage(
      image,
      margin + (availableWidth - drawingWidth) / 2,
      margin,
      drawingWidth,
      drawingHeight,
    );

    const jpegBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("The browser could not render the PDF page."));
      }, "image/jpeg", 0.98);
    });
    return createPdf(new Uint8Array(await jpegBlob.arrayBuffer()), pageWidth, pageHeight);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
