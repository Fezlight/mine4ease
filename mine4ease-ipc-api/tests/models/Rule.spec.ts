import {Action, OS, Rule} from "../../index";
import os from "os";
import {jest} from "@jest/globals";

describe('Testing rules', () => {
  test('Given disallow rule with os windows when rule isRuleValid() then return false', () => {
    let rule = new Rule();
    rule.action = Action.disallow;
    rule.os = {
      name: "windows"
    };

    const osPlatform = jest.fn(os.platform);
    osPlatform.mockImplementation(() => "darwin");

    expect(osPlatform).toBeCalledTimes(1);
    expect(rule.isRuleValid()).toBe(false);
  });

  it('Given allow rule with os windows when rule isRuleValid() then return true', () => {
    let rule = new Rule();
    rule.action = Action.allow;
    rule.os = {
      name: "windows"
    };

    expect(rule.isRuleValid()).toBe(true);
  });

  it('Given list of rules with os macosx and disallow windows v10.0.0 when rule isRuleValid() then return false', () => {
    let rule = new Rule();
    rule.action = Action.allow;
    rule.os = {
      name: "darwin"
    };

    let rule2 = new Rule();
    rule2.action = Action.disallow;
    rule2.os = {
      name: "windows",
      version: "^10.0.0$"
    };

    let rules = [rule, rule2];

    expect(rules
      .map(value => value.isRuleValid())
      .reduce((previousValue, currentValue) => previousValue && currentValue))
    .toBe(false);
  });
});
