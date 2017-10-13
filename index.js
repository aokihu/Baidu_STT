/**
 * Baidu Speech To Text
 * @author aokihu aokihu@gmail.com
 * @github https://github.com/aokihu/Baidu_STT
 * @license MIT
 * @version 1.0.10
 */
const http = require('http');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');
const Token = require('./token.js');
const Mic = require('mic');
const Detector = require('snowboy').Detector;
const Models = require('snowboy').Models;
const fetch = require('little-fetch')

const MAX_BUFFER_SIZE = 8192 * 32;
const BDServiceAPIUrl = 'http://vop.baidu.com/server_api/';

/**
 * Define statusl constant
 */
const STAT_NULL = 0;
const STAT_READY = 1;
const STAT_SLEEP = 2;
const STAT_WAKE_UP = 3;
const STAT_LISTENING = 4;
const STAT_UPLOAD = 5;

/**
 * @class BaiduSTT
 */
class BaiduSTT extends EventEmitter {
  /**
   * @constructor
   * @param {string} appId Baidu App ID, you can find it in baidu console
   * @param {string} apiKey App api key
   * @param {string} secretKey App secret key
   * @param {string} language Choose your language, default is 'zh'
   * @param {boolean} recordVoice Whether save the voice
   * @param {string} hotwords Hot word
   * @param {string} sensitivity Snowboy sensitivity
   * @param {string} modelFile Snowboy hot word model file
   * @param {number} gain Snowboy gain
   * @param {boolean} continual If is 'true' it will pause, 'false' is stop recording
   * @param {string} voiceRate Recoding voice rate, you can set '16000' OR '8000', but '16000' maybe is the only rate with my test
   * @param {string} voicePath Voice saved path, default is current folder
   * @param {string} voiceType Voice type, default is 'wav'
   * @param {boolean} debug Show debug information
   * @param {number} silenceDelay The delay of silence after speak command, default is 2s
   */
  constructor({
    appId,
    apiKey,
    secretKey,
    language='zh',
    recordVoice = false,
    debug = false,
    continual = false,
    modelFile = './resources/Alexa.pmdl',
    sensitivity = '0.5',
    gain = 2.0,
    silenceDelay = 2000,
    hotwords = "Alexa",
    voicePath = './',
    voiceRate = '16000',
    voiceType = 'wav' }) {
    super();

    //
    // this._ is private property
    //
    this._ = {
      token: '', /* Baidu service session token */
      status: STAT_NULL, /* the status of class, [none, ready, requesting] */
      voiceRate, /* the voice record rate */
      voicePath, /* the voice saved path */
      voiceType, /* the voice saved file type, default is 'pcm' */
      apiKey, /* Baidu service app key, you should fetch it from your baidu console */
      secretKey, /* Baidu service app secret key, you should fetch it from your baidu console */
      appId, /* It's options */
      continual, /* PAUSE OR STOP after recording */
      modelFile,
      hotwords,
      sensitivity,
      debug,
      silenceDelay,
      exitOnSilence: 3, /* Mic delay emit silence signal */
      canStop: false, /* It can stop record */
      buffer: {
        size: 0,
        point: [],
      },
      cuid: 'aokihu_client_' + Date.now(),
      lan: language,
      record: recordVoice
    };

    // Use continal model,
    // you can speak hot word to wake up
    if(this._.continual) {
      // Snowboy Model
      this.model = new Models();
      this.model.add({
        file: this._.modelFile,
        sensitivity: this._.sensitivity,
        hotwords : this._.hotwords
      });
    
      // Snowboy Detector
      this.detector = new Detector({
        resource: "./resources/common.res",
        models: this.model,
        audioGain: this._.gain
      });

      this._.exitOnSilence = 0;
    }
  
    // Init mic
    this.mic = Mic({
      rate: this._.voiceRate,
      channels: 1,
      debug: this._.debug,
      exitOnSilence: this._.exitOnSilence,
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
    tokenSession.once('ready', (token) => {
      this._.token = token;
      this._.status = 'ready';
      this.emit('ready');
      this._.status = STAT_READY; // SET STATUS = READY
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

    // Save to file
    if(this._.record){
      this._recordToFile(micStream);
    }

    // Set snowboy to listen hot word
    if(this._.continual){
      this.detector.on('hotword', this._wakeup.bind(this));
      this.detector.on('sound', this._listening.bind(this));
      this.detector.on('silence', this._afterRecord.bind(this));
      micStream.pipe(this.detector);
      this._.status = STAT_SLEEP;
      this.emit('sleep');
    } else {
      micStream.on('startComplete', this._afterStart.bind(this));
      micStream.on('data', this._recording.bind(this));
      micStream.on('silence', this._afterRecord.bind(this));
      this._.status = STAT_LISTENING;
    }
    
    // start recording
    this.mic.start();
  }

  /**
   * @private
   * @function _recordToFile()
   * @param {Stream} inputStream mic stream
   * @description Save voice wave data to file
   */
  _recordToFile(inputStream){
    const filename = `output.${this._.voiceType}`;
    const outputFileStream = fs.createWriteStream(path.resolve(this._.voicePath, filename));
    inputStream.pipe(outputFileStream);
  }

  /**
   * @private
   * @function _wakeup
   * @param {number} index 
   * @param {string} hotword 
   * @param {Buffer} buffer 
   */
  _wakeup(index, hotword, buffer){
    console.log('WAKEUP')
    this.emit('wakeup', hotword);
    setTimeout(() => { this._.canStop = true; }, this._.silenceDelay); 
  }

  /**
   * @private
   * @function _afterStart()
   * @description it will delay 3s to stop record
   */
  _afterStart() {
    this.emit('start');
    this.emit('begin');
    setTimeout(() => { this._.canStop = true; }, this.silenceDelay);
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
   * @param {Buffer} buffer voice buffer data
   */
  _listening(buffer){
    console.log('SOUND')
  }

  /**
   * @private
   * @function do something after record
   */
  _afterRecord() {

    console.log('SILENCE')

    if (this._.canStop) {
      if(this._.continual){
        
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

    const url = `http://vop.baidu.com/server_api?token=${this._.token}&cuid=${this._.cuid}&lan=${this._.lan}`;

    fetch({
      url,
      method: 'POST',
      headers: {
        'Content-Type':`audio/wav;rate=${this._.voiceRate}`
      },
      postData:data
    })
    .then(data => {
      const parsedData = JSON.parse(data);
      if(parsedData.err_no === 0){
        this.emit('success', parsedData.result);
      }else
      {
        this.emit('fail', parsedData.err_msg);
      }
    })
    .catch(console.log)


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
