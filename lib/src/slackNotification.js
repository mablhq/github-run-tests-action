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
exports.notifySlackOnDeploymentFailure = notifySlackOnDeploymentFailure;
exports.notifySlackOnDeploymentTaskFailure = notifySlackOnDeploymentTaskFailure;
exports.resolveSlackWebhookUrl = resolveSlackWebhookUrl;
exports.buildSlackWorkflowContext = buildSlackWorkflowContext;
const axios_1 = __importDefault(require("axios"));
const core = __importStar(require("@actions/core"));
const deploymentAnalysis_1 = require("./deploymentAnalysis");
const slackUtil_1 = require("./slackUtil");
async function notifySlackOnDeploymentFailure(webhookUrl, context) {
    const metrics = context.executionResult.journey_execution_metrics;
    const planMetrics = context.executionResult.plan_execution_metrics;
    let analysisText;
    try {
        const analysis = await (0, deploymentAnalysis_1.getDeploymentFailureAnalysisForSlack)(context.apiClient, context.workspaceId, context.deploymentEventId);
        if (analysis) {
            analysisText = (0, deploymentAnalysis_1.formatFailureAnalysisForSlack)(analysis);
        }
    }
    catch (error) {
        core.warning(`Unable to load deployment analysis for Slack notification: ${error}`);
    }
    const payload = buildSlackPayload(context, analysisText, metrics, planMetrics);
    await postSlackWebhook(webhookUrl, payload);
}
async function notifySlackOnDeploymentTaskFailure(webhookUrl, context) {
    const blocks = [
        {
            type: 'header',
            text: {
                type: 'plain_text',
                text: 'mabl deployment task failed',
                emoji: true,
            },
        },
    ];
    appendContextFields(blocks, context);
    blocks.push({
        type: 'section',
        text: {
            type: 'markdown',
            text: (0, slackUtil_1.fitSlackSectionText)(`*Error:*\n${(0, slackUtil_1.escapeSlackMarkdown)(context.errorMessage)}`, slackUtil_1.SLACK_SECTION_TEXT_MAX_CHARS),
        },
    });
    if (context.executionResult) {
        const metrics = context.executionResult.journey_execution_metrics;
        const planMetrics = context.executionResult.plan_execution_metrics;
        blocks.push({
            type: 'section',
            text: {
                type: 'markdown',
                text: `*Partial results:*\n${metrics.failed} test(s) failed (${metrics.passed}/${metrics.total} passed)\n${planMetrics.failed} plan(s) failed (${planMetrics.passed}/${planMetrics.total} passed)`,
            },
        });
    }
    blocks.push({
        type: 'section',
        text: {
            type: 'markdown',
            text: `<${context.deploymentPageUrl}|View deployment in mabl>`,
        },
    });
    appendWorkflowContext(blocks, context.workflowUrl);
    await postSlackWebhook(webhookUrl, {
        text: 'mabl deployment task failed',
        blocks,
    });
}
function buildSlackPayload(context, analysisText, journeyMetrics, planMetrics) {
    const blocks = [
        {
            type: 'header',
            text: {
                type: 'plain_text',
                text: 'mabl deployment tests failed',
                emoji: true,
            },
        },
    ];
    appendContextFields(blocks, context);
    blocks.push({
        type: 'section',
        text: {
            type: 'markdown',
            text: `*Results:*\n${journeyMetrics.failed} test(s) failed (${journeyMetrics.passed}/${journeyMetrics.total} passed)\n${planMetrics.failed} plan(s) failed (${planMetrics.passed}/${planMetrics.total} passed)`,
        },
    });
    blocks.push({
        type: 'section',
        text: {
            type: 'markdown',
            text: `<${context.deploymentPageUrl}|View deployment in mabl>`,
        },
    });
    if (analysisText) {
        blocks.push({
            type: 'section',
            text: {
                type: 'markdown',
                text: (0, slackUtil_1.fitSlackSectionText)(`*Analysis*\n${analysisText}`, slackUtil_1.SLACK_SECTION_TEXT_MAX_CHARS),
            },
        });
    }
    appendWorkflowContext(blocks, context.workflowUrl);
    return {
        text: `mabl deployment tests failed (${journeyMetrics.failed} test failure(s))`,
        blocks,
    };
}
function appendContextFields(blocks, context) {
    const fields = [];
    if (context.repository) {
        fields.push({
            type: 'markdown',
            text: `*Repository:*\n${(0, slackUtil_1.escapeSlackMarkdown)(context.repository)}`,
        });
    }
    if (context.branch) {
        fields.push({
            type: 'markdown',
            text: `*Branch / ref:*\n\`${(0, slackUtil_1.escapeSlackMarkdown)(context.branch)}\``,
        });
    }
    if (context.revision) {
        fields.push({
            type: 'markdown',
            text: `*Revision:*\n\`${(0, slackUtil_1.escapeSlackMarkdown)(context.revision.slice(0, 7))}\``,
        });
    }
    if (context.actor) {
        fields.push({
            type: 'markdown',
            text: `*Triggered by:*\n${(0, slackUtil_1.escapeSlackMarkdown)(context.actor)}`,
        });
    }
    if (fields.length > 0) {
        blocks.push({ type: 'section', fields });
    }
}
function appendWorkflowContext(blocks, workflowUrl) {
    if (!workflowUrl) {
        return;
    }
    blocks.push({
        type: 'context',
        elements: [
            {
                type: 'markdown',
                text: `<${workflowUrl}|GitHub Actions workflow run>`,
            },
        ],
    });
}
async function postSlackWebhook(webhookUrl, payload) {
    await axios_1.default.post(webhookUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30_000,
    });
}
function resolveSlackWebhookUrl() {
    const fromEnv = process.env.SLACK_WEBHOOK_URL?.trim();
    if (fromEnv) {
        return fromEnv;
    }
    return undefined;
}
function buildSlackWorkflowContext() {
    const serverUrl = process.env.GITHUB_SERVER_URL ?? 'https://github.com';
    const workflowUrl = process.env.GITHUB_RUN_ID && process.env.GITHUB_REPOSITORY
        ? `${serverUrl}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
        : undefined;
    return {
        repository: process.env.GITHUB_REPOSITORY,
        branch: process.env.GITHUB_REF,
        actor: process.env.GITHUB_ACTOR,
        workflowUrl,
    };
}
