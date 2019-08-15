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
  triggering_event_name: string | undefined;
  repository_commit_username: string | undefined;
  repository_action: string | undefined;
  repository_name: string | undefined;
  repository_branch_name: string | undefined;
  repository_url: string | undefined;
  repository_pull_request_url?: string | undefined;
  repository_pull_request_number?: number | undefined;
  repository_pull_request_title?: string | undefined;
  repository_pull_request_merged_at?: string | undefined;
  repository_pull_request_created_at?: string | undefined;
}

export interface PullRequest {
  title: string | undefined;
  number: number | undefined;
  created_at: string | undefined;
  merged_at: string | undefined;
  url: string | undefined;
}
