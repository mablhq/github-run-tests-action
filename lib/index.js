"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const mablApiClient_1 = require("./mablApiClient");
const table_1 = require("./table");
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
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
function run() {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            core.startGroup('Gathering inputs');
            const applicationId = core.getInput('application-id', {
                required: false,
            });
            const environmentId = core.getInput('environment-id', {
                required: false,
            });
            const apiKey = process.env.MABL_API_KEY || '';
            if (!apiKey) {
                core.setFailed('MABL_API_KEY required');
            }
            const browserTypes = core.getInput('browser-types', {
                required: false,
            });
            const uri = core.getInput('uri', { required: false });
            const rebaselineImages = parseBoolean(core.getInput('rebaseline-images', {
                required: false,
            }));
            const setStaticBaseline = parseBoolean(core.getInput('set-static-baseline', {
                required: false,
            }));
            const continueOnPlanFailure = parseBoolean(core.getInput('continue-on-failure', { required: false }));
            const pullRequest = yield getRelatedPullRequest();
            const eventTimeString = core.getInput('event-time', { required: false });
            const eventTime = eventTimeString ? parseInt(eventTimeString) : Date.now();
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
            const baseApiUrl = (_a = process.env.APP_URL) !== null && _a !== void 0 ? _a : DEFAULT_MABL_APP_URL;
            const revision = process.env.GITHUB_EVENT_NAME === 'pull_request'
                ? (_c = (_b = github.context.payload.pull_request) === null || _b === void 0 ? void 0 : _b.head) === null || _c === void 0 ? void 0 : _c.sha : process.env.GITHUB_SHA;
            core.info(`Using git revision [${revision}]`);
            core.endGroup();
            core.startGroup('Creating deployment event');
            const apiClient = new mablApiClient_1.MablApiClient(apiKey);
            const deployment = yield apiClient.postDeploymentEvent(applicationId, environmentId, browserTypes, uri, rebaselineImages, setStaticBaseline, revision, eventTime, properties);
            core.setOutput('mabl-deployment-id', deployment.id);
            let outputLink = baseApiUrl;
            if (applicationId) {
                const application = yield apiClient.getApplication(applicationId);
                outputLink = `${baseApiUrl}/workspaces/${application.organization_id}/events/${deployment.id}`;
                core.info(`Deployment triggered. View output at: ${outputLink}`);
            }
            core.startGroup('Await completion of tests');
            let executionComplete = false;
            while (!executionComplete) {
                yield new Promise((resolve) => setTimeout(resolve, EXECUTION_POLL_INTERVAL_MILLIS));
                const executionResult = yield apiClient.getExecutionResults(deployment.id);
                if (executionResult === null || executionResult === void 0 ? void 0 : executionResult.executions) {
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
            const finalExecutionResult = yield apiClient.getExecutionResults(deployment.id);
            finalExecutionResult.executions.forEach((execution) => {
                core.info(table_1.prettyFormatExecution(execution));
            });
            core.setOutput('plans_run', '' + finalExecutionResult.plan_execution_metrics.total);
            core.setOutput('plans_passed', '' + finalExecutionResult.plan_execution_metrics.passed);
            core.setOutput('plans_failed', '' + finalExecutionResult.plan_execution_metrics.failed);
            core.setOutput('tests_run', '' + finalExecutionResult.journey_execution_metrics.total);
            core.setOutput('tests_passed', '' + finalExecutionResult.journey_execution_metrics.passed);
            core.setOutput('tests_failed', '' + finalExecutionResult.journey_execution_metrics.failed);
            if (finalExecutionResult.journey_execution_metrics.failed === 0) {
                core.debug('Deployment plans passed');
            }
            else if (continueOnPlanFailure) {
                core.warning(`There were ${finalExecutionResult.journey_execution_metrics.failed} test failures but the continueOnPlanFailure flag is set so the task has been marked as passing`);
            }
            else {
                core.setFailed(`${finalExecutionResult.journey_execution_metrics.failed} mabl test(s) failed`);
            }
            core.endGroup();
        }
        catch (err) {
            core.setFailed(`mabl deployment task failed for the following reason: ${err}`);
        }
    });
}
function parseBoolean(toParse) {
    return (toParse === null || toParse === void 0 ? void 0 : toParse.toLowerCase()) === 'true';
}
function getExecutionsStillPending(executionResult) {
    return executionResult.executions.filter((execution) => {
        return !(EXECUTION_COMPLETED_STATUSES.includes(execution.status) &&
            execution.stop_time);
    });
}
function getRelatedPullRequest() {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
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
                'User-Agent': 'mabl-action',
            },
        };
        const client = axios_1.default.create(config);
        try {
            const response = yield client.get(targetUrl, config);
            return (_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a[0];
        }
        catch (error) {
            if (error.status !== 404) {
                core.warning(error.message);
            }
        }
        return;
    });
}
run();
