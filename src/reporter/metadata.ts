// reporter/metadata.ts

import { AllureTest, LinkType, Severity } from 'allure-js-commons';
import { LabelName, Priority } from './models';
import { TestStep } from '../testcafe/step';
import { loadReporterConfig } from '../utils/config';

const reporterConfig = loadReporterConfig();

export default class Metadata {
  // стандартные поля
  severity?: string;
  priority?: Priority;
  description: string = '';
  issue?: string;
  parent_suite?: string;
  suite?: string;
  sub_suite?: string;
  epic?: string;
  feature?: string;
  story?: string;
  bug?: string;
  flaky: boolean = false;

  // новые кастомные
  tag?: string;
  layer?: string;

  // шаги
  steps?: TestStep[];

  // TMS связи
  user_story?: string;
  test_case?: string;

  // всё остальное
  otherMeta: Map<string, string> = new Map();
  links: string[] = [];

  constructor(meta?: any, testContext: boolean = false) {
    if (!meta) return;

    const {
      severity,
      priority,
      description,
      issue,
      suite,
      epic,
      story,
      bug,
      feature,
      flaky,
      steps,
      user_story,
      test_case,
      tag,
      layer,
      ...otherMeta
    } = meta;

    if (this.isValidEnumValue(severity, Severity)) {
      this.severity = severity;
    }
    if (this.isValidEnumValue(priority, Priority)) {
      this.priority = priority;
    }
    if (this.isString(description)) {
      this.description = description;
    }
    if (this.isString(issue)) {
      this.issue = issue;
    }

    if (this.isString(suite)) {
      if (testContext) this.sub_suite = suite;
      else this.parent_suite = suite;
    }
    if (this.isString(epic)) this.epic = epic;
    if (this.isString(feature)) this.feature = feature;
    if (this.isString(story)) this.story = story;
    if (this.isString(bug)) this.bug = bug;
    if (this.isBoolean(flaky)) this.flaky = flaky;

    if (steps) this.steps = steps;
    if (this.isString(user_story)) this.user_story = user_story;
    if (this.isString(test_case)) this.test_case = test_case;

    // кастомные поля
    if (this.isString(tag)) this.tag = tag;
    if (this.isString(layer)) this.layer = layer;

    // всё остальное
    Object.entries(otherMeta).forEach(([k, v]) => {
      this.otherMeta.set(k, String(v));
    });
  }

  /** Добавить описание (можно вызывать несколько раз) */
  public addDescription(text: string) {
    this.description += text;
  }

  /** Добавить link */
  public addLink(url: string, text: string, icon: string) {
    this.links.push(
      `<a class="link" href="${url}" target="_blank"><i class="fa fa-${icon}"></i> ${text}</a>`
    );
  }

  /** Пометить как flaky */
  public setFlaky() {
    this.flaky = true;
  }

  /** Добавить в otherMeta */
  public addOtherMeta(key: string, value: string) {
    this.otherMeta.set(key, value);
  }

  /** Получить шаги */
  public getSteps(): TestStep[] | null {
    return this.steps ?? null;
  }

  /**
   * Записать всю метадату в AllureTest
   */
  public addMetadataToTest(test: AllureTest, groupMeta: Metadata) {
    // 1) Слить групповую и локальную
    this.mergeMetadata(groupMeta);

    // 2) Лейблы
    test.addLabel(LabelName.SEVERITY, this.severity ?? reporterConfig.META.SEVERITY);
    test.addLabel(LabelName.PRIORITY, this.priority ?? reporterConfig.META.PRIORITY);

    if (this.parent_suite) test.addLabel(LabelName.PARENT_SUITE, this.parent_suite);
    if (this.suite) test.addLabel(LabelName.SUITE, this.suite);
    if (this.sub_suite) test.addLabel(LabelName.SUB_SUITE, this.sub_suite);

    if (this.epic) test.addLabel(LabelName.EPIC, this.epic);
    if (this.feature) test.addLabel(LabelName.FEATURE, this.feature);
    if (this.story) test.addLabel(LabelName.STORY, this.story);
    if (this.bug) test.addLabel(LabelName.BUG, this.bug);

    // кастомные лейблы
    if (this.tag) test.addLabel(LabelName.TAG, this.tag);
    if (this.layer) test.addLabel(LabelName.LAYER, this.layer);

    // 3) Связи
    if (this.issue) {
      this.issue.split(',').forEach(id =>
        test.addLink(
          `${reporterConfig.META.JIRA_URL}${id.trim()}`,
          `${reporterConfig.LABEL.ISSUE}: ${id.trim()}`,
          'check-square'
        )
      );
    }
    if (this.test_case) {
      test.addLink(
        `${reporterConfig.META.JIRA_URL}${this.test_case}`,
        `${reporterConfig.LABEL.ISSUE}: ${this.test_case}`,
        'check-square'
      );
    }

    // 4) Описание + ссылки
    if (this.description) {
      let desc = this.description.split('\n').join('<br/>');
      if (this.links.length) {
        desc += `<h3>Links</h3>${this.links.join('<br/>')}`;
      }
      test.description = desc;
    }

    // 5) Параметры — всё остальное
    this.otherMeta.forEach((v, k) => {
      test.addParameter(k, v);
    });
  }

  /** Слить родительский metadata в текущий, если текущего поля нет */
  private mergeMetadata(parent: Metadata) {
    if (!this.severity && parent.severity) this.severity = parent.severity;
    if (!this.priority && parent.priority) this.priority = parent.priority;
    if (!this.parent_suite && parent.parent_suite) this.parent_suite = parent.parent_suite;
    if (!this.suite && parent.suite) this.suite = parent.suite;
    if (!this.sub_suite && parent.sub_suite) this.sub_suite = parent.sub_suite;
    if (!this.epic && parent.epic) this.epic = parent.epic;
    if (!this.feature && parent.feature) this.feature = parent.feature;
    if (!this.story && parent.story) this.story = parent.story;
    if (!this.bug && parent.bug) this.bug = parent.bug;
    if (!this.tag && parent.tag) this.tag = parent.tag;
    if (!this.layer && parent.layer) this.layer = parent.layer;
  }

  private isValidEnumValue(val: any, en: any): boolean {
    return typeof val === 'string' && Object.values(en).includes(val.toUpperCase());
  }
  private isString(val: any): val is string {
    return typeof val === 'string';
  }
  private isBoolean(val: any): val is boolean {
    return typeof val === 'boolean';
  }
}
