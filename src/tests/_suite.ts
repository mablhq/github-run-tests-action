import * as assert from 'assert';
import {} from 'mocha';
import {mablApiClient} from '../mablApiClient';

describe('azure pipeline task tests', function() {
  before(function() {});

  after(() => {});

  it('builds the request correctly with all options', function(done: MochaDone) {
    let expected: any =
      '{"environment_id":"env","application_id":"app","plan_overrides":{"browser_types":["firefox"," chrome"," internet_explorer"],"uri":"uri"},"actions":{"rebaseline_images":true,"set_static_baseline":true}}';
    let apiClient: mablApiClient = new mablApiClient('test');
    let requestBody = apiClient.buildRequestBody(
      'app',
      'env',
      'firefox, chrome, internet_explorer',
      'uri',
      true,
      true,
      'abcs',
      0,
      {
        repository_branch_name: 'master',
        repository_commit_username: 'gcooney',
        repository_action: 'mabl-tests',
        repository_url: 'git@github.com:mablhq/github-mabl-actions.git',
        triggering_event_name: 'push',
        repository_pull_request_url: 'https://github.com/mablhq/repo/pr/1',
        repository_pull_request_number: 5,
        repository_pull_request_title: 'good pr',
        repository_pull_merged_at: '2019',
        repository_pull_created_at: '2019',
      },
    );
    assert.equal(expected, JSON.stringify(requestBody));
    done();
  });

  it('builds the request correctly with some options', function(done: MochaDone) {
    let expected: any =
      '{"application_id":"app","plan_overrides":{"uri":"uri"},"actions":{}}';
    let apiClient: mablApiClient = new mablApiClient('test');
    let requestBody = apiClient.buildRequestBody(
      'app',
      '',
      '',
      'uri',
      false,
      false,
      'abcs',
      0,
      {
        repository_branch_name: 'master',
        repository_commit_username: 'gcooney',
        repository_action: 'mabl-tests',
        repository_url: 'git@github.com:mablhq/github-mabl-actions.git',
        triggering_event_name: 'push',
        repository_pull_request_url: 'https://github.com/mablhq/repo/pr/1',
        repository_pull_request_number: 5,
        repository_pull_request_title: 'good pr',
        repository_pull_merged_at: '2019',
        repository_pull_created_at: '2019',
      },
    );
    assert.equal(expected, JSON.stringify(requestBody));
    done();
  });
});
