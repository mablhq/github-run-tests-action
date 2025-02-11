import {MablApiClient} from '../src/mablApiClient';
import {booleanInput, optionalArrayInput, optionalInput, run} from '../src';
import {ActionInputs} from '../src/constants';
import {AxiosHeaders} from 'axios';


describe('GitHub Action tests', () => {

  beforeEach(() => {
    process.env.DISABLE_FAILURE_EXIT_CODES = 'true';
  });

  // Place the input into ENV var the same as in GitHub Actions
  function setGithubInput(name: string, value: string): void {
    process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] = value;
  }

  function assertExitCodeNot(expected: number): void {
    expect(process.exitCode).not.toBe(expected);
  }

  it('handles invalid application/environment ids', async () => {
    setGithubInput(ActionInputs.ApplicationId, '');
    setGithubInput(ActionInputs.EnvironmentId, '');
    await run(false);
    assertExitCodeNot(1); // We'd normally seek '1', but that will break the CI/CD test harness
  });

  it('parses array inputs', () => {
    setGithubInput(ActionInputs.BrowserTypes, '');
    expect(optionalArrayInput(ActionInputs.BrowserTypes)).toEqual([]);

    setGithubInput(ActionInputs.BrowserTypes, 'chrome ');
    expect(optionalArrayInput(ActionInputs.BrowserTypes)).toEqual(['chrome']);

    setGithubInput(ActionInputs.BrowserTypes, 'chrome, firefox ');
    expect(optionalArrayInput(ActionInputs.BrowserTypes)).toEqual(['chrome', 'firefox']);

    setGithubInput(ActionInputs.BrowserTypes, 'chrome\nfirefox\nwebkit\nedge ');
    expect(optionalArrayInput(ActionInputs.BrowserTypes)).toEqual(['chrome', 'firefox', 'webkit', 'edge']);
  });

  it('parses boolean inputs', () => {
    setGithubInput(ActionInputs.RebaselineImages, '');
    expect(booleanInput(ActionInputs.RebaselineImages)).toEqual(false);

    setGithubInput(ActionInputs.RebaselineImages, 'false ');
    expect(booleanInput(ActionInputs.RebaselineImages)).toEqual(false);

    setGithubInput(ActionInputs.RebaselineImages, 'False ');
    expect(booleanInput(ActionInputs.RebaselineImages)).toEqual(false);

    setGithubInput(ActionInputs.RebaselineImages, 'True ');
    expect(booleanInput(ActionInputs.RebaselineImages)).toEqual(true);

    setGithubInput(ActionInputs.RebaselineImages, 'true ');
    expect(booleanInput(ActionInputs.RebaselineImages)).toEqual(true);

    setGithubInput(ActionInputs.RebaselineImages, 'TRUE');
    expect(booleanInput(ActionInputs.RebaselineImages)).toEqual(true);
  });


  it('parses optional string inputs', () => {
    setGithubInput(ActionInputs.ApplicationId, '');
    expect(optionalInput(ActionInputs.ApplicationId)).toBeUndefined();

    setGithubInput(ActionInputs.ApplicationId, 'baz ');
    expect(optionalInput(ActionInputs.ApplicationId)).toEqual('baz');

    setGithubInput(ActionInputs.ApplicationId, 'BAZ');
    expect(optionalInput(ActionInputs.ApplicationId)).toEqual('BAZ');
  });

  it('humanizes 403 errors', () => {
    expect(() => MablApiClient.throwHumanizedError({
      status: 403,
      statusText: 'This is an error',
      config: {headers: new AxiosHeaders()},
      headers: {},
      data: 10,
      request: {}
    })).toThrow("Forbidden API error, are you sure you used a \"CI/CD Integration\" type API key? Ensure this key is for the same workspace you're testing.");
  });

  it('humanizes 401 errors', () => {
    expect(() => MablApiClient.throwHumanizedError({
      status: 401,
      statusText: 'This is an error',
      config: {headers: new AxiosHeaders()},
      headers: {},
      data: 10,
      request: {}
    })).toThrow('Unauthorized API error, are you sure you passed the correct API key? Is the key "enabled"?');
  });

  it('humanizes 404 errors', () => {
    expect(() => MablApiClient.throwHumanizedError({
      status: 404,
      statusText: 'This is an error',
      config: {headers: new AxiosHeaders()},
      headers: {},
      data: 10,
      request: {}
    })).toThrow('Not Found API error, please ensure any environment or application IDs in your Action config are correct.');
  });

  it('humanizes non-specific errors', () => {
    expect(() => MablApiClient.throwHumanizedError({
      status: 500,
      statusText: 'This is an error',
      config: {
        headers: new AxiosHeaders()
      },
      headers: {},
      data: 10,
      request: {}
    })).toThrow('[500 - This is an error]');
  });

  it('builds the request correctly with all options', () => {
    const expected = {
      environment_id: 'env',
      application_id: 'app',
      plan_overrides: {
        browser_types: ['firefox', 'chrome', 'edge'],
        web_url: 'fake-app-url',
        api_url: 'fake-api-url',
      },
      actions: {rebaseline_images: true, set_static_baseline: true},
      revision: 'abcs',
      properties: {
        repository_branch_name: 'master',
        repository_commit_username: 'gcooney',
        repository_action: 'mabl-tests',
        repository_url: 'git@github.com:mablhq/github-mabl-actions.git',
        repository_name: 'github-mabl-actions',
        triggering_event_name: 'push',
        repository_pull_request_url: 'https://github.com/mablhq/repo/pr/1',
        repository_pull_request_number: 5,
        repository_pull_request_title: 'good pr',
        repository_pull_request_merged_at: '2019',
        repository_pull_request_created_at: '2019',
      },
    };
    const apiClient = new MablApiClient('test');
    const requestBody = apiClient.buildRequestBody(
      ['firefox', 'chrome', 'edge'],
      [],
      [],
      true,
      true,

      0,
      {
        repository_branch_name: 'master',
        repository_commit_username: 'gcooney',
        repository_action: 'mabl-tests',
        repository_url: 'git@github.com:mablhq/github-mabl-actions.git',
        repository_name: 'github-mabl-actions',
        triggering_event_name: 'push',
        repository_pull_request_url: 'https://github.com/mablhq/repo/pr/1',
        repository_pull_request_number: 5,
        repository_pull_request_title: 'good pr',
        repository_pull_request_merged_at: '2019',
        repository_pull_request_created_at: '2019',
      },
      'app',
      'env',
      'fake-app-url',
      'fake-api-url',
      'abcs',
    );
    expect(expected).toStrictEqual(requestBody);
  });

  it('builds the request correctly with some options', () => {
    const expected = {
      application_id: 'app',
      plan_labels: ['alpha', 'beta'],
      plan_overrides: {
        web_url: 'fake-app-url',
        browser_types: ['chrome', 'firefox'],
        http_headers: [{
          name: 'Header-Uno',
          value: 'value-uno',
          log_header_value: false,
        }, {
          name: 'Header-Dos',
          value: 'value-dos',
          log_header_value: false,
        }],
        http_headers_required: true
      },
      actions: {},
      revision: 'abcs',
      properties: {
        repository_branch_name: 'master',
        repository_commit_username: 'gcooney',
        repository_action: 'mabl-tests',
        repository_name: 'github-mabl-actions',
        repository_url: 'git@github.com:mablhq/github-mabl-actions.git',
        triggering_event_name: 'push',
        repository_pull_request_url: 'https://github.com/mablhq/repo/pr/1',
        repository_pull_request_number: 5,
        repository_pull_request_title: 'good pr',
        repository_pull_request_merged_at: '2019',
        repository_pull_request_created_at: '2019',
      },
    };
    const apiClient = new MablApiClient('test');
    const requestBody = apiClient.buildRequestBody(
      ['chrome', 'firefox'],
      ['alpha', 'beta'],
      ['Header-Uno:value-uno', 'Header-Dos:value-dos'],
      false,
      false,

      0,
      {
        repository_branch_name: 'master',
        repository_commit_username: 'gcooney',
        repository_action: 'mabl-tests',
        repository_name: 'github-mabl-actions',
        repository_url: 'git@github.com:mablhq/github-mabl-actions.git',
        triggering_event_name: 'push',
        repository_pull_request_url: 'https://github.com/mablhq/repo/pr/1',
        repository_pull_request_number: 5,
        repository_pull_request_title: 'good pr',
        repository_pull_request_merged_at: '2019',
        repository_pull_request_created_at: '2019',
      },
      'app',
      '',
      'fake-app-url',
      undefined,
      'abcs',
    );
    expect(expected).toStrictEqual(requestBody);
  });

  it('builds the request correctly with some options API test override', () => {
    const expected = {
      application_id: 'app',
      plan_labels: ['alpha', 'beta'],
      plan_overrides: {
        api_url: 'fake-api-url',
        browser_types: ['chrome', 'firefox'],
        http_headers: [{
          name: 'Header-Uno',
          value: 'value-uno',
          log_header_value: false,
        }, {
          name: 'Header-Dos',
          value: 'value-dos',
          log_header_value: false,
        }],
        http_headers_required: true
      },
      actions: {},
      revision: 'abcs',
      properties: {
        repository_branch_name: 'master',
        repository_commit_username: 'gcooney',
        repository_action: 'mabl-tests',
        repository_name: 'github-mabl-actions',
        repository_url: 'git@github.com:mablhq/github-mabl-actions.git',
        triggering_event_name: 'push',
        repository_pull_request_url: 'https://github.com/mablhq/repo/pr/1',
        repository_pull_request_number: 5,
        repository_pull_request_title: 'good pr',
        repository_pull_request_merged_at: '2019',
        repository_pull_request_created_at: '2019',
      },
    };
    const apiClient = new MablApiClient('test');
    const requestBody = apiClient.buildRequestBody(
      ['chrome', 'firefox'],
      ['alpha', 'beta'],
      ['Header-Uno:value-uno', 'Header-Dos:value-dos'],
      false,
      false,

      0,
      {
        repository_branch_name: 'master',
        repository_commit_username: 'gcooney',
        repository_action: 'mabl-tests',
        repository_name: 'github-mabl-actions',
        repository_url: 'git@github.com:mablhq/github-mabl-actions.git',
        triggering_event_name: 'push',
        repository_pull_request_url: 'https://github.com/mablhq/repo/pr/1',
        repository_pull_request_number: 5,
        repository_pull_request_title: 'good pr',
        repository_pull_request_merged_at: '2019',
        repository_pull_request_created_at: '2019',
      },
      'app',
      '',
      undefined,
      'fake-api-url',
      'abcs',
    );
    expect(expected).toStrictEqual(requestBody);
  });
});
