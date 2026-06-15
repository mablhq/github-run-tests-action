export const USER_AGENT = 'mabl-github-run-tests-action';
export var ActionInputs;
(function (ActionInputs) {
    ActionInputs["ApplicationId"] = "application-id";
    ActionInputs["AwaitCompletion"] = "await-completion";
    ActionInputs["BrowserTypes"] = "browser-types";
    ActionInputs["ContinueOnFailure"] = "continue-on-failure";
    ActionInputs["EnvironmentId"] = "environment-id";
    ActionInputs["EventTime"] = "event-time";
    ActionInputs["HttpHeaders"] = "http-headers";
    ActionInputs["MablBranch"] = "mabl-branch";
    ActionInputs["PlanLabels"] = "plan-labels";
    ActionInputs["RebaselineImages"] = "rebaseline-images";
    ActionInputs["SetStaticBaseline"] = "set-static-baseline";
    ActionInputs["Uri"] = "uri";
    ActionInputs["UrlApi"] = "api-url";
    ActionInputs["UrlApp"] = "app-url";
})(ActionInputs || (ActionInputs = {}));
export var ActionOutputs;
(function (ActionOutputs) {
    ActionOutputs["DeploymentId"] = "mabl-deployment-id";
    ActionOutputs["PlansRun"] = "plans_run";
    ActionOutputs["PlansPassed"] = "plans_passed";
    ActionOutputs["PlansFailed"] = "plans_failed";
    ActionOutputs["TestsRun"] = "tests_run";
    ActionOutputs["TestsPassed"] = "tests_passed";
    ActionOutputs["TestsFailed"] = "tests_failed";
})(ActionOutputs || (ActionOutputs = {}));
