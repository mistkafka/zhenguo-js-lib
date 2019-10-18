const fs = require('fs');
const path = require('path');
const shelljs = require('shelljs');
const child_process = require('child_process');
const moment = require('moment');
const csvParse = require('csv-parse/lib/sync');
const R = require('ramda')
const json2xls = require('json2xls');

function resolveHome(filepath) {
    if (filepath[0] === '~') {
        return path.join(process.env.HOME, filepath.slice(1));
    }
    return filepath;
}

function readFileContent(filePath) {
    filePath = resolveHome(filePath);
    return fs.readFileSync(filePath, {encoding: 'utf8'});
}

function writeContentToFile(filePath, content, options = {}) {
    filePath = resolveHome(filePath);
    fs.writeFileSync(filePath, content, {encoding: 'utf8', ...options})
}


function loadJson(filePath) {
    const content = readFileContent(filePath);
    return JSON.parse(content);
}

function loadCsvAsJson(filePath) {
    const content = readFileContent(filePath);

    return csvParse(content, {
        columns: true,
        skip_empty_lines: true
    });
}

function convertDatas2Csv(items) {
  const keys = Object.keys(items[0]);

  const content = items
    .map(item => {
      return keys
        .map(key => item[key])
        .map(val => (val || '').toString().trim())
        .join(',')
    })
    .join('\n')

  const headerContent = keys.join(',');

  return headerContent + '\n' + content;
}


function renameFile(dir, oldName, newName) {
    dir = resolveHome(dir);
    const oldPath = path.join(dir, oldName);
    const newPath = path.join(dir, newName);
    console.log(`'${oldPath}' --> '${newPath}'`);
    shelljs.mv(oldPath, newPath);
}

function renameFileByReplace(dir, target, replaceWith) {
    dir = resolveHome(dir);
    const fileNames = ls(dir);
    fileNames
        .filter(name => name.includes(target))
        .forEach(name => {
            const newName = name.replace(target, replaceWith);

            renameFile(dir, name, newName);
        });
}


function ls(argStr) {
    const result = shelljs.ls(argStr);
    return result.slice(0, result.length);
}


function simpleExec(cmd, env = null, options = {}) {
    return child_process.execSync(cmd, { encoding: 'utf-8', env, ...options });
}

function execP(cmd, options = {}) {
  const finalOptions = {
    shell: '/bin/bash',
    ...options
  };
  const child = child_process.spawn(cmd, [], finalOptions);

  let stdout = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', data => {
    stdout = stdout + data.toString();
    console.log(data.toLocaleString());
  });

  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', data => {
    stderr = stderr + data.toString();
    console.log(data.toLocaleString());
  });

  return new Promise((resolve, reject) => {
    child.on('close', code => {
      const result = {
        stdout,
        stderr,
        code
      };

      if (code === 0) {
        resolve(result);
      } else {
        reject(result);
      }
    });
  });
}


module.exports = {
  resolveHome,
  loadJson,
  readFileContent,
  writeContentToFile,
  loadCsvAsJson,
  renameFile,
  renameFileByReplace,
  ls,
  simpleExec,
  execP,
  R,
  moment,
  convertDatas2Csv,
  json2xls
}
