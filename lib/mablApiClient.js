"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MablApiClient = void 0;
const async_retry_1 = __importDefault(require("async-retry"));
const axios_1 = __importDefault(require("axios"));
class MablApiClient {
    constructor(apiKey) {
        var _a;
        this.baseUrl = (_a = process.env.APP_URL) !== null && _a !== void 0 ? _a : 'https://api.mabl.com';
        const config = {
            headers: {
                'User-Agent': 'github-run-tests-action',
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            auth: {
                username: 'key',
                password: apiKey,
            },
        };
        this.httpClient = axios_1.default.create(config);
    }
    makeGetRequest(url) {
        return __awaiter(this, void 0, void 0, function* () {
            return async_retry_1.default(() => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const response = yield this.httpClient.get(url);
                if (((_a = response.status) !== null && _a !== void 0 ? _a : 400) >= 400) {
                    throw new Error(`[${response.status} - ${response.statusText}]`);
                }
                return response.data;
            }), {
                retries: 3,
            });
        });
    }
    makePostRequest(url, requestBody) {
        return __awaiter(this, void 0, void 0, function* () {
            return async_retry_1.default(() => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const response = yield this.httpClient.post(url, JSON.stringify(requestBody));
                if (((_a = response.status) !== null && _a !== void 0 ? _a : 400) >= 400) {
                    throw new Error(`[${response.status} - ${response.statusText}]`);
                }
                return response.data;
            }), {
                retries: 3,
            });
        });
    }
    getApplication(applicationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.makeGetRequest(`${this.baseUrl}/v1/applications/${applicationId}`);
            }
            catch (error) {
                throw new Error(`failed to get mabl application ($applicationId) from the API ${error}`);
            }
        });
    }
    getExecutionResults(eventId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.makeGetRequest(`${this.baseUrl}/execution/result/event/${eventId}`);
            }
            catch (error) {
                throw new Error(`failed to get mabl execution results for event ${eventId} from the API ${error}`);
            }
        });
    }
    postDeploymentEvent(applicationId, environmentId, browserTypes, uri, rebaselineImages, setStaticBaseline, revision, eventTime, properties) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const requestBody = this.buildRequestBody(applicationId, environmentId, browserTypes, uri, rebaselineImages, setStaticBaseline, eventTime, properties, revision);
                return yield this.makePostRequest(`${this.baseUrl}/events/deployment/`, requestBody);
            }
            catch (e) {
                throw new Error(`failed to create deployment through mabl API ${e}`);
            }
        });
    }
    buildRequestBody(applicationId, environmentId, browserTypes, uri, rebaselineImages, setStaticBaseline, event_time, properties, revision) {
        const requestBody = {};
        if (environmentId) {
            requestBody.environment_id = environmentId;
        }
        if (applicationId) {
            requestBody.application_id = applicationId;
        }
        const planOverrides = {};
        if (browserTypes) {
            planOverrides.browser_types = browserTypes.split(',');
        }
        if (uri) {
            planOverrides.uri = uri;
        }
        requestBody.plan_overrides = planOverrides;
        if (revision) {
            requestBody.revision = revision;
        }
        if (event_time) {
            requestBody.event_time = event_time;
        }
        if (properties) {
            requestBody.properties = properties;
        }
        const actions = {};
        if (rebaselineImages) {
            actions.rebaseline_images = rebaselineImages;
        }
        if (setStaticBaseline) {
            actions.set_static_baseline = setStaticBaseline;
        }
        requestBody.actions = actions;
        return requestBody;
    }
}
exports.MablApiClient = MablApiClient;
