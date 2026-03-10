import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const registryPath = path.join(root, 'src', 'registry.ts');
const tokenMapPath = path.join(root, 'src', 'spec.component-token-map.ts');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
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
    blocks.push({
      componentId,
      hasSnapshot: blockText.includes('figmaPropertySnapshot:'),
      hasComponentTokenParam: /componentToken:\s*\{/.test(blockText)
    });
  }

  return blocks;
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
  const registryText = readText(registryPath);
  const tokenMapText = readText(tokenMapPath);
  const blocks = parseComponentBlocks(registryText);
  const { componentToTokens } = parseTokenMap(tokenMapText);

  const rows = blocks.map((item) => {
    const mappedTokens = componentToTokens.get(item.componentId) || [];
    const tokenLabel = mappedTokens.length > 0 ? mappedTokens.join(', ') : '-';
    return {
      componentId: item.componentId,
      mappedTokens: tokenLabel,
      hasSnapshot: item.hasSnapshot ? 'yes' : 'no',
      hasComponentTokenParam: item.hasComponentTokenParam ? 'yes' : 'no'
    };
  });

  const withSnapshot = rows.filter((row) => row.hasSnapshot === 'yes').length;
  const total = rows.length;

  console.log(`# Snapshot Registration Status`);
  console.log('');
  console.log(`- updatedAt: ${new Date().toISOString()}`);
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
