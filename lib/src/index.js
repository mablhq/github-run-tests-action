"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalArrayInput = optionalArrayInput;
exports.optionalInput = optionalInput;
exports.booleanInput = booleanInput;
exports.run = run;
const axios_1 = __importDefault(require("axios"));
const mablApiClient_1 = require("./mablApiClient");
const table_1 = require("./table");
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const constants_1 = require("./constants");
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
function optionalArrayInput(name) {
    return core
        .getInput(name, {
        required: false,
    })
        .split(/[,\n]/)
        .filter((item) => item.length)
        .map((item) => item.trim());
}
function optionalInput(name) {
    const rawValue = core.getInput(name, {
        required: false,
    });
    if (rawValue.length > 0) {
        return rawValue;
    }
    return;
}
function booleanInput(name) {
    return (core
        .getInput(name, {
        required: false,
    })
        .toLowerCase() === 'true');
}
async function run(enableFailureExitCodes = true) {
    const wrappedFailed = (message) => {
        if (enableFailureExitCodes) {
            core.setFailed(message);
        }
    };
    try {
        core.startGroup('Gathering inputs');
        const applicationId = optionalInput(constants_1.ActionInputs.ApplicationId);
        const environmentId = optionalInput(constants_1.ActionInputs.EnvironmentId);
        const apiKey = process.env.MABL_API_KEY;
        if (!apiKey) {
            wrappedFailed('env var MABL_API_KEY required');
            return;
        }
        const planLabels = optionalArrayInput(constants_1.ActionInputs.PlanLabels);
        const browserTypes = optionalArrayInput(constants_1.ActionInputs.BrowserTypes);
        const httpHeaders = optionalArrayInput(constants_1.ActionInputs.HttpHeaders);
        const uri = optionalInput(constants_1.ActionInputs.Uri);
        const apiUrl = optionalInput(constants_1.ActionInputs.UrlApi);
        const appUrl = optionalInput(constants_1.ActionInputs.UrlApp);
        const mablBranch = optionalInput(constants_1.ActionInputs.MablBranch);
        const rebaselineImages = booleanInput(constants_1.ActionInputs.RebaselineImages);
        const setStaticBaseline = booleanInput(constants_1.ActionInputs.SetStaticBaseline);
        const continueOnPlanFailure = booleanInput(constants_1.ActionInputs.ContinueOnFailure);
        const pullRequest = await getRelatedPullRequest();
        const eventTimeString = optionalInput(constants_1.ActionInputs.EventTime);
        const eventTime = eventTimeString ? parseInt(eventTimeString) : Date.now();
        if (uri) {
            core.warning(`[${constants_1.ActionInputs.Uri}] has been deprecated. Please use [${constants_1.ActionInputs.UrlApp}] instead.`);
        }
        if (uri && appUrl) {
            core.warning(`Both [${constants_1.ActionInputs.Uri}] and [${constants_1.ActionInputs.UrlApp}] were set. The value for [${constants_1.ActionInputs.UrlApp}] will be used`);
        }
        const effectiveAppUrl = appUrl ?? uri;
        let properties = {
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
        const revision = process.env.GITHUB_EVENT_NAME === 'pull_request'
            ? github.context.payload.pull_request?.head?.sha
            : process.env.GITHUB_SHA;
        if (mablBranch) {
            core.info(`Using mabl branch [${mablBranch}]`);
        }
        core.info(`Using git revision [${revision}]`);
        core.endGroup();
        core.startGroup('Creating deployment event');
        const apiClient = new mablApiClient_1.MablApiClient(apiKey);
        const deployment = await apiClient.postDeploymentEvent(browserTypes, planLabels, httpHeaders, rebaselineImages, setStaticBaseline, eventTime, properties, applicationId, environmentId, effectiveAppUrl, apiUrl, revision, mablBranch);
        core.setOutput(constants_1.ActionOutputs.DeploymentId, deployment.id);
        let appOrEnv;
        if (applicationId) {
            appOrEnv = await apiClient.getApplication(applicationId);
        }
        else if (environmentId) {
            appOrEnv = await apiClient.getEnvironment(environmentId);
        }
        if (!appOrEnv) {
            wrappedFailed('Invalid configuration. Valid "application-id" or "environment-id" must be set. No tests started.');
            return;
        }
        const effectiveWorkspaceId = appOrEnv.workspace_id ?? appOrEnv.organization_id;
        const outputLink = `${baseAppUrl}/workspaces/${effectiveWorkspaceId}/events/${deployment.id}`;
        core.info(`Deployment triggered. View output at: ${outputLink}`);
        core.startGroup('Await completion of tests');
        let executionComplete = false;
        while (!executionComplete) {
            await sleep(EXECUTION_POLL_INTERVAL_MILLIS);
            const executionResult = await apiClient.getExecutionResults(deployment.id);
            if (executionResult?.executions) {
                const pendingExecutions = getExecutionsStillPending(executionResult);
                if (pendingExecutions.length === 0) {
                    executionComplete = true;
                }
                else {
                    core.info(`${pendingExecutions.length} mabl plan(s) are still running`);
                }
            }
        }
        core.info('mabl deployment runs have completed');
        core.endGroup();
        core.startGroup('Fetch execution results');
        const finalExecutionResult = await apiClient.getExecutionResults(deployment.id);
        finalExecutionResult.executions.forEach((execution) => {
            core.info((0, table_1.prettyFormatExecution)(execution));
        });
        core.setOutput(constants_1.ActionOutputs.PlansRun, '' + finalExecutionResult.plan_execution_metrics.total);
        core.setOutput(constants_1.ActionOutputs.PlansPassed, '' + finalExecutionResult.plan_execution_metrics.passed);
        core.setOutput(constants_1.ActionOutputs.PlansFailed, '' + finalExecutionResult.plan_execution_metrics.failed);
        core.setOutput(constants_1.ActionOutputs.TestsRun, '' + finalExecutionResult.journey_execution_metrics.total);
        core.setOutput(constants_1.ActionOutputs.TestsPassed, '' + finalExecutionResult.journey_execution_metrics.passed);
        core.setOutput(constants_1.ActionOutputs.TestsFailed, '' + finalExecutionResult.journey_execution_metrics.failed);
        if (finalExecutionResult.journey_execution_metrics.failed === 0) {
            core.debug('Deployment plans passed');
        }
        else if (continueOnPlanFailure) {
            core.warning(`There were ${finalExecutionResult.journey_execution_metrics.failed} test failures but the continueOnPlanFailure flag is set so the task has been marked as passing`);
        }
        else {
            wrappedFailed(`${finalExecutionResult.journey_execution_metrics.failed} mabl test(s) failed`);
        }
        core.endGroup();
    }
    catch (err) {
        wrappedFailed(`mabl deployment task failed for the following reason: ${err}`);
    }
}
function sleep(milliseconds) {
    return new Promise((resolve, reject) => {
        try {
            setTimeout(resolve, milliseconds);
        }
        catch (error) {
            reject(error);
        }
    });
}
function getExecutionsStillPending(executionResult) {
    return executionResult.executions.filter((execution) => {
        return !(EXECUTION_COMPLETED_STATUSES.includes(execution.status) &&
            execution.stop_time);
    });
}
async function getRelatedPullRequest() {
    const targetUrl = `${GITHUB_BASE_URL}/repos/${process.env.GITHUB_REPOSITORY}/commits/${process.env.GITHUB_SHA}/pulls`;
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
        return;
    }
    const config = {
        headers: {
            Authorization: `token ${githubToken}`,
            Accept: 'application/vnd.github.groot-preview+json',
            'Content-Type': 'application/json',
            'User-Agent': constants_1.USER_AGENT,
        },
    };
    const client = axios_1.default.create(config);
    try {
        const response = await client.get(targetUrl, config);
        return response?.data?.[0];
    }
    catch (error) {
        const maybeAxiosError = error;
        if (maybeAxiosError.status !== 404) {
            core.warning(maybeAxiosError.message);
        }
    }
    return;
}
