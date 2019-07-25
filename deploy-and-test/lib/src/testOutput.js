"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var builder = require('xmlbuilder');
const path = require("path");
const task = require("azure-pipelines-task-lib/task");
/**
 * Generate and save a junit xml file
 * @param executionResult the execution result to output to a JUnit XML file
 */
function generatePublishExecutionResult(filename, executionResult, eventId, outputLink) {
    let planTestSuites = [];
    executionResult.executions.forEach(execution => {
        let journeyTestCases = [];
        execution.journey_executions.forEach(jE => {
            let journey = execution.journeys.find(journey => journey.id === jE.journey_id);
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
            }
            else {
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
            '@failures': execution.journey_executions &&
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
    let feed = builder.create(feedObj, { encoding: 'utf-8' });
    let finalXml = feed.end({ pretty: true });
    writeToFileSystem(filename, finalXml);
}
exports.generatePublishExecutionResult = generatePublishExecutionResult;
function writeToFileSystem(filename, finalXml) {
    let fileWithPath = path.join(__dirname, filename);
    task.writeFile(fileWithPath, finalXml);
    let tp = new task.TestPublisher('JUnit');
    tp.publish(fileWithPath, false, 'mabl', '', 'mabl deployment triggered tests', false);
}
