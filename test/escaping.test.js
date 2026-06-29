'use strict';

// Coverage for escaped mustaches (issues #67 and #106). In Handlebars a leading
// backslash escapes a mustache so it renders literally rather than being
// evaluated, e.g. `\{{foo}}` outputs the text "{{foo}}". The grammar must
// therefore NOT highlight an escaped mustache as an expression. A *double*
// backslash escapes the backslash itself, so `\\{{foo}}` still evaluates the
// mustache — that case must keep its normal expression highlighting.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { scopesOf, allTokens } = require('./helpers/grammar');

async function assertScope(source, text, scope) {
  const scopes = await scopesOf(source, text);
  assert.ok(
    scopes.some((s) => s === scope || s.split(' ').includes(scope)),
    `token ${JSON.stringify(text)} in ${JSON.stringify(source)}\n` +
      `  expected scope ${JSON.stringify(scope)}\n  got ${JSON.stringify(scopes)}`
  );
}

// Returns true if any token in the source carries the given scope fragment.
async function anyTokenHasScope(source, scopeFragment) {
  const tokens = await allTokens(source);
  return tokens.some((t) => t.scopes.some((s) => s.includes(scopeFragment)));
}

test('escaped mustache marks the opening as a character escape', async () => {
  await assertScope('\\{{foo}}', '\\{{', 'constant.character.escape.handlebars');
});

test('escaped mustache is NOT highlighted as an expression', async () => {
  // The `foo` inside an escaped mustache must stay plain text, not a variable.
  assert.equal(
    await anyTokenHasScope('\\{{foo}}', 'variable.parameter.handlebars'),
    false,
    'escaped mustache should not produce a variable token'
  );
});

test('escaped triple-stash is also escaped', async () => {
  await assertScope('\\{{{foo}}}', '\\{{{', 'constant.character.escape.handlebars');
  assert.equal(await anyTokenHasScope('\\{{{foo}}}', 'variable.parameter.handlebars'), false);
});

test('escaped block helper is not treated as a block', async () => {
  await assertScope('\\{{#with foo}}', '\\{{', 'constant.character.escape.handlebars');
  assert.equal(
    await anyTokenHasScope('\\{{#with foo}}', 'meta.function.block.start.handlebars'),
    false,
    'escaped block should not open a block-helper scope'
  );
});

test('a double backslash does NOT escape: the mustache still evaluates', async () => {
  const src = '\\\\{{foo}}'; // two backslashes then {{foo}}
  await assertScope(src, '{{', 'support.constant.handlebars');
  await assertScope(src, 'foo', 'variable.parameter.handlebars');
  // The backslashes themselves are not a mustache escape.
  assert.equal(await anyTokenHasScope(src, 'constant.character.escape.handlebars'), false);
});

test('a normal mustache is unaffected', async () => {
  await assertScope('{{foo}}', 'foo', 'variable.parameter.handlebars');
  assert.equal(await anyTokenHasScope('{{foo}}', 'constant.character.escape.handlebars'), false);
});

test('escaped mustache inside an inline <script> template', async () => {
  const src = ['<script type="text/x-handlebars" id="t">', '\\{{escaped}}', '</script>'].join('\n');
  await assertScope(src, '\\{{', 'constant.character.escape.handlebars');
  assert.equal(await anyTokenHasScope(src, 'variable.parameter.handlebars'), false);
});
