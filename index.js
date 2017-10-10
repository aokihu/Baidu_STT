/**
 * Baidu Speech To Text
 * @author aokihu aokihu@gmail.com
 * @github https://github.com/aokihu/Baidu_STT
 * @license MIT
 * @version 1.0
 */
const { URL } = require('url');
const http = require('http');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');
const Token = require('./token.js');
const Mic = require('mic');

const MAX_BUFFER_SIZE = 8192 * 32;
const BDServiceAPIUrl = 'http://vop.baidu.com/server_api/';

class BaiduSTT extends EventEmitter {
  /**
   * @constructor
   * @param {string} appId Baidu App ID, you can find it in baidu console
   * @param {string} apiKey App api key
   * @param {string} secretKey App secret key
   * @param {string} language Choose your language, default is 'zh'
   * @param {boolean} recordVoice Whether save the voice
   * @param {boolean} continual If is 'true' it will pause, 'false' is stop recording
   * @param {stirng} voiceRate Recoding voice rate, you can set '16000' OR '8000', but '16000' maybe is the only rate with my test
   * @param {string} voicePath Voice saved path, default is current folder
   * @param {string} voiceType Voice type, default is 'wav'
   */
  constructor({
    appId,
    apiKey,
    secretKey,
    language='zh',
    recordVoice = false,
    continual = false,
    voicePath = './',
    voiceRate = '16000',
    voiceType = 'wav' }) {
    super();

    //
    // this._ is private property
    //
    this._ = {
      token: '', /* Baidu service session token */
      status: 'none', /* the status of class, [none, ready, requesting] */
      voiceRate, /* the voice record rate */
      voicePath, /* the voice saved path */
      voiceType, /* the voice saved file type, default is 'pcm' */
      apiKey, /* Baidu service app key, you should fetch it from your baidu console */
      secretKey, /* Baidu service app secret key, you should fetch it from your baidu console */
      appId, /* It's options */
      continual, /* PAUSE OR STOP after recording */
      canStop: false, /* It can stop record */
      buffer: {
        size: 0,
        point: [],
      },
      cuid: 'bdtts_client_' + Date.now(),
      lan: language,
      record: recordVoice
    };

    // Init mic
    this.mic = Mic({
      rate: this._.voiceRate,
      channels: 1,
      debug: false,
      exitOnSilence: 3,
      fileType: this._.voiceType,
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
    const tokenSession = new Token({ apiKey: this._.apiKey, secretKey: this._.secretKey });
    tokenSession.on('ready', (token) => {
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

    if(this._.record){
      const filename = `output.${this._.voiceType}`;
      const outputFileStream = fs.createWriteStream(path.resolve(this._.voicePath, filename));
      micStream.pipe(outputFileStream);
    }

    micStream.on('startComplete', this._afterStart.bind(this));
    micStream.on('resumeComplete', this._afterStart.bind(this));
    micStream.on('data', this._recording.bind(this));
    micStream.on('silence', this._afterRecord.bind(this));

    this.mic.start();

  }


  /**
   * @private
   * @function _afterStart()
   * @description it will delay 3s to stop record
   */
  _afterStart() {
    this.emit('start');
    this.emit('begin');
    setTimeout(() => { this._.canStop = true; }, 3000);
  }

  /**
   * @private
   * @function _recording(data)
   * @param {Buffer} data voice data
   * @description Allocate memory and save voice data
   */
  _recording(data) {

    // Check buffer size
    // if size is lager than MAX_BUFFER_SIZE
    // free buffer and set buffer size to zero
    if(MAX_BUFFER_SIZE > this._.buffer.size)
    {
      this._.buffer.size += data.byteLength;
      this._.buffer.point.push(data);
    }else{
      this._.buffer.point = [];
      this._.buffer.size = 0;
      this.emit('timeout');
    }

    this.emit('listening');
  }

  /**
   * @private
   * @function do something after record
   */
  _afterRecord() {

    if (this._.canStop) {
      if(this._.continual){
        this.mic.pause()
        this._.status = 'pause';
        this._.canStop = true;
      }else{
        this.mic.stop();
        this._.status = 'stop';
        this._.canStop = false;
      }

      const buffer = Buffer.concat(this._.buffer.point, this._.buffer.size);

      this.emit('stop');

      this._uploadVoice(buffer);

      // Free buffer
      this._.buffer.point = [];
      this._.buffer.size = 0;
    }

  }

  /**
   * @private
   * @function uploadVoice()
   * @param {buffer} data voice data
   * @description Upload voice date to baidu STT service
   */
  _uploadVoice(data) {

    // construct request options
    const options = {
      protocol:'http:',
      method:'POST',
      hostname:'vop.baidu.com',
      path:`/server_api?token=${this._.token}&cuid=${this._.cuid}&lan=${this._.lan}`
    }

    const client = http.request(options, (res) => {
      res.setEncoding('utf8');
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        const parsedData = JSON.parse(rawData);

        if(parsedData.err_no === 0){
          this.emit('success', parsedData.result);
        }else
        {
          this.emit('fail', parsedData.err_msg);
        }

      });
    });

    client.setHeader('Content-Type', 'audio/wav;rate='+this._.voiceRate);
    client.write(data);
    client.end();

    this.emit('upload');

    if(this._.continual)
    {
      setTimeout(()=>{
        this.mic.resume();
      }, 1000)
    }
  }

}


module.exports = BaiduSTT;
