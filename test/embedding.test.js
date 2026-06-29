'use strict';

// Coverage for how Handlebars is embedded into the surrounding document:
// expressions inside HTML attributes, inline <script> templates, the
// layout-extends preprocessor, and a note on YAML front-matter.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { scopesOf, lineHasScope, tokenizeLines } = require('./helpers/grammar');

async function assertScope(source, text, scope) {
  const scopes = await scopesOf(source, text);
  assert.ok(
    scopes.some((s) => s === scope || s.split(' ').includes(scope)),
    `token ${JSON.stringify(text)} in ${JSON.stringify(source)}\n` +
      `  expected scope ${JSON.stringify(scope)}\n  got ${JSON.stringify(scopes)}`
  );
}

test('expression inside an HTML attribute value is highlighted', async () => {
  const src = '<div class="{{cls}}">';
  // The mustache keeps its own scopes while nested in the quoted attribute.
  await assertScope(src, '{{', 'meta.function.inline.other.handlebars');
  await assertScope(src, 'cls', 'variable.parameter.handlebars');
  await assertScope(src, '}}', 'support.constant.handlebars');
  // ...and the surrounding HTML tag is still recognised as HTML.
  await assertScope(src, 'div', 'entity.name.tag.block.any.html');
});

test('layout extends preprocessor: {{!< layout}}', async () => {
  const src = '{{!< layout}}';
  await assertScope(src, '{{!<', 'meta.preprocessor.handlebars');
  await assertScope(src, '{{!<', 'support.function.handlebars');
  await assertScope(src, 'layout', 'support.class.handlebars');
  await assertScope(src, '}}', 'support.function.handlebars');
});

test('inline <script> template embeds Handlebars', async () => {
  const src = [
    '<script type="text/x-handlebars" id="t">',
    '  <h1>{{title}}</h1>',
    '</script>',
  ].join('\n');
  const lines = await tokenizeLines(src);
  // Every line of the script body sits in the embedded Handlebars source scope.
  for (const tok of lines.flat()) {
    assert.ok(
      tok.scopes.includes('source.handlebars.embedded.html'),
      `token ${JSON.stringify(tok.text)} missing embedded scope: ${JSON.stringify(tok.scopes)}`
    );
  }
  // The expression inside the template is still highlighted as Handlebars.
  await assertScope(src, 'title', 'variable.parameter.handlebars');
});

test('plain HTML outside any script tag is NOT treated as embedded', async () => {
  const src = '<p>{{body}}</p>';
  const tok = (await tokenizeLines(src)).flat().find((t) => t.text === 'p');
  assert.ok(!tok.scopes.includes('source.handlebars.embedded.html'));
});

// The grammar carries a YAML front-matter rule, but its `begin` is anchored on
// `---\n$` (a literal newline). VS Code feeds lines to the tokenizer without
// their terminator, so this rule cannot fire there. This test documents that
// reality — if a future change makes front-matter actually highlight, update it.
test('YAML front-matter is inert under VS Code line feeding', async () => {
  const src = '---\ntitle: Hello\n---\n<p>{{x}}</p>';
  assert.equal(await lineHasScope(src, 1, 'markup.raw.yaml.front-matter'), false);
  // The body after the front-matter still highlights normally.
  assert.equal(await lineHasScope(src, 4, 'variable.parameter.handlebars'), true);
});
