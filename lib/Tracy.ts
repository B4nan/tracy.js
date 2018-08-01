import { readFileSync } from 'fs';
import { merge, isEmpty } from 'lodash';
import * as exceptions from './exceptions';

/**
 * debugger module that displays stack traces in readable html
 */
export class Tracy {

  private enabled = false; // disable by default
  private options: Options;
  public environment: string;
  public readonly exceptions = exceptions;

  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.options = {
      logger: process.stderr.write,
      baseDir: process.cwd(),
      productionErrorMessage: 'Internal Server Error',
      hideProductionErrorMessage: true,
      showLinesBeforeError: 10,
      showLinesAfterError: 5,
      editor: 'editor://open',
      enableHtmlResponse: true,
    } as Options;
  }

  static enable(options = {} as Options): Tracy {
    const tracy = new Tracy();
    tracy.enable(options);

    return tracy;
  }

  enable(options = {} as Options): void {
    this.options = merge(this.options, options);
    this.enabled = true;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Create wrapper for route handlers, that automatically catches all thrown exceptions and promise rejections
   * When using promises inside handler, you need to return the Promise from it to allow proper rejection handling
   *
   * @param {Function} callback with `req`, `res` and `next` parameters
   */
  catcher(callback: Function): Function {
    return (req: any, res: any, next: Function) => {
      Promise
        .resolve()
        .then(() => callback(req, res, next))
        .catch(err => this.errorResponse(req, res, err || {}));
    };
  }

  errorResponse(req: any, res: any, err: any) {
    let code = 500;

    if (err.code && !isNaN(err.code)) {
      code = err.code;
    }

    res.status(code);
    this.logToConsole(err, code, req);

    // is browser request?
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    const browser = ua && (ua.includes('mozilla') || ua.includes('chrome') || ua.includes('edge') || ua.includes('webkit'));

    // Only include errors in response if application environment
    // is not set to 'production'.  In production, we shouldn't
    // send back any identifying information about errors.
    let json;

    if (this.getEnvironment() === 'production') {
      if (err.message && err.message.indexOf(' ') === -1 && this.options.hideProductionErrorMessage) {
        json = { message: err.message };
      } else {
        json = { message: this.options.productionErrorMessage };
      }
    } else if (browser && this.options.enableHtmlResponse) { // tracy like json response when request accepts text/html
      return res.end(this.generateHtmlError(err, req));
    } else {
      json = { message: err.message, stack: err.stack } as any;

      if (err.previous) {
        json.previous = err.previous;
      }
    }

    if (err.errorCode) {
      json.code = err.errorCode;
    }

    if (err.data) {
      json.data = err.data;
    }

    res.json(json);
  }

  private generateHtmlError(err: exceptions.LogicalException | Error | any, req: any): string {
    let html = readFileSync(__dirname + '/../debugger.html').toString('utf8');
    html = html.replace(/\${error}/g, err.constructor.name + (typeof err.code !== 'undefined' ? ` #${err.code}` : ''));
    html = html.replace('${err.code}', err.code);
    html = html.replace(/\${err.message}/g, err.message);

    // previous exception
    if (err.previous) {
      html = html.replace('${err.previous}', `<div>Caused by ${err.previous}</div>`);
    } else {
      html = html.replace('${err.previous}', '');
    }

    html = this.processObject(html, err, 'err', 'data');

    // get content of originating file
    const rows = err.stack.split('\n').slice(1);
    html = this.processSourceFile(rows, html);

    // prepare stack rows
    let rowsHtml = '';
    rows.forEach((row: string) => {
      row = row.replace('<', '&lt;');
      const file = row.substring(row.indexOf(' (') + 2, row.lastIndexOf(')')).split(':');
      const method = row.substring(row.indexOf('at ') + 3, row.indexOf(' (')) + '()';
      rowsHtml += `<li>${this.processFile(file, method)}</li>`;
    });
    html = html.replace('${rows}', rowsHtml);

    // request headers, route and parameters
    html = this.processObject(html, req, 'req', 'route');
    html = this.processObject(html, req, 'req', 'headers');
    html = this.processObject(html, req, 'req', 'params');

    html = this.createFooter(html, req);

    return html;
  }

  /**
   * line array items are [file, row, col]
   */
  private processFile(line: string[], method = '') {
    if (typeof line[1] === 'undefined') {
      return `<span>node/${line[0]}</span>&nbsp;&nbsp;${method}`;
    }

    const editor = this.options.editor;
    const fileName = line[0].substr(line[0].lastIndexOf('/') + 1);
    let shortIndex = line[0].indexOf(this.options.baseDir);
    const shortIndexEnd = line[0].lastIndexOf('/');

    if (shortIndex === -1) {
      shortIndex = line[0].indexOf('/node_modules');
    }

    if (shortIndex === -1) {
      return `<span>node/${fileName}:${line[1]}</span>&nbsp;&nbsp;${method}`;
    }

    shortIndex += this.options.baseDir.length;

    return `<a href="${editor}?file=${encodeURIComponent(line[0])}&amp;line=${line[1]}">...${line[0].substring(shortIndex, shortIndexEnd)}/<b>${fileName}</b>:${line[1]}</a>&nbsp;&nbsp;${method}`;
  }

  private processSourceFile(rows: string[], html: string): string {
    // find first file in stack from our app
    const row = rows.find(r => r.includes(this.options.baseDir));
    if (!row) {
      html = html.replace('${source}', '');
      return html.replace('${sourceAnchor}', '');
    }

    let file;
    if (row.indexOf(' (') !== -1) {
      // format of row: '    at Server.<anonymous> (/Users/lukas/Workspace/quest-api/src/core/Middleware.ts:39:44)'
      file = row.substring(row.indexOf(' (') + 2, row.lastIndexOf(')')).split(':');
    } else {
      // format of row: '     at /Users/lukas/Workspace/quest-api/src/core/Middleware.ts:39:44'
      file = row.substring(row.indexOf('/')).split(':');
    }

    const sourceLine = parseInt(file[1]);
    const before = sourceLine - this.options.showLinesBeforeError - 1;
    const after = sourceLine + this.options.showLinesAfterError - 1;
    const lines = readFileSync(file[0]).toString('utf8').split('\n').slice(before, after);
    let source = '';
    let i = Math.max(1, sourceLine - this.options.showLinesBeforeError);
    lines.forEach(line => {
      line = line.replace('<', '&lt;');
      source += `${i === sourceLine ? '<b>' : ''}${i++}. ${line}${i === sourceLine + 1 ? '</b>' : ''}\n`;
    });
    html = html.replace('${source}', source);

    return html.replace('${sourceAnchor}', this.processFile(file));
  }

  getEnvironment(): string {
    return this.environment;
  }

  private processObject(html: string, obj: any, objName: string, field: string): string {
    if (obj[field] && Object.keys(obj[field]).length > 0) {
      return html.replace(`$\{${objName}.${field}}`, Object.keys(obj[field]).map(key => `<tr><th>${key}</th><td>${obj[field][key]}</td></tr>`).join('\n'));
    } else {
      return html.replace(`$\{${objName}.${field}}`, `<tr><td><em>empty</em></td></tr>`);
    }
  }

  private createFooter(html: string, req: any): string {
    const packageJson = require('../package.json');
    html = html.replace('${now}', '' + new Date());
    html = html.replace(/\${link}/g, (req.headers['x-forwarded-host'] || req.headers['host']) + req.url);
    html = html.replace('${tracy.version}', packageJson.version);
    html = html.replace('${node.version}', process.versions.node);
    html = html.replace('${node.arch}', process.arch);
    html = html.replace('${node.platform}', process.platform);

    return html;
  }

  private logToConsole(err: any, code: number, req: any) {
    const dumpData = !(err instanceof exceptions.LogicalException) || code >= 500;

    // find the first line with app code that caused the error
    const stack = (err && err.stack) ? err.stack.split('\n') : new Error().stack.split('\n').slice(2);
    const line = stack.find((l: string) => l.includes(this.options.baseDir) && !l.includes(this.options.baseDir + '/node_modules'));

    let error = err && err.constructor.name;
    const info = req.url + (req.user && req.user.email ? `, ${req.user.email}` : '');

    if (err !== undefined && dumpData) {
      if (line && err.stack) {
        const stack = err.stack.split('\n');
        const i = stack.findIndex((l: string) => l === line);

        if (i >= 0) {
          stack[i] = stack[i].replace('   at', '-> at');
        }

        err.stack = stack.join('\n');
      }

      this.options.logger(`Sending ${code} ("${error}") [${info}]:\n${err.stack || err}`);
    } else {
      error += err && err.message ? ': ' + err.message : '';
      this.options.logger(`Sending empty ${code} ("${error}") [${info}]${err && !isEmpty(err.data) ? '\n' + err.data : ''}`);

      if (line) {
        this.options.logger(` \\_ ${line.trim()}`);
      }
    }
  }

}

export interface Options {
  logger: Function;
  baseDir: string;
  productionErrorMessage: string;
  hideProductionErrorMessage: boolean;
  showLinesBeforeError: number;
  showLinesAfterError: number;
  editor: string;
  enableHtmlResponse: boolean;
}
