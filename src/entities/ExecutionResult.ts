interface PlanExecutionMetrics {
  total: number;
  passed: number;
  failed: number;
}

interface JourneyExecutionMetrics {
  total: number;
  passed: number;
  failed: number;
}

export interface Execution {
  status: string;
  success: boolean;
  plan: PlanInfo;
  plan_execution: PlanExecution;
  journeys: JourneyInfo[];
  journey_executions: JourneyExecution[];
  start_time: number;
  stop_time: number;
}

export interface PlanInfo {
  id: string;
  name: string;
  href: string;
  app_href: string;
}

interface PlanExecution {
  id: string;
  status: string;
  href: string;
}

export interface JourneyInfo {
  id: string;
  name: string;
  href: string;
  app_href: string;
}

interface JourneyExecution {
  journey_id: string;
  journey_execution_id: string;
  application_id: string;
  environment_id: string;
  initial_url: string;
  run_multiplier_index: number;
  browser_type: string;
  status: string;
  success: boolean;
  start_time: number;
  stop_time: number;
  href: string;
  app_href: string;
}

interface EventStatus {
  succeeded?: boolean;
  succeeded_first_attempt?: boolean;
  succeeded_with_retries?: boolean;
}

export interface ExecutionResult {
  plan_execution_metrics: PlanExecutionMetrics;
  journey_execution_metrics: JourneyExecutionMetrics;
  executions: Execution[];
  event_status?: EventStatus;
}
