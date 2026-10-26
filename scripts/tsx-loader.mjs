import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const stubUrl = pathToFileURL(fileURLToPath(new URL('./rn-stub.tsx', import.meta.url))).href;
const secureStoreUrl = pathToFileURL(fileURLToPath(new URL('./secure-store-stub.mjs', import.meta.url))).href;
const rootDir = fileURLToPath(new URL('..', import.meta.url));

function aliasUrl(specifier) {
  if (!specifier.startsWith('@/')) return null;
  const base = rootDir + specifier.slice(2);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.mjs`]) {
    if (existsSync(candidate)) return pathToFileURL(candidate).href;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'react-native' || specifier === 'expo-image') {
    return { url: stubUrl, shortCircuit: true };
  }
  if (specifier === 'expo-secure-store') {
    return { url: secureStoreUrl, shortCircuit: true };
  }
  const aliased = aliasUrl(specifier);
  if (aliased) return { url: aliased, shortCircuit: true };
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (!url.endsWith('.ts') && !url.endsWith('.tsx')) return nextLoad(url, context);
  const source = await readFile(fileURLToPath(url), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: url,
  });
  return { format: 'module', source: output.outputText, shortCircuit: true };
}
