"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const mablApiClient_1 = require("./mablApiClient");
const table_1 = require("./table");
const testOutput_1 = require("./testOutput");
const core_1 = __importDefault(require("@actions/core/lib/core"));
let EXECUTION_POLL_INTERVAL_MILLIS = 10000;
let EXECUTION_COMPLETED_STATUSES = [
    'succeeded',
    'failed',
    'cancelled',
    'completed',
    'terminated',
];
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // required input
            const apiKey = core_1.default.getInput('api-key', { required: true });
            // basic optional inputs
            const applicationId = core_1.default.getInput('application-id', {
                required: false,
            });
            const environmentId = core_1.default.getInput('environment-id', {
                required: false,
            });
            // plan override options
            const browserTypes = core_1.default.getInput('browser-types', {
                required: false,
            });
            const uri = core_1.default.getInput('uri', { required: false });
            // deployment action options
            const rebaselineImages = parseBoolean(core_1.default.getInput('rebaseline-images', {
                required: false,
            }));
            const setStaticBaseline = parseBoolean(core_1.default.getInput('set-static-baseline', {
                required: false,
            }));
            const continueOnPlanFailure = parseBoolean(core_1.default.getInput('continue-on-failure', { required: false }));
            const eventTimeString = core_1.default.getInput('event-time', { required: false });
            const eventTime = eventTimeString ? parseInt(eventTimeString) : Date.now();
            const properties = {
                branch: process.env.GITHUB_REF,
                committer: process.env.GITHUB_ACTOR,
            };
            const baseApiUrl = process.env.APP_URL || 'https://app.mabl.com';
            // set up http client
            let apiClient = new mablApiClient_1.mablApiClient(apiKey);
            const revision = process.env.GITHUB_SHA;
            const event_time = 
            // send the deployment
            core_1.default.debug('Creating Deployment');
            let deployment = yield apiClient.postDeploymentEvent(applicationId, environmentId, browserTypes, uri, rebaselineImages, setStaticBaseline, revision, eventTime, properties);
            core_1.default.setOutput('mabl-deployment-id', deployment.id);
            let outputLink = baseApiUrl;
            if (applicationId) {
                let application = yield apiClient.getApplication(applicationId);
                outputLink = `${baseApiUrl}/workspaces/${application.organization_id}/events/${deployment.id}`;
                core_1.default.debug(`Deployment triggered. View output at: ${outputLink}`);
            }
            // poll Execution result until complete
            let executionComplete = false;
            while (!executionComplete) {
                yield new Promise(resolve => setTimeout(resolve, EXECUTION_POLL_INTERVAL_MILLIS));
                let executionResult = yield apiClient.getExecutionResults(deployment.id);
                if (executionResult && executionResult.executions) {
                    let pendingExecutions = getExecutionsStillPending(executionResult);
                    if (pendingExecutions.length === 0) {
                        executionComplete = true;
                    }
                    else {
                        core_1.default.debug(`${pendingExecutions.length} mabl plan(s) are still running`);
                    }
                }
            }
            core_1.default.debug('mabl deployment runs have completed');
            let finalExecutionResult = yield apiClient.getExecutionResults(deployment.id);
            finalExecutionResult.executions.forEach((execution) => {
                table_1.prettyPrintExecution(execution);
                console.log('');
            });
            testOutput_1.generatePublishExecutionResult('mabl-deployment-test-output.xml', finalExecutionResult, deployment.id, outputLink);
            core_1.default.debug('mabl Azure DevOps Pipeline Extension Complete');
            if (finalExecutionResult.plan_execution_metrics.failed === 0) {
                core_1.default.debug('Deployment plans passed');
            }
            else if (continueOnPlanFailure) {
                core_1.default.warning(`There were ${finalExecutionResult.journey_execution_metrics.failed} journey failures but the continueOnPlanFailure flag is set so the task has been marked as passing`);
                core_1.default.setNeutral();
            }
            else {
                core_1.default.setFailed(`${finalExecutionResult.journey_execution_metrics.failed} mabl Journey(s) failed`);
            }
        }
        catch (err) {
            core_1.default.setFailed(`mabl deployment task failed for the following reason: ${err}`);
        }
    });
}
function parseBoolean(toParse) {
    if (toParse && toParse.toLowerCase() == 'true')
        return true;
    return false;
}
function getExecutionsStillPending(executionResult) {
    let pendingExecutions = executionResult.executions.filter((execution) => {
        return !(EXECUTION_COMPLETED_STATUSES.includes(execution.status) &&
            execution.stop_time);
    });
    return pendingExecutions;
}
run();
