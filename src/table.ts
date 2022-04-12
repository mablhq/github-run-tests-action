import {Execution, JourneyInfo} from './entities/ExecutionResult';
import Table from 'cli-table3';
import * as moment from 'moment';
import {Option} from './interfaces';

export function prettyFormatExecution(execution: Execution): string {
  let outputString = '';

  const planTable = new Table({
    head: [],
    style: {
      head: [],
      border: [],
    },
    colWidths: [15, 30, 15, 13, 15, 20, 17, 130],
    wordWrap: true,
  });

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

  const testTable = new Table({
    head: ['Browser', 'Status', 'Test Name', 'Duration', 'mabl App Link'],
    style: {
      head: [],
      border: [],
    },
    colWidths: [10, 15, 27, 15, 160],
    wordWrap: true,
  });

  execution.journey_executions.forEach((journeyExecution) => {
    const test: Option<JourneyInfo> = execution.journeys.find(
      (test) => test.id === journeyExecution.journey_id,
    );

    testTable.push([
      journeyExecution.browser_type,
      journeyExecution.success ? 'Passed' : 'Failed',
      test ? test.name : journeyExecution.journey_id,
      moment
        .utc(journeyExecution.stop_time - journeyExecution.start_time)
        .format('HH:mm:ss'),
      journeyExecution.app_href,
    ]);
  });

  outputString += outputTable(planTable);
  outputString += '\n'; // prevent offset table row in output
  outputString += outputTable(testTable);

  return outputString;
}

function outputTable(table: Table.Table): string {
  return table.toString().replace(/[\r\n]+/, '\n    ');
}
