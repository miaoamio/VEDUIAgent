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

function loadRegistry(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const match = text.match(/export const COMPONENT_REGISTRY[^=]*=\\s*([\\s\\S]*);\\s*$/m);
  if (!match) {
    fail(`Unable to locate COMPONENT_REGISTRY in ${path.relative(root, filePath)}`);
  }
  return JSON.parse(match[1]);
}

function writeRegistry(filePath, registry) {
  const header = 'import type { ComponentRegistry } from \"./registry.types\";\\n\\n';
  const body = `export const COMPONENT_REGISTRY: ComponentRegistry = ${JSON.stringify(registry, null, 2)};\\n`;
  fs.writeFileSync(filePath, header + body, 'utf8');
}

async function main() {
  const { useStdin, inputPath, registryPath } = parseArgs(process.argv);
  const rawInput = useStdin
    ? await readStdin()
    : fs.readFileSync(inputPath, 'utf8');

  const jsonText = rawInput.replace(/^\\uFEFF/, '').trim();
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
  const registry = loadRegistry(registryPath);

  const appliedComponentIds = [];

  payload.snapshotsByComponent.forEach((snapshot, componentId) => {
    const def = registry.components?.[componentId];
    if (!def) {
      fail(`Component '${componentId}' was not found in ${path.relative(root, registryPath)}`);
    }
    def.figmaPropertySnapshot = snapshot;
    appliedComponentIds.push(componentId);
  });

  writeRegistry(registryPath, registry);

  console.log('# Spec Patch Apply Result');
  console.log('');
  if (payload.generatedAt) console.log(`- generatedAt: ${payload.generatedAt}`);
  if (payload.source) console.log(`- source: ${payload.source}`);
  console.log(`- registry: ${path.relative(root, registryPath)}`);
  console.log(`- applied: ${appliedComponentIds.length}`);
  console.log(`- changed: yes`);
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
