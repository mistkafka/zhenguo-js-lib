import { childProcessUtils } from './child-process-utils';
import { fileUtils } from './file-utils';

function writeText(text: string): void {
  fileUtils.withTmpFilePath((tmpFilePath) => {
    fileUtils.writeFileSync(tmpFilePath, text, {encoding: 'utf-8'});
    childProcessUtils.simpleExec(`pbcopy < ${tmpFilePath}`);
  })
}

function writeObj(obj: any): void {
  const content = JSON.stringify(obj, null, 2);
  writeText(content);
}

function readText(): string {
  return childProcessUtils.simpleExec('pbpaste');
}

function readObj(): any {
  const content = readText();
  try {
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

export const clipboardUtils = {
  writeText,
  writeObj,
  readText,
  readObj,
}
