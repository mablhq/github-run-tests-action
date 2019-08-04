import * as assert from 'assert';
import {} from 'mocha';
import {mablApiClient} from '../mablApiClient';

describe('azure pipeline task tests', function () {
    before(function () {
    });

    after(() => {
    });

    it('builds the request correctly with all options', function (done: MochaDone) {
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
                repositoryBranchName: 'master',
                committer: 'gcooney',
                repositoryRevisionNumber: '9317002e5458a2bf965c5f78ac19b1be4cd92b2a',
                repositoryAction: 'mabl-tests',
                repositoryUrl: 'git@github.com:mablhq/github-mabl-actions.git'
            },
        );
        assert.equal(expected, JSON.stringify(requestBody));
        done();
    });

    it('builds the request correctly with some options', function (done: MochaDone) {
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
                repositoryBranchName: 'master',
                committer: 'twistedpair',
                repositoryRevisionNumber: '9317002e5458a2bf965c5f78ac19b1be4cd92b2a',
                repositoryAction: 'mabl-tests',
                repositoryUrl: 'git@github.com:mablhq/github-mabl-actions.git'
            },
        );
        assert.equal(expected, JSON.stringify(requestBody));
        done();
    });
});
