import * as httpm from 'typed-rest-client/HttpClient';
import * as hm from 'typed-rest-client/Handlers';
import retry from 'async-retry';
import {Application} from './entities/Application';
import {Deployment, DeploymentProperties} from './entities/Deployment';
import {ExecutionResult} from './entities/ExecutionResult';

export class mablApiClient {
  httpClient: httpm.HttpClient;
  baseUrl: string = process.env.APP_URL || 'https://api.mabl.com';

  constructor(apiKey: string) {
    let bh: hm.BasicCredentialHandler = new hm.BasicCredentialHandler(
      'key',
      apiKey,
    );
    this.httpClient = new httpm.HttpClient(
      'mabl-azure-devops-extension',
      [bh],
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      },
    );
  }

  async makeGetRequest(path: string): Promise<any> {
    return await retry(
      async () => {
        let response: httpm.HttpClientResponse = await this.httpClient.get(
          path,
        );
        if ((response.message.statusCode || 400) >= 400) {
          throw `[${response.message.statusCode} - ${
            response.message.statusMessage
          }]`;
        }
        let body: string = await response.readBody();
        let obj: any = JSON.parse(body);
        return obj;
      },
      {
        retries: 3,
      },
    );
  }

  async makePostRequest(path: string, requestBody: object): Promise<any> {
    return await retry(
      async () => {
        let response: httpm.HttpClientResponse = await this.httpClient.post(
          path,
          JSON.stringify(requestBody),
        );
        if ((response.message.statusCode || 400) >= 400) {
          throw `[${response.message.statusCode} - ${
            response.message.statusMessage
          }]`;
        }
        let body: string = await response.readBody();
        let obj: any = JSON.parse(body);
        return obj;
      },
      {
        retries: 3,
      },
    );
  }

  async getApplication(applicationId: string): Promise<any> {
    try {
      let response: Application = await this.makeGetRequest(
        `${this.baseUrl}/v1/applications/${applicationId}`,
      );
      return response;
    } catch (e) {
      throw `failed to get mabl application ($applicationId) from the API ${e}`;
    }
  }

  async getExecutionResults(eventId: string): Promise<any> {
    try {
      let response: ExecutionResult = await this.makeGetRequest(
        `${this.baseUrl}/execution/result/event/${eventId}`,
      );
      return response;
    } catch (e) {
      throw `failed to get mabl execution results for event ${eventId} from the API ${e}`;
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

      let requestBody: any = this.buildRequestBody(
        applicationId,
        environmentId,
        browserTypes,
        uri,
        rebaselineImages,
        setStaticBaseline,
        revision,
        eventTime,
        properties,
      );
      return await this.makePostRequest(
        `${this.baseUrl}/events/deployment/`,
        requestBody,
      );
    } catch (e) {
      throw `failed to create deployment through mabl API ${e}`;
    }
  }

  buildRequestBody(
    applicationId: string,
    environmentId: string,
    browserTypes: string,
    uri: string,
    rebaselineImages: boolean,
    setStaticBaseline: boolean,
    revision: string | undefined,
    event_time: number,
    properties: DeploymentProperties,
  ): any {
    let requestBody: any = {};

    environmentId ? (requestBody.environment_id = environmentId) : null;
    applicationId ? (requestBody.application_id = applicationId) : null;

    let planOverrides: any = {};
    browserTypes
      ? (planOverrides.browser_types = browserTypes.split(','))
      : null;
    uri ? (planOverrides.uri = uri) : null;
    requestBody.plan_overrides = planOverrides;

    revision ? (requestBody.revision = revision) : null;
    event_time ? (requestBody.event_time = event_time) : null;
    properties ? (requestBody.properties = properties) : null;


    let actions: any = {};
    rebaselineImages ? (actions.rebaseline_images = rebaselineImages) : null;
    setStaticBaseline
      ? (actions.set_static_baseline = setStaticBaseline)
      : null;
    requestBody.actions = actions;
    return requestBody;
  }
}
