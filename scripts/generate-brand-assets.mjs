import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);
const IconFile =
  require("../desktop/node_modules/resedit/dist/data/IconFile.js").default;
const RawIconItem =
  require("../desktop/node_modules/resedit/dist/data/RawIconItem.js").default;

const iconPalette = {
  badgeTop: "#0A1C34",
  badgeBottom: "#15355D",
  badgeStroke: "#214A7A",
  cyanTop: "#A4F1FF",
  cyanBottom: "#4BA8FF",
  greenTop: "#63F0D1",
  greenBottom: "#28C873",
  bridgeLeft: "#89EFFF",
  bridgeRight: "#3FD9AC",
  nodeBlue: "#7DE8FF",
  nodeGreen: "#48DC96",
  nodeTeal: "#7DEBD7",
  ink: "#071322",
  shine: "#BDEFFF",
};

function ensureDir(dirPath) {
  mkdirSync(dirPath, { recursive: true });
}

function toArrayBuffer(buffer) {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
}

function createIconDefsBody() {
  return `
      <linearGradient id="hcBadgeFill" x1="20" y1="12" x2="108" y2="116" gradientUnits="userSpaceOnUse">
        <stop stop-color="${iconPalette.badgeTop}" />
        <stop offset="1" stop-color="${iconPalette.badgeBottom}" />
      </linearGradient>
      <linearGradient id="hcShineFill" x1="24" y1="18" x2="74" y2="64" gradientUnits="userSpaceOnUse">
        <stop stop-color="#8EDFFF" stop-opacity="0.42" />
        <stop offset="1" stop-color="#8EDFFF" stop-opacity="0" />
      </linearGradient>
      <linearGradient id="hcLeftFill" x1="31" y1="28" x2="49" y2="100" gradientUnits="userSpaceOnUse">
        <stop stop-color="${iconPalette.cyanTop}" />
        <stop offset="1" stop-color="${iconPalette.cyanBottom}" />
      </linearGradient>
      <linearGradient id="hcRightFill" x1="79" y1="28" x2="97" y2="100" gradientUnits="userSpaceOnUse">
        <stop stop-color="${iconPalette.greenTop}" />
        <stop offset="1" stop-color="${iconPalette.greenBottom}" />
      </linearGradient>
      <linearGradient id="hcBridgeFill" x1="45" y1="57" x2="83" y2="71" gradientUnits="userSpaceOnUse">
        <stop stop-color="${iconPalette.bridgeLeft}" />
        <stop offset="1" stop-color="${iconPalette.bridgeRight}" />
      </linearGradient>
      <filter id="hcBadgeShadow" x="0" y="0" width="128" height="128" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
        <feFlood flood-opacity="0" result="BackgroundImageFix" />
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
        <feOffset dy="5" />
        <feGaussianBlur stdDeviation="4" />
        <feComposite in2="hardAlpha" operator="out" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.0196078 0 0 0 0 0.0588235 0 0 0 0 0.133333 0 0 0 0.34 0" />
        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_0_1" />
        <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_0_1" result="shape" />
      </filter>
  `;
}

function createIconMarkup() {
  return `
    <g filter="url(#hcBadgeShadow)">
      <rect x="12" y="12" width="104" height="104" rx="30" fill="url(#hcBadgeFill)" stroke="${iconPalette.badgeStroke}" stroke-width="4" />
      <path d="M28 22C36 17 47 16 58 19" stroke="${iconPalette.shine}" stroke-opacity="0.7" stroke-width="5" stroke-linecap="round" />
      <path d="M24 20H62C67 20 72 25 72 30V56C72 61 67 66 62 66H32C27 66 22 61 22 56V30C22 25 23 22 24 20Z" fill="url(#hcShineFill)" opacity="0.7" />
      <path d="M31 28C31 23.03 35.03 19 40 19C44.97 19 49 23.03 49 28V100H31V28Z" fill="url(#hcLeftFill)" />
      <path d="M79 28C79 23.03 83.03 19 88 19C92.97 19 97 23.03 97 28V100H79V28Z" fill="url(#hcRightFill)" />
      <rect x="45" y="57" width="38" height="14" rx="7" fill="url(#hcBridgeFill)" />
      <path d="M33 33H44" stroke="${iconPalette.cyanTop}" stroke-width="6" stroke-linecap="round" />
      <path d="M86 95H98" stroke="${iconPalette.greenTop}" stroke-width="6" stroke-linecap="round" />
      <path d="M88 33H97" stroke="${iconPalette.greenTop}" stroke-width="6" stroke-linecap="round" />
      <circle cx="26" cy="33" r="8" fill="${iconPalette.nodeBlue}" stroke="${iconPalette.ink}" stroke-width="4" />
      <circle cx="102" cy="95" r="9" fill="${iconPalette.nodeGreen}" stroke="${iconPalette.ink}" stroke-width="4" />
      <circle cx="102" cy="33" r="7" fill="${iconPalette.nodeTeal}" stroke="${iconPalette.ink}" stroke-width="4" />
      <rect x="31" y="28" width="18" height="72" rx="9" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5" />
      <rect x="79" y="28" width="18" height="72" rx="9" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5" />
      <rect x="45" y="57" width="38" height="14" rx="7" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1.5" />
    </g>
  `;
}

function createFaviconSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
${createIconDefsBody()}  </defs>
${createIconMarkup()}
</svg>
`;
}

function writeIco(outputPath, sizes, pngBySize) {
  const iconFile = new IconFile();
  for (const size of sizes) {
    const png = pngBySize.get(size);
    if (!png) {
      continue;
    }

    iconFile.icons.push({
      width: size,
      height: size,
      colors: 0,
      planes: 1,
      bitCount: 32,
      data: RawIconItem.from(toArrayBuffer(png), size, size, 32),
    });
  }

  writeFileSync(outputPath, Buffer.from(iconFile.generate()));
}

function createIcnsChunk(type, data) {
  const header = Buffer.alloc(8);
  header.write(type, 0, 4, "ascii");
  header.writeUInt32BE(data.length + 8, 4);
  return Buffer.concat([header, data]);
}

function writeIcns(outputPath, pngBySize) {
  const chunkTypes = new Map([
    [16, "icp4"],
    [32, "icp5"],
    [64, "icp6"],
    [128, "ic07"],
    [256, "ic08"],
    [512, "ic09"],
    [1024, "ic10"],
  ]);

  const chunks = [];
  for (const [size, type] of chunkTypes) {
    const png = pngBySize.get(size);
    if (!png) {
      continue;
    }

    chunks.push(createIcnsChunk(type, png));
  }

  const totalLength = 8 + chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const header = Buffer.alloc(8);
  header.write("icns", 0, 4, "ascii");
  header.writeUInt32BE(totalLength, 4);
  writeFileSync(outputPath, Buffer.concat([header, ...chunks], totalLength));
}

function main() {
  const frontendPublicDir = path.join(repoRoot, "frontend", "public");
  const frontendAssetsDir = path.join(repoRoot, "frontend", "src", "assets");
  const desktopBuildDir = path.join(repoRoot, "desktop", "build");
  const desktopBuildIconsDir = path.join(desktopBuildDir, "icons");
  const desktopRuntimeAssetsDir = path.join(
    repoRoot,
    "desktop",
    "src",
    "assets",
  );

  ensureDir(frontendPublicDir);
  ensureDir(frontendAssetsDir);
  ensureDir(desktopBuildDir);
  ensureDir(desktopBuildIconsDir);
  ensureDir(desktopRuntimeAssetsDir);

  writeFileSync(
    path.join(frontendPublicDir, "favicon.svg"),
    createFaviconSvg(),
    "utf8",
  );

  const iconSizes = [16, 32, 48, 64, 128, 256, 512, 1024];
  const pngBySize = new Map(
    iconSizes.map((size) => {
      const iconPath = path.join(desktopBuildIconsDir, `${size}x${size}.png`);
      if (!existsSync(iconPath)) {
        throw new Error(`Missing raster icon source: ${iconPath}`);
      }

      return [size, readFileSync(iconPath)];
    }),
  );

  copyFileSync(
    path.join(desktopBuildIconsDir, "16x16.png"),
    path.join(frontendPublicDir, "favicon-16x16.png"),
  );
  copyFileSync(
    path.join(desktopBuildIconsDir, "32x32.png"),
    path.join(frontendPublicDir, "favicon-32x32.png"),
  );
  copyFileSync(
    path.join(desktopBuildIconsDir, "512x512.png"),
    path.join(desktopBuildDir, "icon.png"),
  );
  copyFileSync(
    path.join(desktopBuildIconsDir, "512x512.png"),
    path.join(desktopRuntimeAssetsDir, "window-icon.png"),
  );

  writeIco(
    path.join(frontendPublicDir, "favicon.ico"),
    [16, 32, 48, 64],
    pngBySize,
  );
  writeIco(
    path.join(desktopBuildDir, "icon.ico"),
    [16, 32, 48, 64, 128, 256],
    pngBySize,
  );
  writeIcns(path.join(desktopBuildDir, "icon.icns"), pngBySize);
}

main();
