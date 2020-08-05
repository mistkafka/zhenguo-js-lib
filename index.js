const fs = require('fs');
const path = require('path');
const shelljs = require('shelljs');
const child_process = require('child_process');
const moment = require('moment');
const csvParse = require('csv-parse/lib/sync');
const R = require('ramda');
const json2xls = require('json2xls');
const tinify = require('tinify');
const prettyBytes = require('pretty-bytes');
const uuidv4 = require('uuid/v4');
const { parse: parseHtml } = require('node-html-parser');

tinify.key = process.env.TINIFY_KEY;


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

function readStdin() {
  return new Promise((resolve, reject) => {
    let stdinStr = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('readable', () => {
      stdinStr += process.stdin.read();
    });

    process.stdin.on('end', () => {
      resolve(stdinStr);
    });
  });
}

function parseLines(content) {
  return content.split('\n').map(x => x.trim()).filter(x => x);
}

function cpImageToAndroidProject(imageDir, androidResDir) {
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

  const reg = /([\w\-]+)@[23]x\.png/i;
  const files = ls(imageDir);
  const pickTargetPng = R.filter(fileName => fileName.match(reg));
  const getImageName = R.map(fileName => fileName.match(reg)[1]);
  const doCpOperator = R.forEach(imageName => {
    sizes.forEach(size => {
      const fileSuffix = size2FileSuffix[size];
      const fileName = `${imageName}${fileSuffix}`;
      const sourcePath = path.join(imageDir, fileName);

      const sizeDir = "drawable-" + size2SizeDirSuffix[size];
      const targetPath = path.join(androidResDir, sizeDir, imageName + '.png');

      const result = shelljs.cp(sourcePath, targetPath);
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
    doCpOperator
  )(files);
}

function tinifyImagesInDirP(dir, muteConsole=false) {
  const files = ls(dir);
  const pngs = files.filter(x => x.endsWith('.png') || x.endsWith('.jpg'));
  const promises = pngs.map(imageName => {
    const filePath = path.join(dir, imageName);
    return tinifyFileP(filePath, filePath, muteConsole);
  });

  return Promise.all(promises);
}

async function tinifyFileSync(filePath, savePath, muteConsole = false) {
  await tinifyFileP(filePath, savePath, muteConsole);
}

function tinifyFileP(filePath, savePath = null, muteConsole = false) {
  if (!savePath) {
    savePath = filePath
  }
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, sourceData) => {
      if (err) throw err;
      tinify.fromBuffer(sourceData).toBuffer((err, resultData) => {
        if (err) throw err;

        fs.writeFileSync(savePath, resultData, 'binary');
        if (!muteConsole) {
          const originSize = prettyBytes(sourceData.length);
          const optedSize = prettyBytes(resultData.length);
          console.log(`tinify file: ${filePath}, from ${originSize} to ${optedSize}, and save to ${savePath}`);
        }
        resolve();
      })
    });
  });
}

function getGitBranchCurrent(pwd='') {
  let cmd = 'git branch';
  if (pwd) {
    cmd = `cd ${pwd} && ${cmd}`
  }
  const branchs = simpleExec(cmd).split('\n');
  const currentBranch = branchs.filter(x => x.startsWith('* '))[0];

  return currentBranch.substring(2);
}

function getGitTags(pwd='', count=20) {
  let cmd = `git describe --tags \`git rev-list --tags --max-count=${count}\``;
  if (pwd) {
    cmd = `cd ${pwd} && ${cmd}`
  }
  return simpleExec(cmd).split('\n').map(x => x.trim()).filter(x => x);
}

function withTmpFilePath(actionFn) {
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

/**
 * alias to clipboardWriteText
 */
function copyToClipboard(content) {
  clipboardWriteText(content)
}

function copyObjToClipboard(obj, indent=4) {
  const content = JSON.stringify(obj, null, indent);
  copyToClipboard(content);
}

function camelCaseToSnakeCase(camelStr) {
  return camelStr[0] + camelStr.substring(1).replace(/[A-Z]/g, x => '_' + x.toLowerCase());
}

function snakeCaseToCamelCase(snakeCase) {
  snakeCase = snakeCase.toLowerCase();
  const parts = snakeCase.split('_');
  return parts.map(x => x[0].toUpperCase() + x.substring(1)).join('');
}

function clipboardWriteText(text) {
  withTmpFilePath((tmpFilePath) => {
    writeContentToFile(tmpFilePath, text, {encoding: 'utf-8'});
    simpleExec(`pbcopy < ${tmpFilePath}`);
  })
}

function clipboardReadText() {
  return simpleExec('pbpaste');
}

function simpleExecAppleScript(appleScript) {
  return withTmpFilePath((tmpFilePath) => {
    writeContentToFile(tmpFilePath, appleScript, { encoding: 'utf8' });
    return simpleExec(`osascript ${tmpFilePath}`);
  });
}

function osxNotification(title, content, subtitle='', sound=false) {
  const parts = [
    `display notification "${content}"`,
    `with title "${title}"`,
  ];
  if (subtitle) {
    parts.push(`subtitle "${subtitle}"`);
  }
  if (sound) {
    parts.push('sound name "Submarine"');
  }

  const script = parts.join(' ');
  simpleExecAppleScript(script);
}


module.exports = {
  simpleExec,
  execP,
  resolveHome,
  loadJson,
  readFileContent,
  writeContentToFile,
  loadCsvAsJson,
  withTmpFilePath,
  tinifyFileSync,
  tinifyFileP,
  convertDatas2Csv,
  getGitBranchCurrent,
  getGitTags,
  copyToClipboard,
  copyObjToClipboard,
  clipboardWriteText,
  clipboardReadText,

  renameFile,
  renameFileByReplace,
  ls,

  R,
  moment,
  json2xls,
  cpImageToAndroidProject,
  shelljs,
  tinifyImagesInDirP,
  camelCaseToSnakeCase,
  parseHtml,
  snakeCaseToCamelCase,
  simpleExecAppleScript,
  osxNotification,
  parseLines,
};
