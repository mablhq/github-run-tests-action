import retry from 'async-retry';
import {Application} from './entities/Application';
import {Deployment, DeploymentProperties} from './entities/Deployment';
import {ExecutionResult} from './entities/ExecutionResult';
import axios, {AxiosInstance, AxiosRequestConfig} from 'axios';
import {Environment} from './entities/Environment';

export class MablApiClient {
  private readonly httpClient: AxiosInstance;
  private readonly baseUrl: string =
    process.env.APP_URL ?? 'https://api.mabl.com';

  constructor(apiKey: string) {
    const config: AxiosRequestConfig = {
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

    this.httpClient = axios.create(config);
  }

  async makeGetRequest<T>(url: string): Promise<T> {
    return retry(
      async () => {
        const response = await this.httpClient.get<T>(url);
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

  async makePostRequest<T>(url: string, requestBody: object): Promise<T> {
    return retry(
      async () => {
        const response = await this.httpClient.post(
          url,
          JSON.stringify(requestBody),
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
        `${this.baseUrl}/v1/applications/${id}`,
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
        `${this.baseUrl}/v1/environments/${id}`,
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
    event_time: number,
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
    if (event_time) {
      requestBody.event_time = event_time;
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
