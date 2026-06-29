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
  const openTag = '<script type="text/x-handlebars" id="t">';
  const body = '  <h1>{{title}}</h1>';
  const closeTag = '</script>';
  const src = [openTag, body, closeTag].join('\n');
  const lines = await tokenizeLines(src);
  // Assert specifically on the template body (line 2), not the <script>/
  // </script> boundary lines, so the check targets the embedded content itself.
  const bodyTokens = lines[1];
  for (const tok of bodyTokens) {
    assert.ok(
      tok.scopes.includes('source.handlebars.embedded.html'),
      `body token ${JSON.stringify(tok.text)} missing embedded scope: ${JSON.stringify(tok.scopes)}`
    );
  }
  // The expression inside the template is still highlighted as Handlebars.
  await assertScope(src, 'title', 'variable.parameter.handlebars');
});

// Regression for #58: an `id` (or any attribute) appearing BEFORE `type` in the
// opening tag must still be highlighted. The old grammar consumed everything up
// to `type=` with a greedy `.*`, swallowing the leading attributes into one
// unscoped token. The fix asserts the handlebars `type` via a lookahead and lets
// the #tag-stuff rules highlight every attribute regardless of order.
test('#58: id attribute before type is still highlighted', async () => {
  const src = '<script id="t" type="text/x-handlebars-template"></script>';
  await assertScope(src, 'id', 'entity.other.attribute-name.id.html');
  await assertScope(src, 't', 'string.quoted.double.handlebars');
  // The script body is still recognised as an embedded handlebars template.
  await assertScope(src, 'script', 'entity.name.tag.script.html');
});

test('#58: id attribute after type is still highlighted (no regression)', async () => {
  const src = '<script type="text/x-handlebars-template" id="t"></script>';
  await assertScope(src, 'id', 'entity.other.attribute-name.id.html');
  await assertScope(src, 't', 'string.quoted.double.handlebars');
});

test('#58: a plain text/javascript script is NOT a handlebars template', async () => {
  // The lookahead must not fire for a non-handlebars type; the body should fall
  // through to source.js, not the handlebars embedding.
  const src = '<script id="x" type="text/javascript">';
  const idTok = (await tokenizeLines(src)).flat().find((t) => t.text === 'id');
  assert.ok(
    !idTok.scopes.includes('source.handlebars.embedded.html'),
    `plain JS script should not be a handlebars embedding: ${JSON.stringify(idTok.scopes)}`
  );
});

test('plain HTML outside any script tag is NOT treated as embedded', async () => {
  const src = '<p>{{body}}</p>';
  const tok = (await tokenizeLines(src)).flat().find((t) => t.text === 'p');
  assert.ok(!tok.scopes.includes('source.handlebars.embedded.html'));
});

test('YAML front-matter at the top of the document is highlighted', async () => {
  const src = '---\ntitle: Hello\n---\n<p>{{x}}</p>';
  // Opening fence, content and closing fence are all in the front-matter block.
  assert.equal(await lineHasScope(src, 1, 'markup.raw.yaml.front-matter'), true);
  assert.equal(await lineHasScope(src, 2, 'markup.raw.yaml.front-matter'), true);
  assert.equal(await lineHasScope(src, 3, 'markup.raw.yaml.front-matter'), true);
  // The body after the front-matter still highlights normally.
  assert.equal(await lineHasScope(src, 4, 'variable.parameter.handlebars'), true);
});

test('a bare --- not at the document start is NOT front-matter', async () => {
  const src = '<p>hi</p>\n---\nstill body';
  assert.equal(await lineHasScope(src, 2, 'markup.raw.yaml.front-matter'), false);
});
