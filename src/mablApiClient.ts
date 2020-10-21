import retry from 'async-retry';
import {Application} from './entities/Application';
import {Deployment, DeploymentProperties} from './entities/Deployment';
import {ExecutionResult} from './entities/ExecutionResult';
import axios, {AxiosInstance, AxiosRequestConfig} from 'axios';

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

  async getApplication(applicationId: string): Promise<Application> {
    try {
      return await this.makeGetRequest<Application>(
        `${this.baseUrl}/v1/applications/${applicationId}`,
      );
    } catch (error) {
      throw new Error(
        `failed to get mabl application ($applicationId) from the API ${error}`,
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
    applicationId: string,
    environmentId: string,
    browserTypes: string,
    uri: string,
    rebaselineImages: boolean,
    setStaticBaseline: boolean,
    revision: string | undefined,
    eventTime: number,
    properties: DeploymentProperties,
  ): Promise<Deployment> {
    try {
      const requestBody: any = this.buildRequestBody(
        applicationId,
        environmentId,
        browserTypes,
        uri,
        rebaselineImages,
        setStaticBaseline,
        eventTime,
        properties,
        revision,
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
    applicationId: string,
    environmentId: string,
    browserTypes: string,
    uri: string,
    rebaselineImages: boolean,
    setStaticBaseline: boolean,
    event_time: number,
    properties: DeploymentProperties,
    revision?: string,
  ): any {
    const requestBody: any = {};

    if (environmentId) {
      requestBody.environment_id = environmentId;
    }
    if (applicationId) {
      requestBody.application_id = applicationId;
    }

    const planOverrides: any = {};
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
