export interface Deployment {
  id: string;
  application_id: string;
  environment_id: string;
  received_time: number;
  triggered_plan_run_summaries: Array<TriggeredPlanSummary>;
  event_time: number;
  revision: string | undefined;
  properties: DeploymentProperties;
}

interface TriggeredPlanSummary {
  plan_id: string;
  plan_run_id: string;
}

export interface DeploymentProperties {
  committer: string | undefined;
  repositoryAction: string | undefined;
  repositoryBranchName: string | undefined;
  repositoryRevisionNumber: string | undefined;
  repositoryUrl: string | undefined;
}
