/* eslint-disable @typescript-eslint/no-unused-vars,func-names */
// src/index.ts

import { AllureConfig } from 'allure-js-commons';
import AllureReporter from './reporter/allure-reporter';
import { TestRunInfo } from './testcafe/models';
import cleanAllureFolders from './utils/clean-folders';
import log from './utils/logger';
import step, { stepWithExpectedResult } from './testcafe/step';
import { loadReporterConfig } from './utils/config';
import { Severity } from 'allure-js-commons';
import { Priority } from './reporter/models';

/**
 * Функция-фабрика репортера для TestCafe.
 * TestCafe будет вызывать этот default-экспорт как CommonJS-модуль.
 */
function pluginFactory(): any {
  let allureReporter: any = null;
  let allureConfig: AllureConfig | null = null;

  return {
    getReporter() {
      return this;
    },

    preloadConfig(cfg: AllureConfig) {
      allureConfig = cfg;
    },

    async reportTaskStart(startTime: Date, userAgents: string[], testCount: number) {
      log(this, 'Starting Task');
      allureReporter = new AllureReporter(allureConfig, userAgents);
      await cleanAllureFolders();
    },

    async reportFixtureStart(name: string, path: string, meta: object) {
      log(this, `Starting Fixture: ${name}`);
      allureReporter.endGroup();
      allureReporter.startGroup(name, meta);
    },

    async reportTestStart(name: string, meta: object) {
      log(this, `Starting Test: ${name}`);
      allureReporter.startTest(name, meta);
    },

    async reportTestDone(name: string, testRunInfo: TestRunInfo, meta: object) {
      log(this, `Ending Test: ${name}`);
      allureReporter.endTest(name, testRunInfo, meta, this);
    },

    async reportTaskDone(endTime: Date, passed: number, warnings: string[], result: object) {
      log(this, 'Ending Task');
      allureReporter.endGroup();
      allureReporter.setGlobals();
    },
  };
}

// Приклеиваем утилиты и константы к функции, чтобы их можно было импортировать
Object.assign(pluginFactory, {
  step,
  stepWithExpectedResult,
  cleanAllureFolders,
  log,
  loadReporterConfig,
  Severity,
  Priority
});

// Этим экспортом TestCafe увидит ваш плагин
export default pluginFactory;

// И также доступны именованные экспорты для утилит
export {
  step,
  stepWithExpectedResult,
  cleanAllureFolders,
  log,
  loadReporterConfig,
  Severity,
  Priority
};
