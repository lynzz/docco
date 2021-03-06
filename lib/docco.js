// Generated by CoffeeScript 1.3.3
(function() {
  var commander, defaults, document, ensureDirectory, exec, ext, fs, generateDocumentation, generateHtml, getLanguage, getResource, highlight, highlightEnd, highlightStart, key, l, languages, parse, path, resolveSource, run, showdown, spawn, template, value, version, _ref, _ref1,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  generateDocumentation = function(source, config, callback) {
    return fs.readFile(source, function(error, buffer) {
      var code, sections;
      if (error) {
        throw error;
      }
      code = buffer.toString();
      sections = parse(source, code);
      return highlight(source, sections, function() {
        generateHtml(source, sections, config);
        return callback();
      });
    });
  };

  parse = function(source, code) {
    var codeText, docsText, hasCode, language, line, lines, save, sections, _i, _len;
    lines = code.split('\n');
    sections = [];
    language = getLanguage(source);
    hasCode = docsText = codeText = '';
    save = function(docsText, codeText) {
      return sections.push({
        docsText: docsText,
        codeText: codeText
      });
    };
    for (_i = 0, _len = lines.length; _i < _len; _i++) {
      line = lines[_i];
      if (line.match(language.commentMatcher) && !line.match(language.commentFilter)) {
        if (hasCode) {
          save(docsText, codeText);
          hasCode = docsText = codeText = '';
        }
        docsText += line.replace(language.commentMatcher, '') + '\n';
      } else {
        hasCode = true;
        codeText += line + '\n';
      }
    }
    save(docsText, codeText);
    return sections;
  };

  highlight = function(source, sections, callback) {
    var language, output, pygments, section, text;
    language = getLanguage(source);
    pygments = spawn('pygmentize', ['-l', language.name, '-f', 'html', '-O', 'encoding=utf-8,tabsize=2']);
    output = '';
    pygments.stderr.on('data', function(error) {
      if (error) {
        return console.error(error.toString());
      }
    });
    pygments.stdin.on('error', function(error) {
      console.error('Could not use Pygments to highlight the source.');
      return process.exit(1);
    });
    pygments.stdout.on('data', function(result) {
      if (result) {
        return output += result;
      }
    });
    pygments.on('exit', function() {
      var fragments, i, section, _i, _len;
      output = output.replace(highlightStart, '').replace(highlightEnd, '');
      fragments = output.split(language.dividerHtml);
      for (i = _i = 0, _len = sections.length; _i < _len; i = ++_i) {
        section = sections[i];
        section.codeHtml = highlightStart + fragments[i] + highlightEnd;
        section.docsHtml = showdown.makeHtml(section.docsText);
      }
      return callback();
    });
    if (pygments.stdin.writable) {
      text = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = sections.length; _i < _len; _i++) {
          section = sections[_i];
          _results.push(section.codeText);
        }
        return _results;
      })();
      pygments.stdin.write(text.join(language.dividerText));
      return pygments.stdin.end();
    }
  };

  generateHtml = function(source, sections, config) {
    var dest, destination, html, title;
    destination = function(filepath) {
      return path.join(config.output, path.basename(filepath, path.extname(filepath)) + '.html');
    };
    title = path.basename(source);
    dest = destination(source);
    html = config.doccoTemplate({
      title: title,
      sections: sections,
      sources: config.sources,
      path: path,
      destination: destination,
      css: path.basename(config.css)
    });
    console.log("docco: " + source + " -> " + dest);
    return fs.writeFileSync(dest, html);
  };

  fs = require('fs');

  path = require('path');

  showdown = require('./../vendor/showdown').Showdown;

  _ref = require('child_process'), spawn = _ref.spawn, exec = _ref.exec;

  commander = require('commander');

  getResource = function(name) {
    var fullPath;
    fullPath = path.join(__dirname, '..', 'resources', name);
    return fs.readFileSync(fullPath).toString();
  };

  languages = JSON.parse(getResource('languages.json'));

  for (ext in languages) {
    l = languages[ext];
    l.commentMatcher = RegExp("^\\s*" + l.symbol + "\\s?");
    l.commentFilter = /(^#![/]|^\s*#\{)/;
    l.dividerText = "\n" + l.symbol + "DIVIDER\n";
    l.dividerHtml = RegExp("\\n*<span\\sclass=\"c1?\">" + l.symbol + "DIVIDER<\\/span>\\n*");
  }

  getLanguage = function(source) {
    return languages[path.extname(source)];
  };

  ensureDirectory = function(dir, callback) {
    return exec("mkdir -p " + dir, function() {
      return callback();
    });
  };

  template = function(str) {
    return new Function('obj', 'var p=[],print=function(){p.push.apply(p,arguments);};' + 'with(obj){p.push(\'' + str.replace(/[\r\t\n]/g, " ").replace(/'(?=[^<]*%>)/g, "\t").split("'").join("\\'").split("\t").join("'").replace(/<%=(.+?)%>/g, "',$1,'").split('<%').join("');").split('%>').join("p.push('") + "');}return p.join('');");
  };

  highlightStart = '<div class="highlight"><pre>';

  highlightEnd = '</pre></div>';

  version = JSON.parse(fs.readFileSync("" + __dirname + "/../package.json")).version;

  defaults = {
    template: "" + __dirname + "/../resources/docco.jst",
    css: "" + __dirname + "/../resources/docco.css",
    output: "docs/"
  };

  run = function(args) {
    if (args == null) {
      args = process.argv;
    }
    commander.version(version).usage("[options] <filePattern ...>").option("-c, --css [file]", "use a custom css file", defaults.css).option("-o, --output [path]", "use a custom output path", defaults.output).option("-t, --template [file]", "use a custom .jst template", defaults.template).parse(args).name = "docco";
    if (commander.args.length) {
      return document(commander.args.slice(), commander);
    } else {
      return console.log(commander.helpInformation());
    }
  };

  document = function(sources, options, callback) {
    var config, doccoStyles, key, m, resolved, src, value, _i, _j, _len, _len1;
    if (options == null) {
      options = {};
    }
    if (callback == null) {
      callback = null;
    }
    config = {};
    for (key in defaults) {
      value = defaults[key];
      config[key] = defaults[key];
    }
    if (key in defaults) {
      for (key in options) {
        value = options[key];
        config[key] = value;
      }
    }
    resolved = [];
    for (_i = 0, _len = sources.length; _i < _len; _i++) {
      src = sources[_i];
      resolved = resolved.concat(resolveSource(src));
    }
    config.sources = resolved.filter(function(source) {
      return getLanguage(source);
    }).sort();
    for (_j = 0, _len1 = resolved.length; _j < _len1; _j++) {
      m = resolved[_j];
      if (__indexOf.call(config.sources, m) < 0) {
        console.log("docco: skipped unknown type (" + m + ")");
      }
    }
    config.doccoTemplate = template(fs.readFileSync(config.template).toString());
    doccoStyles = fs.readFileSync(config.css).toString();
    return ensureDirectory(config.output, function() {
      var files, nextFile;
      fs.writeFileSync(path.join(config.output, path.basename(config.css)), doccoStyles);
      files = config.sources.slice();
      nextFile = function() {
        if ((callback != null) && !files.length) {
          callback();
        }
        if (files.length) {
          return generateDocumentation(files.shift(), config, nextFile);
        }
      };
      return nextFile();
    });
  };

  resolveSource = function(source) {
    var file, file_path, files, regex, regex_str;
    if (!source.match(/([\*\?])/)) {
      return source;
    }
    regex_str = path.basename(source).replace(/\./g, "\\$&").replace(/\*/, ".*").replace(/\?/, ".");
    regex = new RegExp('^(' + regex_str + ')$');
    file_path = path.dirname(source);
    files = fs.readdirSync(file_path);
    return (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = files.length; _i < _len; _i++) {
        file = files[_i];
        if (file.match(regex)) {
          _results.push(path.join(file_path, file));
        }
      }
      return _results;
    })();
  };

  _ref1 = {
    run: run,
    document: document,
    parse: parse,
    resolveSource: resolveSource,
    version: version,
    defaults: defaults,
    languages: languages
  };
  for (key in _ref1) {
    value = _ref1[key];
    exports[key] = value;
  }

}).call(this);
