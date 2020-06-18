import { childProcessUtils } from './child-process-utils';

function getGitBranchCurrent(): string {
  const branchs = childProcessUtils.simpleExec('git branch').split('\n');
  const currentBranch = branchs.filter(x => x.startsWith('* '))[0];

  return currentBranch.substring(2);
}

export const gitUtils = {
  getGitBranchCurrent,
}
