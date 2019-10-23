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

function moveImageToAndroidProject(imageDir, androidResDir) {
  imageDir = resolveHome(imageDir);
  androidResDir = resolveHome(androidResDir);

  const sizes = [1, 2, 3];
  const size2FileSuffix = {
    1: ".png",
    2: "@2x.png",
    3: "@3x.png",
  };
  const size2SizeDirSuffix = {
    1: "mdpi",
    2: "xhdpi",
    3: "xxhdpi",
  };

  const reg = /(\w+)@[23]x\.png/i;
  const files = ls(imageDir);
  const pickTargetPng = R.filter(fileName => fileName.match(reg));
  const getImageName = R.map(fileName => fileName.match(reg)[1]);
  const doMoveOperator = R.forEach(imageName => {
    sizes.forEach(size => {
      const fileSuffix = size2FileSuffix[size];
      const fileName = `${imageName}${fileSuffix}`;
      const sourcePath = path.join(imageDir, fileName);

      const sizeDir = "drawable-" + size2SizeDirSuffix[size];
      const targetPath = path.join(androidResDir, sizeDir, imageName + '.png');

      const result = shelljs.mv(sourcePath, targetPath);
      if (result.stderr) {
        console.log(`'${sourcePath}' -> ${targetPath}, failed`);
      } else {
        console.log(`'${sourcePath}' -> ${targetPath}, success`);
      }
    });
  });

  R.pipe(
    pickTargetPng,
    getImageName,
    R.uniq,
    doMoveOperator
  )(files);
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
  json2xls,
  moveImageToAndroidProject,
};
