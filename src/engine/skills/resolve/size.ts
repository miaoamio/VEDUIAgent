import { getRegistrySizeMetrics, getRegistrySizeMetricsMap } from '../../../registry.helpers';
import type { SizeMetricDefinition } from '../../../registry.types';

export function getSizeMetrics(componentId: string, size: string): SizeMetricDefinition | null {
  return getRegistrySizeMetrics(componentId, size);
}

export function getSizeMetricsMap(componentId: string): Record<string, SizeMetricDefinition> | null {
  return getRegistrySizeMetricsMap(componentId);
}
