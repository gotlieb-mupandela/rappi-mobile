import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const stubUrl = pathToFileURL(fileURLToPath(new URL('./rn-stub.tsx', import.meta.url))).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'react-native') {
    return { url: stubUrl, shortCircuit: true };
  }
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
