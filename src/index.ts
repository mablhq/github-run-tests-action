import {mablApiClient} from './mablApiClient';
import {
  Deployment,
  PullRequest,
  DeploymentProperties,
} from './entities/Deployment';
import {Application} from './entities/Application';
import {Execution, ExecutionResult} from './entities/ExecutionResult';
import {prettyPrintExecution} from './table';
import request from 'request-promise-native';
import * as core from '@actions/core/lib/core';

const DEFAULT_MABL_APP_URL: string = 'https://app.mabl.com';
const EXECUTION_POLL_INTERVAL_MILLIS: number = 10000;
const EXECUTION_COMPLETED_STATUSES: Array<string> = [
  'succeeded',
  'failed',
  'cancelled',
  'completed',
  'terminated',
];
const GITHUB_BASE_URL = 'https://api.github.com';

async function run() {
  try {
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

    const pullRequest: PullRequest | undefined = await getRelatedPullRequest();
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

    const baseApiUrl = process.env.APP_URL || DEFAULT_MABL_APP_URL;

    // set up http client
    let apiClient: mablApiClient = new mablApiClient(apiKey);
    const revision = process.env.GITHUB_SHA;

    // send the deployment
    core.debug('Creating Deployment');
    let deployment: Deployment = await apiClient.postDeploymentEvent(
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
      let application: Application = await apiClient.getApplication(
        applicationId,
      );
      outputLink = `${baseApiUrl}/workspaces/${application.organization_id}/events/${deployment.id}`;
      core.debug(`Deployment triggered. View output at: ${outputLink}`);
    }

    // poll Execution result until complete
    let executionComplete: boolean = false;
    while (!executionComplete) {
      await new Promise(resolve =>
        setTimeout(resolve, EXECUTION_POLL_INTERVAL_MILLIS),
      );
      let executionResult: ExecutionResult = await apiClient.getExecutionResults(
        deployment.id,
      );
      if (executionResult && executionResult.executions) {
        let pendingExecutions: Array<Execution> = getExecutionsStillPending(
          executionResult,
        );
        if (pendingExecutions.length === 0) {
          executionComplete = true;
        } else {
          core.debug(
            `${pendingExecutions.length} mabl plan(s) are still running`,
          );
        }
      }
    }
    core.debug('mabl deployment runs have completed');
    let finalExecutionResult: ExecutionResult = await apiClient.getExecutionResults(
      deployment.id,
    );

    finalExecutionResult.executions.forEach((execution: Execution) => {
      prettyPrintExecution(execution);
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
      'journeys_run',
      '' + finalExecutionResult.journey_execution_metrics.total,
    );
    core.setOutput(
      'journeys_passed',
      '' + finalExecutionResult.journey_execution_metrics.passed,
    );
    core.setOutput(
      'journeys_failed',
      '' + finalExecutionResult.journey_execution_metrics.failed,
    );

    if (finalExecutionResult.journey_execution_metrics.failed === 0) {
      core.debug('Deployment plans passed');
    } else if (continueOnPlanFailure) {
      core.warning(
        `There were ${finalExecutionResult.journey_execution_metrics.failed} journey failures but the continueOnPlanFailure flag is set so the task has been marked as passing`,
      );
      // core.setNeutral();  Todo  Set neutral when support is added to actions v2
    } else {
      core.setFailed(
        `${finalExecutionResult.journey_execution_metrics.failed} mabl Journey(s) failed`,
      );
    }
  } catch (err) {
    core.setFailed(
      `mabl deployment task failed for the following reason: ${err}`,
    );
  }
}

function parseBoolean(toParse: string): boolean {
  return !!(toParse && toParse.toLowerCase() == 'true');
}

function getExecutionsStillPending(
  executionResult: ExecutionResult,
): Array<Execution> {
  return executionResult.executions.filter((execution: Execution) => {
    return !(
      EXECUTION_COMPLETED_STATUSES.includes(execution.status) &&
      execution.stop_time
    );
  });
}

function getRelatedPullRequest(): Promise<any> {
  const targetUrl = `${GITHUB_BASE_URL}/repos/${process.env.GITHUB_REPOSITORY}/commits/${process.env.GITHUB_SHA}/pulls`;

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    return Promise.resolve();
  }

  const postOptions = {
    method: 'GET',
    url: targetUrl,
    headers: {
      Authorization: `token ${githubToken}`,
      Accept: 'application/vnd.github.groot-preview+json',
      'Content-Type': 'application/json',
      'User-Agent': 'mabl-action',
    },
    json: true,
  };

  return request(postOptions)
    .then(response => {
      if (!response || !response.length) {
        return;
      }

      return {
        title: response[0].title,
        number: response[0].number,
        created_at: response[0].created_at,
        merged_at: response[0].merged_at,
        url: response[0].url,
      };
    })
    .catch(error => {
      if (error.status != 404) {
        core.warning(error.message);
      }
    });
}

run();
