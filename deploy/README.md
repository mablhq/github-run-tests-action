# mabl deploy

## Usage 

Creates a deployment event in mabl, triggering any tests associated with that deployment.

Upon success the id of the deployment event created is written under to mabl/deployment_event_id in the home directory.  
This id can be used by subsequent actions to poll for results of the mabl tests kicked off by this deployment.

Example action:

```
action "Trigger mabl Deployment" {
  on = "push"
  uses = "mablhq/github-mabl-actions/deploy@master"
  secrets = ["MABL_API_KEY"]
}
```


