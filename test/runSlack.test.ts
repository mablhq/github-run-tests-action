import * as core from '@actions/core';
import {ActionInputs} from '../src/constants';
import {run} from '../src/index';
import {
  notifySlackOnDeploymentFailure,
  notifySlackOnDeploymentTaskFailure,
} from '../src/slackNotification';

const mockPostDeploymentEvent = jest.fn();
const mockGetApplication = jest.fn();
const mockGetExecutionResults = jest.fn();
const mockTryGetSavedDeploymentFailureAnalysis = jest.fn();

jest.mock('../src/mablApiClient', () => ({
  MablApiClient: jest.fn().mockImplementation(() => ({
    postDeploymentEvent: mockPostDeploymentEvent,
    getApplication: mockGetApplication,
    getEnvironment: jest.fn(),
    getExecutionResults: mockGetExecutionResults,
    tryGetSavedDeploymentFailureAnalysis:
      mockTryGetSavedDeploymentFailureAnalysis,
  })),
}));

jest.mock('../src/slackNotification', () => {
  const actual = jest.requireActual('../src/slackNotification');
  return {
    ...actual,
    notifySlackOnDeploymentFailure: jest.fn().mockResolvedValue(undefined),
    notifySlackOnDeploymentTaskFailure: jest.fn().mockResolvedValue(undefined),
  };
});

const mockedNotifySlackOnDeploymentFailure =
  notifySlackOnDeploymentFailure as jest.MockedFunction<
    typeof notifySlackOnDeploymentFailure
  >;
const mockedNotifySlackOnDeploymentTaskFailure =
  notifySlackOnDeploymentTaskFailure as jest.MockedFunction<
    typeof notifySlackOnDeploymentTaskFailure
  >;

function setGithubInput(name: string, value: string): void {
  process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] = value;
}

function completedExecution(overrides: {success?: boolean; running?: boolean}) {
  return {
    status: overrides.running
      ? 'running'
      : overrides.success === false
        ? 'failed'
        : 'succeeded',
    success: overrides.success ?? true,
    plan: {
      id: 'plan-1',
      name: 'Smoke plan',
      href: 'https://api.mabl.com/plan/1',
      app_href: 'https://app.mabl.com/plan/1',
    },
    plan_execution: {
      id: 'pe-1',
      status: 'completed',
      href: 'https://api.mabl.com/pe/1',
    },
    journeys: [],
    journey_executions: [],
    start_time: 1,
    stop_time: overrides.running ? 0 : 2,
  };
}

function failedExecutionResult() {
  return {
    plan_execution_metrics: {total: 1, passed: 0, failed: 1},
    journey_execution_metrics: {total: 2, passed: 0, failed: 2},
    executions: [completedExecution({success: false})],
  };
}

describe('run() Slack integration', () => {
  const infoSpy = jest.spyOn(core, 'info').mockImplementation(() => undefined);
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {...originalEnv};
    delete process.exitCode;

    process.env.MABL_API_KEY = 'test-api-key';
    process.env.GITHUB_REPOSITORY = 'mablhq/example';
    process.env.GITHUB_SHA = 'abc1234567890123456789012345678901234567890';
    process.env.GITHUB_REF = 'refs/heads/main';
    process.env.GITHUB_ACTOR = 'octocat';
    process.env.GITHUB_EVENT_NAME = 'push';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/test';

    setGithubInput(ActionInputs.ApplicationId, 'app-id');
    setGithubInput(ActionInputs.EnvironmentId, '');

    mockPostDeploymentEvent.mockResolvedValue({id: 'deployment-1'});
    mockGetApplication.mockResolvedValue({
      id: 'app-id',
      workspace_id: 'workspace-1',
      organization_id: 'org-1',
      name: 'Example app',
      created_time: 0,
      created_by_id: 'user',
      last_updated_time: 0,
      last_updated_by_id: 'user',
    });
    mockTryGetSavedDeploymentFailureAnalysis.mockResolvedValue(undefined);
  });

  afterAll(() => {
    process.env = originalEnv;
    infoSpy.mockRestore();
  });

  it('notifies Slack when deployment tests fail', async () => {
    mockGetExecutionResults.mockResolvedValue(failedExecutionResult());

    await run(false, {executionPollIntervalMs: 0});

    expect(mockedNotifySlackOnDeploymentFailure).toHaveBeenCalledTimes(1);
    expect(mockedNotifySlackOnDeploymentFailure.mock.calls[0][0]).toBe(
      'https://hooks.slack.com/services/test',
    );
    expect(
      mockedNotifySlackOnDeploymentFailure.mock.calls[0][1].deploymentEventId,
    ).toBe('deployment-1');
    expect(mockedNotifySlackOnDeploymentTaskFailure).not.toHaveBeenCalled();
  });

  it('notifies Slack on task error after deployment is triggered', async () => {
    const pendingResults = {
      plan_execution_metrics: {total: 0, passed: 0, failed: 0},
      journey_execution_metrics: {total: 0, passed: 0, failed: 0},
      executions: [completedExecution({running: true})],
    };

    mockGetExecutionResults
      .mockResolvedValueOnce(pendingResults)
      .mockResolvedValueOnce(failedExecutionResult())
      .mockRejectedValueOnce(new Error('final fetch failed'))
      .mockRejectedValueOnce(new Error('results unavailable for slack'));

    await run(false, {executionPollIntervalMs: 0});

    expect(mockedNotifySlackOnDeploymentTaskFailure).toHaveBeenCalledTimes(1);
    expect(mockedNotifySlackOnDeploymentFailure).not.toHaveBeenCalled();
  });

  it('logs skip message on error path when SLACK_WEBHOOK_URL is unset', async () => {
    delete process.env.SLACK_WEBHOOK_URL;
    mockGetExecutionResults.mockRejectedValue(new Error('poll failed'));

    await run(false, {executionPollIntervalMs: 0});

    expect(mockedNotifySlackOnDeploymentFailure).not.toHaveBeenCalled();
    expect(mockedNotifySlackOnDeploymentTaskFailure).not.toHaveBeenCalled();
    expect(
      infoSpy.mock.calls.some((call) =>
        String(call[0]).includes('Skipping Slack notification'),
      ),
    ).toBe(true);
  });
});
