import * as fs from 'fs';
import prettyBytes from 'pretty-bytes';
import tinify from 'tinify';

tinify.key = process.env.TINIFY_KEY;

function tinifyFileP(filePath: string, savePath: string = null) {
  if (!savePath) {
    savePath = filePath
  }
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, sourceData) => {
      if (err) throw err;
      tinify.fromBuffer(sourceData).toBuffer((err, resultData) => {
        if (err) throw err;

        fs.writeFileSync(savePath, resultData, 'binary');

        const originSize = prettyBytes(sourceData.length);
        const optedSize = prettyBytes(resultData.length);

        resolve({
          originSize,
          optedSize,
        });
      })
    });
  });
}

export const tinifyUtils = {
  tinifyFileP,
}
