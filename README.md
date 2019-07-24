## Mabl Deployment Action

This repo contains:

1. A github action for running [mabl](https://www.mabl.com) UI tests on mabl code.  
2. An example github workflow for using that action to trigger mabl tests
3. A simple github pages site to demonstrate the integration and trigger mabl tests against

### TODO

- Convert action from a docker action to a nodejs action
- Poll for results
- Send additional metadata to mabl on deployment
- Get workflow trigger working off github pages site deployment instead of push (currently getting an error and request to contact support for workflows triggered on deployment)
