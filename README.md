# Sublime Text 2 Handlebars.js bundle

- Colors of Handlebars expressions are selected to be in contrast with the surrounding HTML.
- Handlebars expressions get syntax highlighting in HTML attributes.
- Parameters passed to block expressions get syntax highlighting too.
- Key bindings for `{{! Handlebars comments }}`
- Tab triggers for
  - `if` -> `{{#if }}`
  - `un` -> `{{#unless }}`
  - `each` -> `{{#each }}`
  - `with` -> `{{#with }}`
  - `par` -> `{{> }}` (for partials)
  - `x-temp` -> `<script id="$1" type="text/x-handlebars-template">` (inline script tag in HTML files)

## About Handlebars.js

It's a great JS templating engine, based on [Mustache](http://mustache.github.com/), but adding the ability to precompile templates and to create custom helpers.

Official website: [handlebarsjs.com](http://handlebarsjs.com/)

## Installation

Get it through [Sublime Package Control](http://wbond.net/sublime_packages/package_control).

If you haven't used it yet, just install it from the link above and then:

1. Press Shift + Command (or Control) + P
2. Type "install", to bring up the "Package Control: Install Package" option, and press Enter
3. Look for "Handlebars", and press Enter to install it.
4. Choose "Handlebars" in the bottom right corner with one of your template files open
5. Profit

Package Control will also autoupdate the package from this point on!

## Precompilation

This package does not offer any Handlebars precompilation functionality to keep things simple, but you can use [Guard](https://github.com/guard/guard) (which is a file system watcher) and [Guard-Steering](https://github.com/guard/guard-steering) (a Handlebars precompiler from yours truly) to have all templates precompiled as you save them.

There's also a [Guard package for Sublime](https://github.com/cyphactor/sublime_guard) if you want integration, but I don't personally use this as I'm happy with Guard running in an iTerm window I can access from anywhere.

There are of course Node.js / Grunt based compilers too ([like this](https://npmjs.org/package/grunt-handlebars-js)), but I haven't personally used any yet.

## Credits

Adapted from the great [sublime-text-handlebars](https://github.com/nrw/sublime-text-handlebars) package by Nicholas Westlake.

## License

(The MIT License)

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
