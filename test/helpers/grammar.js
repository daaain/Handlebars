'use strict';

// Test helper that loads the Handlebars TextMate grammar and tokenizes text
// using the exact engine VS Code uses: vscode-textmate (the tokenizer) driven
// by vscode-oniguruma (the Oniguruma regex engine). TextMate grammars rely on
// Oniguruma regex semantics rather than JavaScript's RegExp, so this is the
// only faithful way to assert what VS Code actually highlights.

const fs = require('fs');
const path = require('path');
const oniguruma = require('vscode-oniguruma');
const vsctm = require('vscode-textmate');

const GRAMMAR_PATH = path.join(__dirname, '..', '..', 'grammars', 'Handlebars.json');
const SCOPE_NAME = 'text.html.handlebars';

const onigLib = oniguruma
  .loadWASM(
    fs.readFileSync(path.join(require.resolve('vscode-oniguruma'), '..', 'onig.wasm')).buffer
  )
  .then(() => ({
    createOnigScanner: (patterns) => new oniguruma.OnigScanner(patterns),
    createOnigString: (s) => new oniguruma.OnigString(s),
  }));

// External scopes the grammar includes for embedded languages. VS Code ships
// these grammars; this repo does not. Returning `null` for them leaves the
// include unresolved, which silently breaks the *enclosing* rule from compiling
// (e.g. the YAML front-matter rule, whose body includes source.yaml). We resolve
// them to an empty stub so the include becomes a harmless no-op. (Handlebars'
// own HTML highlighting comes from its internal `html_tags` rules, not from
// text.html.basic, so stubbing loses no coverage here.) Keep this list in sync
// with the external `"include"` references in grammars/Handlebars.json.
const STUBBED_SCOPES = new Set([
  'text.html.basic',
  'source.css',
  'source.js',
  'source.yaml',
]);

const registry = new vsctm.Registry({
  onigLib,
  loadGrammar: (scopeName) => {
    if (scopeName === SCOPE_NAME) {
      return Promise.resolve(
        vsctm.parseRawGrammar(fs.readFileSync(GRAMMAR_PATH, 'utf8'), GRAMMAR_PATH)
      );
    }
    if (STUBBED_SCOPES.has(scopeName)) {
      return Promise.resolve({ scopeName, patterns: [] });
    }
    // Fail fast on anything else: an unrecognised scope means a typo or a newly
    // introduced external include that should be reviewed and added above,
    // rather than silently stubbed away.
    throw new Error(
      `Unexpected grammar scope requested: ${JSON.stringify(scopeName)}. ` +
        `Add it to STUBBED_SCOPES if it is a known embedded-language include.`
    );
  },
});

let grammarPromise;
function loadGrammar() {
  if (!grammarPromise) grammarPromise = registry.loadGrammar(SCOPE_NAME);
  return grammarPromise;
}

// Tokenize multi-line source, threading the rule stack line-to-line so that
// multi-line constructs (e.g. block comments) are tracked correctly. Returns an
// array of lines, each an array of { text, scopes } tokens.
async function tokenizeLines(source) {
  const grammar = await loadGrammar();
  let ruleStack = vsctm.INITIAL;
  // Feed each line WITHOUT its terminator, exactly as VS Code drives the
  // tokenizer: `$` anchors match end-of-string and `\n` is never present. Any
  // grammar rule that literally requires `\n` is therefore inert here, just as
  // it is in VS Code — so the tests exercise real editor behaviour.
  return source.split('\n').map((line) => {
    const result = grammar.tokenizeLine(line, ruleStack);
    ruleStack = result.ruleStack;
    return result.tokens.map((t) => ({
      text: line.substring(t.startIndex, t.endIndex),
      scopes: t.scopes,
    }));
  });
}

// Convenience: does any token on the given line carry a scope containing
// `scopeFragment`? Line numbers are 1-based to match editor gutters.
async function lineHasScope(source, lineNumber, scopeFragment) {
  const lines = await tokenizeLines(source);
  const tokens = lines[lineNumber - 1] || [];
  return tokens.some((tok) => tok.scopes.some((s) => s.includes(scopeFragment)));
}

// Flatten all tokens of a source into a single list (handy for asserting on a
// specific piece of text regardless of which line it lands on).
async function allTokens(source) {
  const lines = await tokenizeLines(source);
  return lines.flat();
}

// Return the scope stack of the first token whose text exactly equals `text`.
// Throws if no such token exists, so a typo in the expected text fails loudly
// rather than silently passing.
async function scopesOf(source, text) {
  const tok = (await allTokens(source)).find((t) => t.text === text);
  if (!tok) {
    throw new Error(`no token with text ${JSON.stringify(text)} in ${JSON.stringify(source)}`);
  }
  return tok.scopes;
}

module.exports = {
  loadGrammar,
  tokenizeLines,
  allTokens,
  scopesOf,
  lineHasScope,
  SCOPE_NAME,
  GRAMMAR_PATH,
};
