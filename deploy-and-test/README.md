# mabl deploy

## Usage

Creates a deployment event in mabl, triggering any tests associated with that
deployment and waiting for their results.

### Example action:

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

- `MABL_API_KEY` {string} - Your mabl API key [available here](https://app.mabl.com/workspaces/-/settings/apis)

### Inputs

**Note**: Either `application-id` or `environment-id` must be supplied.

- `application-id` {string} (optional) - mabl id for the deployed application. Use the [curl builder](https://app.mabl.com/workspaces/-/settings/apis#api-docs-selector-dropdown-button) to find the id. 
- `environment-id` {string} (optional) - mabl id for the deployed environment. Use the [curl builder](https://app.mabl.com/workspaces/-/settings/apis#api-docs-selector-dropdown-button) to find the id. 
- `browser-types` (optional): override for browser types to test e.g. `firefox,safari`. If not
  provided, mabl will test the browsers configured on the triggered test.
- `rebaseline-images` {boolean} (optional) - Set `true` to reset the visual baseline to the
  current deployment
- `set-static-baseline` (optional) - Set `true` to use current deployment as
  an exact static baseline. If set, mabl will **not** model dynamic areas
  and will use the current deployment as the pixel-exact visual baseline.
- `continue-on-failure` (optional) - Set to true to continue the build even if
  there are test failures
- `event-time` {int64} (optional) - Event time the deployment occurred in UTC epoch milliseconds. Defaults to
  now.

### outputs:

- `mabl-deployment-id` {string} - mabl id of the deployment

## Developer Notes

### Making updates

Actions need the compiled code checked in. This means your changes will only
take effect if you have run the build to generate .js files from the .ts
Typescript files and checked the .js files in as well.

### Adding new dependencies

Check in the Action with everything it needs to run. If you update
dependencies you will need to commit the changes to Node modules as well.

```bash
# Remove any non-production dependencies
npm prune --production
# Compile Typescript to ES6
npm run build
# Add the compiled Typescript output
git add lib/
# 
git add -f node_modules/*
```
