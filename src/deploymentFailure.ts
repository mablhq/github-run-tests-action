import {ExecutionResult} from './entities/ExecutionResult';

export function deploymentHasFailures(
  executionResult: ExecutionResult,
): boolean {
  return (
    executionResult.journey_execution_metrics.failed > 0 ||
    executionResult.plan_execution_metrics.failed > 0
  );
}

export function formatDeploymentFailureMessage(
  testsFailed: number,
  plansFailed: number,
): string {
  const parts: string[] = [];
  if (testsFailed > 0) {
    parts.push(`${testsFailed} mabl test(s) failed`);
  }
  if (plansFailed > 0) {
    parts.push(`${plansFailed} mabl plan(s) failed`);
  }
  if (parts.length === 0) {
    return 'mabl deployment failed';
  }
  return parts.join(' and ');
}

export function formatContinueOnFailureWarning(
  testsFailed: number,
  plansFailed: number,
): string {
  const parts: string[] = [];
  if (testsFailed > 0) {
    parts.push(`${testsFailed} test failure(s)`);
  }
  if (plansFailed > 0) {
    parts.push(`${plansFailed} plan failure(s)`);
  }
  const summary = parts.join(' and ') || 'failures';
  return `There were ${summary} but the continueOnPlanFailure flag is set so the task has been marked as passing`;
}
