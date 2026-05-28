import axios from 'axios';
import * as core from '@actions/core';
import {ExecutionResult} from './entities/ExecutionResult';
import {
  formatFailureAnalysisForSlack,
  getDeploymentFailureAnalysisForSlack,
} from './deploymentAnalysis';
import {MablApiClient} from './mablApiClient';
import {
  escapeSlackMarkdown,
  fitSlackSectionText,
  SLACK_SECTION_TEXT_MAX_CHARS,
} from './slackUtil';

export interface SlackFailureNotificationContext {
  apiClient: MablApiClient;
  workspaceId: string;
  deploymentEventId: string;
  deploymentPageUrl: string;
  executionResult: ExecutionResult;
  repository?: string;
  branch?: string;
  actor?: string;
  revision?: string;
  workflowUrl?: string;
}

export interface SlackTaskFailureContext {
  deploymentPageUrl: string;
  repository?: string;
  branch?: string;
  actor?: string;
  revision?: string;
  workflowUrl?: string;
  errorMessage: string;
  executionResult?: ExecutionResult;
}

export async function notifySlackOnDeploymentFailure(
  webhookUrl: string,
  context: SlackFailureNotificationContext,
): Promise<void> {
  const metrics = context.executionResult.journey_execution_metrics;
  const planMetrics = context.executionResult.plan_execution_metrics;

  let analysisText: string | undefined;
  try {
    const analysis = await getDeploymentFailureAnalysisForSlack(
      context.apiClient,
      context.workspaceId,
      context.deploymentEventId,
    );
    if (analysis) {
      analysisText = formatFailureAnalysisForSlack(analysis);
    }
  } catch (error) {
    core.warning(
      `Unable to load deployment analysis for Slack notification: ${error}`,
    );
  }

  const payload = buildSlackPayload(
    context,
    analysisText,
    metrics,
    planMetrics,
  );

  await postSlackWebhook(webhookUrl, payload);
}

export async function notifySlackOnDeploymentTaskFailure(
  webhookUrl: string,
  context: SlackTaskFailureContext,
): Promise<void> {
  const blocks: object[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'mabl deployment task failed',
        emoji: true,
      },
    },
  ];

  appendContextFields(blocks, context);

  blocks.push({
    type: 'section',
    text: {
      type: 'markdown',
      text: fitSlackSectionText(
        `*Error:*\n${escapeSlackMarkdown(context.errorMessage)}`,
        SLACK_SECTION_TEXT_MAX_CHARS,
      ),
    },
  });

  if (context.executionResult) {
    const metrics = context.executionResult.journey_execution_metrics;
    const planMetrics = context.executionResult.plan_execution_metrics;
    blocks.push({
      type: 'section',
      text: {
        type: 'markdown',
        text: `*Partial results:*\n${metrics.failed} test(s) failed (${metrics.passed}/${metrics.total} passed)\n${planMetrics.failed} plan(s) failed (${planMetrics.passed}/${planMetrics.total} passed)`,
      },
    });
  }

  blocks.push({
    type: 'section',
    text: {
      type: 'markdown',
      text: `<${context.deploymentPageUrl}|View deployment in mabl>`,
    },
  });

  appendWorkflowContext(blocks, context.workflowUrl);

  await postSlackWebhook(webhookUrl, {
    text: 'mabl deployment task failed',
    blocks,
  });
}

function buildSlackPayload(
  context: SlackFailureNotificationContext,
  analysisText: string | undefined,
  journeyMetrics: ExecutionResult['journey_execution_metrics'],
  planMetrics: ExecutionResult['plan_execution_metrics'],
): object {
  const blocks: object[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'mabl deployment tests failed',
        emoji: true,
      },
    },
  ];

  appendContextFields(blocks, context);

  blocks.push({
    type: 'section',
    text: {
      type: 'markdown',
      text: `*Results:*\n${journeyMetrics.failed} test(s) failed (${journeyMetrics.passed}/${journeyMetrics.total} passed)\n${planMetrics.failed} plan(s) failed (${planMetrics.passed}/${planMetrics.total} passed)`,
    },
  });

  blocks.push({
    type: 'section',
    text: {
      type: 'markdown',
      text: `<${context.deploymentPageUrl}|View deployment in mabl>`,
    },
  });

  if (analysisText) {
    blocks.push({
      type: 'section',
      text: {
        type: 'markdown',
        text: fitSlackSectionText(
          `*Analysis*\n${analysisText}`,
          SLACK_SECTION_TEXT_MAX_CHARS,
        ),
      },
    });
  }

  appendWorkflowContext(blocks, context.workflowUrl);

  return {
    text: `mabl deployment tests failed (${journeyMetrics.failed} test failure(s))`,
    blocks,
  };
}

function appendContextFields(
  blocks: object[],
  context: {
    repository?: string;
    branch?: string;
    actor?: string;
    revision?: string;
  },
): void {
  const fields: {type: string; text: string}[] = [];

  if (context.repository) {
    fields.push({
      type: 'markdown',
      text: `*Repository:*\n${escapeSlackMarkdown(context.repository)}`,
    });
  }
  if (context.branch) {
    fields.push({
      type: 'markdown',
      text: `*Branch / ref:*\n\`${escapeSlackMarkdown(context.branch)}\``,
    });
  }
  if (context.revision) {
    fields.push({
      type: 'markdown',
      text: `*Revision:*\n\`${escapeSlackMarkdown(
        context.revision.slice(0, 7),
      )}\``,
    });
  }
  if (context.actor) {
    fields.push({
      type: 'markdown',
      text: `*Triggered by:*\n${escapeSlackMarkdown(context.actor)}`,
    });
  }

  if (fields.length > 0) {
    blocks.push({type: 'section', fields});
  }
}

function appendWorkflowContext(blocks: object[], workflowUrl?: string): void {
  if (!workflowUrl) {
    return;
  }

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'markdown',
        text: `<${workflowUrl}|GitHub Actions workflow run>`,
      },
    ],
  });
}

async function postSlackWebhook(
  webhookUrl: string,
  payload: object,
): Promise<void> {
  await axios.post(webhookUrl, payload, {
    headers: {'Content-Type': 'application/json'},
    timeout: 30_000,
  });
}

export function resolveSlackWebhookUrl(): string | undefined {
  const fromEnv = process.env.SLACK_WEBHOOK_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return undefined;
}

export function buildSlackWorkflowContext(): {
  repository?: string;
  branch?: string;
  actor?: string;
  workflowUrl?: string;
} {
  const serverUrl = process.env.GITHUB_SERVER_URL ?? 'https://github.com';
  const workflowUrl =
    process.env.GITHUB_RUN_ID && process.env.GITHUB_REPOSITORY
      ? `${serverUrl}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : undefined;

  return {
    repository: process.env.GITHUB_REPOSITORY,
    branch: process.env.GITHUB_REF,
    actor: process.env.GITHUB_ACTOR,
    workflowUrl,
  };
}
