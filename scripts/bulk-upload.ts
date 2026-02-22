import { readFileSync, readdirSync } from "fs";
import path from "path";
import { uploadImageToCloudinary } from "../src/lib/cloudinary";
import { prisma } from "../src/lib/prisma";
import { slugify } from "../src/lib/slug";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const PRICES = Array.from({ length: 16 }, (_, i) => 15000 + i * 1000); // [15000, 16000, ..., 30000]

const MEASUREMENTS = "35 x 40 cm";

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  };
  return map[ext] ?? "application/octet-stream";
}

function cleanTitle(filename: string): string {
  const nameWithoutExt = path.parse(filename).name;
  return nameWithoutExt
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function makeUniqueSlug(base: string): Promise<string> {
  const slug = slugify(base);
  let suffix = 0;

  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing = await prisma.product.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    suffix++;
  }
}

async function main() {
  const folderArg = process.argv[2];
  if (!folderArg) {
    console.error("Usage: npx tsx --env-file=.env scripts/bulk-upload.ts <folder-path>");
    process.exit(1);
  }

  const folderPath = path.resolve(folderArg);

  let entries: string[];
  try {
    entries = readdirSync(folderPath);
  } catch {
    console.error(`Cannot read folder: ${folderPath}`);
    process.exit(1);
  }

  const imageFiles = entries.filter((name) => {
    const ext = path.extname(name).toLowerCase();
    return IMAGE_EXTENSIONS.has(ext);
  });

  if (imageFiles.length === 0) {
    console.log("No image files found in folder.");
    process.exit(0);
  }

  console.log(`Found ${imageFiles.length} image(s). Starting upload...\n`);

  const admin = await prisma.adminUser.findFirst();
  if (!admin) {
    console.error("No AdminUser found in the database. Create one first.");
    process.exit(1);
  }

  let created = 0;
  let errors = 0;

  for (const filename of imageFiles) {
    const filePath = path.join(folderPath, filename);
    const ext = path.extname(filename).toLowerCase();
    const title = cleanTitle(filename);

    try {
      const buffer = readFileSync(filePath);
      const file = new File([buffer], filename, { type: getMimeType(ext) });

      const { url } = await uploadImageToCloudinary(file);
      const slug = await makeUniqueSlug(title);
      const price = randomFrom(PRICES);
      const stock = Math.floor(Math.random() * 5) + 1;

      await prisma.product.create({
        data: {
          slug,
          title,
          description: `${title} - descripción genérica`,
          measurements: MEASUREMENTS,
          priceArs: price,
          stock,
          status: "ACTIVE",
          createdByAdminId: admin.id,
          images: {
            create: {
              url,
              altText: title,
              sortOrder: 0,
            },
          },
        },
      });

      console.log(`✓ Creado: ${title}`);
      created++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`✗ Error: ${title} — ${message}`);
      errors++;
    }
  }

  console.log(`\nResumen: ${created} creados, ${errors} errores`);
  await prisma.$disconnect();
}

main();
