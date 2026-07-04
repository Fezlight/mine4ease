import {Rule} from "../../src/models/Rule";
import {beforeEach, describe, expect, test} from "@jest/globals";

describe('Testing basic rules', () => {
  test('Given disallow rule with os windows when rule isRuleValid() then return false', () => {
    let rule = new Rule();
    rule.action = "disallow";
    rule.os = {
      name: "windows"
    };

    expect(rule.isRuleValid("win32", "", "x64")).toBe(false);
  });

  test('Given allow rule with os osx when rule isRuleValid() then return true', () => {
    let rule = new Rule();
    rule.action = "allow";
    rule.os = {
      name: "osx"
    };

    expect(rule.isRuleValid("darwin", "", "x64")).toBe(true);
  });

  test('Given allow rule without any rule when rule isRuleValid() then return true', () => {
    let rule = new Rule();
    rule.action = "allow";

    expect(rule.isRuleValid("linux", "", "x64")).toBe(true);
  });

  test('Given disallow rule without any rule when rule isRuleValid() then return false', () => {
    let rule = new Rule();
    rule.action = "disallow";

    expect(rule.isRuleValid("linux", "", "x64")).toBe(false);
  });
});

describe('Testing advanced rules', () => {
  let rules: Rule[] = [];
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
    expect(rules
    .map(value => value.isRuleValid("linux", "", "x64"))
    .reduce((previousValue, currentValue) => previousValue && currentValue))
    .toBe(false);
  });

  test('Given list of rules with os macosx and disallow windows v10.0.0 on windows 11.0.0 when rule isRuleValid() then return false', () => {
    expect(rules
    .map(value => value.isRuleValid("win32", "11.0.0", "x64"))
    .reduce((previousValue, currentValue) => previousValue && currentValue))
    .toBe(false);
  });

  test('Given list of rules with os macosx and disallow windows v10.0.0 on osx when rule isRuleValid() then return true', () => {
    expect(rules
    .map(value => value.isRuleValid("darwin", "", "x64"))
    .reduce((previousValue, currentValue) => previousValue && currentValue))
    .toBe(true);
  });

  test('Given list of rules with os windows v10.X and x64 on windows v10.5.3 and x64 when rule isRuleValid() then return true', () => {
    let rule = new Rule();
    rule.action = "allow";
    rule.os = {
      name: "windows",
      version: "^10\\.5\\.\\d$",
      arch: "x64"
    };

    expect(rule.isRuleValid("win32", "10.5.3", "x64")).toBe(true);
  });
});
