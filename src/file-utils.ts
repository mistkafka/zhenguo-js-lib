import * as fs from 'fs';
import * as path from 'path';
import { pathUtils } from './path-utils';
import uuidv4 from 'uuid/v4';
import csvParse from 'csv-parse/lib/sync';
import shelljs from 'shelljs';


function readFileSync(filePath: string) {
  filePath = pathUtils.resolveHome(filePath);
  return fs.readFileSync(filePath, {encoding: 'utf8'});
}

function writeFileSync(filePath: string, data: any, options = {}) {
  filePath = pathUtils.resolveHome(filePath);
  fs.writeFileSync(filePath, data, {encoding: 'utf8', ...options})
}

function loadJson(filePath: string) {
  const content = readFileSync(filePath);
  return JSON.parse(content);
}

function loadCsv(filePath: string) {
  const content = readFileSync(filePath);

  return csvParse(content, {
    columns: true,
    skip_empty_lines: true
  });
}

function withTmpFilePath(actionFn: (tmpFilePath: string) => any) {
  const TMP_DIR = '/tmp/';
  const tmpFileName = 'zhenguo-js-lib-tmp' + uuidv4() + '.txt';
  const tmpFilePath = path.join(TMP_DIR, tmpFileName);

  const result = actionFn(tmpFilePath);

  if (result instanceof Promise) {
    result.finally(() => {
      shelljs.rm(tmpFilePath);
    })
  } else {
    shelljs.rm(tmpFilePath);
  }

  return result;
}

export const fileUtils = {
  readFileSync,
  writeFileSync,
  loadJson,
  loadCsv,
  withTmpFilePath,
}
