import * as child_process from 'child_process';
import ProcessEnv = NodeJS.ProcessEnv;


function simpleExec(cmd: string, env: ProcessEnv = null, options = {}) {
  return child_process.execSync(cmd, { encoding: 'utf-8', env, ...options });
}


function execP(cmd: string, options = {}) {
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

export const childProcessUtils = {
  simpleExec,
  execP,
}
