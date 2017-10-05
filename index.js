/**
 * Baidu Speech To Text
 * @author aokihu aokihu@gmail.com
 * @github https://github.com/aokihu/Baidu_STT
 * @license MIT
 * @version 0.0.1
 */

const fs = require('fs');
const EventEmitter = require('events');
const Token = require('./token.js');
const Mic = require('mic');

class BaiduSTT extends EventEmitter {

  /**
   * @constructor
   * @param {string} appId Baidu App ID, you can find it in baidu console
   * @param {string} apiKey App api key
   * @param {string} secretKey App secret key
   */
  constructor({ appId, apiKey, secretKey }){

    super();

    //
    // this._ is private property
    //
    this._ = {
      token: '', /* Baidu service session token */
      status: 'none', /* the status of class, [none, ready, requesting] */
      apiKey, secretKey, appId
    };

    // Init mic
    this.mic = Mic({
      rate: '16000',
      channels: 1,
      debug: false,
      exitOnSilence: 3,
      fileType:'wav'
    });

  }

  /**
   * @public
   * @function init()
   * @description after call this function, it will check local token session,
   *              if the token is null or outdate, it will request new token
   *              from baidu service
   */
  init() {

    const tokenSession = new Token({apiKey: this._.apiKey, secretKey: this._.secretKey});
    tokenSession.on('ready', token => {
      this._.token = token;
      this._.status = 'ready';
      this.emit('ready');
    });
    tokenSession.initToken();

  }

  /**
   * @public
   * @function listen
   * @description Listen for your voice
   */
  listen() {
    const micStream = this.mic.getAudioStream();
    const outputFileStream = fs.createWriteStream('output.wav');
    micStream.pipe(outputFileStream);
    micStream.on('data', console.log);
    micStream.on('silence', () => this.mic.stop())
    this.mic.start();
  }

  _updateVoice(){

  }

}


module.exports = BaiduSTT;
