'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { lineHasScope } = require('./helpers/grammar');

const COMMENT = 'comment.block.handlebars';

// Each case is [description, source, expectedCommentPerLine].
// expectedCommentPerLine[i] === true means line i+1 should carry a Handlebars
// comment scope. The recurring shape `[..., false]` asserts that the line after
// a comment is NOT swallowed by it — the heart of the whitespace-control bug.
const cases = [
  // Regression: the originally reported bug (microsoft/vscode#320133).
  ['block comment with trailing ~ does not leak to next line',
    '{{!-- This is a comment --~}}\nBut this is not', [true, false]],

  ['plain block comment still closes',
    '{{!-- comment --}}\nnot a comment', [true, false]],

  ['block comment with leading ~',
    '{{~!-- comment --}}\nnot a comment', [true, false]],

  ['block comment with leading and trailing ~',
    '{{~!-- comment --~}}\nnot a comment', [true, false]],

  ['multi-line block comment closing with ~',
    '{{!--\nstill comment\n--~}}\nnot a comment', [true, true, true, false]],

  ['inline comment with trailing ~',
    '{{! comment ~}}\nnot a comment', [true, false]],

  ['inline comment with leading ~',
    '{{~! comment }}\nnot a comment', [true, false]],

  ['plain inline comment still closes',
    '{{! comment }}\nnot a comment', [true, false]],
];

for (const [name, source, expected] of cases) {
  test(name, async () => {
    for (let i = 0; i < expected.length; i++) {
      const lineNo = i + 1;
      const actual = await lineHasScope(source, lineNo, COMMENT);
      assert.equal(
        actual,
        expected[i],
        `line ${lineNo} (${JSON.stringify(source.split('\n')[i])}) ` +
          `should ${expected[i] ? '' : 'NOT '}be a comment`
      );
    }
  });
}
