"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
}
Object.defineProperty(exports, "__esModule", { value: true });
const cli_table3_1 = __importDefault(require("cli-table3"));
const moment = __importStar(require("moment"));
function prettyPrintExecution(execution) {
    let planTable = new cli_table3_1.default({
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
    let testTable = new cli_table3_1.default({
        head: ['Browser', 'Status', 'Test Name', 'Duration', 'mabl App Link'],
        style: {
            head: [],
            border: [],
        },
        colWidths: [10, 15, 27, 15, 160],
        wordWrap: true,
    });
    execution.journey_executions.forEach(jE => {
        let test = execution.journeys.find(test => test.id === jE.journey_id);
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
exports.prettyPrintExecution = prettyPrintExecution;
function outputTable(table) {
    let tableAsString = table.toString().replace(/[\r\n]+/, '\n    ');
    console.log(tableAsString);
}
