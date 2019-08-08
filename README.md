![mabl logo](https://avatars3.githubusercontent.com/u/25963599?s=100&v=4)

# mabl GitHub Run Tests Deployment Action

This GitHub Action creates a mabl deployment event, triggering any functional
tests associated with that deployment and waiting for their results.

### Example workflow: 

```
on: [push]

name: mabl

jobs:
  test:
    name: mabl Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@master

      - name: Functional test deployment
        id: mabl-test-deployment
        uses: ./deploy-and-test/
        env:
          MABL_API_KEY: ${{ secrets.MABL_API_KEY }}
          application-id: <your-application-id-a>
          environment-id: <your-environment-id-e>
```

### Environment variables

- `MABL_API_KEY` {string} - Your mabl API key
  [available here](https://app.mabl.com/workspaces/-/settings/apis)

### Inputs

**Note**: Either `application-id` or `environment-id` must be supplied.

- `application-id` {string} (optional) - mabl id for the deployed application.
  Use the
  [curl builder](https://app.mabl.com/workspaces/-/settings/apis#api-docs-selector-dropdown-button)
  to find the id.
- `environment-id` {string} (optional) - mabl id for the deployed environment.
  Use the
  [curl builder](https://app.mabl.com/workspaces/-/settings/apis#api-docs-selector-dropdown-button)
  to find the id.
- `browser-types` (optional): override for browser types to test e.g.
  `chrome, firefox, safari, internet_explorer`. If not provided, mabl will test
  the browsers configured on the triggered test.
- `rebaseline-images` {boolean} (optional) - Set `true` to reset the visual
  baseline to the current deployment
- `set-static-baseline` (optional) - Set `true` to use current deployment as an
  exact static baseline. If set, mabl will **not** model dynamic areas and will
  use the current deployment as the pixel-exact visual baseline.
- `continue-on-failure` (optional) - Set to true to continue the build even if
  there are test failures
- `event-time` {int64} (optional) - Event time the deployment occurred in UTC
  epoch milliseconds. Defaults to now.

### outputs:

- `mabl-deployment-id` {string} - mabl id of the deployment
- `plans_run` {int32} - number of mabl plans run against this deployment. A mabl
  plan is a collection of similarly configured tests.
- `plans_passed` {int32} - number of mabl plans that passed against this
  deployment. A mabl plan is a collection of similarly configured tests.
- `plans_failed` {int32} - number of mabl plans that failed against this
  deployment. A mabl plan is a collection of similarly configured tests.
- `journeys_run` {int32} - total number of mabl journeys run against this
  deployment. A mabl journey is an end to end test of your application.
- `journeys_passed` {int32} - number of mabl journeys that passed against this
  deployment. A mabl journey is an end to end test of your application.
- `journeys_failed` {int32} - number of mabl journeys that failed against this
  deployment. A mabl journey is an end to end test of your application.
