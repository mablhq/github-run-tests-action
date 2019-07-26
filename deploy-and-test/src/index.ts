import {mablApiClient} from './mablApiClient';
import {Deployment} from './entities/Deployment';
import {Application} from './entities/Application';
import {ExecutionResult, Execution} from './entities/ExecutionResult';
import {prettyPrintExecution} from './table';
import * as core from '@actions/core/lib/core';

let EXECUTION_POLL_INTERVAL_MILLIS: number = 10000;
let EXECUTION_COMPLETED_STATUSES: Array<string> = [
  'succeeded',
  'failed',
  'cancelled',
  'completed',
  'terminated',
];

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

    const eventTimeString = core.getInput('event-time', {required: false});
    const eventTime = eventTimeString ? parseInt(eventTimeString) : Date.now();

    const properties = {
      branch: process.env.GITHUB_REF,
      committer: process.env.GITHUB_ACTOR,
    };
    const baseApiUrl = process.env.APP_URL || 'https://app.mabl.com';

    // set up http client
    let apiClient: mablApiClient = new mablApiClient(apiKey);
    const revision = process.env.GITHUB_SHA;
    const event_time =
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
      outputLink = `${baseApiUrl}/workspaces/${
        application.organization_id
      }/events/${deployment.id}`;
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

    if (finalExecutionResult.plan_execution_metrics.failed === 0) {
      core.debug('Deployment plans passed');
    } else if (continueOnPlanFailure) {
      core.warning(
        `There were ${
          finalExecutionResult.journey_execution_metrics.failed
        } journey failures but the continueOnPlanFailure flag is set so the task has been marked as passing`,
      );
      core.setNeutral();
    } else {
      core.setFailed(
        `${
          finalExecutionResult.journey_execution_metrics.failed
        } mabl Journey(s) failed`,
      );
    }
  } catch (err) {
    core.setFailed(
      `mabl deployment task failed for the following reason: ${err}`,
    );
  }
}

function parseBoolean(toParse: string): boolean {
  if (toParse && toParse.toLowerCase() == 'true') return true;

  return false;
}

function getExecutionsStillPending(
  executionResult: ExecutionResult,
): Array<Execution> {
  let pendingExecutions = executionResult.executions.filter(
    (execution: Execution) => {
      return !(
        EXECUTION_COMPLETED_STATUSES.includes(execution.status) &&
        execution.stop_time
      );
    },
  );
  return pendingExecutions;
}

run();
