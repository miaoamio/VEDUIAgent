import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const defaultRegistryPath = path.join(root, 'src', 'registry.ts');

function printUsage() {
  console.log(`Usage:
  node scripts/apply-component-spec-patch.mjs <patch-json-path>
  pbpaste | node scripts/apply-component-spec-patch.mjs --stdin

Options:
  --stdin              Read Spec Patch JSON from stdin
  --registry <path>    Override registry file path (default: src/registry.ts)
  --help               Show this help
`);
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let useStdin = false;
  let inputPath = '';
  let registryPath = defaultRegistryPath;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
    if (arg === '--stdin') {
      useStdin = true;
      continue;
    }
    if (arg === '--registry') {
      const next = args[index + 1];
      if (!next) fail('--registry requires a path');
      registryPath = path.resolve(root, next);
      index += 1;
      continue;
    }
    if (arg.startsWith('--')) {
      fail(`Unknown option '${arg}'`);
    }
    if (inputPath) {
      fail('Only one patch JSON path is allowed');
    }
    inputPath = path.resolve(root, arg);
  }

  if (useStdin && inputPath) {
    fail('Use either a patch JSON path or --stdin, not both');
  }
  if (!useStdin && !inputPath) {
    fail('Missing patch JSON input. Use a file path or --stdin.');
  }

  return {
    useStdin,
    inputPath,
    registryPath
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function quoteString(value) {
  return `'${String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')}'`;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return undefined;
  const result = value
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);
  return result.length > 0 ? Array.from(new Set(result)) : undefined;
}

function normalizeProperty(raw, index, componentId) {
  const propertyName = typeof raw?.propertyName === 'string' ? raw.propertyName.trim() : '';
  const type = typeof raw?.type === 'string' ? raw.type.trim() : '';
  if (!propertyName) {
    fail(`patch for component '${componentId}' has properties[${index}] without propertyName`);
  }
  if (!type) {
    fail(`patch for component '${componentId}' has properties[${index}] without type`);
  }

  const normalized = {
    propertyName,
    type
  };

  if (typeof raw.displayName === 'string' && raw.displayName.trim()) {
    normalized.displayName = raw.displayName;
  }
  if (typeof raw.defaultValue === 'string' || typeof raw.defaultValue === 'boolean') {
    normalized.defaultValue = raw.defaultValue;
  }

  const options = normalizeStringArray(raw.options);
  if (options) {
    normalized.options = options;
  }

  return normalized;
}

function normalizeSnapshot(rawSnapshot, componentId) {
  if (!rawSnapshot || typeof rawSnapshot !== 'object') {
    fail(`patch for component '${componentId}' is missing figmaPropertySnapshot`);
  }

  const componentKey = typeof rawSnapshot.componentKey === 'string'
    ? rawSnapshot.componentKey.trim()
    : '';
  const inspectedAt = typeof rawSnapshot.inspectedAt === 'string'
    ? rawSnapshot.inspectedAt.trim()
    : '';

  if (!componentKey) {
    fail(`patch for component '${componentId}' is missing figmaPropertySnapshot.componentKey`);
  }
  if (!inspectedAt) {
    fail(`patch for component '${componentId}' is missing figmaPropertySnapshot.inspectedAt`);
  }

  const normalized = {
    componentKey,
    inspectedAt,
    source: 'discover_component_props',
    properties: Array.isArray(rawSnapshot.properties)
      ? rawSnapshot.properties.map((item, index) => normalizeProperty(item, index, componentId))
      : []
  };

  if (typeof rawSnapshot.token === 'string' && rawSnapshot.token.trim()) {
    normalized.token = rawSnapshot.token.trim();
  }

  if (rawSnapshot.source && rawSnapshot.source !== 'discover_component_props') {
    fail(
      `patch for component '${componentId}' has unsupported source '${String(rawSnapshot.source)}'`
    );
  }

  return normalized;
}

function normalizePatchPayload(rawPayload) {
  if (!rawPayload || typeof rawPayload !== 'object') {
    fail('Spec Patch JSON must be an object');
  }

  const patches = Array.isArray(rawPayload.patches) ? rawPayload.patches : [];
  if (patches.length === 0) {
    fail('Spec Patch JSON does not contain any patches');
  }

  const snapshotsByComponent = new Map();
  const skipped = [];

  patches.forEach((patch, index) => {
    const componentId = typeof patch?.componentId === 'string' ? patch.componentId.trim() : '';
    if (!componentId) {
      skipped.push({
        index,
        token: typeof patch?.token === 'string' ? patch.token : '',
        componentKey: typeof patch?.componentKey === 'string' ? patch.componentKey : ''
      });
      return;
    }

    const snapshot = normalizeSnapshot(patch.figmaPropertySnapshot, componentId);
    const existing = snapshotsByComponent.get(componentId);
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(snapshot)) {
        fail(`duplicate patches for component '${componentId}' have different snapshot content`);
      }
      return;
    }

    snapshotsByComponent.set(componentId, snapshot);
  });

  if (snapshotsByComponent.size === 0) {
    fail('All patches are missing componentId. Update src/spec.component-token-map.ts first.');
  }

  return {
    generatedAt:
      typeof rawPayload.generatedAt === 'string' && rawPayload.generatedAt.trim()
        ? rawPayload.generatedAt.trim()
        : undefined,
    source:
      typeof rawPayload.source === 'string' && rawPayload.source.trim()
        ? rawPayload.source.trim()
        : undefined,
    snapshotsByComponent,
    skipped
  };
}

function findMatchingBrace(text, openBraceIndex) {
  let depth = 0;
  let quote = null;
  let inLineComment = false;
  let inBlockComment = false;
  let escaping = false;

  for (let index = openBraceIndex; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inLineComment) {
      if (char === '\n') inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaping) {
        escaping = false;
        continue;
      }
      if (char === '\\') {
        escaping = true;
        continue;
      }
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '/' && next === '/') {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      inBlockComment = true;
      index += 1;
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
      continue;
    }
  }

  fail(`Could not find matching brace for index ${openBraceIndex}`);
}

function findLineStart(text, index) {
  const lineBreakIndex = text.lastIndexOf('\n', index);
  return lineBreakIndex === -1 ? 0 : lineBreakIndex + 1;
}

function renderOptionsArray(values) {
  return `[${values.map((value) => quoteString(value)).join(', ')}]`;
}

function renderSnapshot(snapshot) {
  const lines = [];
  lines.push('    figmaPropertySnapshot: {');
  if (snapshot.token) {
    lines.push(`      token: ${quoteString(snapshot.token)},`);
  }
  lines.push(`      componentKey: ${quoteString(snapshot.componentKey)},`);
  lines.push(`      inspectedAt: ${quoteString(snapshot.inspectedAt)},`);
  lines.push(`      source: ${quoteString(snapshot.source)},`);
  if (snapshot.properties.length === 0) {
    lines.push('      properties: []');
  } else {
    lines.push('      properties: [');
    snapshot.properties.forEach((property, index) => {
      lines.push('        {');
      lines.push(`          propertyName: ${quoteString(property.propertyName)},`);
      if (property.displayName) {
        lines.push(`          displayName: ${quoteString(property.displayName)},`);
      }
      lines.push(`          type: ${quoteString(property.type)},`);
      if (property.defaultValue !== undefined) {
        lines.push(
          `          defaultValue: ${typeof property.defaultValue === 'boolean' ? String(property.defaultValue) : quoteString(property.defaultValue)},`
        );
      }
      if (property.options && property.options.length > 0) {
        lines.push(`          options: ${renderOptionsArray(property.options)}`);
      } else {
        const lastIndex = lines.length - 1;
        lines[lastIndex] = lines[lastIndex].replace(/,$/, '');
      }
      lines.push(index === snapshot.properties.length - 1 ? '        }' : '        },');
    });
    lines.push('      ]');
  }
  lines.push('    },');
  return lines.join('\n');
}

function findComponentBlock(text, componentId, registryPath) {
  const pattern = new RegExp(`^  '${escapeRegExp(componentId)}':\\s*\\{`, 'm');
  const match = pattern.exec(text);
  if (!match) {
    fail(`Component '${componentId}' was not found in ${path.relative(root, registryPath)}`);
  }

  const propertyStart = match.index;
  const openBraceIndex = propertyStart + match[0].lastIndexOf('{');
  const closeBraceIndex = findMatchingBrace(text, openBraceIndex);
  const blockText = text.slice(propertyStart, closeBraceIndex + 1);

  return {
    propertyStart,
    openBraceIndex,
    closeBraceIndex,
    blockText
  };
}

function findSnapshotRange(text, componentBlock) {
  const snapshotMatch = /^\s{4}figmaPropertySnapshot:\s*\{/m.exec(componentBlock.blockText);
  if (!snapshotMatch) return null;

  const propertyStart = componentBlock.propertyStart + snapshotMatch.index;
  const openBraceIndex = propertyStart + snapshotMatch[0].lastIndexOf('{');
  const closeBraceIndex = findMatchingBrace(text, openBraceIndex);
  const lineStart = findLineStart(text, propertyStart);

  let end = closeBraceIndex + 1;
  if (text[end] === ',') end += 1;
  if (text[end] === '\r' && text[end + 1] === '\n') {
    end += 2;
  } else if (text[end] === '\n') {
    end += 1;
  }

  return {
    start: lineStart,
    end
  };
}

function findInsertionIndex(componentBlock) {
  const anchors = ['allowedChildren', 'variableBindings', 'typographyBindings', 'params'];
  for (const anchor of anchors) {
    const match = new RegExp(`^\\s{4}${anchor}:`, 'm').exec(componentBlock.blockText);
    if (match) {
      return componentBlock.propertyStart + match.index;
    }
  }
  return null;
}

function upsertSnapshot(registryText, componentId, snapshot, registryPath) {
  const componentBlock = findComponentBlock(registryText, componentId, registryPath);
  const renderedSnapshot = `${renderSnapshot(snapshot)}\n`;
  const existingSnapshotRange = findSnapshotRange(registryText, componentBlock);

  if (existingSnapshotRange) {
    return (
      registryText.slice(0, existingSnapshotRange.start) +
      renderedSnapshot +
      registryText.slice(existingSnapshotRange.end)
    );
  }

  const insertAt = findInsertionIndex(componentBlock);
  if (insertAt === null) {
    fail(`Could not determine where to insert figmaPropertySnapshot for component '${componentId}'`);
  }

  return registryText.slice(0, insertAt) + renderedSnapshot + registryText.slice(insertAt);
}

async function main() {
  const { useStdin, inputPath, registryPath } = parseArgs(process.argv);
  const rawInput = useStdin
    ? await readStdin()
    : fs.readFileSync(inputPath, 'utf8');

  const jsonText = rawInput.replace(/^\uFEFF/, '').trim();
  if (!jsonText) {
    fail('Spec Patch JSON input is empty');
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    fail(`Invalid JSON: ${String(error)}`);
  }

  const payload = normalizePatchPayload(parsed);
  const registryText = fs.readFileSync(registryPath, 'utf8');

  let nextRegistryText = registryText;
  const appliedComponentIds = [];

  payload.snapshotsByComponent.forEach((snapshot, componentId) => {
    nextRegistryText = upsertSnapshot(nextRegistryText, componentId, snapshot, registryPath);
    appliedComponentIds.push(componentId);
  });

  if (nextRegistryText !== registryText) {
    fs.writeFileSync(registryPath, nextRegistryText, 'utf8');
  }

  console.log('# Spec Patch Apply Result');
  console.log('');
  if (payload.generatedAt) console.log(`- generatedAt: ${payload.generatedAt}`);
  if (payload.source) console.log(`- source: ${payload.source}`);
  console.log(`- registry: ${path.relative(root, registryPath)}`);
  console.log(`- applied: ${appliedComponentIds.length}`);
  console.log(`- changed: ${nextRegistryText === registryText ? 'no' : 'yes'}`);
  console.log(`- skippedWithoutComponentId: ${payload.skipped.length}`);
  console.log(`- components: ${appliedComponentIds.join(', ')}`);

  if (payload.skipped.length > 0) {
    console.log('');
    console.log('## Skipped');
    payload.skipped.forEach((item) => {
      const tokenLabel = item.token || '-';
      const keyLabel = item.componentKey || '-';
      console.log(`- patches[${item.index}] token=${tokenLabel} componentKey=${keyLabel} (missing componentId; add token mapping first)`);
    });
  }
}

main().catch((error) => {
  fail(String(error));
});
