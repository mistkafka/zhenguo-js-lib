import * as path from 'path';

const resolveHome = (filePath: string) => {
  if (filePath[0] === '~') {
    return path.join(process.env.HOME, filePath.slice(1));
  }
  return filePath;
}

export const pathUtils = {
  resolveHome,
}
