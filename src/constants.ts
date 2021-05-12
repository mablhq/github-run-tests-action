export const USER_AGENT = 'mabl-github-run-tests-action';

export enum ActionInputs {
  ApplicationId = 'application-id',
  BrowserTypes = 'browser-types',
  ContinueOnFailure = 'continue-on-failure',
  EnvironmentId = 'environment-id',
  EventTime = 'event-time',
  HttpHeaders = 'http-headers',
  MablBranch = 'mabl-branch',
  PlanLabels = 'plan-labels',
  RebaselineImages = 'rebaseline-images',
  SetStaticBaseline = 'set-static-baseline',
  Uri = 'uri',
}

export enum ActionOutputs {
  DeploymentId = 'mabl-deployment-id',
  // Note: from here down is snake case, not dash case
  PlansRun = 'plans_run',
  PlansPassed = 'plans_passed',
  PlansFailed = 'plans_failed',
  TestsRun = 'tests_run',
  TestsPassed = 'tests_passed',
  TestsFailed = 'tests_failed',
}
