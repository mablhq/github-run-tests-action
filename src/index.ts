import axios, {AxiosRequestConfig, isAxiosError} from 'axios';
import {MablApiClient} from './mablApiClient';
import {
  Deployment,
  DeploymentProperties,
  PullRequest,
} from './entities/Deployment';
import {Application} from './entities/Application';
import {Execution, ExecutionResult} from './entities/ExecutionResult';
import {prettyFormatExecution} from './table';
import * as core from '@actions/core';
import * as github from '@actions/github';
import {Option} from './interfaces';
import {Environment} from './entities/Environment';
import {ActionInputs, ActionOutputs, USER_AGENT} from './constants';
import {
  deploymentHasFailures,
  formatContinueOnFailureWarning,
  formatDeploymentFailureMessage,
} from './deploymentFailure';
import {
  buildSlackWorkflowContext,
  notifySlackOnDeploymentFailure,
  notifySlackOnDeploymentTaskFailure,
  resolveSlackWebhookUrl,
} from './slackNotification';

const DEFAULT_MABL_APP_URL = 'https://app.mabl.com';
const EXECUTION_POLL_INTERVAL_MILLIS = 10_000;
const EXECUTION_COMPLETED_STATUSES = [
  'succeeded',
  'failed',
  'cancelled',
  'completed',
  'terminated',
];
const GITHUB_BASE_URL = 'https://api.github.com';

interface ActiveDeploymentContext {
  apiClient: MablApiClient;
  workspaceId: string;
  deploymentId: string;
  deploymentPageUrl: string;
  revision?: string;
}

export function optionalArrayInput(name: string): string[] {
  // Note: GitHub Action inputs default to '' for undefined inputs, remove these
  return core
    .getInput(name, {
      required: false,
    })
    .split(/[,\n]/)
    .filter((item) => item.length)
    .map((item) => item.trim());
}

export function optionalInput(name: string): string | undefined {
  const rawValue = core.getInput(name, {
    required: false,
  });

  if (rawValue.length > 0) {
    return rawValue;
  }
  return;
}

export function booleanInput(name: string): boolean {
  return (
    core
      .getInput(name, {
        required: false,
      })
      .toLowerCase() === 'true'
  );
}

export async function run(
  enableFailureExitCodes = true,
  options?: {executionPollIntervalMs?: number},
): Promise<void> {
  const executionPollIntervalMs =
    options?.executionPollIntervalMs ?? EXECUTION_POLL_INTERVAL_MILLIS;
  const wrappedFailed = (message: string): void => {
    // Allow disabling, otherwise units will always fail in workflow builds w/ process exit code 1
    if (enableFailureExitCodes) {
      core.setFailed(message);
    }
  };

  let activeDeployment: ActiveDeploymentContext | undefined;

  try {
    core.startGroup('Gathering inputs');
    const applicationId = optionalInput(ActionInputs.ApplicationId);
    const environmentId = optionalInput(ActionInputs.EnvironmentId);

    const apiKey = process.env.MABL_API_KEY;
    if (!apiKey) {
      wrappedFailed('env var MABL_API_KEY required');
      return;
    }

    const planLabels = optionalArrayInput(ActionInputs.PlanLabels);

    // plan override options
    const browserTypes = optionalArrayInput(ActionInputs.BrowserTypes);
    const httpHeaders = optionalArrayInput(ActionInputs.HttpHeaders);
    const uri = optionalInput(ActionInputs.Uri);
    const apiUrl = optionalInput(ActionInputs.UrlApi);
    const appUrl = optionalInput(ActionInputs.UrlApp);
    const mablBranch = optionalInput(ActionInputs.MablBranch);

    // deployment action options
    const rebaselineImages = booleanInput(ActionInputs.RebaselineImages);
    const setStaticBaseline = booleanInput(ActionInputs.SetStaticBaseline);
    const continueOnPlanFailure = booleanInput(ActionInputs.ContinueOnFailure);

    const pullRequest = await getRelatedPullRequest();
    const eventTimeString = optionalInput(ActionInputs.EventTime);
    const eventTime = eventTimeString ? parseInt(eventTimeString) : Date.now();

    // Helpful warning notices
    if (uri) {
      core.warning(
        `[${ActionInputs.Uri}] has been deprecated. Please use [${ActionInputs.UrlApp}] instead.`,
      );
    }

    if (uri && appUrl) {
      core.warning(
        `Both [${ActionInputs.Uri}] and [${ActionInputs.UrlApp}] were set. The value for [${ActionInputs.UrlApp}] will be used`,
      );
    }

    const effectiveAppUrl = appUrl ?? uri;

    let properties: DeploymentProperties = {
      triggering_event_name: process.env.GITHUB_EVENT_NAME,
      repository_commit_username: process.env.GITHUB_ACTOR,
      repository_action: process.env.GITHUB_ACTION,
      repository_branch_name: process.env.GITHUB_REF,
      repository_name: process.env.GITHUB_REPOSITORY,
      repository_url: `git@github.com:${process.env.GITHUB_REPOSITORY}.git`,
    };

    if (pullRequest) {
      properties = Object.assign(properties, {
        repository_pull_request_url: pullRequest.url,
        repository_pull_request_number: pullRequest.number,
        repository_pull_request_title: pullRequest.title,
        repository_pull_request_created_at: pullRequest.created_at,
      });

      if (pullRequest.merged_at) {
        properties.repository_pull_request_merged_at = pullRequest.merged_at;
      }
    }

    const baseAppUrl = process.env.MABL_APP_URL ?? DEFAULT_MABL_APP_URL;
    const revision =
      process.env.GITHUB_EVENT_NAME === 'pull_request'
        ? github.context.payload.pull_request?.head?.sha
        : process.env.GITHUB_SHA;

    if (mablBranch) {
      core.info(`Using mabl branch [${mablBranch}]`);
    }

    core.info(`Using git revision [${revision}]`);
    core.endGroup();

    core.startGroup('Creating deployment event');
    // set up http client
    const apiClient: MablApiClient = new MablApiClient(apiKey);

    // send the deployment
    const deployment: Deployment = await apiClient.postDeploymentEvent(
      browserTypes,
      planLabels,
      httpHeaders,
      rebaselineImages,
      setStaticBaseline,
      eventTime,
      properties,
      applicationId,
      environmentId,
      effectiveAppUrl,
      apiUrl,
      revision,
      mablBranch,
    );

    core.setOutput(ActionOutputs.DeploymentId, deployment.id);

    let appOrEnv: Application | Environment | undefined;
    if (applicationId) {
      appOrEnv = await apiClient.getApplication(applicationId);
    } else if (environmentId) {
      appOrEnv = await apiClient.getEnvironment(environmentId);
    }

    // Check we have minimum viable config
    if (!appOrEnv) {
      wrappedFailed(
        'Invalid configuration. Valid "application-id" or "environment-id" must be set. No tests started.',
      );
      return; // exit
    }

    const effectiveWorkspaceId =
      appOrEnv.workspace_id ?? appOrEnv.organization_id;

    const outputLink = `${baseAppUrl}/workspaces/${effectiveWorkspaceId}/events/${deployment.id}`;
    core.info(`Deployment triggered. View output at: ${outputLink}`);

    activeDeployment = {
      apiClient,
      workspaceId: effectiveWorkspaceId,
      deploymentId: deployment.id,
      deploymentPageUrl: outputLink,
      revision,
    };

    core.startGroup('Await completion of tests');

    // poll Execution result until complete
    let executionComplete = false;
    while (!executionComplete) {
      await sleep(executionPollIntervalMs);

      const executionResult = await apiClient.getExecutionResults(
        deployment.id,
      );
      if (executionResult?.executions) {
        const pendingExecutions = getExecutionsStillPending(executionResult);

        if (pendingExecutions.length === 0) {
          executionComplete = true;
        } else {
          core.info(
            `${pendingExecutions.length} mabl plan(s) are still running`,
          );
        }
      }
    }
    core.info('mabl deployment runs have completed');
    core.endGroup();

    core.startGroup('Fetch execution results');
    const finalExecutionResult = await apiClient.getExecutionResults(
      deployment.id,
    );

    finalExecutionResult.executions.forEach((execution) => {
      core.info(prettyFormatExecution(execution));
    });

    core.setOutput(
      ActionOutputs.PlansRun,
      '' + finalExecutionResult.plan_execution_metrics.total,
    );
    core.setOutput(
      ActionOutputs.PlansPassed,
      '' + finalExecutionResult.plan_execution_metrics.passed,
    );
    core.setOutput(
      ActionOutputs.PlansFailed,
      '' + finalExecutionResult.plan_execution_metrics.failed,
    );
    core.setOutput(
      ActionOutputs.TestsRun,
      '' + finalExecutionResult.journey_execution_metrics.total,
    );
    core.setOutput(
      ActionOutputs.TestsPassed,
      '' + finalExecutionResult.journey_execution_metrics.passed,
    );
    core.setOutput(
      ActionOutputs.TestsFailed,
      '' + finalExecutionResult.journey_execution_metrics.failed,
    );

    if (!deploymentHasFailures(finalExecutionResult)) {
      core.debug('Deployment plans passed');
    } else {
      await notifySlackForActiveDeployment(
        activeDeployment,
        finalExecutionResult,
      );

      const testsFailed = finalExecutionResult.journey_execution_metrics.failed;
      const plansFailed = finalExecutionResult.plan_execution_metrics.failed;

      if (continueOnPlanFailure) {
        core.warning(formatContinueOnFailureWarning(testsFailed, plansFailed));
      } else {
        wrappedFailed(formatDeploymentFailureMessage(testsFailed, plansFailed));
      }
    }
    core.endGroup();
  } catch (err) {
    if (activeDeployment) {
      await notifySlackAfterDeploymentTaskError(activeDeployment, err);
    }
    wrappedFailed(
      `mabl deployment task failed for the following reason: ${err}`,
    );
  }
}

function sleep(milliseconds: number): Promise<number> {
  // eslint-disable-next-line no-restricted-globals
  return new Promise((resolve, reject): void => {
    try {
      // eslint-disable-next-line no-restricted-globals
      setTimeout(resolve, milliseconds);
    } catch (error) {
      reject(error);
    }
  });
}

function getExecutionsStillPending(
  executionResult: ExecutionResult,
): Execution[] {
  return executionResult.executions.filter((execution: Execution) => {
    return !(
      EXECUTION_COMPLETED_STATUSES.includes(execution.status) &&
      execution.stop_time
    );
  });
}

async function notifySlackForActiveDeployment(
  activeDeployment: ActiveDeploymentContext,
  executionResult: ExecutionResult,
): Promise<void> {
  const webhookUrl = resolveSlackWebhookUrl();
  if (!webhookUrl) {
    core.info(
      'Skipping Slack notification (set SLACK_WEBHOOK_URL env var to enable)',
    );
    return;
  }

  core.startGroup('Notify Slack on deployment failure');
  try {
    await sendSlackDeploymentFailureNotification(
      webhookUrl,
      activeDeployment,
      executionResult,
    );
    core.info('Slack notification sent');
  } catch (error) {
    core.warning(`Failed to send Slack notification: ${error}`);
  }
  core.endGroup();
}

async function sendSlackDeploymentFailureNotification(
  webhookUrl: string,
  activeDeployment: ActiveDeploymentContext,
  executionResult: ExecutionResult,
): Promise<void> {
  const workflowContext = buildSlackWorkflowContext();
  await notifySlackOnDeploymentFailure(webhookUrl, {
    apiClient: activeDeployment.apiClient,
    workspaceId: activeDeployment.workspaceId,
    deploymentEventId: activeDeployment.deploymentId,
    deploymentPageUrl: activeDeployment.deploymentPageUrl,
    executionResult,
    repository: workflowContext.repository,
    branch: workflowContext.branch,
    actor: workflowContext.actor,
    revision: activeDeployment.revision,
    workflowUrl: workflowContext.workflowUrl,
  });
}

async function notifySlackAfterDeploymentTaskError(
  activeDeployment: ActiveDeploymentContext,
  err: unknown,
): Promise<void> {
  const webhookUrl = resolveSlackWebhookUrl();
  if (!webhookUrl) {
    core.info(
      'Skipping Slack notification (set SLACK_WEBHOOK_URL env var to enable)',
    );
    return;
  }

  core.startGroup('Notify Slack on deployment task failure');
  try {
    let executionResult: ExecutionResult | undefined;
    try {
      executionResult = await activeDeployment.apiClient.getExecutionResults(
        activeDeployment.deploymentId,
      );
    } catch (resultsError) {
      core.warning(
        `Unable to load execution results for Slack notification: ${resultsError}`,
      );
    }

    if (executionResult && deploymentHasFailures(executionResult)) {
      await sendSlackDeploymentFailureNotification(
        webhookUrl,
        activeDeployment,
        executionResult,
      );
      core.info('Slack notification sent');
      return;
    }

    const workflowContext = buildSlackWorkflowContext();
    const errorMessage = err instanceof Error ? err.message : String(err);
    await notifySlackOnDeploymentTaskFailure(webhookUrl, {
      deploymentPageUrl: activeDeployment.deploymentPageUrl,
      repository: workflowContext.repository,
      branch: workflowContext.branch,
      actor: workflowContext.actor,
      revision: activeDeployment.revision,
      workflowUrl: workflowContext.workflowUrl,
      errorMessage,
      executionResult,
    });
    core.info('Slack notification sent');
  } catch (error) {
    core.warning(`Failed to send Slack notification: ${error}`);
  }
  core.endGroup();
}

async function getRelatedPullRequest(): Promise<Option<PullRequest>> {
  const targetUrl = `${GITHUB_BASE_URL}/repos/${process.env.GITHUB_REPOSITORY}/commits/${process.env.GITHUB_SHA}/pulls`;

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    return;
  }

  const config: AxiosRequestConfig = {
    headers: {
      Authorization: `token ${githubToken}`,
      Accept: 'application/vnd.github.groot-preview+json',
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
    },
  };
  const client = axios.create(config);

  try {
    const response = await client.get<PullRequest[]>(targetUrl, config);
    return response?.data?.[0];
  } catch (error: unknown) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return;
    }
    if (error instanceof Error) {
      core.warning(error.message);
    }
  }

  return;
}
