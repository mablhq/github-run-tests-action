import axios from 'axios';
import * as core from '@actions/core';
import {MablApiClient} from './mablApiClient';
import {
  FailureAnalysis,
  FailureAnalysisResponse,
} from './entities/FailureAnalysis';
import {escapeSlackMarkdown, fitSlackSectionText} from './slackUtil';

export interface DeploymentAnalysisPollOptions {
  pollIntervalMs?: number;
  maxPollAttempts?: number;
  sleep?: (ms: number) => Promise<void>;
}

export const DEFAULT_POLL_INTERVAL_MS = 2_000;
export const DEFAULT_MAX_POLL_ATTEMPTS = 10;

const SLACK_ANALYSIS_BODY_MAX_CHARS = 2_700;

export async function getDeploymentFailureAnalysisForSlack(
  apiClient: MablApiClient,
  workspaceId: string,
  deploymentEventId: string,
  pollOptions?: DeploymentAnalysisPollOptions,
): Promise<FailureAnalysis | undefined> {
  const response = await pollForSavedDeploymentFailureAnalysis(
    apiClient,
    workspaceId,
    deploymentEventId,
    pollOptions,
  );
  return response?.analysis;
}

export function formatFailureAnalysisForSlack(
  analysis: FailureAnalysis,
): string | undefined {
  const synopsis = analysis.synopsis?.trim();
  const summaryText = analysis.summary_text?.trim();

  if (!synopsis && !summaryText) {
    return undefined;
  }

  const sections: string[] = [];
  if (synopsis) {
    sections.push(`*${escapeSlackMarkdown(synopsis)}*`);
  }
  if (summaryText) {
    sections.push(escapeSlackMarkdown(summaryText));
  }

  return fitSlackSectionText(
    sections.join('\n\n'),
    SLACK_ANALYSIS_BODY_MAX_CHARS,
  );
}

function getAnalysisFromResponse(
  response: FailureAnalysisResponse,
): FailureAnalysis | undefined {
  if (response.status !== 'done' || !response.analysis) {
    return undefined;
  }
  return response.analysis;
}

function formatAnalysisFetchError(error: unknown): string {
  if (axios.isAxiosError(error)) {
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

async function pollForSavedDeploymentFailureAnalysis(
  apiClient: MablApiClient,
  workspaceId: string,
  deploymentEventId: string,
  pollOptions?: DeploymentAnalysisPollOptions,
): Promise<FailureAnalysisResponse | undefined> {
  const maxAttempts = pollOptions?.maxPollAttempts ?? DEFAULT_MAX_POLL_ATTEMPTS;
  const pollIntervalMs =
    pollOptions?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const sleepFn = pollOptions?.sleep ?? sleep;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await apiClient.tryGetSavedDeploymentFailureAnalysis(
        workspaceId,
        deploymentEventId,
      );

      if (response === undefined) {
        if (attempt < maxAttempts) {
          if (attempt === 1) {
            core.info(
              `Deployment analysis not ready for event [${deploymentEventId}], polling up to ${maxAttempts} attempt(s)`,
            );
          }
          await sleepFn(pollIntervalMs);
          continue;
        }

        core.info(
          `No deployment analysis for event [${deploymentEventId}] after ${maxAttempts} poll attempt(s)`,
        );
        return undefined;
      }

      const analysis = getAnalysisFromResponse(response);
      if (analysis) {
        if (attempt > 1) {
          core.info(
            `Deployment analysis ready for event [${deploymentEventId}] after ${attempt} poll attempt(s)`,
          );
        }
        return response;
      }

      if (response.status === 'queued' && attempt < maxAttempts) {
        if (attempt === 1) {
          core.info(
            `Deployment analysis queued for event [${deploymentEventId}], polling up to ${maxAttempts} attempt(s)`,
          );
        }
        await sleepFn(pollIntervalMs);
        continue;
      }

      if (response.status === 'queued') {
        core.info(
          `Deployment analysis still queued for event [${deploymentEventId}] after ${maxAttempts} poll attempt(s); giving up`,
        );
      }

      return undefined;
    } catch (error) {
      const message = formatAnalysisFetchError(error);
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        core.warning(
          `Deployment analysis unavailable for event [${deploymentEventId}]: ${message}`,
        );
        return undefined;
      }

      if (attempt < maxAttempts) {
        core.warning(
          `Failed to fetch deployment analysis for event [${deploymentEventId}] (attempt ${attempt}/${maxAttempts}): ${message}`,
        );
        await sleepFn(pollIntervalMs);
        continue;
      }

      core.warning(
        `Failed to fetch deployment analysis for event [${deploymentEventId}] after ${maxAttempts} poll attempt(s): ${message}`,
      );
      return undefined;
    }
  }

  return undefined;
}

function sleep(milliseconds: number): Promise<void> {
  // eslint-disable-next-line no-restricted-globals
  return new Promise((resolve) => {
    // eslint-disable-next-line no-restricted-globals
    setTimeout(resolve, milliseconds);
  });
}
