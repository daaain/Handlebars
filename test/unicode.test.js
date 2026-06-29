'use strict';

// Coverage for non-ASCII (Unicode) identifiers in Handlebars expressions.
// Handlebars allows variable, helper, partial and block names in any language,
// so the grammar's identifier character classes use Oniguruma's `\p{L}` (any
// letter) and `\p{N}` (any number) rather than a hardcoded `a-zA-Z0-9` range.
// This supersedes PR #90, which only added Cyrillic. The sample strings below
// span Cyrillic, CJK, Arabic and Latin-with-diacritics so a regression in any
// single script is caught.

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

test('Cyrillic variable name is a variable token', async () => {
  await assertScope('{{Москва}}', 'Москва', 'variable.parameter.handlebars');
});

test('CJK variable name is a variable token', async () => {
  await assertScope('{{北京市}}', '北京市', 'variable.parameter.handlebars');
});

test('Arabic variable name is a variable token', async () => {
  await assertScope('{{إسرائيل}}', 'إسرائيل', 'variable.parameter.handlebars');
});

test('Latin-with-diacritics variable name is a variable token', async () => {
  await assertScope('{{Düsseldorf}}', 'Düsseldorf', 'variable.parameter.handlebars');
});

test('block helper with a non-ASCII name highlights open and close', async () => {
  const src = '{{#список}}{{/список}}';
  await assertScope(src, 'список', 'meta.function.block.start.handlebars');
  // The closing tag must accept the same non-ASCII name: the `/` only appears in
  // the close, and its scope confirms the end_block rule matched the Cyrillic name.
  await assertScope(src, '/', 'meta.function.block.end.handlebars');
});

test('block helper parameters may be non-ASCII', async () => {
  await assertScope('{{#each города}}', 'города', 'variable.parameter.handlebars');
});

test('partial with a non-ASCII name', async () => {
  await assertScope('{{> меню}}', 'меню', 'variable.parameter.handlebars');
});

test('else if with a non-ASCII condition is consumed by the else rule', async () => {
  // The grammar tokenizes the condition with a leading space and (by a
  // pre-existing quirk) does not give it variable scope; what matters here is
  // that the non-ASCII name is matched by the else_token rule rather than
  // spilling out as plain text.
  await assertScope('{{else if активен}}', ' активен', 'meta.function.inline.else.handlebars');
});

test('non-ASCII hash key and value', async () => {
  const src = '{{foo имя=значение}}';
  await assertScope(src, 'имя', 'entity.other.attribute-name.handlebars');
  await assertScope(src, 'значение', 'entity.other.attribute-value.handlebars');
});
