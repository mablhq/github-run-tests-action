"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mablApiClient_1 = require("../src/mablApiClient");
const src_1 = require("../src");
const constants_1 = require("../src/constants");
const axios_1 = require("axios");
describe('GitHub Action tests', () => {
    beforeEach(() => {
        process.env.DISABLE_FAILURE_EXIT_CODES = 'true';
    });
    function setGithubInput(name, value) {
        process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] = value;
    }
    function assertExitCodeNot(expected) {
        expect(process.exitCode).not.toBe(expected);
    }
    it('handles invalid application/environment ids', async () => {
        setGithubInput(constants_1.ActionInputs.ApplicationId, '');
        setGithubInput(constants_1.ActionInputs.EnvironmentId, '');
        await (0, src_1.run)(false);
        assertExitCodeNot(1);
    });
    it('parses array inputs', () => {
        setGithubInput(constants_1.ActionInputs.BrowserTypes, '');
        expect((0, src_1.optionalArrayInput)(constants_1.ActionInputs.BrowserTypes)).toEqual([]);
        setGithubInput(constants_1.ActionInputs.BrowserTypes, 'chrome ');
        expect((0, src_1.optionalArrayInput)(constants_1.ActionInputs.BrowserTypes)).toEqual(['chrome']);
        setGithubInput(constants_1.ActionInputs.BrowserTypes, 'chrome, firefox ');
        expect((0, src_1.optionalArrayInput)(constants_1.ActionInputs.BrowserTypes)).toEqual(['chrome', 'firefox']);
        setGithubInput(constants_1.ActionInputs.BrowserTypes, 'chrome\nfirefox\nsafari ');
        expect((0, src_1.optionalArrayInput)(constants_1.ActionInputs.BrowserTypes)).toEqual(['chrome', 'firefox', 'safari']);
    });
    it('parses boolean inputs', () => {
        setGithubInput(constants_1.ActionInputs.RebaselineImages, '');
        expect((0, src_1.booleanInput)(constants_1.ActionInputs.RebaselineImages)).toEqual(false);
        setGithubInput(constants_1.ActionInputs.RebaselineImages, 'false ');
        expect((0, src_1.booleanInput)(constants_1.ActionInputs.RebaselineImages)).toEqual(false);
        setGithubInput(constants_1.ActionInputs.RebaselineImages, 'False ');
        expect((0, src_1.booleanInput)(constants_1.ActionInputs.RebaselineImages)).toEqual(false);
        setGithubInput(constants_1.ActionInputs.RebaselineImages, 'True ');
        expect((0, src_1.booleanInput)(constants_1.ActionInputs.RebaselineImages)).toEqual(true);
        setGithubInput(constants_1.ActionInputs.RebaselineImages, 'true ');
        expect((0, src_1.booleanInput)(constants_1.ActionInputs.RebaselineImages)).toEqual(true);
        setGithubInput(constants_1.ActionInputs.RebaselineImages, 'TRUE');
        expect((0, src_1.booleanInput)(constants_1.ActionInputs.RebaselineImages)).toEqual(true);
    });
    it('parses optional string inputs', () => {
        setGithubInput(constants_1.ActionInputs.ApplicationId, '');
        expect((0, src_1.optionalInput)(constants_1.ActionInputs.ApplicationId)).toBeUndefined();
        setGithubInput(constants_1.ActionInputs.ApplicationId, 'baz ');
        expect((0, src_1.optionalInput)(constants_1.ActionInputs.ApplicationId)).toEqual('baz');
        setGithubInput(constants_1.ActionInputs.ApplicationId, 'BAZ');
        expect((0, src_1.optionalInput)(constants_1.ActionInputs.ApplicationId)).toEqual('BAZ');
    });
    it('humanizes 403 errors', () => {
        expect(() => mablApiClient_1.MablApiClient.throwHumanizedError({
            status: 403,
            statusText: 'This is an error',
            config: { headers: new axios_1.AxiosHeaders() },
            headers: {},
            data: 10,
            request: {}
        })).toThrow("Forbidden API error, are you sure you used a \"CI/CD Integration\" type API key? Ensure this key is for the same workspace you're testing.");
    });
    it('humanizes 401 errors', () => {
        expect(() => mablApiClient_1.MablApiClient.throwHumanizedError({
            status: 401,
            statusText: 'This is an error',
            config: { headers: new axios_1.AxiosHeaders() },
            headers: {},
            data: 10,
            request: {}
        })).toThrow('Unauthorized API error, are you sure you passed the correct API key? Is the key "enabled"?');
    });
    it('humanizes 404 errors', () => {
        expect(() => mablApiClient_1.MablApiClient.throwHumanizedError({
            status: 404,
            statusText: 'This is an error',
            config: { headers: new axios_1.AxiosHeaders() },
            headers: {},
            data: 10,
            request: {}
        })).toThrow('Not Found API error, please ensure any environment or application IDs in your Action config are correct.');
    });
    it('humanizes non-specific errors', () => {
        expect(() => mablApiClient_1.MablApiClient.throwHumanizedError({
            status: 500,
            statusText: 'This is an error',
            config: {
                headers: new axios_1.AxiosHeaders()
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
                browser_types: ['firefox', 'chrome', 'internet_explorer'],
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
        const requestBody = apiClient.buildRequestBody(['firefox', 'chrome', 'internet_explorer'], [], [], true, true, 0, {
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
        }, 'app', 'env', 'uri', 'abcs');
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
        const apiClient = new mablApiClient_1.MablApiClient('test');
        const requestBody = apiClient.buildRequestBody(['chrome', 'firefox'], ['alpha', 'beta'], ['Header-Uno:value-uno', 'Header-Dos:value-dos'], false, false, 0, {
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
        }, 'app', '', 'uri', 'abcs');
        expect(expected).toStrictEqual(requestBody);
    });
});
