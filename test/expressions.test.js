'use strict';

// Coverage for Handlebars mustache expressions: variables, paths, data
// references, partials, the triple-stash, helper arguments, hash arguments,
// subexpressions and whitespace control. Expected scopes were captured from the
// grammar's own tokenizer output, so they document exactly what VS Code emits.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { scopesOf } = require('./helpers/grammar');

// Asserts the named token carries `scope` somewhere in its stack.
async function assertScope(source, text, scope) {
  const scopes = await scopesOf(source, text);
  assert.ok(
    scopes.some((s) => s === scope || s.split(' ').includes(scope)),
    `token ${JSON.stringify(text)} in ${JSON.stringify(source)}\n` +
      `  expected scope ${JSON.stringify(scope)}\n  got ${JSON.stringify(scopes)}`
  );
}

test('simple variable: delimiters and name', async () => {
  await assertScope('{{foo}}', '{{', 'meta.function.inline.other.handlebars');
  await assertScope('{{foo}}', '{{', 'support.constant.handlebars');
  await assertScope('{{foo}}', 'foo', 'variable.parameter.handlebars');
  await assertScope('{{foo}}', '}}', 'support.constant.handlebars');
});

test('dotted path is a single variable token', async () => {
  await assertScope('{{foo.bar.baz}}', 'foo.bar.baz', 'variable.parameter.handlebars');
});

test('@data reference (e.g. @index)', async () => {
  await assertScope('{{@index}}', '@index', 'variable.parameter.handlebars');
});

test('triple-stash (unescaped) delimiters', async () => {
  await assertScope('{{{rawHtml}}}', '{{{', 'support.constant.handlebars');
  await assertScope('{{{rawHtml}}}', 'rawHtml', 'variable.parameter.handlebars');
  await assertScope('{{{rawHtml}}}', '}}}', 'support.constant.handlebars');
});

test('partial: {{> name }}', async () => {
  await assertScope('{{> myPartial}}', '{{>', 'support.constant.handlebars');
  await assertScope('{{> myPartial}}', 'myPartial', 'variable.parameter.handlebars');
});

test('helper with positional params: literal string and number', async () => {
  const src = '{{loud name "literal" 42}}';
  await assertScope(src, 'name', 'variable.parameter.handlebars');
  await assertScope(src, 'literal', 'string.quoted.double.handlebars');
  await assertScope(src, '42', 'variable.parameter.handlebars');
});

test('hash arguments: key=value', async () => {
  const src = '{{foo bar=baz qux="str"}}';
  await assertScope(src, 'bar', 'entity.other.attribute-name.handlebars');
  await assertScope(src, '=', 'entity.other.attribute-name.handlebars');
  await assertScope(src, 'baz', 'entity.other.attribute-value.handlebars');
  await assertScope(src, 'str', 'string.quoted.double.handlebars');
});

test('single-quoted string argument', async () => {
  const src = "{{foo 'bar'}}";
  await assertScope(src, 'bar', 'string.quoted.single.handlebars');
  await assertScope(src, "'", 'punctuation.definition.string.begin.html');
});

test('whitespace control on a bare variable: {{~foo~}}', async () => {
  await assertScope('{{~foo~}}', '{{~', 'support.constant.handlebars');
  await assertScope('{{~foo~}}', 'foo', 'variable.parameter.handlebars');
  await assertScope('{{~foo~}}', '~}}', 'support.constant.handlebars');
});
