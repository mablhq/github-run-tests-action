import {MablApiClient} from '../src/mablApiClient';

describe('GitHub Action tests', () => {

  it('builds the request correctly with all options', () => {
    const expected = {
      environment_id: 'env',
      application_id: 'app',
      plan_overrides: {
        browser_types: ['firefox', 'chrome', 'internet_explorer'],
        uri: 'uri',
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
      'app',
      'env',
      ['firefox', 'chrome', 'internet_explorer'],
      [],
      [],
      'uri',
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
      'abcs',
    );
    expect(expected).toStrictEqual(requestBody);
  });

  it('builds the request correctly with some options', () => {
    const expected = {
      application_id: 'app',
      plan_labels: ['alpha', 'beta'],
      plan_overrides: {
        uri: 'uri',
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
      'app',
      '',
      ['chrome', 'firefox'],
      ['alpha', 'beta'],
      ['Header-Uno:value-uno', 'Header-Dos:value-dos'],
      'uri',
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
      'abcs',
    );
    expect(expected).toStrictEqual(requestBody);
  });
});
