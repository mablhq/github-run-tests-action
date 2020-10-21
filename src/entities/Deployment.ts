export interface Deployment {
  id: string;
  application_id: string;
  environment_id: string;
  received_time: number;
  triggered_plan_run_summaries: TriggeredPlanSummary[];
  event_time: number;
  revision?: string;
  properties: DeploymentProperties;
}

interface TriggeredPlanSummary {
  plan_id: string;
  plan_run_id: string;
}

export interface DeploymentProperties {
  triggering_event_name?: string;
  repository_commit_username?: string;
  repository_action?: string;
  repository_name?: string;
  repository_branch_name?: string;
  repository_url?: string;
  repository_pull_request_url?: string;
  repository_pull_request_number?: number | undefined;
  repository_pull_request_title?: string;
  repository_pull_request_merged_at?: string;
  repository_pull_request_created_at?: string;
}

export interface PullRequest {
  title?: string;
  number?: number;
  created_at?: string;
  merged_at?: string;
  url?: string;
}
