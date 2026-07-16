'use strict';

// Coverage for escaped mustaches (issues #67 and #106). In Handlebars a leading
// backslash escapes a mustache so it renders literally rather than being
// evaluated, e.g. `\{{foo}}` outputs the text "{{foo}}". The grammar must
// therefore NOT highlight an escaped mustache as an expression.
//
// Backslashes also escape each other, so what matters is the *parity* of the run
// of backslashes immediately before the mustache: an odd run escapes the mustache
// (the last backslash has no partner), while an even run leaves the mustache to
// evaluate (every backslash is paired off). Each `\\` pair renders as one literal
// backslash and is highlighted as a character escape; the lone leftover backslash
// of an odd run escapes the mustache. So `\{{foo}}` and `\\\{{foo}}` are escaped,
// while `\\{{foo}}` and `\\\\{{foo}}` still evaluate (issue raised in PR #116).

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
  // The pair of backslashes is itself an escaped backslash, but it does NOT
  // escape the mustache — the escape scope belongs to the `\\`, not the braces.
  await assertScope(src, '\\\\', 'constant.character.escape.handlebars');
});

test('an escaped backslash is highlighted as a character escape', async () => {
  await assertScope('\\\\{{foo}}', '\\\\', 'constant.character.escape.handlebars');
});

test('a triple backslash escapes the mustache (odd run)', async () => {
  // \\\{{foo}} == escaped backslash (\\) + escaped mustache (\{{). The mustache
  // is escaped, so `foo` must stay plain text rather than becoming a variable.
  const src = '\\\\\\{{foo}}'; // three backslashes then {{foo}}
  await assertScope(src, '\\\\', 'constant.character.escape.handlebars');
  await assertScope(src, '\\{{', 'constant.character.escape.handlebars');
  assert.equal(
    await anyTokenHasScope(src, 'variable.parameter.handlebars'),
    false,
    'a triple backslash escapes the mustache, so it is not an expression'
  );
});

test('a quadruple backslash does NOT escape: the mustache still evaluates', async () => {
  // Four backslashes are two escaped-backslash pairs; nothing is left to escape
  // the mustache, so it evaluates as usual.
  const src = '\\\\\\\\{{foo}}'; // four backslashes then {{foo}}
  await assertScope(src, '{{', 'support.constant.handlebars');
  await assertScope(src, 'foo', 'variable.parameter.handlebars');
});

test('backslashes not preceding a mustache are left as plain text', async () => {
  // Outside of a mustache context a backslash is an ordinary character (e.g. a
  // Windows path in template text), so it must not be highlighted as an escape.
  assert.equal(
    await anyTokenHasScope('C:\\\\path\\\\to', 'constant.character.escape.handlebars'),
    false,
    'bare backslashes in plain text should not be a character escape'
  );
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
