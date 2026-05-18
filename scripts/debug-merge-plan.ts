import fs from 'fs';
import path from 'path';

import {
  normalizeHeaderRowsInput,
  normalizeMergesInput,
  normalizeAutoMergeRulesInput,
  buildNormalizedTableGrid,
} from '../src/code/table/table-merge-model';
import { buildTableRenderPlan } from '../src/code/table/table-render-grid';

const fixturePath = path.resolve(
  process.cwd(),
  'docs/for-humans/testing/case-1-single-group-merge.json'
);

const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const headerRows = normalizeHeaderRowsInput(fixture, fixture.headers || []);
const merges = normalizeMergesInput(fixture);
const autoMergeRules = normalizeAutoMergeRulesInput(fixture);

const grid = buildNormalizedTableGrid({
  headerRows,
  rows: fixture.rows || [],
  columnTypes: fixture.columnTypes || [],
  columnWidths: fixture.columnWidths || [],
  rowAction: fixture.rowAction,
  merges,
  autoMergeRules,
});

const plan = buildTableRenderPlan(grid);

console.log(
  JSON.stringify(
    {
      merges,
      bodyCells: plan.bodyCells.filter((cell) => cell.col === 0 || cell.col === 8),
      coveredCellKeys: plan.coveredCellKeys.filter(
        (key) =>
          key === 'body:1:0' ||
          key === 'body:1:8' ||
          key === 'body:3:0' ||
          key === 'body:3:8' ||
          key === 'body:5:0' ||
          key === 'body:5:8' ||
          key === 'body:6:0' ||
          key === 'body:6:8'
      ),
    },
    null,
    2
  )
);
