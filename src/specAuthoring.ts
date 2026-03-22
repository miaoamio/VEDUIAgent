import { parseAiSceneEnvelope, type AiSceneEnvelope } from './protocol/scene';
import { validateRegistry } from './registry.loader';
import { type ComponentDefinition, type ComponentRegistry } from './registry.types';

export interface AiSpecTestCase {
  name: string;
  envelope: unknown;
  expected: 'success' | 'fail';
  note?: string;
}

export interface AiComponentSpecPackage {
  component: ComponentDefinition;
  tests?: AiSpecTestCase[];
  meta?: {
    author?: string;
    generatedAt?: string;
    promptId?: string;
    description?: string;
  };
}

export type AiSpecIssueCode =
  | 'SPEC_INVALID_VERSION'
  | 'SPEC_INVALID_COMPONENT'
  | 'SPEC_REGISTRY_INVALID'
  | 'SPEC_TEST_INVALID'
  | 'SPEC_TEST_EXPECTATION_MISMATCH';

export interface AiSpecIssue {
  code: AiSpecIssueCode;
  message: string;
  path?: string;
}

export interface AiSpecValidationResult {
  ok: boolean;
  issues: AiSpecIssue[];
  registry?: ComponentRegistry;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function buildRegistryFromSpecPackage(pkg: AiComponentSpecPackage): ComponentRegistry {
  return {
    components: {
      [pkg.component.id]: pkg.component
    },
    meta: {
      owner: pkg.meta?.author ?? 'ai-spec',
      updatedAt: pkg.meta?.generatedAt ?? new Date().toISOString(),
      description: pkg.meta?.description ?? 'Generated from AI spec package'
    }
  };
}

function validatePackageShape(pkg: unknown): AiSpecIssue[] {
  const issues: AiSpecIssue[] = [];

  if (!isObject(pkg)) {
    issues.push({
      code: 'SPEC_INVALID_COMPONENT',
      message: 'Spec package must be an object'
    });
    return issues;
  }

  if (!isObject(pkg.component) || typeof pkg.component.id !== 'string' || !pkg.component.id) {
    issues.push({
      code: 'SPEC_INVALID_COMPONENT',
      message: 'component.id is required',
      path: 'component.id'
    });
  }

  if (pkg.tests !== undefined && !Array.isArray(pkg.tests)) {
    issues.push({
      code: 'SPEC_TEST_INVALID',
      message: 'tests must be an array',
      path: 'tests'
    });
  }

  return issues;
}

export function validateAiComponentSpecPackage(pkg: unknown): AiSpecValidationResult {
  const issues = validatePackageShape(pkg);
  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const typed = pkg as AiComponentSpecPackage;
  const registry = buildRegistryFromSpecPackage(typed);
  const registryIssues = validateRegistry(registry);
  registryIssues.forEach((issue) => {
    issues.push({
      code: 'SPEC_REGISTRY_INVALID',
      message: issue.message,
      path: issue.path
    });
  });

  (typed.tests ?? []).forEach((test, index) => {
    if (!test || typeof test.name !== 'string') {
      issues.push({
        code: 'SPEC_TEST_INVALID',
        message: 'Test name is required',
        path: `tests[${index}].name`
      });
      return;
    }

    if (test.expected !== 'success' && test.expected !== 'fail') {
      issues.push({
        code: 'SPEC_TEST_INVALID',
        message: "Test expected must be 'success' or 'fail'",
        path: `tests[${index}].expected`
      });
      return;
    }

    const parsed = parseAiSceneEnvelope(test.envelope);
    const shouldPass = test.expected === 'success';

    if (shouldPass && !parsed.ok) {
      issues.push({
        code: 'SPEC_TEST_EXPECTATION_MISMATCH',
        message: `Test '${test.name}' expected success but envelope is invalid`,
        path: `tests[${index}]`
      });
      return;
    }

    if (!shouldPass && parsed.ok) {
      issues.push({
        code: 'SPEC_TEST_EXPECTATION_MISMATCH',
        message: `Test '${test.name}' expected fail but envelope is valid`,
        path: `tests[${index}]`
      });
      return;
    }

    if (parsed.ok && parsed.data.intent === 'create' && parsed.data.scene.root.componentId !== typed.component.id) {
      issues.push({
        code: 'SPEC_TEST_INVALID',
        message: `Create test '${test.name}' root componentId should be '${typed.component.id}'`,
        path: `tests[${index}].envelope.scene.root.componentId`
      });
    }
  });

  return {
    ok: issues.length === 0,
    issues,
    registry
  };
}

export function generateSmokeTestsForComponent(component: ComponentDefinition): AiSpecTestCase[] {
  const defaultProps: Record<string, unknown> = {};
  Object.entries(component.params).forEach(([key, value]) => {
    defaultProps[key] = value.default;
  });

  const createEnvelope: AiSceneEnvelope = {
    version: '1.0',
    intent: 'create',
    scene: {
      root: {
        nodeId: `${component.id}_root`,
        componentId: component.id,
        props: defaultProps
      }
    }
  };

  const editEnvelope: AiSceneEnvelope = {
    version: '1.0',
    intent: 'edit',
    patch: {
      operations: [
        {
          op: 'set_props',
          nodeId: `${component.id}_root`,
          props: defaultProps,
          merge: true
        }
      ]
    }
  };

  return [
    {
      name: 'smoke_create',
      envelope: createEnvelope,
      expected: 'success',
      note: '最小 create 验证'
    },
    {
      name: 'smoke_edit',
      envelope: editEnvelope,
      expected: 'success',
      note: '最小 edit 验证'
    },
    {
      name: 'negative_invalid_version',
      envelope: {
        ...createEnvelope,
        version: '9.9'
      },
      expected: 'fail',
      note: '协议版本错误应失败'
    }
  ];
}
