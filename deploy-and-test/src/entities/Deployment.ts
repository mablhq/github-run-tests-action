export interface Deployment {
  id: string;
  application_id: string;
  environment_id: string;
  received_time: number;
  triggered_plan_run_summaries: Array<TriggeredPlanSummary>;
}

interface TriggeredPlanSummary {
  plan_id: string;
  plan_run_id: string;
}
