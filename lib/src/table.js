"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prettyFormatExecution = void 0;
const cli_table3_1 = __importDefault(require("cli-table3"));
const moment = __importStar(require("moment"));
function prettyFormatExecution(execution) {
    let outputString = '';
    const planTable = new cli_table3_1.default({
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
    const testTable = new cli_table3_1.default({
        head: ['Browser', 'Status', 'Test Name', 'Duration', 'mabl App Link'],
        style: {
            head: [],
            border: [],
        },
        colWidths: [10, 15, 27, 15, 160],
        wordWrap: true,
    });
    execution.journey_executions.forEach((journeyExecution) => {
        const test = execution.journeys.find((test) => test.id === journeyExecution.journey_id);
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
    outputString += '\n';
    outputString += outputTable(testTable);
    return outputString;
}
exports.prettyFormatExecution = prettyFormatExecution;
function outputTable(table) {
    return table.toString().replace(/[\r\n]+/, '\n    ');
}
