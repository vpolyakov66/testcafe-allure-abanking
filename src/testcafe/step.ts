/* eslint-disable class-methods-use-this,no-param-reassign */
// testcafe/step.ts

import * as fs from 'fs';
import * as path from 'path';
import TestController from 'testcafe';
import percySnapshot from '@percy/testcafe';
import { loadReporterConfig } from '../utils/config';
import { Attachment } from './models';

const reporterConfig = loadReporterConfig();

export class TestStep {
  public name: string;
  public screenshotAmount: number;
  public attachments: Attachment[];
  public expectedResult?: string; // новое поле

  constructor(
    name: string,
    screenshotAmount: number = 0,
    attachments?: Attachment | Attachment[],
    expectedResult?: string
  ) {
    this.name = name || reporterConfig.LABEL.DEFAULT_STEP_NAME;
    this.screenshotAmount = screenshotAmount;
    this.attachments = [];

    if (attachments) {
      this.attachments = Array.isArray(attachments) ? attachments : [attachments];
    }

    if (expectedResult) {
      this.expectedResult = expectedResult;
    }
  }

  public registerScreenshot(): void {
    this.screenshotAmount += 1;
  }

  private getDate(): string {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() + offset * 60000);
    return local.toISOString().split('T')[0];
  }

  public registerAttachment(attachment: Attachment): void {
    try {
      const filename = `${attachment.name}_${Date.now()}.${attachment.contentType.toLowerCase()}`;
      const folder = path.join(process.cwd(), reporterConfig.FILE_DIR, this.getDate());
      if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
      const fullPath = path.join(folder, filename);
      fs.writeFileSync(fullPath, attachment.content);
      attachment.path = fullPath;
      this.attachments.push(attachment);
    } catch (err) {
      console.error(err);
    }
  }

  public mergeOnSameName(testStep: TestStep): boolean {
    if (this.name === testStep.name) {
      this.screenshotAmount += testStep.screenshotAmount;
      this.attachments.push(...testStep.attachments);
      if (!this.expectedResult && testStep.expectedResult) {
        this.expectedResult = testStep.expectedResult;
      }
      return true;
    }
    return false;
  }

  public addStepToTest(testController: TestController): void {
    const meta: any = this.getMeta(testController);
    if (!meta.steps) meta.steps = [];
    meta.steps.push(this);
  }

  private getMeta(testController: any): any {
    let { meta } = testController.testRun.test;
    if (!meta) {
      meta = {};
      testController.testRun.test.meta = meta;
    }
    return meta;
  }
}

/**
 * Обычный шаг
 */
export default async function step(
  name: string,
  testController: TestController,
  stepAction: any,
  attachments?: Attachment | Attachment[]
): Promise<any> {
  let action = stepAction;
  const testStep = new TestStep(name);

  if (attachments) {
    if (Array.isArray(attachments)) {
      attachments.forEach(att => testStep.registerAttachment(att));
    } else {
      testStep.registerAttachment(attachments);
    }
  }

  if (reporterConfig.ENABLE_SCREENSHOTS) {
    action = action.takeScreenshot();
    testStep.registerScreenshot();
  }

  testStep.addStepToTest(testController);

  const result = await action;
  await percySnapshot(testController, name);  // Percy snapshot
  return result;
}

/**
 * Шаг с ожидаемым результатом
 */
export async function stepWithExpectedResult(
  name: string,
  expectedResult: string,
  testController: TestController,
  stepAction: any,
  attachments?: Attachment | Attachment[]
): Promise<any> {
  let action = stepAction;
  const testStep = new TestStep(name, 0, attachments, expectedResult);

  if (attachments) {
    if (Array.isArray(attachments)) {
      attachments.forEach(att => testStep.registerAttachment(att));
    } else {
      testStep.registerAttachment(attachments);
    }
  }

  if (reporterConfig.ENABLE_SCREENSHOTS) {
    action = action.takeScreenshot();
    testStep.registerScreenshot();
  }

  testStep.addStepToTest(testController);

  const result = await action;
  await percySnapshot(testController, name);  // Percy snapshot
  return result;
}
