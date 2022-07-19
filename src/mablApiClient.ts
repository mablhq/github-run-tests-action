import retry from 'async-retry';
import {Application} from './entities/Application';
import {Deployment, DeploymentProperties} from './entities/Deployment';
import {ExecutionResult} from './entities/ExecutionResult';
import axios, {AxiosInstance, AxiosRequestConfig, AxiosResponse} from 'axios';
import {Environment} from './entities/Environment';
import {USER_AGENT} from './constants';

const GET_REQUEST_TIMEOUT_MILLIS = 600_000;
const POST_REQUEST_TIMEOUT_MILLIS = 900_000;

export class MablApiClient {
  private readonly httpClient: AxiosInstance;
  private readonly baseUrl: string =
    process.env.MABL_REST_API_URL ?? 'https://api.mabl.com';

  constructor(apiKey: string) {
    const config: AxiosRequestConfig = {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      auth: {
        username: 'key',
        password: apiKey,
      },
    };

    this.httpClient = axios.create(config);
  }

  /**
   * Throw helpful error messages, if possible, otherwise throw generic error
   * @param response error response
   */
  static throwHumanizedError(response: AxiosResponse): never {
    switch (response.status) {
      case 401:
        throw new Error(
          `Unauthorized API error, are you sure you passed the correct API key? Is the key "enabled"?`,
        );
      case 403:
        throw new Error(
          `Forbidden API error, are you sure you used a "CI/CD Integration" type API key? Ensure this key is for the same workspace you're testing.`,
        );
      case 404:
        throw new Error(
          `Not Found API error, please ensure any environment or application IDs in your Action config are correct.`,
        );
      default:
        throw new Error(`[${response.status} - ${response.statusText}]`);
    }
  }

  async makeGetRequest<T>(url: string): Promise<T> {
    return retry(
      async () => {
        const response = await this.httpClient.get<T>(url, {
          timeout: GET_REQUEST_TIMEOUT_MILLIS,
        });
        if ((response.status ?? 400) >= 400) {
          MablApiClient.throwHumanizedError(response);
        }
        return response.data;
      },
      {
        retries: 3,
      },
    );
  }

  async makePostRequest<T>(url: string, requestBody: object): Promise<T> {
    return retry(
      async () => {
        const response = await this.httpClient.post(
          url,
          JSON.stringify(requestBody),
          {timeout: POST_REQUEST_TIMEOUT_MILLIS},
        );
        if ((response.status ?? 400) >= 400) {
          throw new Error(`[${response.status} - ${response.statusText}]`);
        }
        return response.data;
      },
      {
        retries: 3,
      },
    );
  }

  async getApplication(id: string): Promise<Application> {
    try {
      return await this.makeGetRequest<Application>(
        `${this.baseUrl}/applications/${id}`,
      );
    } catch (error) {
      throw new Error(
        `failed to get mabl application (${id}) from the API ${error}`,
      );
    }
  }

  async getEnvironment(id: string): Promise<Environment> {
    try {
      return await this.makeGetRequest<Environment>(
        `${this.baseUrl}/environments/${id}`,
      );
    } catch (error) {
      throw new Error(
        `failed to get mabl environment (${id}) from the API ${error}`,
      );
    }
  }

  async getExecutionResults(eventId: string): Promise<ExecutionResult> {
    try {
      return await this.makeGetRequest<ExecutionResult>(
        `${this.baseUrl}/execution/result/event/${eventId}`,
      );
    } catch (error) {
      throw new Error(
        `failed to get mabl execution results for event ${eventId} from the API ${error}`,
      );
    }
  }

  async postDeploymentEvent(
    browserTypes: string[],
    planLabels: string[],
    httpHeaders: string[],
    rebaselineImages: boolean,
    setStaticBaseline: boolean,
    eventTime: number,
    properties: DeploymentProperties,
    applicationId?: string,
    environmentId?: string,
    uri?: string,
    revision?: string,
    mablBranch?: string,
  ): Promise<Deployment> {
    try {
      const requestBody: any = this.buildRequestBody(
        browserTypes,
        planLabels,
        httpHeaders,
        rebaselineImages,
        setStaticBaseline,
        eventTime,
        properties,
        applicationId,
        environmentId,
        uri,
        revision,
        mablBranch,
      );
      return await this.makePostRequest<Deployment>(
        `${this.baseUrl}/events/deployment/`,
        requestBody,
      );
    } catch (e) {
      throw new Error(`failed to create deployment through mabl API ${e}`);
    }
  }

  buildRequestBody(
    browserTypes: string[],
    planLabels: string[],
    httpHeaders: string[],
    rebaselineImages: boolean,
    setStaticBaseline: boolean,
    eventTime: number,
    properties: DeploymentProperties,
    applicationId?: string,
    environmentId?: string,
    uri?: string,
    revision?: string,
    mablBranch?: string,
  ): any {
    const requestBody: any = {};

    if (environmentId) {
      requestBody.environment_id = environmentId;
    }
    if (applicationId) {
      requestBody.application_id = applicationId;
    }

    if (mablBranch) {
      requestBody.source_control_tag = mablBranch;
    }

    const planOverrides: any = {};
    if (browserTypes.length) {
      planOverrides.browser_types = browserTypes;
    }

    if (uri) {
      planOverrides.uri = uri;
    }

    if (httpHeaders.length) {
      planOverrides.http_headers = httpHeaders.map((header) => {
        const parts = header.split(':', 2); // allow for colon in the header value
        return {
          name: parts[0],
          value: parts[1],
          log_header_value: false,
        };
      });
      planOverrides.http_headers_required = true;
    }

    requestBody.plan_overrides = planOverrides;

    if (planLabels.length) {
      requestBody.plan_labels = planLabels;
    }

    if (revision) {
      requestBody.revision = revision;
    }
    if (eventTime) {
      requestBody.event_time = eventTime;
    }
    if (properties) {
      requestBody.properties = properties;
    }

    const actions: any = {};
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
