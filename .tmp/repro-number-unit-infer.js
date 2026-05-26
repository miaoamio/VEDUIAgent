const esbuild = require('esbuild');
const path = require('path');

esbuild.buildSync({
  stdin: {
    contents: `
      import { inferColumnTypesFromRows } from './src/engine/skills/table.skill.ts';

      const headers = ['ID', '利用率', '容量', '成本金额'];
      const rows = [
        ['ECS-2026-001', '78%', '100GB', '¥2,345'],
        ['ECS-2026-002', '78%', '200GB', '¥3,120'],
        ['ECS-2026-003', '78%', '50GB', '¥1,890']
      ];

      console.log(JSON.stringify({
        inferred: inferColumnTypesFromRows(headers, rows, headers.map(() => 'Text'))
      }));
    `,
    resolveDir: path.resolve(__dirname, '..'),
    sourcefile: 'repro-number-unit-infer.ts',
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: path.resolve(__dirname, 'repro-number-unit-infer.bundle.cjs'),
});

require('./repro-number-unit-infer.bundle.cjs');
