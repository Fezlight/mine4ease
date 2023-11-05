import {Rule} from "../../index";
import * as os from "os";
import {beforeEach, describe, expect, jest, test} from "@jest/globals";

describe('Testing basic rules', () => {
  test('Given disallow rule with os windows when rule isRuleValid() then return false', () => {
    let rule = new Rule();
    rule.action = "disallow";
    rule.os = {
      name: "windows"
    };

    jest.spyOn(os, 'platform').mockReturnValue("win32");

    expect(rule.isRuleValid()).toBe(false);

    jest.resetAllMocks();
  });

  test('Given allow rule with os osx when rule isRuleValid() then return true', () => {
    let rule = new Rule();
    rule.action = "allow";
    rule.os = {
      name: "osx"
    };

    jest.spyOn(os, 'platform').mockReturnValue("darwin");

    expect(rule.isRuleValid()).toBe(true);

    jest.resetAllMocks();
  });

  test('Given allow rule without any rule when rule isRuleValid() then return true', () => {
    let rule = new Rule();
    rule.action = "allow";

    expect(rule.isRuleValid()).toBe(true);
  });

  test('Given disallow rule without any rule when rule isRuleValid() then return false', () => {
    let rule = new Rule();
    rule.action = "disallow";

    expect(rule.isRuleValid()).toBe(false);
  });
});

describe('Testing advanced rules', () => {
  let rules = [];
  beforeEach(() => {
    let rule = new Rule();
    rule.action = "allow";
    rule.os = {
      name: "osx"
    };

    let rule2 = new Rule();
    rule2.action = "disallow";
    rule2.os = {
      name: "windows",
      version: "10.*"
    };

    rules = [rule, rule2];
  })

  test('Given list of rules with os macosx and disallow windows v10.0.0 on linux when rule isRuleValid() then return false', () => {
    jest.spyOn(os, 'platform').mockReturnValue("linux");

    expect(rules
    .map(value => value.isRuleValid())
    .reduce((previousValue, currentValue) => previousValue && currentValue))
    .toBe(false);

    jest.resetAllMocks();
  });

  test('Given list of rules with os macosx and disallow windows v10.0.0 on windows 11.0.0 when rule isRuleValid() then return false', () => {
    jest.spyOn(os, 'platform').mockReturnValue("win32");
    jest.spyOn(os, 'version').mockReturnValue("11.0.0");

    expect(rules
    .map(value => value.isRuleValid())
    .reduce((previousValue, currentValue) => previousValue && currentValue))
    .toBe(false);

    jest.resetAllMocks();
  });

  test('Given list of rules with os macosx and disallow windows v10.0.0 on osx when rule isRuleValid() then return true', () => {
    jest.spyOn(os, 'platform').mockReturnValue("darwin");

    expect(rules
    .map(value => value.isRuleValid())
    .reduce((previousValue, currentValue) => previousValue && currentValue))
    .toBe(true);

    jest.resetAllMocks();
  });

  test('Given list of rules with os windows v10.X and x64 on windows v10.5.3 and x64 when rule isRuleValid() then return true', () => {
    jest.spyOn(os, 'platform').mockReturnValue("win32");
    jest.spyOn(os, 'version').mockReturnValue("10.5.3");
    jest.spyOn(os, 'arch').mockReturnValue("x64");

    let rule = new Rule();
    rule.action = "allow";
    rule.os = {
      name: "windows",
      version: "^10\\.5\\.\\d$",
      arch: "x64"
    };

    expect(rule.isRuleValid()).toBe(true);

    jest.resetAllMocks();
  });
});
