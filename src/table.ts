import {Execution, JourneyInfo} from './entities/ExecutionResult';
import Table from 'cli-table3';
import {HorizontalTable} from 'cli-table3';
import * as moment from 'moment';
import * as core from '@actions/core/lib/core';

export function prettyPrintExecution(execution: Execution) {
  let planTable = new Table({
    head: [],
    style: {
      head: [],
      border: [],
    },
    colWidths: [15, 30, 15, 13, 15, 20, 17, 130],
    wordWrap: true,
  }) as HorizontalTable;
  planTable.push([
    'Plan Name:',
    execution.plan.name,
    'Status:',
    execution.success ? 'Passed' : 'Failed',
    'Duration:',
    moment.utc(execution.stop_time - execution.start_time).format('HH:mm:ss'),
    'mabl App Link:',
    execution.plan.app_href,
  ]);

  let testTable = new Table({
    head: ['Browser', 'Status', 'Test Name', 'Duration', 'mabl App Link'],
    style: {
      head: [],
      border: [],
    },
    colWidths: [10, 15, 27, 15, 160],
    wordWrap: true,
  }) as HorizontalTable;
  execution.journey_executions.forEach(jE => {
    let test: JourneyInfo | undefined = execution.journeys.find(
      test => test.id === jE.journey_id,
    );
    testTable.push([
      jE.browser_type,
      jE.success ? 'Passed' : 'Failed',
      test ? test.name : jE.journey_id,
      moment.utc(jE.stop_time - jE.start_time).format('HH:mm:ss'),
      jE.app_href,
    ]);
  });

  outputTable(planTable);
  outputTable(testTable);
}

function outputTable(table: HorizontalTable) {
  let tableAsString = table.toString().replace(/[\r\n]+/, '\n    ');
  console.log(tableAsString);
}
