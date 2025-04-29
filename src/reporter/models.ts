// reporter/models.ts

export enum LabelName {
    TEST_CASE = 'testCase',
    USER_STORY = 'userStory',
    AS_ID = 'AS_ID',
    SUITE = 'suite',
    PARENT_SUITE = 'parentSuite',
    SUB_SUITE = 'subSuite',
    EPIC = 'epic',
    FEATURE = 'feature',
    STORY = 'story',
    BUG = 'bug',
    SEVERITY = 'severity',
    PRIORITY = 'Priority',
    TAG = 'tag',      // ← новый
    LAYER = 'layer',    // ← новый
    OWNER = 'owner',
    LEAD = 'lead',
    HOST = 'host',
    THREAD = 'thread',
    TEST_METHOD = 'testMethod',
    TEST_CLASS = 'testClass',
    PACKAGE = 'package',
    FRAMEWORK = 'framework',
    LANGUAGE = 'language',
}

export enum Priority {
    HIGHEST = 'highest',
    HIGH = 'high',
    MEDIUM = 'medium',
    LOW = 'low',
    LOWEST = 'lowest',
}

export enum ErrorConfig {
    ASSERTION_ERROR = 'AssertionError',
    BEFORE_HOOK = '- Error in test.before hook -\n',
    UNHANDLED_EXCEPTION = 'Unhandled Exception',
}
