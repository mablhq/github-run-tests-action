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
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const mablApiClient_1 = require("../mablApiClient");
describe('GitHub Action tests', function () {
    before(function () { });
    after(() => { });
    it('builds the request correctly with all options', (done) => {
        const expected = {
            environment_id: 'env',
            application_id: 'app',
            plan_overrides: {
                browser_types: ['firefox', ' chrome', ' internet_explorer'],
                uri: 'uri',
            },
            actions: { rebaseline_images: true, set_static_baseline: true },
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
        const apiClient = new mablApiClient_1.MablApiClient('test');
        const requestBody = apiClient.buildRequestBody('app', 'env', 'firefox, chrome, internet_explorer', 'uri', true, true, 0, {
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
        }, 'abcs');
        assert.deepEqual(expected, requestBody);
        done();
    });
    it('builds the request correctly with some options', (done) => {
        const expected = {
            application_id: 'app',
            plan_overrides: { uri: 'uri' },
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
        const apiClient = new mablApiClient_1.MablApiClient('test');
        const requestBody = apiClient.buildRequestBody('app', '', '', 'uri', false, false, 0, {
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
        }, 'abcs');
        assert.deepEqual(expected, requestBody);
        done();
    });
});
