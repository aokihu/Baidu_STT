/**
 * Baidu token
 * @author aokihu aokihu@gmail.com
 * @github https://github.com/aokihu/Baidu_STT
 * @license MIT
 * @version 0.0.1
 */

const fs = require('fs');
const EventEmitter = require('events');
const path = require('path');
const querystring = require('querystring');
// const got = require('./request.js');
const got = require('little-fetch')

// Token url
const AccessUrl = 'http://openapi.baidu.com/oauth/2.0/token';
const GRANT_TYPE = 'client_credentials';
// Session file
const SessionFile = path.resolve(__dirname, './session.json');
// Session Outdate
const TokenDeadline = 12 * 3600 * 1000;

class Token extends EventEmitter {
  constructor({ apiKey, secretKey }) {
    super();

    this.apiKey = apiKey;
    this.secretKey = secretKey;
  }

  initToken() {
    return new Promise((resolve, reject) => {
      this.vaildToken()
        .then(this.tokenReady.bind(this))
        .catch(() => {
          const params = {
            grant_type: GRANT_TYPE,
            client_id: this.apiKey,
            client_secret: this.secretKey,
          };

          this.requestToken(params)
            .then(this.tokenReady.bind(this))
            .catch(reject);
        });
    });
  }

  tokenReady(token) {
    this.emit('ready', token);
  }
  vaildToken() {
    return new Promise((resolve, reject) => {
      fs.access(SessionFile, fs.R_OK, (err) => {
        if (err) {
          // TODO: 如果没有Session文件，那么返回false
          reject();
        } else {
          // TODO: 如果有Session文件，然后检查是否已经过期
          const { token, timestamp } = JSON.parse(fs.readFileSync(SessionFile));
          const delta = new Date() - new Date(timestamp);
          delta > TokenDeadline ? reject() : resolve(token);
        }
      });
    });
  }

  requestToken(params) {
    // 从百度获取token session
    const url = `${AccessUrl}?${querystring.stringify(params)}`;
    console.log(url)
    return got({url})
      .then((body) => {
        const { access_token: token } = JSON.parse(body);
        return this.saveToken(token);
      })
      .catch(console.error);
  }

  saveToken(token) {
    return new Promise((resolve, reject) => {
      fs.writeFile(
        SessionFile,
        JSON.stringify({ token, timestamp: new Date() }),
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(token);
          }
        },
      );
    });
  }


  /**
   * @function clearToken()
   * @description Delete token session file
   */
  clearToken() {

  }
}


module.exports = Token;
