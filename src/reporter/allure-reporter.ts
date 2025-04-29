/* eslint-disable @typescript-eslint/no-unused-vars,class-methods-use-this */
import {
  AllureConfig,
  AllureGroup,
  AllureRuntime,
  AllureStep,
  AllureTest,
  Category,
  ContentType,
  ExecutableItemWrapper,
  Stage,
  Status,
} from 'allure-js-commons';
import * as fs from 'fs';
import crypto from 'crypto';
import { Screenshot, TestError, TestRunInfo } from '../testcafe/models';
import { TestStep } from '../testcafe/step';
import { loadCategoriesConfig, loadReporterConfig } from '../utils/config';
import addNewLine from '../utils/utils';
import Metadata from './metadata';
import { ErrorConfig } from './models';
import { Attachment } from '../testcafe/models';
import stripAnsi from 'strip-ansi';

const reporterConfig = loadReporterConfig();
const categoriesConfig: Category[] = loadCategoriesConfig();

export default class AllureReporter {
  private runtime: AllureRuntime;
  private userAgents: string[] | null;
  private group: AllureGroup | null = null;
  private groupMetadata!: Metadata;
  private tests: { [key: string]: AllureTest } = {};

  constructor(allureConfig?: AllureConfig, userAgents?: string[]) {
    const config = allureConfig ?? new AllureConfig(reporterConfig.RESULT_DIR);
    this.userAgents = userAgents ?? null;
    this.runtime = new AllureRuntime(config);
  }

  public setGlobals(): void {
    this.runtime.writeCategoriesDefinitions(categoriesConfig);
    if (this.userAgents) {
      this.runtime.writeEnvironmentInfo({ Browsers: this.userAgents.toString() });
    }
  }

  public startGroup(name: string, meta: object): void {
    this.groupMetadata = new Metadata(meta);
    this.groupMetadata.suite = name;
    this.group = this.runtime.startGroup(name);
  }

  public endGroup(): void {
    if (this.group) {
      this.group.endGroup();
    }
  }

  public generateHistoryId(fixtureName: string, testName: string): string {
    return crypto
      .createHash('md5')
      .update(`${fixtureName}::${testName}`)
      .digest('hex');
  }

  public startTest(name: string, _meta: object): void {
    if (!this.group) {
      throw new Error('No active suite');
    }

    const compositeKey = `${this.group.name}::${name}`;
    const testId = this.generateHistoryId(this.group.name, name);

    let currentTest = this.tests[compositeKey];
    if (!currentTest) {
      currentTest = this.group.startTest(name);
      currentTest.historyId = testId;
      this.tests[compositeKey] = currentTest;
    }

    currentTest.fullName = `${this.group.name} : ${name}`;
    currentTest.stage = Stage.RUNNING;
  }

  public endTest(name: string, testRunInfo: TestRunInfo, meta: object, context: any): void {
    if (!this.group) {
      throw new Error('No active suite');
    }

    const compositeKey = `${this.group.name}::${name}`;
    let currentTest = this.tests[compositeKey];
    if (!currentTest) {
      this.startTest(name, meta);
      currentTest = this.tests[compositeKey];
    }

    const currentMetadata = new Metadata(meta, true);
    const hasErrors = !!testRunInfo.errs?.length;
    const hasWarnings = !!testRunInfo.warnings?.length;
    const isSkipped = testRunInfo.skipped;

    let testMessages = '';
    let testDetails = '';

    currentMetadata.addDescription('<br/><strong>User Agent:</strong> ');
    testRunInfo.browsers?.forEach(browser => {
      currentMetadata.addDescription(browser.prettyUserAgent);
      currentMetadata.addOtherMeta('browser', browser.prettyUserAgent);
    });

    if (isSkipped) {
      currentTest.status = Status.SKIPPED;
    } else if (hasErrors) {
      const testErrors: TestError[] = [];
      testRunInfo.errs!.forEach(err => {
        const formatted = context.formatError(err);
        const errorObj = this.formatErrorObject(stripAnsi(formatted));
        (err as TestError).title = `${errorObj.errorName}: ${errorObj.errorMessage}`;
        (err as TestError).pretty = errorObj.pretty;
        testErrors.push(err as TestError);
      });

      currentTest.status = Status.FAILED;
      const merged = this.mergeErrors(testErrors);

      merged.forEach(error => {
        if (error.title) {
          testMessages = addNewLine(testMessages, error.code ? `${error.code} - ${error.title}` : error.title);
        }
        if (error.pretty) {
          testDetails = addNewLine(testDetails, error.pretty);
        } else {
          if (error.callsite?.filename) {
            testDetails = addNewLine(testDetails, `File name: ${error.callsite.filename}`);
          }
          if (error.callsite?.lineNum) {
            testDetails = addNewLine(testDetails, `Line number: ${error.callsite.lineNum}`);
          }
          if (error.userAgent) {
            testDetails = addNewLine(testDetails, `User Agent(s): ${error.userAgent}`);
          }
        }
      });
    } else {
      currentTest.status = Status.PASSED;
    }

    if (hasWarnings) {
      testRunInfo.warnings!.forEach(w => {
        testMessages = addNewLine(testMessages, w);
      });
    }

    if (testRunInfo.unstable) {
      currentMetadata.setFlaky();
    }
    if (currentMetadata.flaky) {
      testMessages = addNewLine(testMessages, reporterConfig.LABEL.FLAKY);
    }

    currentMetadata.addMetadataToTest(currentTest, this.groupMetadata);

    const steps = currentMetadata.getSteps();
    if (steps) {
      this.addStepsWithAttachments(currentTest, testRunInfo, steps);
    } else {
      this.addScreenshotAttachments(currentTest, testRunInfo);
    }

    currentTest.detailsMessage = testMessages;
    currentTest.detailsTrace = testDetails;
    currentTest.stage = Stage.FINISHED;
    currentTest.endTest();

    delete this.tests[compositeKey];
  }

  private addStepsWithAttachments(
    test: AllureTest,
    testRunInfo: TestRunInfo,
    steps: TestStep[]
  ): void {
    const mergedSteps = this.mergeSteps(steps);
    let screenshotIndex = 0;

    mergedSteps.forEach((s, i) => {
      const allureStep = test.startStep(s.name);
      s.attachments.forEach(att => this.addStepAttachment(allureStep, att));
      for (let j = 0; j < s.screenshotAmount; j++) {
        const scr = testRunInfo.screenshots![screenshotIndex++];
        if (scr) this.addScreenshotAttachment(allureStep, scr);
      }
      allureStep.status = i === mergedSteps.length - 1 ? test.status : Status.PASSED;
      allureStep.stage = Stage.FINISHED;
      allureStep.endStep();
    });
  }

  private addScreenshotAttachments(test: AllureTest, testRunInfo: TestRunInfo): void {
    testRunInfo.screenshots?.forEach(scr => this.addScreenshotAttachment(test, scr));
  }

  private addStepAttachment(test: ExecutableItemWrapper, att: Attachment): void {
    const data = fs.readFileSync(att.path!);
    const fileRef = this.runtime.writeAttachment(data, ContentType[att.contentType]);
    test.addAttachment(att.name, ContentType.JSON, fileRef);
  }

  private addScreenshotAttachment(test: ExecutableItemWrapper, scr: Screenshot): void {
    if (scr.screenshotPath && fs.existsSync(scr.screenshotPath)) {
      const name = scr.takenOnFail
        ? reporterConfig.LABEL.SCREENSHOT_ON_FAIL
        : reporterConfig.LABEL.SCREENSHOT_MANUAL;
      const label = this.userAgents && scr.userAgent
        ? `${name} - ${scr.userAgent}`
        : name;
      const img = fs.readFileSync(scr.screenshotPath);
      const fileRef = this.runtime.writeAttachment(img, ContentType.PNG);
      test.addAttachment(label, ContentType.PNG, fileRef);
    }
  }

  private mergeSteps(steps: TestStep[]): TestStep[] {
    const merged: TestStep[] = [];
    steps.forEach(s => {
      const found = merged.find(m => m.name === s.name);
      if (found) {
        found.screenshotAmount += s.screenshotAmount;
        found.attachments.push(...s.attachments);
      } else {
        merged.push(new TestStep(s.name, s.screenshotAmount, s.attachments));
      }
    });
    return merged;
  }

  private mergeErrors(errors: TestError[]): TestError[] {
    const merged: TestError[] = [];
    errors.forEach(err => {
      const dup = merged.find(m => m.title === err.title);
      if (dup && err.userAgent && dup.userAgent !== err.userAgent) {
        dup.userAgent = `${dup.userAgent}, ${err.userAgent}`;
      } else if (!dup) {
        merged.push(err);
      }
    });
    return merged;
  }

  private formatErrorObject(errorText: string) {
    let errorName = '';
    let errorMessage = '';
    if (errorText.includes(ErrorConfig.ASSERTION_ERROR)) {
      errorName = ErrorConfig.ASSERTION_ERROR;
      errorMessage = errorText.substring(
        ErrorConfig.ASSERTION_ERROR.length + 2,
        errorText.indexOf('\n\n')
      );
    } else if (errorText.includes(ErrorConfig.BEFORE_HOOK)) {
      errorName = ErrorConfig.BEFORE_HOOK;
      errorMessage = errorText.substring(
        ErrorConfig.BEFORE_HOOK.length,
        errorText.indexOf('\n\n')
      );
    } else {
      errorName = ErrorConfig.UNHANDLED_EXCEPTION;
      errorMessage = errorText.substring(0, errorText.indexOf('\n\n'));
    }
    return {
      errorName,
      errorMessage,
      pretty: errorText.substring(errorText.indexOf('\n\n')),
    };
  }
}
