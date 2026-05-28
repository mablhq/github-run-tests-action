import {MablApiClient} from '../src/mablApiClient';
import {
  DEFAULT_MAX_POLL_ATTEMPTS,
  formatFailureAnalysisForSlack,
  getDeploymentFailureAnalysisForSlack,
} from '../src/deploymentAnalysis';
import {FailureAnalysisResponse} from '../src/entities/FailureAnalysis';

describe('deploymentAnalysis', () => {
  describe('formatFailureAnalysisForSlack', () => {
    it('formats synopsis and summary with escaped markdown', () => {
      const text = formatFailureAnalysisForSlack({
        synopsis: 'Login <script> broke',
        summary_text: 'The submit *button* did not respond.',
      });

      expect(text).toContain('*Login &lt;script&gt; broke*');
      expect(text).toContain('submit *​button*');
      expect(text).not.toContain('View full analysis');
    });

    it('returns undefined when analysis has no text', () => {
      expect(formatFailureAnalysisForSlack({})).toBeUndefined();
    });

    it('truncates long summary text', () => {
      const text = formatFailureAnalysisForSlack({
        summary_text: 'x'.repeat(3_000),
      });

      expect(text).toBeDefined();
      expect(text?.length).toBeLessThanOrEqual(2_700);
      expect(text).toContain('...');
    });
  });

  describe('getDeploymentFailureAnalysisForSlack', () => {
    it('defaults to 10 poll attempts', () => {
      expect(DEFAULT_MAX_POLL_ATTEMPTS).toBe(10);
    });

    it('polls until analysis is done', async () => {
      const queued: FailureAnalysisResponse = {status: 'queued'};
      const done: FailureAnalysisResponse = {
        status: 'done',
        analysis: {synopsis: 'Done', summary_text: 'Root cause'},
      };

      const tryGetSavedDeploymentFailureAnalysis = jest
        .fn()
        .mockResolvedValueOnce(queued)
        .mockResolvedValueOnce(done);

      const apiClient = {
        tryGetSavedDeploymentFailureAnalysis,
      } as unknown as MablApiClient;

      const analysis = await getDeploymentFailureAnalysisForSlack(
        apiClient,
        'workspace-id',
        'deployment-id',
        {
          pollIntervalMs: 1,
          maxPollAttempts: 10,
          sleep: async () => undefined,
        },
      );

      expect(analysis).toEqual(done.analysis);
      expect(tryGetSavedDeploymentFailureAnalysis).toHaveBeenCalledTimes(2);
    });

    it('retries when analysis is not found yet', async () => {
      const done: FailureAnalysisResponse = {
        status: 'done',
        analysis: {synopsis: 'Ready'},
      };

      const tryGetSavedDeploymentFailureAnalysis = jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(done);

      const apiClient = {
        tryGetSavedDeploymentFailureAnalysis,
      } as unknown as MablApiClient;

      const analysis = await getDeploymentFailureAnalysisForSlack(
        apiClient,
        'workspace-id',
        'deployment-id',
        {
          pollIntervalMs: 1,
          maxPollAttempts: 10,
          sleep: async () => undefined,
        },
      );

      expect(analysis).toEqual(done.analysis);
      expect(tryGetSavedDeploymentFailureAnalysis).toHaveBeenCalledTimes(2);
    });

    it('gives up after max attempts while queued', async () => {
      const tryGetSavedDeploymentFailureAnalysis = jest
        .fn()
        .mockResolvedValue({status: 'queued'});

      const apiClient = {
        tryGetSavedDeploymentFailureAnalysis,
      } as unknown as MablApiClient;

      const analysis = await getDeploymentFailureAnalysisForSlack(
        apiClient,
        'workspace-id',
        'deployment-id',
        {
          pollIntervalMs: 1,
          maxPollAttempts: 3,
          sleep: async () => undefined,
        },
      );

      expect(analysis).toBeUndefined();
      expect(tryGetSavedDeploymentFailureAnalysis).toHaveBeenCalledTimes(3);
    });
  });
});
