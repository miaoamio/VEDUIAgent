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
  return [...raw.matchAll(/'([^']+)'|"([^"]+)"/g)].map((m) => m[1] || m[2]).filter(Boolean);
}

function extractComponentEditableMap(text) {
  const pattern = /COMPONENT_EDITABLE_PARAM_KEYS(?:\s*:\s*[^=]+)?\s*=\s*\{([\s\S]*?)\}\s*;?/m;
  const match = text.match(pattern);
  if (!match) return new Map();
  const body = match[1];
  const map = new Map();
  const entries = [...body.matchAll(/([A-Za-z0-9_-]+|'[^']+'|"[^"]+")\s*:\s*\[([^\]]*)\]/g)];
  entries.forEach((entry) => {
    const rawKey = entry[1];
    const key = rawKey.startsWith('\'') || rawKey.startsWith('"')
      ? rawKey.slice(1, -1)
      : rawKey;
    const rawList = entry[2];
    const values = [...rawList.matchAll(/'([^']+)'|"([^"]+)"/g)].map((m) => m[1] || m[2]).filter(Boolean);
    map.set(key, values);
  });
  return map;
}

function parseComponentBlocks(registryText) {
  const matchAll = [...registryText.matchAll(/^\s*'([^']+)':\s*\{/gm)];
  const blocks = [];

  for (let i = 0; i < matchAll.length; i += 1) {
    const current = matchAll[i];
    const next = matchAll[i + 1];
    const componentId = current[1];
    const start = current.index ?? 0;
    const end = next?.index ?? registryText.length;
    const blockText = registryText.slice(start, end);
    blocks.push({ componentId, blockText });
  }

  return blocks;
}

function findParamsObjectText(blockText) {
  const paramsIndex = blockText.indexOf('params:');
  if (paramsIndex === -1) return null;
  const braceStart = blockText.indexOf('{', paramsIndex);
  if (braceStart === -1) return null;

  let depth = 0;
  let inString = false;
  let stringQuote = '';
  let escape = false;

  for (let i = braceStart; i < blockText.length; i += 1) {
    const ch = blockText[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === stringQuote) {
        inString = false;
      }
      continue;
    }

    if (ch === '\'' || ch === '"' || ch === '`') {
      inString = true;
      stringQuote = ch;
      continue;
    }

    if (ch === '{') depth += 1;
    if (ch === '}') depth -= 1;

    if (depth === 0) {
      return blockText.slice(braceStart + 1, i);
    }
  }

  return null;
}

function parseParams(paramsText) {
  if (!paramsText) return new Map();
  const result = new Map();
  let i = 0;

  const isIdStart = (ch) => /[A-Za-z_]/.test(ch);
  const isIdChar = (ch) => /[A-Za-z0-9_-]/.test(ch);

  while (i < paramsText.length) {
    const ch = paramsText[i];
    if (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t' || ch === ',') {
      i += 1;
      continue;
    }
    if (!isIdStart(ch)) {
      i += 1;
      continue;
    }

    let start = i;
    i += 1;
    while (i < paramsText.length && isIdChar(paramsText[i])) i += 1;
    const key = paramsText.slice(start, i);

    while (i < paramsText.length && /\s/.test(paramsText[i])) i += 1;
    if (paramsText[i] !== ':') {
      continue;
    }
    i += 1;
    while (i < paramsText.length && /\s/.test(paramsText[i])) i += 1;

    if (paramsText[i] !== '{') {
      continue;
    }

    const blockStart = i;
    let depth = 0;
    let inString = false;
    let stringQuote = '';
    let escape = false;

    for (; i < paramsText.length; i += 1) {
      const c = paramsText[i];
      if (inString) {
        if (escape) {
          escape = false;
        } else if (c === '\\') {
          escape = true;
        } else if (c === stringQuote) {
          inString = false;
        }
        continue;
      }
      if (c === '\'' || c === '"' || c === '`') {
        inString = true;
        stringQuote = c;
        continue;
      }
      if (c === '{') depth += 1;
      if (c === '}') {
        depth -= 1;
        if (depth === 0) {
          const blockText = paramsText.slice(blockStart, i + 1);
          result.set(key, blockText);
          i += 1;
          break;
        }
      }
    }
  }

  return result;
}

function extractFamily(blockText) {
  const match = blockText.match(/family:\s*'([^']+)'|family:\s*\"([^\"]+)\"/);
  return match ? (match[1] || match[2]) : null;
}

function isKeyUsedInRuntime(codeText, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
  const registryText = readText(registryPath);
  const codeText = readText(codePath);
  const editabilityText = readText(editabilityPath);

  const fullRerenderIds = new Set(extractSetValues(editabilityText, 'FULL_RERENDER_COMPONENT_IDS'));
  const genericEditableKeys = new Set(extractSetValues(editabilityText, 'GENERIC_EDITABLE_PARAM_KEYS'));
  const componentEditableMap = extractComponentEditableMap(editabilityText);
  const generationOnlyKeys = new Set(extractSetValues(editabilityText, 'GENERATION_ONLY_PARAM_KEYS'));

  const blocks = parseComponentBlocks(registryText);
  const report = [];
  let totalParams = 0;
  let unusedCount = 0;
  let nonEditableCount = 0;

  blocks.forEach(({ componentId, blockText }) => {
    const paramsText = findParamsObjectText(blockText);
    const paramBlocks = parseParams(paramsText);
    const family = extractFamily(blockText);

    const unusedParams = [];
    const nonEditableParams = [];

    for (const [key, paramBlock] of paramBlocks.entries()) {
      totalParams += 1;
      const generationOnly = /uiRole\s*:\s*['"]generation-only['"]/i.test(paramBlock);
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
    }

    if (unusedParams.length > 0 || nonEditableParams.length > 0) {
      report.push({ componentId, family, unusedParams, nonEditableParams });
    }
  });

  console.log('# Registry Param Audit');
  console.log('');
  console.log(`- updatedAt: ${new Date().toISOString()}`);
  console.log(`- components: ${blocks.length}`);
  console.log(`- params: ${totalParams}`);
  console.log(`- unusedParams: ${unusedCount}`);
  console.log(`- nonEditableParams: ${nonEditableCount}`);
  console.log('');

  if (report.length === 0) {
    console.log('No issues found.');
  } else {
    report.forEach((entry) => {
      console.log(`## ${entry.componentId}${entry.family ? ` (family: ${entry.family})` : ''}`);
      if (entry.unusedParams.length > 0) {
        console.log('- unusedParams:');
        entry.unusedParams.forEach((item) => {
          console.log(`  - ${item.key}${item.generationOnly ? ' (generation-only)' : ''}`);
        });
      }
      if (entry.nonEditableParams.length > 0) {
        console.log('- nonEditableParams:');
        entry.nonEditableParams.forEach((key) => {
          console.log(`  - ${key}`);
        });
      }
      console.log('');
    });
  }

  const strict = process.argv.includes('--strict');
  if (strict && (unusedCount > 0 || nonEditableCount > 0)) {
    process.exitCode = 1;
  }
}

main();
