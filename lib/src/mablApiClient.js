"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
}
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const httpm = __importStar(require("typed-rest-client/HttpClient"));
const hm = __importStar(require("typed-rest-client/Handlers"));
const async_retry_1 = __importDefault(require("async-retry"));
class mablApiClient {
    constructor(apiKey) {
        this.baseUrl = process.env.APP_URL || 'https://api.mabl.com';
        let bh = new hm.BasicCredentialHandler('key', apiKey);
        this.httpClient = new httpm.HttpClient('mabl-azure-devops-extension', [bh], {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        });
    }
    makeGetRequest(path) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield async_retry_1.default(() => __awaiter(this, void 0, void 0, function* () {
                let response = yield this.httpClient.get(path);
                if ((response.message.statusCode || 400) >= 400) {
                    throw `[${response.message.statusCode} - ${response.message.statusMessage}]`;
                }
                let body = yield response.readBody();
                let obj = JSON.parse(body);
                return obj;
            }), {
                retries: 3,
            });
        });
    }
    makePostRequest(path, requestBody) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield async_retry_1.default(() => __awaiter(this, void 0, void 0, function* () {
                let response = yield this.httpClient.post(path, JSON.stringify(requestBody));
                if ((response.message.statusCode || 400) >= 400) {
                    throw `[${response.message.statusCode} - ${response.message.statusMessage}]`;
                }
                let body = yield response.readBody();
                let obj = JSON.parse(body);
                return obj;
            }), {
                retries: 3,
            });
        });
    }
    getApplication(applicationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let response = yield this.makeGetRequest(`${this.baseUrl}/v1/applications/${applicationId}`);
                return response;
            }
            catch (e) {
                throw `failed to get mabl application ($applicationId) from the API ${e}`;
            }
        });
    }
    getExecutionResults(eventId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let response = yield this.makeGetRequest(`${this.baseUrl}/execution/result/event/${eventId}`);
                return response;
            }
            catch (e) {
                throw `failed to get mabl execution results for event ${eventId} from the API ${e}`;
            }
        });
    }
    postDeploymentEvent(applicationId, environmentId, browserTypes, uri, rebaselineImages, setStaticBaseline, revision, event_time, properties) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let requestBody = this.buildRequestBody(applicationId, environmentId, browserTypes, uri, rebaselineImages, setStaticBaseline);
                let response = yield this.makePostRequest(`${this.baseUrl}/events/deployment/`, requestBody);
                return response;
            }
            catch (e) {
                throw `failed to create deployment through mabl API ${e}`;
            }
        });
    }
    buildRequestBody(applicationId, environmentId, browserTypes, uri, rebaselineImages, setStaticBaseline) {
        let requestBody = {};
        environmentId ? (requestBody.environment_id = environmentId) : null;
        applicationId ? (requestBody.application_id = applicationId) : null;
        let planOverrides = {};
        browserTypes
            ? (planOverrides.browser_types = browserTypes.split(','))
            : null;
        uri ? (planOverrides.uri = uri) : null;
        requestBody.plan_overrides = planOverrides;
        let actions = {};
        rebaselineImages ? (actions.rebaseline_images = rebaselineImages) : null;
        setStaticBaseline
            ? (actions.set_static_baseline = setStaticBaseline)
            : null;
        requestBody.actions = actions;
        return requestBody;
    }
}
exports.mablApiClient = mablApiClient;
