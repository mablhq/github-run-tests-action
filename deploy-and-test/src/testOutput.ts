import {ExecutionResult, JourneyInfo} from './entities/ExecutionResult';
var builder = require('xmlbuilder');
import path = require('path');
import * as core from '@actions/core/lib/core';

/**
 * Generate and save a junit xml file
 * @param executionResult the execution result to output to a JUnit XML file
 */
export function generatePublishExecutionResult(
  filename: string,
  executionResult: ExecutionResult,
  eventId: string,
  outputLink: string,
): void {
  let planTestSuites: Array<any> = [];
  executionResult.executions.forEach(execution => {
    let journeyTestCases: Array<any> = [];
    execution.journey_executions.forEach(jE => {
      let journey: JourneyInfo | undefined = execution.journeys.find(
        journey => journey.id === jE.journey_id,
      );
      let journeyExecution;
      if (!jE.success) {
        journeyExecution = {
          '@name': journey ? journey.name : jE.journey_id,
          '@time': `${(jE.stop_time - jE.start_time) / 1000}`,
          '@status': 'Failed',
          error: {
            '@message': `View Output: ${jE.app_href}`,
          },
        };
      } else {
        journeyExecution = {
          '@name': journey ? journey.name : jE.journey_id,
          '@status': 'Passed',
          '@time': `${(jE.stop_time - jE.start_time) / 1000}`,
        };
      }
      journeyTestCases.push(journeyExecution);
    });

    let planObj = {
      '@name': execution.plan.name,
      '@id': execution.plan.id,
      '@disabled': '',
      '@failures':
        execution.journey_executions &&
        execution.journey_executions.filter(jE => !jE.status).length,
      '@tests': execution.journey_executions.length,
      '@time': `${(execution.stop_time - execution.start_time) / 1000}`,
      testcase: journeyTestCases,
    };

    planTestSuites.push(planObj);
  });

  let feedObj = {
    testsuites: {
      '@name': `mabl Deployment event: ${eventId}`,
      '@disabled': '',
      properties: {
        property: [
          {
            '@name': 'mabl View Output',
            '@value': outputLink,
          },
        ],
      },
      '@failures': executionResult.journey_execution_metrics.failed,
      '@tests': executionResult.journey_execution_metrics.total,
      testsuite: planTestSuites,
    },
  };

  let feed = builder.create(feedObj, {encoding: 'utf-8'});
  let finalXml = feed.end({pretty: true});
}
