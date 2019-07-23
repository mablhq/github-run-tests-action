FROM debian:stable-slim

LABEL "name"="mabl_deployment"
LABEL "maintainer"="mabl <support@mabl.com>"
LABEL "version"="1.0.0"

LABEL "com.github.actions.name"="Submit mabl deployment event"
LABEL "com.github.actions.description"="Submits a deployment event to the mabl api, triggering any tests configured to run on deployment"
LABEL "com.github.actions.icon"="play-circle"
LABEL "com.github.actions.color"="yellow"

COPY LICENSE README.md /

COPY submit_deploy_event.sh /

RUN apt-get update && \
	apt-get install curl -y && \
	apt-get install jq -y && \
        apt-get clean -y

ENTRYPOINT ["/submit_deploy_event.sh"]
