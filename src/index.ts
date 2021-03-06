import axios, {AxiosRequestConfig} from 'axios';
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

const DEFAULT_MABL_APP_URL = 'https://app.mabl.com';
const EXECUTION_POLL_INTERVAL_MILLIS = 10000;
const EXECUTION_COMPLETED_STATUSES = [
  'succeeded',
  'failed',
  'cancelled',
  'completed',
  'terminated',
];
const GITHUB_BASE_URL = 'https://api.github.com';

async function run(): Promise<void> {
  try {
    core.startGroup('Gathering inputs');
    const applicationId: string = core.getInput('application-id', {
      required: false,
    });
    const environmentId: string = core.getInput('environment-id', {
      required: false,
    });

    const apiKey: string = process.env.MABL_API_KEY || '';
    if (!apiKey) {
      core.setFailed('MABL_API_KEY required');
    }

    // plan override options
    const browserTypes: string = core.getInput('browser-types', {
      required: false,
    });
    const uri: string = core.getInput('uri', {required: false});

    // deployment action options
    const rebaselineImages: boolean = parseBoolean(
      core.getInput('rebaseline-images', {
        required: false,
      }),
    );
    const setStaticBaseline: boolean = parseBoolean(
      core.getInput('set-static-baseline', {
        required: false,
      }),
    );

    const continueOnPlanFailure: boolean = parseBoolean(
      core.getInput('continue-on-failure', {required: false}),
    );

    const pullRequest = await getRelatedPullRequest();
    const eventTimeString = core.getInput('event-time', {required: false});
    const eventTime = eventTimeString ? parseInt(eventTimeString) : Date.now();

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

    const baseApiUrl = process.env.APP_URL ?? DEFAULT_MABL_APP_URL;
    const revision =
      process.env.GITHUB_EVENT_NAME === 'pull_request'
        ? github.context.payload.pull_request?.head?.sha
        : process.env.GITHUB_SHA;

    core.info(`Using git revision [${revision}]`);
    core.endGroup();

    core.startGroup('Creating deployment event');
    // set up http client
    const apiClient: MablApiClient = new MablApiClient(apiKey);

    // send the deployment
    const deployment: Deployment = await apiClient.postDeploymentEvent(
      applicationId,
      environmentId,
      browserTypes,
      uri,
      rebaselineImages,
      setStaticBaseline,
      revision,
      eventTime,
      properties,
    );

    core.setOutput('mabl-deployment-id', deployment.id);

    let outputLink: string = baseApiUrl;
    if (applicationId) {
      const application: Application = await apiClient.getApplication(
        applicationId,
      );
      outputLink = `${baseApiUrl}/workspaces/${application.organization_id}/events/${deployment.id}`;
      core.info(`Deployment triggered. View output at: ${outputLink}`);
    }

    core.startGroup('Await completion of tests');

    // poll Execution result until complete
    let executionComplete = false;
    while (!executionComplete) {
      await new Promise((resolve) =>
        // eslint-disable-next-line no-restricted-globals
        setTimeout(resolve, EXECUTION_POLL_INTERVAL_MILLIS),
      );
      const executionResult: ExecutionResult = await apiClient.getExecutionResults(
        deployment.id,
      );
      if (executionResult?.executions) {
        const pendingExecutions: Execution[] = getExecutionsStillPending(
          executionResult,
        );
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
    const finalExecutionResult: ExecutionResult = await apiClient.getExecutionResults(
      deployment.id,
    );

    finalExecutionResult.executions.forEach((execution: Execution) => {
      core.info(prettyFormatExecution(execution));
    });

    core.setOutput(
      'plans_run',
      '' + finalExecutionResult.plan_execution_metrics.total,
    );
    core.setOutput(
      'plans_passed',
      '' + finalExecutionResult.plan_execution_metrics.passed,
    );
    core.setOutput(
      'plans_failed',
      '' + finalExecutionResult.plan_execution_metrics.failed,
    );
    core.setOutput(
      'tests_run',
      '' + finalExecutionResult.journey_execution_metrics.total,
    );
    core.setOutput(
      'tests_passed',
      '' + finalExecutionResult.journey_execution_metrics.passed,
    );
    core.setOutput(
      'tests_failed',
      '' + finalExecutionResult.journey_execution_metrics.failed,
    );

    if (finalExecutionResult.journey_execution_metrics.failed === 0) {
      core.debug('Deployment plans passed');
    } else if (continueOnPlanFailure) {
      core.warning(
        `There were ${finalExecutionResult.journey_execution_metrics.failed} test failures but the continueOnPlanFailure flag is set so the task has been marked as passing`,
      );
      // core.setNeutral();  Todo  Set neutral when support is added to actions v2
    } else {
      core.setFailed(
        `${finalExecutionResult.journey_execution_metrics.failed} mabl test(s) failed`,
      );
    }
    core.endGroup();
  } catch (err) {
    core.setFailed(
      `mabl deployment task failed for the following reason: ${err}`,
    );
  }
}

function parseBoolean(toParse: string): boolean {
  return toParse?.toLowerCase() === 'true';
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
      'User-Agent': 'mabl-action',
    },
  };
  const client = axios.create(config);

  try {
    const response = await client.get<PullRequest[]>(targetUrl, config);
    return response?.data?.[0];
  } catch (error) {
    if (error.status !== 404) {
      core.warning(error.message);
    }
  }

  return;
}

// eslint-disable-next-line
run();
