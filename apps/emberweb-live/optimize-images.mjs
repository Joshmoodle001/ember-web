import { createRequire } from "node:module";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const assetRoot = path.join(appRoot, "assets");
const manifestPath = path.join(appRoot, "image-manifest.json");
// Set SHARP_MODULE_PATH to a Sharp package directory when `sharp` is not installed locally.
const sourceDirectories = [
  path.join(assetRoot, "visuals"),
  path.join(assetRoot, "brand"),
];
const responsiveWidths = [640, 960];
const quality = 88;
const effort = 5;
const appRequire = createRequire(import.meta.url);
const sharpSpecifier = process.env.SHARP_MODULE_PATH?.trim() || "sharp";
const sharpModule = appRequire(sharpSpecifier);
const sharp = sharpModule.default ?? sharpModule;

if (typeof sharp !== "function") {
  throw new Error("The selected Sharp module does not export the Sharp image function.");
}

function assertInsideAssetRoot(filePath) {
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(assetRoot + path.sep)) {
    throw new Error("Refusing to read or write outside the EmberWeb assets directory.");
  }
  return resolved;
}

function toAssetUrl(filePath) {
  const relative = path.relative(assetRoot, filePath).split(path.sep).join("/");
  return "/" + relative;
}

function roundPercent(value, total) {
  return total === 0 ? 0 : Number(((value / total) * 100).toFixed(2));
}

async function listPngs(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".png"))
    .map((entry) => assertInsideAssetRoot(path.join(directory, entry.name)))
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

async function inspectOutput(outputPath, expectedWidth, expectedHeight, preserveAlpha) {
  const outputMeta = await sharp(outputPath).metadata();
  if (outputMeta.width !== expectedWidth || outputMeta.height !== expectedHeight) {
    throw new Error(
      `Unexpected dimensions for ${path.relative(appRoot, outputPath)}: ` +
        `${outputMeta.width}x${outputMeta.height}; expected ${expectedWidth}x${expectedHeight}.`,
    );
  }
  if (preserveAlpha && !outputMeta.hasAlpha) {
    throw new Error(`Transparency was lost in ${path.relative(appRoot, outputPath)}.`);
  }
  return outputMeta;
}

const sourceFiles = (await Promise.all(sourceDirectories.map(listPngs)))
  .flat()
  .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
if (sourceFiles.length === 0) {
  throw new Error("No PNG images were found in assets/visuals or assets/brand.");
}

const images = {};
let sourceTotalBytes = 0;
let fullSizeWebpTotalBytes = 0;
let responsiveVariantBytes = 0;
let responsiveVariantCount = 0;

for (const sourcePath of sourceFiles) {
  assertInsideAssetRoot(sourcePath);
  const sourceStats = await stat(sourcePath);
  const sourceMeta = await sharp(sourcePath).metadata();
  if (!sourceMeta.width || !sourceMeta.height) {
    throw new Error(`Sharp could not read dimensions for ${path.relative(appRoot, sourcePath)}.`);
  }

  const sourceWidth = sourceMeta.width;
  const sourceHeight = sourceMeta.height;
  const sourceHasAlpha = Boolean(sourceMeta.hasAlpha);
  const extensionlessPath = sourcePath.slice(0, -path.extname(sourcePath).length);
  const mainPath = assertInsideAssetRoot(extensionlessPath + ".webp");
  await mkdir(path.dirname(mainPath), { recursive: true });
  await sharp(sourcePath)
    .webp({ quality, effort, smartSubsample: true, alphaQuality: 100 })
    .toFile(mainPath);
  const mainMeta = await inspectOutput(mainPath, sourceWidth, sourceHeight, sourceHasAlpha);
  const mainStats = await stat(mainPath);

  const variants = [];
  for (const width of responsiveWidths) {
    if (width >= sourceWidth) continue;

    const variantPath = assertInsideAssetRoot(`${extensionlessPath}-${width}.webp`);
    const expectedHeight = Math.max(1, Math.round((sourceHeight * width) / sourceWidth));
    await sharp(sourcePath)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, effort, smartSubsample: true, alphaQuality: 100 })
      .toFile(variantPath);
    const variantMeta = await inspectOutput(variantPath, width, expectedHeight, sourceHasAlpha);
    const variantStats = await stat(variantPath);

    variants.push({
      requestedWidth: width,
      url: toAssetUrl(variantPath),
      width: variantMeta.width,
      height: variantMeta.height,
      bytes: variantStats.size,
    });
    responsiveVariantBytes += variantStats.size;
    responsiveVariantCount += 1;
  }

  const savingsBytes = sourceStats.size - mainStats.size;
  images[toAssetUrl(sourcePath)] = {
    width: sourceWidth,
    height: sourceHeight,
    hasAlpha: sourceHasAlpha,
    sourceBytes: sourceStats.size,
    mainWebp: {
      url: toAssetUrl(mainPath),
      width: mainMeta.width,
      height: mainMeta.height,
      bytes: mainStats.size,
    },
    variants,
    fullSizeSavingsBytes: savingsBytes,
    fullSizeSavingsPercent: roundPercent(savingsBytes, sourceStats.size),
  };

  sourceTotalBytes += sourceStats.size;
  fullSizeWebpTotalBytes += mainStats.size;
}

const fullSizeSavingsBytes = sourceTotalBytes - fullSizeWebpTotalBytes;
const allGeneratedWebpBytes = fullSizeWebpTotalBytes + responsiveVariantBytes;
const manifest = {
  schemaVersion: 1,
  encoder: {
    format: "webp",
    quality,
    effort,
    responsiveWidths,
    preserveAlpha: true,
    preserveOriginalDimensions: true,
  },
  totals: {
    sourceImages: sourceFiles.length,
    sourceBytes: sourceTotalBytes,
    fullSizeWebpBytes: fullSizeWebpTotalBytes,
    fullSizeSavingsBytes,
    fullSizeSavingsPercent: roundPercent(fullSizeSavingsBytes, sourceTotalBytes),
    responsiveVariantCount,
    responsiveVariantBytes,
    allGeneratedWebpBytes,
    generatedBytesWhileOriginalsAreKept: sourceTotalBytes + allGeneratedWebpBytes,
  },
  images,
};

await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
process.stdout.write(
  `Optimized ${sourceFiles.length} PNGs: ${sourceTotalBytes} source bytes → ` +
    `${fullSizeWebpTotalBytes} full-size WebP bytes ` +
    `(${fullSizeSavingsBytes} bytes / ${manifest.totals.fullSizeSavingsPercent}% saved). ` +
    `Generated ${responsiveVariantCount} responsive variants (${responsiveVariantBytes} bytes); ` +
    `wrote ${path.relative(appRoot, manifestPath)}.\n`,
);
