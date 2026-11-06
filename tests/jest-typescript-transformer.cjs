const ts = require('typescript');

// Vite-flavored sources (the NewUI frontend tree) read `import.meta.env` /
// `import.meta.url`. TypeScript's transpile-only CommonJS emit leaves
// `import.meta` untouched, and Node's CommonJS parser rejects it outright
// ("Cannot use 'import.meta' outside a module") — that is what kept
// tests/frontend/vite-runtime.test.tsx from even loading. Rewrite the
// emitted code to the CommonJS equivalents, matching how Vite exposes the
// same values at runtime (env bag + module URL).
function rewriteImportMeta(code) {
  return code
    .replace(/import\.meta\.env\b/g, 'process.env')
    .replace(/import\.meta\.url\b/g, "require('node:url').pathToFileURL(__filename).href")
    .replace(/import\.meta\b/g, '({ env: process.env })');
}

module.exports = {
  process(sourceText, sourcePath) {
    const result = ts.transpileModule(sourceText, {
      fileName: sourcePath,
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.Node10,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        sourceMap: false,
        isolatedModules: true,
      },
    });
    return { code: rewriteImportMeta(result.outputText) };
  },
};
