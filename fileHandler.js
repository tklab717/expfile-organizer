const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

/**
 * 指定されたファイルを新しい場所に移動し、クラウド化する（Windows用）
 * @param {string} src - 移動元のパス
 * @param {string} dest - 移動先のパス
 * @returns {Promise<string>}
 */
function moveAndCloudify(src, dest) {
  return new Promise((resolve, reject) => {
    const destDir = path.dirname(dest);
    // 移動先のディレクトリがなければ作成
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // ファイルを移動
    fs.rename(src, dest, (err) => {
      if (err) return reject(`ファイルの移動に失敗しました: ${err.message}`);

      // Windows でクラウドのみに設定（+U 属性付与）
      if (process.platform === 'win32') {
        exec(`attrib +U "${dest}"`, (err, stdout, stderr) => {
          if (err) return reject(`クラウド化に失敗しました: ${stderr}`);
          resolve('移動およびクラウド化が完了しました。');
        });
      } else {
        resolve('移動完了（クラウド化は非対応OS）');
      }
    });
  });
}

module.exports = { moveAndCloudify };