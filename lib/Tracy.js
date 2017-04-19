'use strict';

const fs = require('fs');
const _merge = require('lodash.merge');
const exceptions = require('./exceptions');

/**
 * debugger module that displays stack traces in readable html
 */
class Tracy {

  constructor() {
    this.enabled = false; // disable by default
    this.environment = process.env.NODE_ENV || 'development';
    this.options = {
      logger: process.stderr.write,
      baseDir: process.cwd(),
      productionErrorMessage: 'Internal Server Error',
      showLinesBeforeError: 10,
      showLinesAfterError: 5,
    };
    this.exceptions = exceptions;
  }

  /**
   * @param {Object} [options]
   */
  enable(options = {}) {
    this.options = _merge(this.options, options);
    this.enabled = true;
  }

  /**
   * @returns {Boolean}
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Create wrapper for route handlers, that automatically catches all thrown exceptions and promise rejections
   * When using promises inside handler, you need to return the Promise from it to allow proper rejection handling
   *
   * @param {Function} callback with `req`, `res` and `next` parameters
   * @returns {Function}
   */
  catcher(callback) {
    return (req, res, next) => {
      Promise
        .resolve()
        .then(() => callback(req, res, next))
        .catch(err => this.errorResponse(req, res, err));
    };
  }

  /**
   * @param {Object} req
   * @param {Object} res
   * @param {Error|Object} [err]
   */
  errorResponse(req, res, err = {}) {
    let code = 500;

    if (err.code && !isNaN(err.code)) {
      code = err.code;
    }

    // Set status code
    res.status(code);

    // Log error to console
    const error = err.constructor ? err.constructor.name : 'Error';
    if (err !== undefined) {
      this.options.logger(err);
    } else {
      this.options.logger(`Sending empty ${code} ("${error}") response`);
    }

    // is browser request?
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    const browser = ua && (ua.includes('mozilla') || ua.includes('chrome') || ua.includes('edge') || ua.includes('webkit'));

    // Only include errors in response if application environment
    // is not set to 'production'.  In production, we shouldn't
    // send back any identifying information about errors.
    let json;
    if (this.getEnvironment() === 'production') {
      if (err.message && err.message.indexOf(' ') === -1) {
        json = {message: err.message};
      } else {
        json = {message: this.options.productionErrorMessage};
      }
    } else if (browser) { // tracy like json response when request accepts text/html
      return res.end(this._generateHtmlError(err, req));
    } else {
      json = {message: err.message, stack: err.stack};

      if (err.previous) {
        json.previous = err.previous;
      }
    }

    res.json(json);
  }

  /**
   * @param {Error} err
   * @param {Object} req
   * @returns {String}
   * @private
   */
  _generateHtmlError(err, req) {
    const error = err.constructor ? err.constructor.name : 'Error';
    let html = fs.readFileSync(__dirname + '/debugger.html').toString('utf8');
    html = html.replace(/\${error}/g, error + (typeof err.code !== 'undefined' ? ` #${err.code}` : ''));
    html = html.replace('${err.code}', err.code);
    html = html.replace('${err.message}', err.message);

    // previous exception
    if (err.previous) {
      html = html.replace('${err.previous}', `<div>Caused by ${err.previous}</div>`);
    } else {
      html = html.replace('${err.previous}', '');
    }

    // get content of originating file
    const rows = err.stack.split('\n').slice(1);
    html = this._processSourceFile(rows, html);

    // prepare stack rows
    let rowsHtml = '';
    rows.forEach(row => {
      row = row.replace('<', '&lt;');
      const file = row.substring(row.indexOf(' (') + 2, row.lastIndexOf(')')).split(':');
      const method = row.substring(row.indexOf('at ') + 3, row.indexOf(' (')) + '()';
      rowsHtml += `<li>${this._processFile(file, method)}</li>`;
    });
    html = html.replace('${rows}', rowsHtml);

    // request headers, route and parameters
    html = this._processRequest(html, req, 'route');
    html = this._processRequest(html, req, 'headers');
    html = this._processRequest(html, req, 'params');

    return html;
  }

  /**
   * @param {String[]} line [file, row, col]
   * @param {String} method
   * @returns {String}
   * @private
   */
  _processFile(line, method = '') {
    if (typeof line[1] === 'undefined') {
      return `<span>node/${line[0]}</span>&nbsp;&nbsp;${method}`;
    }

    const editor = config.has('log.editor') ? config.get('log.editor') : 'editor://open';
    const fileName = line[0].substr(line[0].lastIndexOf('/') + 1);
    let shortIndex = line[0].indexOf(this.options.baseDir);
    const shortIndexEnd = line[0].lastIndexOf('/');

    if (shortIndex === -1) {
      shortIndex = line[0].indexOf('/node_modules');
    }

    if (shortIndex === -1) {
      return `<span>node/${fileName}:${line[1]}</span>&nbsp;&nbsp;${method}`;
    }

    return `<a href="${editor}?file=${encodeURIComponent(line[0])}&amp;line=${line[1]}">...${line[0].substring(shortIndex, shortIndexEnd)}/<b>${fileName}</b>:${line[1]}</a>&nbsp;&nbsp;${method}`;
  }

  /**
   * @param {String[]} rows
   * @param {String} html
   * @return {String}
   * @private
   */
  _processSourceFile(rows, html) {
    // find first file in stack from our app
    const row = rows.find(r => r.includes(this.options.baseDir));
    if (!row) {
      html = html.replace('${source}', '');
      return html.replace('${sourceAnchor}', '');
    }

    const file = row.substring(row.indexOf(' (') + 2, row.lastIndexOf(')')).split(':');
    const line = parseInt(file[1]);
    const before = line - this.options.showLinesBeforeError - 1;
    const after = line + this.options.showLinesAfterError - 1;
    const lines = fs.readFileSync(file[0]).toString('utf8').split('\n').slice(before, after);
    let source = '';
    let i = Math.max(1, line - this.options.showLinesBeforeError);
    lines.forEach(line => {
      line = line.replace('<', '&lt;');
      source += `${i === line ? '<b>' : ''}${i++}. ${line}${i === line + 1 ? '</b>' : ''}\n`;
    });
    html = html.replace('${source}', source);

    return html.replace('${sourceAnchor}', this._processFile(file));
  }

  /**
   * @returns {String}
   */
  getEnvironment() {
    return this.environment;
  }

  /**
   * @param {String} html
   * @param {Object} req
   * @param {String} field
   * @returns {String}
   * @private
   */
  _processRequest(html, req, field) {
    if (Object.keys(req[field]).length > 0) {
      return html.replace(`$\{req.${field}}`, Object.keys(req[field]).map(key => `<tr><th>${key}</th><td>${req[field][key]}</td></tr>`).join('\n'));
    } else {
      return html.replace(`$\{req.${field}}`, `<tr><td><em>empty</em></td></tr>`);
    }
  }
}

module.exports = new Tracy();
