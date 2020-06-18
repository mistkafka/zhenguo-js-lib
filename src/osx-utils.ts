import { childProcessUtils } from './child-process-utils';
import { fileUtils } from './file-utils';

function simpleExecAppleScript(appleScript: string) {
  return fileUtils.withTmpFilePath((tmpFilePath) => {
    fileUtils.writeFileSync(tmpFilePath, appleScript, { encoding: 'utf8' });
    return childProcessUtils.simpleExec(`osascript ${tmpFilePath}`);
  });
}

function osxNotification(title: string, content: string, subtitle= '', sound= false) {
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
