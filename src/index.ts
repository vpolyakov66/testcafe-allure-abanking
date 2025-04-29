/* src/index.ts */
/* eslint-disable @typescript-eslint/no-unused-vars,func-names */

import { AllureConfig } from 'allure-js-commons';
import AllureReporterFactory from './reporter/allure-reporter';
import { TestRunInfo } from './testcafe/models';
import cleanAllureFolders from './utils/clean-folders';
import log from './utils/logger';
import step, {
  stepWithExpectedResult
} from './testcafe/step';
import {
  loadReporterConfig
} from './utils/config';
import { Severity } from 'allure-js-commons';
import { Priority } from './reporter/models';

/**
 * Это ваш плагин-репортер для TestCafe
 */
export default function () {
  return {
    allureReporter: null,
    allureConfig: null,

    getReporter() {
      return this;
    },

    preloadConfig(allureConfig: AllureConfig) {
      this.allureConfig = allureConfig;
    },

    async reportTaskStart(startTime: Date, userAgents: string[], testCount: number) {
      log(this, 'Starting Task');
      this.allureReporter = new AllureReporterFactory(this.allureConfig, userAgents);
      await cleanAllureFolders();
    },

    async reportFixtureStart(name: string, path: string, meta: object) {
      log(this, `Starting Fixture: ${name}`);
      this.allureReporter.endGroup();
      this.allureReporter.startGroup(name, meta);
    },

    async reportTestStart(name: string, meta: object) {
      log(this, `Starting Test: ${name}`);
      this.allureReporter.startTest(name, meta);
    },

    async reportTestDone(name: string, testRunInfo: TestRunInfo, meta: object) {
      log(this, `Ending Test: ${name}`);
      this.allureReporter.endTest(name, testRunInfo, meta, this);
    },

    async reportTaskDone(endTime: Date, passed: number, warnings: string[], result: object) {
      log(this, 'Ending Task');
      this.allureReporter.endGroup();
      this.allureReporter.setGlobals();
    },
  };
}

/**
 * Всё, что раньше приходилось дергать из подпапок — теперь экспортируется из корня:
 */
export {
  step,
  stepWithExpectedResult,
  cleanAllureFolders,
  log,
  loadReporterConfig,
  Severity,
  Priority,
  AllureReporterFactory as AllureReporter,
};
