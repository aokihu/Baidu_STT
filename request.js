const http = require('http');
const { URL } = require('url');

/**
 * 实现got操作
 */
function got(url, headers, postData) {
  return new Promise((resolve, reject) => {
    const options = new URL(url);
    const result = [];
    const req = http.request(options, (res) => {
      res.on('data', chunk => result.push(chunk));
      res.on('end', () => { resolve(result.join('')); });
    });

    req.on('error', reject);
    req.end();
  });
}


/**
 * Module export
 */
module.exports = got;
