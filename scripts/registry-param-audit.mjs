import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const registryPath = path.join(root, 'src', 'registry.ts');
const codePath = path.join(root, 'src', 'code.ts');
const editabilityPath = path.join(root, 'src', 'editability.ts');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function extractSetValues(text, name) {
  const pattern = new RegExp(`${name}\\s*=\\s*new Set\\(\\[([\\s\\S]*?)\\]\\)`, 'm');
  const match = text.match(pattern);
  if (!match) return [];
  const raw = match[1];
  return [...raw.matchAll(/'([^']+)'|\"([^\"]+)\"/g)].map((m) => m[1] || m[2]).filter(Boolean);
}

function extractComponentEditableMap(text) {
  const pattern = /COMPONENT_EDITABLE_PARAM_KEYS(?:\\s*:\\s*[^=]+)?\\s*=\\s*\\{([\\s\\S]*?)\\}\\s*;?/m;
  const match = text.match(pattern);
  if (!match) return new Map();
  const body = match[1];
  const map = new Map();
  const entries = [...body.matchAll(/([A-Za-z0-9_-]+|'[^']+'|\"[^\"]+\")\\s*:\\s*\\[([^\\]]*)\\]/g)];
  entries.forEach((entry) => {
    const rawKey = entry[1];
    const key = rawKey.startsWith("'") || rawKey.startsWith('"')
      ? rawKey.slice(1, -1)
      : rawKey;
    const rawList = entry[2];
    const values = [...rawList.matchAll(/'([^']+)'|\"([^\"]+)\"/g)].map((m) => m[1] || m[2]).filter(Boolean);
    map.set(key, values);
  });
  return map;
}

function loadRegistry(filePath) {
  const text = readText(filePath);
  const match = text.match(/export const COMPONENT_REGISTRY[^=]*=\\s*([\\s\\S]*);\\s*$/m);
  if (!match) {
    throw new Error(`Unable to locate COMPONENT_REGISTRY in ${path.relative(root, filePath)}`);
  }
  return JSON.parse(match[1]);
}

function isKeyUsedInRuntime(codeText, key) {
  const escaped = key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
  const paramObjects = [
    'params',
    'formParams',
    'rowParams',
    'fieldParams',
    'currentParams',
    'nextParams',
    'childParams',
    'colParams',
    'tableParams',
    'tagParams',
    'normalizedParams'
  ];
  const paramObjectPattern = paramObjects.join('|');
  const dotPattern = new RegExp(`\\b(?:${paramObjectPattern})\\s*(?:\\.|\\?\\.)\\s*${escaped}\\b`);
  const bracketPattern = new RegExp(`\\b(?:${paramObjectPattern})\\s*\\[\\s*['\"]${escaped}['\"]\\s*\\]`);
  const nestedDotPattern = new RegExp(`\\b\\w+\\.params\\s*(?:\\.|\\?\\.)\\s*${escaped}\\b`);
  const nestedBracketPattern = new RegExp(`\\b\\w+\\.params\\s*\\[\\s*['\"]${escaped}['\"]\\s*\\]`);
  return (
    dotPattern.test(codeText) ||
    bracketPattern.test(codeText) ||
    nestedDotPattern.test(codeText) ||
    nestedBracketPattern.test(codeText)
  );
}

function main() {
  const registry = loadRegistry(registryPath);
  const codeText = readText(codePath);
  const editabilityText = readText(editabilityPath);

  const fullRerenderIds = new Set(extractSetValues(editabilityText, 'FULL_RERENDER_COMPONENT_IDS'));
  const genericEditableKeys = new Set(extractSetValues(editabilityText, 'GENERIC_EDITABLE_PARAM_KEYS'));
  const componentEditableMap = extractComponentEditableMap(editabilityText);
  const generationOnlyKeys = new Set(extractSetValues(editabilityText, 'GENERATION_ONLY_PARAM_KEYS'));

  const report = [];
  let totalParams = 0;
  let unusedCount = 0;
  let nonEditableCount = 0;

  Object.values(registry.components).forEach((def) => {
    const componentId = def.id;
    const family = def.family ?? null;
    const unusedParams = [];
    const nonEditableParams = [];

    Object.keys(def.params || {}).forEach((key) => {
      totalParams += 1;
      const generationOnly = false;
      const used = isKeyUsedInRuntime(codeText, key);
      if (!used) {
        unusedCount += 1;
        unusedParams.push({ key, generationOnly });
      }

      const componentSpecificKeys = componentEditableMap.get(componentId) || [];
      const editable =
        fullRerenderIds.has(componentId) ||
        componentId === 'table' ||
        componentId === 'table-column' ||
        family === 'table-cell' ||
        componentSpecificKeys.includes(key) ||
        genericEditableKeys.has(key);

      if (!editable && !generationOnly && !generationOnlyKeys.has(key)) {
        nonEditableCount += 1;
        nonEditableParams.push(key);
      }
    });

    if (unusedParams.length > 0 || nonEditableParams.length > 0) {
      report.push({ componentId, family, unusedParams, nonEditableParams });
    }
  });

  console.log('# Registry Param Audit');
  console.log('');
  console.log(`- updatedAt: ${new Date().toISOString()}`);
  console.log(`- registry: ${path.relative(root, registryPath)}`);
  console.log(`- totalParams: ${totalParams}`);
  console.log(`- unusedParams: ${unusedCount}`);
  console.log(`- nonEditableParams: ${nonEditableCount}`);
  console.log('');

  report.forEach((row) => {
    console.log(`## ${row.componentId}${row.family ? ` (family: ${row.family})` : ''}`);
    if (row.unusedParams.length > 0) {
      console.log('- unused params:');
      row.unusedParams.forEach((item) => {
        console.log(`  - ${item.key}${item.generationOnly ? ' (generation-only)' : ''}`);
      });
    }
    if (row.nonEditableParams.length > 0) {
      console.log('- non-editable params:');
      row.nonEditableParams.forEach((key) => {
        console.log(`  - ${key}`);
      });
    }
    console.log('');
  });
}

main();
