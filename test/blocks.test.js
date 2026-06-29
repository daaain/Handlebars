'use strict';

// Coverage for Handlebars block expressions: opening helpers (#if, #each,
// #unless, #with, custom), block parameters (as |x|), closing tags (/if), and
// the {{else}} / {{else if}} inverse sections.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { scopesOf } = require('./helpers/grammar');

async function assertScope(source, text, scope) {
  const scopes = await scopesOf(source, text);
  assert.ok(
    scopes.some((s) => s === scope || s.split(' ').includes(scope)),
    `token ${JSON.stringify(text)} in ${JSON.stringify(source)}\n` +
      `  expected scope ${JSON.stringify(scope)}\n  got ${JSON.stringify(scopes)}`
  );
}

test('block open {{#if}} is a block.start with keyword.control name', async () => {
  const src = '{{#if condition}}';
  await assertScope(src, '{{', 'meta.function.block.start.handlebars');
  await assertScope(src, '#', 'keyword.control');
  await assertScope(src, 'if', 'keyword.control');
  await assertScope(src, 'condition', 'variable.parameter.handlebars');
});

for (const helper of ['each', 'unless', 'with']) {
  test(`built-in block helper {{#${helper}}}`, async () => {
    const src = `{{#${helper} value}}`;
    await assertScope(src, '#', 'keyword.control');
    await assertScope(src, helper, 'keyword.control');
    await assertScope(src, 'value', 'variable.parameter.handlebars');
  });
}

test('custom block helper {{#myHelper}}', async () => {
  const src = '{{#myHelper arg}}';
  await assertScope(src, '#', 'keyword.control');
  await assertScope(src, 'myHelper', 'keyword.control');
});

test('block parameters: {{#each items as |item|}}', async () => {
  const src = '{{#each items as |item|}}';
  await assertScope(src, 'items', 'variable.parameter.handlebars');
  await assertScope(src, 'item', 'variable.parameter.handlebars');
});

test('block close {{/if}} is a block.end with keyword.control', async () => {
  const src = '{{/if}}';
  await assertScope(src, '{{', 'meta.function.block.end.handlebars');
  await assertScope(src, '/', 'keyword.control');
  await assertScope(src, 'if', 'keyword.control');
});

test('{{else}} is an inline else section', async () => {
  const src = '{{else}}';
  await assertScope(src, '{{', 'meta.function.inline.else.handlebars');
  await assertScope(src, 'else', 'keyword.control');
});

test('{{else if other}} keeps the else section scope', async () => {
  const src = '{{else if other}}';
  await assertScope(src, 'else', 'keyword.control');
  await assertScope(src, '{{', 'meta.function.inline.else.handlebars');
});

test('whitespace control on a block: {{~#if x~}} ... {{~/if~}}', async () => {
  await assertScope('{{~#if x~}}', '{{', 'meta.function.block.start.handlebars');
  await assertScope('{{~#if x~}}', '~#', 'keyword.control');
  await assertScope('{{~#if x~}}', '~}}', 'support.constant.handlebars');
  await assertScope('{{~/if~}}', '{{', 'meta.function.block.end.handlebars');
  await assertScope('{{~/if~}}', '~/', 'keyword.control');
  await assertScope('{{~/if~}}', '~}}', 'support.constant.handlebars');
});
