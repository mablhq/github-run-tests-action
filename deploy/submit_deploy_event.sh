#!/bin/bash
set -e

EVENT_TIME="${CI_TIMESTAMP}"
if [[ -z "${EVENT_TIME}" ]]; then
    EVENT_TIME="$(date +%s)000"
fi

if [[ -z "${MABL_API_KEY}" ]]; then
    echo "No MABL_API_KEY provided"
    exit 1
fi

if [[ -z "${MABL_API_HOST}" ]]; then
    MABL_API_HOST="api.mabl.com"
fi

DEPLOYMENT_JSON="{ \"event_time\" : ${EVENT_TIME}, \"revision\" : \"${GITHUB_SHA}\", \"properties\" : { \"branch\" : \"${GITHUB_REF}\", \"committer\" : \"${GITHUB_ACTOR}\" }"
if [[ -n "${ENVIRONMENT_ID}" ]]; then
    DEPLOYMENT_JSON="${DEPLOYMENT_JSON}, \"environment_id\" : \"${ENVIRONMENT_ID}\""
fi
if [[ -n "${APPLICATION_ID}" ]]; then
    DEPLOYMENT_JSON="${DEPLOYMENT_JSON}, \"application_id\" : \"${APPLICATION_ID}\""
fi
DEPLOYMENT_JSON="${DEPLOYMENT_JSON} }"


TARGET_URL="https://${MABL_API_HOST}/events/deployment"

echo "Sending deployment to mabl with @ ${TARGET_URL}..."
response=$(curl -s ${TARGET_URL} \
-u "key:${MABL_API_KEY}" \
-H "Content-Type:application/json" \
-d "${DEPLOYMENT_JSON}")

DEPLOYMENT_EVENT_ID=$(echo "${response}" | jq '.id' -r)
status_code=$(echo "${response}" | jq '.code' -r)

if ! [ "${status_code}" == "null" ]; then
    echo "WARNING: Deployment event notification failed with status code ${status_code}"
    echo "response from mabl API: ${response}"
    exit 20
else
    echo "Deployment event notification successful"
fi

echo "Checking for results"

COMPLETION_WAIT_MAX_WAIT_MILLISECONDS=$((30*60*1000))
COMPLETION_WAIT_POOLING_SECONDS=15

COMPLETION_WAIT_MAX_TIME_MILLISECONDS=$((`date +%s%3N`+${COMPLETION_WAIT_MAX_WAIT_MILLISECONDS})) # 30 minutes
WAIT_FOR_MABL_TEST_SUCCESS=1
EXECUTION_RESULTS_URL="https://${!MABL_API_HOST}/execution/result/event/${DEPLOYMENT_EVENT_ID}";

EXECUTION_RESULTS_JSON_PATH=$(mktemp)

while true; do

    # don't fail build on API error
    set +e
    curl -s ${EXECUTION_RESULTS_URL} \
    -u "key:${!MABL_API_KEY}" \
    -H "Content-Type:application/json" > ${EXECUTION_RESULTS_JSON_PATH}
    set -e

    set +e
    EXECUTION_RESULTS_ALL_SUCCESS_FALSE_COUNT=$(cat ${EXECUTION_RESULTS_JSON_PATH} | jq '.executions[].success' -r | grep -c 'false')
    EXECUTION_RESULTS_STATUS_COMPLETE_COUNT=$(cat ${EXECUTION_RESULTS_JSON_PATH} | jq '.executions[].status' -r | egrep -c '(succeeded|failed|cancelled|completed)')
    EXECUTION_RESULTS_STATUS_COUNT=$(cat ${EXECUTION_RESULTS_JSON_PATH} | jq '.executions[].success' -r | wc -l)
    set -e

    if [[ ${EXECUTION_RESULTS_STATUS_COMPLETE_COUNT} -eq ${EXECUTION_RESULTS_STATUS_COUNT} ]]; then
      if [[ ${EXECUTION_RESULTS_ALL_SUCCESS_FALSE_COUNT} -gt 0 ]]; then
        echo "Completed running ${EXECUTION_RESULTS_STATUS_COUNT} tests, with ${EXECUTION_RESULTS_ALL_SUCCESS_FALSE_COUNT} failures."
        exit 21
      fi

      echo "Completed running ${EXECUTION_RESULTS_STATUS_COUNT} tests.  All tests PASSED!"
      exit 0
    fi

    echo "Current completion rate: [${EXECUTION_RESULTS_STATUS_COMPLETE_COUNT}/${EXECUTION_RESULTS_STATUS_COUNT}]"

    # Have we hit max timeout?
    CURRENT_TIME_MILLISECONDS=`date +%s%3N`

    if [[ ${CURRENT_TIME_MILLISECONDS} -gt ${COMPLETION_WAIT_MAX_TIME_MILLISECONDS} ]]; then
      echo "FAILED! Max timeout exceeded! Aborting waiting for tests!"
      exit 22
    fi

    # Sleep and try again
    sleep ${COMPLETION_WAIT_POOLING_SECONDS}
done

