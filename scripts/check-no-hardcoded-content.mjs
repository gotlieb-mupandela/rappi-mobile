/**
 * Fails when handwritten storefront content is back in src/ or app/.
 * Also fails on quoted Namibia or France defaults, and on a default standard shipping assignment.
 * Tests, src/i18n/market.ts, and the recorded fixture are excluded from those extra checks.
 * An allowlist such as ['standard', 'express', 'pickup'] is not a default assignment.
 *
 * QA command:
 * rg -n --glob '!node_modules' --glob '!src/lib/storefront/generated/**' -e '\b(HOME_TILES|NAV_MENU_KEYS|HUB_TYPES|HUB_DESCRIPTIONS|AUDIENCE_IMAGES|hubImage|ATHLETES|AUDIENCES|BASE_GROUP_NAMES|TEAMWEAR_BRANCH|categoryName|CATEGORY_NAMES|CATEGORY_NAMES_FR|PRIMARY_CATEGORY_ORDER|MENUS|SPORTSWEAR_TYPES|SHOE_TYPES|CHECKOUT_COUNTRY_NAMES|COUNTRIES|SHIPPING|DATA_DRIVEN_STOREFRONT|EXPO_PUBLIC_DATA_DRIVEN_STOREFRONT)\b' -e "'J:" -e '"J:' -e "'V:" -e '"V:' src app
 * test ! -e src/lib/menus.ts && test ! -e src/lib/categories.ts && test ! -e app/menus.ts && test ! -e app/categories.ts
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['src', 'app'];
const FORBIDDEN_FILES = ['src/lib/menus.ts', 'src/lib/categories.ts', 'app/menus.ts', 'app/categories.ts'];
const IDENTIFIERS = [
  'HOME_TILES',
  'NAV_MENU_KEYS',
  'HUB_TYPES',
  'HUB_DESCRIPTIONS',
  'AUDIENCE_IMAGES',
  'hubImage',
  'ATHLETES',
  'AUDIENCES',
  'BASE_GROUP_NAMES',
  'TEAMWEAR_BRANCH',
  'categoryName',
  'CATEGORY_NAMES',
  'CATEGORY_NAMES_FR',
  'PRIMARY_CATEGORY_ORDER',
  'MENUS',
  'SPORTSWEAR_TYPES',
  'SHOE_TYPES',
  'CHECKOUT_COUNTRY_NAMES',
  'COUNTRIES',
  'SHIPPING',
  'DATA_DRIVEN_STOREFRONT',
  'EXPO_PUBLIC_DATA_DRIVEN_STOREFRONT',
];
const REF_PATTERNS = [/'J:/, /"J:/, /'V:/, /"V:/];
const COUNTRY_DEFAULT = /(['"])(?:Namibia|France)\1/;
const DEFAULT_SKIP = new Set(['src/i18n/market.ts', 'src/lib/storefront/fixture.json']);
const SHIPPING_ALLOWLIST = /\[['"]standard['"]\s*,\s*['"]express['"]\s*,\s*['"]pickup['"]\]/;
const SHIPPING_UNION = /['"]standard['"]\s*\|\s*['"]express['"]/;

function isTestFile(file) {
  return /\.test\.(ts|tsx)$/.test(file);
}

/** A selected default of the standard method, not a comparison, union, or allowlist. */
function standardDefaultAssignment(line) {
  if (!/['"]standard['"]/.test(line)) return false;
  if (SHIPPING_ALLOWLIST.test(line) || SHIPPING_UNION.test(line)) return false;
  const withoutCompare = line.replace(/[=!]{2,3}\s*['"]standard['"]/g, '');
  return (
    /useState\s*(?:<[^;\n]*>)?\s*\([^)\n]*['"]standard['"]/.test(withoutCompare) ||
    /(?<![=!])=\s*['"]standard['"]/.test(withoutCompare) ||
    /\?\?\s*['"]standard['"]/.test(withoutCompare) ||
    /\|\|\s*['"]standard['"]/.test(withoutCompare)
  );
}

function walk(dir, out) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'generated') continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, out);
    else if (/\.(ts|tsx|js|mjs|json)$/.test(name)) out.push(path);
  }
}

const failures = [];
for (const file of FORBIDDEN_FILES) {
  if (existsSync(file)) failures.push(`${file} must not exist`);
}

const files = [];
for (const root of ROOTS) walk(root, files);
const identifier = new RegExp(`\\b(?:${IDENTIFIERS.join('|')})\\b`);

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');
  const skipDefaults = isTestFile(file) || DEFAULT_SKIP.has(file);
  lines.forEach((line, index) => {
    if (identifier.test(line) || REF_PATTERNS.some((pattern) => pattern.test(line))) {
      failures.push(`${file}:${index + 1}: ${line.trim()}`);
    }
    if (!skipDefaults && (COUNTRY_DEFAULT.test(line) || standardDefaultAssignment(line))) {
      failures.push(`${file}:${index + 1}: ${line.trim()}`);
    }
  });
}

if (failures.length > 0) {
  process.stderr.write(`Hardcoded storefront content is still in src/ or app/:\n${failures.join('\n')}\n`);
  process.exit(1);
}

process.stdout.write('No hardcoded storefront content in src/ or app/.\n');
