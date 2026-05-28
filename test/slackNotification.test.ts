import axios from 'axios';
import {deploymentHasFailures, formatContinueOnFailureWarning, formatDeploymentFailureMessage} from '../src/deploymentFailure';
import {ExecutionResult} from '../src/entities/ExecutionResult';
import {MablApiClient} from '../src/mablApiClient';
import {
  notifySlackOnDeploymentFailure,
  notifySlackOnDeploymentTaskFailure,
  resolveSlackWebhookUrl,
} from '../src/slackNotification';
import {escapeSlackMarkdown, fitSlackSectionText} from '../src/slackUtil';

jest.mock('axios');
jest.mock('../src/deploymentAnalysis', () => ({
  getDeploymentFailureAnalysisForSlack: jest.fn(),
  formatFailureAnalysisForSlack: jest.fn(),
}));

import {
  formatFailureAnalysisForSlack,
  getDeploymentFailureAnalysisForSlack,
} from '../src/deploymentAnalysis';

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedGetDeploymentFailureAnalysisForSlack =
  getDeploymentFailureAnalysisForSlack as jest.MockedFunction<
    typeof getDeploymentFailureAnalysisForSlack
  >;
const mockedFormatFailureAnalysisForSlack =
  formatFailureAnalysisForSlack as jest.MockedFunction<
    typeof formatFailureAnalysisForSlack
  >;

describe('deploymentFailure', () => {
  it('detects plan failures without journey failures', () => {
    const result: ExecutionResult = {
      plan_execution_metrics: {total: 1, passed: 0, failed: 1},
      journey_execution_metrics: {total: 0, passed: 0, failed: 0},
      executions: [],
    };

    expect(deploymentHasFailures(result)).toBe(true);
  });

  it('formats failure message with only non-zero counts', () => {
    expect(formatDeploymentFailureMessage(0, 1)).toBe(
      '1 mabl plan(s) failed',
    );
    expect(formatDeploymentFailureMessage(2, 0)).toBe('2 mabl test(s) failed');
    expect(formatDeploymentFailureMessage(2, 1)).toBe(
      '2 mabl test(s) failed and 1 mabl plan(s) failed',
    );
  });

  it('formats continue-on-failure warning with only non-zero counts', () => {
    expect(formatContinueOnFailureWarning(0, 1)).toBe(
      'There were 1 plan failure(s) but the continueOnPlanFailure flag is set so the task has been marked as passing',
    );
  });
});

describe('slackUtil', () => {
  it('escapes markdown characters', () => {
    expect(escapeSlackMarkdown('a & b <c>')).toBe('a &amp; b &lt;c&gt;');
  });

  it('escapes markdown formatting characters', () => {
    const escaped = escapeSlackMarkdown('*bold* _italic_ `code` ~strike~');
    expect(escaped).toContain('*​');
    expect(escaped).toContain('_​');
    expect(escaped).toContain('`​');
    expect(escaped).toContain('~​');
  });

  it('truncates section text', () => {
    expect(fitSlackSectionText('abcdef', 5)).toBe('ab...');
  });
});

describe('slackNotification', () => {
  const executionResult: ExecutionResult = {
    plan_execution_metrics: {total: 2, passed: 1, failed: 1},
    journey_execution_metrics: {total: 4, passed: 2, failed: 2},
    executions: [],
  };

  const originalSlackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

  beforeEach(() => {
    mockedAxios.post.mockReset();
    mockedAxios.post.mockResolvedValue({status: 200});
    mockedGetDeploymentFailureAnalysisForSlack.mockReset();
    mockedGetDeploymentFailureAnalysisForSlack.mockResolvedValue(undefined);
    mockedFormatFailureAnalysisForSlack.mockReset();
    delete process.env.SLACK_WEBHOOK_URL;
  });

  afterAll(() => {
    if (originalSlackWebhookUrl) {
      process.env.SLACK_WEBHOOK_URL = originalSlackWebhookUrl;
    }
  });

  it('resolveSlackWebhookUrl returns undefined when unset', () => {
    expect(resolveSlackWebhookUrl()).toBeUndefined();
  });

  it('resolveSlackWebhookUrl trims env var', () => {
    process.env.SLACK_WEBHOOK_URL = '  https://hooks.slack.com/test  ';
    expect(resolveSlackWebhookUrl()).toBe('https://hooks.slack.com/test');
  });

  it('posts slack payload with deployment link and metrics', async () => {
    const apiClient = {} as unknown as MablApiClient;

    await notifySlackOnDeploymentFailure('https://hooks.slack.com/test', {
      apiClient,
      workspaceId: 'ws-1',
      deploymentEventId: 'dep-1',
      deploymentPageUrl: 'https://app.mabl.com/workspaces/ws-1/events/dep-1',
      executionResult,
      repository: 'mablhq/example',
      branch: 'refs/heads/main',
      actor: 'octocat',
      revision: 'abc1234567890123456789012345678901234567890',
      workflowUrl: 'https://github.com/mablhq/example/actions/runs/1',
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    const [url, payload] = mockedAxios.post.mock.calls[0] as [
      string,
      {text: string; blocks: object[]},
    ];
    expect(url).toBe('https://hooks.slack.com/test');
    expect(payload.text).toContain('2 test failure');
    expect(JSON.stringify(payload.blocks)).toContain(
      'https://app.mabl.com/workspaces/ws-1/events/dep-1',
    );
    expect(JSON.stringify(payload.blocks)).toContain('mablhq/example');
  });

  it('includes analysis section when available', async () => {
    mockedGetDeploymentFailureAnalysisForSlack.mockResolvedValue({
      synopsis: 'Checkout failed',
      summary_text: 'Payment API returned 500.',
    });
    mockedFormatFailureAnalysisForSlack.mockReturnValue(
      '*Checkout failed*\n\nPayment API returned 500.',
    );
    const apiClient = {} as unknown as MablApiClient;

    await notifySlackOnDeploymentFailure('https://hooks.slack.com/test', {
      apiClient,
      workspaceId: 'ws-1',
      deploymentEventId: 'dep-1',
      deploymentPageUrl: 'https://app.mabl.com/workspaces/ws-1/events/dep-1',
      executionResult,
    });

    const payload = mockedAxios.post.mock.calls[0][1] as {
      blocks: object[];
    };
    expect(JSON.stringify(payload.blocks)).toContain('Checkout failed');
    expect(JSON.stringify(payload.blocks)).toContain(
      'Payment API returned 500',
    );
  });

  it('posts task failure payload', async () => {
    await notifySlackOnDeploymentTaskFailure('https://hooks.slack.com/test', {
      deploymentPageUrl: 'https://app.mabl.com/workspaces/ws-1/events/dep-1',
      errorMessage: 'Timed out waiting for execution results',
    });

    const payload = mockedAxios.post.mock.calls[0][1] as {
      text: string;
      blocks: object[];
    };
    expect(payload.text).toContain('task failed');
    expect(JSON.stringify(payload.blocks)).toContain(
      'Timed out waiting for execution results',
    );
  });
});
