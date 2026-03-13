import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const registryPath = path.join(root, 'src', 'registry.ts');
const tokenMapPath = path.join(root, 'src', 'spec.component-token-map.ts');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function loadRegistry(filePath) {
  const text = readText(filePath);
  const match = text.match(/export const COMPONENT_REGISTRY[^=]*=\\s*([\\s\\S]*);\\s*$/m);
  if (!match) {
    throw new Error(`Unable to locate COMPONENT_REGISTRY in ${path.relative(root, filePath)}`);
  }
  return JSON.parse(match[1]);
}

function parseTokenMap(tokenMapText) {
  const tokenToComponentIds = new Map();
  const componentToTokens = new Map();
  const entries = [...tokenMapText.matchAll(/^\s*'([^']+)':\s*\[([^\]]*)\]/gm)];

  entries.forEach((entry) => {
    const token = entry[1];
    const rawIds = entry[2];
    const componentIds = [...rawIds.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    tokenToComponentIds.set(token, componentIds);
    componentIds.forEach((id) => {
      if (!componentToTokens.has(id)) componentToTokens.set(id, []);
      componentToTokens.get(id).push(token);
    });
  });

  return { tokenToComponentIds, componentToTokens };
}

function main() {
  const registry = loadRegistry(registryPath);
  const tokenMapText = readText(tokenMapPath);
  const { componentToTokens } = parseTokenMap(tokenMapText);

  const rows = Object.values(registry.components).map((def) => {
    const mappedTokens = componentToTokens.get(def.id) || [];
    const tokenLabel = mappedTokens.length > 0 ? mappedTokens.join(', ') : '-';
    return {
      componentId: def.id,
      mappedTokens: tokenLabel,
      hasSnapshot: def.figmaPropertySnapshot ? 'yes' : 'no',
      hasComponentTokenParam: Boolean(def.params?.componentToken) ? 'yes' : 'no'
    };
  });

  const withSnapshot = rows.filter((row) => row.hasSnapshot === 'yes').length;
  const total = rows.length;

  console.log(`# Snapshot Registration Status`);
  console.log('');
  console.log(`- updatedAt: ${new Date().toISOString()}`);
  console.log(`- registry: ${path.relative(root, registryPath)}`);
  console.log(`- totalComponents: ${total}`);
  console.log(`- withSnapshot: ${withSnapshot}`);
  console.log(`- withoutSnapshot: ${total - withSnapshot}`);
  console.log('');
  console.log('| componentId | mappedTokens | hasSnapshot | hasComponentTokenParam |');
  console.log('| --- | --- | --- | --- |');
  rows.forEach((row) => {
    console.log(`| ${row.componentId} | ${row.mappedTokens} | ${row.hasSnapshot} | ${row.hasComponentTokenParam} |`);
  });
}

main();
