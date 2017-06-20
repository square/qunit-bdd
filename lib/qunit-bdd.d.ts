/// <reference types="qunit" />

declare namespace QUnitBDD {
  export type TestContext = object;

  export type DescribeCallback = {
    (): void | Promise<void>;
    (assert: Assert): void | Promise<void>;
  };

  export type TestCallback = {
    (this: TestContext): void | Promise<void>;
    (this: TestContext, assert: Assert): void | Promise<void>;
  };

  export type Describe = {
    (description: string, body: DescribeCallback): void;
    skip(description: string, body: DescribeCallback): void;
    only(description: string, body: DescribeCallback): void;
  };

  export type TestMethod = {
    (this: Context, description: string, body: TestCallback): void;
    skip(this: Context, description: string, body: TestCallback): void;
    only(this: Context, description: string, body: TestCallback): void;
  };

  export type Lazy<T> = {
    (name: string, factory: (this: TestContext) => T): void;
    (name: string, value: T): void;
  };

  export type Helper<T> = (name: string, method: (this: TestContext) => T) => void;
  export type Before = (this: Context, body: TestCallback) => void;
  export type After = (this: Context, body: TestCallback) => void;
  export type Fail = (message: string) => void;
  export type Expect<T> = (value: T) => Expectation<T>;

  export interface Expectation<T> {
    to: this;
    not: this;
    be: this;
    equal(expected: T, message?: string): void;
    eql(expected: T, message?: string): void;
    undefined(message?: string): void;
    null(message?: string): void;
    false(message?: string): void;
    true(message?: string): void;
    defined(message?: string): void;
  }
}

declare module 'qunit-bdd' {
  export const describe: QUnitBDD.Describe;
  export const context: QUnitBDD.Describe;
  export const it: QUnitBDD.TestMethod;
  export const lazy: QUnitBDD.Lazy<any>;
  export const helper: QUnitBDD.Helper<any>;
  export const before: QUnitBDD.Before;
  export const after: QUnitBDD.After;
  export const fail: QUnitBDD.Fail;
  export const expect: QUnitBDD.Expect<any>;
}

declare const describe: QUnitBDD.Describe;
declare const context: QUnitBDD.Describe;
declare const it: QUnitBDD.TestMethod;
declare const lazy: QUnitBDD.Lazy<any>;
declare const helper: QUnitBDD.Helper<any>;
declare const before: QUnitBDD.Before;
declare const after: QUnitBDD.After;
declare const fail: QUnitBDD.Fail;
declare const expect: QUnitBDD.Expect<any>;
