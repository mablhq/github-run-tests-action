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
exports.DEFAULT_MAX_POLL_ATTEMPTS = exports.DEFAULT_POLL_INTERVAL_MS = void 0;
exports.getDeploymentFailureAnalysisForSlack = getDeploymentFailureAnalysisForSlack;
exports.formatFailureAnalysisForSlack = formatFailureAnalysisForSlack;
const axios_1 = __importDefault(require("axios"));
const core = __importStar(require("@actions/core"));
const slackUtil_1 = require("./slackUtil");
exports.DEFAULT_POLL_INTERVAL_MS = 2_000;
exports.DEFAULT_MAX_POLL_ATTEMPTS = 10;
const SLACK_ANALYSIS_BODY_MAX_CHARS = 2_700;
async function getDeploymentFailureAnalysisForSlack(apiClient, workspaceId, deploymentEventId, pollOptions) {
    const response = await pollForSavedDeploymentFailureAnalysis(apiClient, workspaceId, deploymentEventId, pollOptions);
    return response?.analysis;
}
function formatFailureAnalysisForSlack(analysis) {
    const synopsis = analysis.synopsis?.trim();
    const summaryText = analysis.summary_text?.trim();
    if (!synopsis && !summaryText) {
        return undefined;
    }
    const sections = [];
    if (synopsis) {
        sections.push(`*${(0, slackUtil_1.escapeSlackMarkdown)(synopsis)}*`);
    }
    if (summaryText) {
        sections.push((0, slackUtil_1.escapeSlackMarkdown)(summaryText));
    }
    return (0, slackUtil_1.fitSlackSectionText)(sections.join('\n\n'), SLACK_ANALYSIS_BODY_MAX_CHARS);
}
function getAnalysisFromResponse(response) {
    if (response.status !== 'done' || !response.analysis) {
        return undefined;
    }
    return response.analysis;
}
function formatAnalysisFetchError(error) {
    if (axios_1.default.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 403) {
            return 'HTTP 403 (forbidden — API key may lack analysis permissions)';
        }
        if (status !== undefined) {
            return `HTTP ${status}`;
        }
        return error.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
async function pollForSavedDeploymentFailureAnalysis(apiClient, workspaceId, deploymentEventId, pollOptions) {
    const maxAttempts = pollOptions?.maxPollAttempts ?? exports.DEFAULT_MAX_POLL_ATTEMPTS;
    const pollIntervalMs = pollOptions?.pollIntervalMs ?? exports.DEFAULT_POLL_INTERVAL_MS;
    const sleepFn = pollOptions?.sleep ?? sleep;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const response = await apiClient.tryGetSavedDeploymentFailureAnalysis(workspaceId, deploymentEventId);
            if (response === undefined) {
                if (attempt < maxAttempts) {
                    if (attempt === 1) {
                        core.info(`Deployment analysis not ready for event [${deploymentEventId}], polling up to ${maxAttempts} attempt(s)`);
                    }
                    await sleepFn(pollIntervalMs);
                    continue;
                }
                core.info(`No deployment analysis for event [${deploymentEventId}] after ${maxAttempts} poll attempt(s)`);
                return undefined;
            }
            const analysis = getAnalysisFromResponse(response);
            if (analysis) {
                if (attempt > 1) {
                    core.info(`Deployment analysis ready for event [${deploymentEventId}] after ${attempt} poll attempt(s)`);
                }
                return response;
            }
            if (response.status === 'queued' && attempt < maxAttempts) {
                if (attempt === 1) {
                    core.info(`Deployment analysis queued for event [${deploymentEventId}], polling up to ${maxAttempts} attempt(s)`);
                }
                await sleepFn(pollIntervalMs);
                continue;
            }
            if (response.status === 'queued') {
                core.info(`Deployment analysis still queued for event [${deploymentEventId}] after ${maxAttempts} poll attempt(s); giving up`);
            }
            return undefined;
        }
        catch (error) {
            const message = formatAnalysisFetchError(error);
            if (axios_1.default.isAxiosError(error) && error.response?.status === 403) {
                core.warning(`Deployment analysis unavailable for event [${deploymentEventId}]: ${message}`);
                return undefined;
            }
            if (attempt < maxAttempts) {
                core.warning(`Failed to fetch deployment analysis for event [${deploymentEventId}] (attempt ${attempt}/${maxAttempts}): ${message}`);
                await sleepFn(pollIntervalMs);
                continue;
            }
            core.warning(`Failed to fetch deployment analysis for event [${deploymentEventId}] after ${maxAttempts} poll attempt(s): ${message}`);
            return undefined;
        }
    }
    return undefined;
}
function sleep(milliseconds) {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
}
