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
    name: Mabl Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@master

      - name: test deployment
        id: mabl-test-deployment
        uses: ./deploy-and-test/
        env:
          MABL_API_KEY: ${{ secrets.MABL_API_KEY }}
          APPLICATION_ID: l-j3fqIO64LLOOEoFTPSxA-a
          ENVIRONMENT_ID: rtN4kWDLuBTr2Gxa5vwfaA-e
```

### Enviroement variables

- MABL-API-KEY - Your mabl api key. Available at
  https://app.mabl.com/workspaces/-/settings/apis

### Inputs

- application-id (OPTIONAL) - the mabl id for the deployed application. You can
  get the id using the curl builder at
  https://app.mabl.com/workspaces/-/settings/apis. Either this or environment-id
  must be provided
- environment-id (OPTIONAL) - the mabl id for the deployed environment. You can
  get the id using the curl builder at
  https://app.mabl.com/workspaces/-/settings/apis. Either this or application-id
  must be provided
- browser-types (OPTIONAL): override for the browser types to test. If not
  provided, mabl will test the browsers configured on the triggered test plans.
- rebaseline-images(OPTIONAL) - Set to true to reset the visual baseline to the
  current deployment
- set-static-baseline(OPTIONAL) - Set to true to use the current deployment as
  an exact static baseline. If this is set, mabl will not model dynamic areas
  and will use the current deployment as a pixel-exact visual baseline.
- continue-on-failure(OPTIONAL) - Set to true to continue the build even if
  there are test failures
- event-time(OPTIONAL) - The event time the deployment happened at. Defaults to
  now.

### outputs:

- mabl-deployment-id - the id of the deployment in mabl

## Developer Notes

### Making updates

Actions need the compiled code checked in. This means your changes will only
take effect if you have run the build to generate .js files from the .ts
tyescript files and checked the .js files in as well.

### Adding new dependencies

Actions need to be checked in with everything they need to run. If you update
dependencies you will need to commit the changes to node modules as well.

```bash
npm prune --production
git add -f node_modules/*"
```
