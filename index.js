/**
 * Baidu Speech To Text
 * @author aokihu aokihu@gmail.com
 * @github https://github.com/aokihu/Baidu_STT
 * @license MIT
 * @version 1.0.8
 */
const http = require('http');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');
const Token = require('./token.js');
const Mic = require('mic');
const fetch = require('little-fetch')
const Detector = require('snowboy').Detector;
const Models = require('snowboy').Models;

const MAX_BUFFER_SIZE = 8192 * 32;
const BDServiceAPIUrl = 'http://vop.baidu.com/server_api/';

// Define the status
const STATUS_NULL   = 0;
const STATUS_READY  = 1;
const STATUS_SLEEP  = 2;
const STATUS_WAKE   = 3;
const STATUS_UPLOAD = 4;
const TOKEN_READY   = 99;

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
   * @param {integer} gain Trigger wake up gain
   * @param {string} hotword The wake up word
   * @param {string} sensitivity wake up sensitivity
   * @param {string} mdlFile The wake up model file, default is './resources/jarvis.pdml',
   *                          you can train yours model on website `snowboy.kitt.ai`
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
    voiceType = 'wav',
    gain = 1.0,
    hotword = '贾维斯',
    sensitivity = '3.9',
    mdlFile = './resources/jarvis.pmdl'
   }) {
    super();

    //
    // this._ is private property
    //
    this._ = {
      token: '', /* Baidu service session token */
      status: STATUS_NULL, /* the status of class, [none, ready, requesting] */
      voiceRate, /* the voice record rate */
      voicePath, /* the voice saved path */
      voiceType, /* the voice saved file type, default is 'pcm' */
      apiKey, /* Baidu service app key, you should fetch it from your baidu console */
      secretKey, /* Baidu service app secret key, you should fetch it from your baidu console */
      appId, /* It's options */
      continual, /* PAUSE OR STOP after recording */
      gain,
      hotword,
      sensitivity,
      mdlFile,
      canStop: false, /* It can stop record */
      buffer: {
        size: 0,
        point: [],
      },
      cuid: 'bdtts_client_' + Date.now(),
      lan: language,
      record: recordVoice
    };

    // Snowboy Models
    this.model = new Models();
    this.model.add({
      file: this._.mdlFile,
      sensitivity: this._.sensitivity,
      hotwords : this._.hotword
    })

    // Snowboy Detector
    this.detector = new Detector({
      resource: "./resources/common.res",
      models: this.model,
      audioGain: this._.gain
    });

    // Process snowboy events
    this.detector.on('silence', this._silence.bind(this));
    this.detector.on('sound', console.log)
    this.detector.on('hotword',this._hotword.bind(this));
    this.detector.on('error', err => this.emit('error', err));

    // Init mic
    this.mic = Mic({
      rate: this._.voiceRate,
      channels: 1,
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
      this._.status = STATUS_READY;
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
    micStream.pipe(this.detector);

    if(this._.record){
      const filename = `output.${this._.voiceType}`;
      const outputFileStream = fs.createWriteStream(path.resolve(this._.voicePath, filename));
      micStream.pipe(outputFileStream);
    }
    setTimeout(() => {
      micStream.on('data', this._sound.bind(this));
    },1000)

    this.mic.start();

    // Set status to sleep
    this._.status = STATUS_SLEEP;
  }

  /**
   * @public
   * @function stop()
   * @description Stop recording
   */
  stop() {
    this.mic.stop();
    this._.status = STATUS_READY;
  }

  /**
   * @private
   * @function _recording(data)
   * @param {Buffer} data voice data
   * @description Allocate memory and save voice data
   */
  _sound(data) {

    if(this._.status === STATUS_WAKE){
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
        this._.status = STATUS_SLEEP;
      }

    }

  }

  /**
   * @private
   * @function do something after record
   */
  _hotword(index,hotword,buffer) {

    if(this._.status === STATUS_SLEEP){
      this.emit('wake', hotword);
      this._.status = STATUS_WAKE;
      setTimeout(() => {this._.canStop = true}, 3000);
    }
  }

  _silence(){
    if(this._.status === STATUS_WAKE && this._.canStop){
      this.mic.pause();
      this._uploadVoice(this._.buffer.point);
      this._.canStop = false;
    }
  }

  /**
   * @private
   * @function uploadVoice()
   * @param {buffer} data voice data
   * @description Upload voice date to baidu STT service
   */
  _uploadVoice() {
    const url = `http://vop.baidu.com/server_api?token=${this._.token}&cuid=${this._.cuid}&lan=${this._.lan}`;

    fetch({
      url,
      method: 'POST',
      headers: {'Content-Type':`audio/wav;rate=${this._.voiceRate}`},
      postData: Buffer.concat(this._.buffer.point)
    })
    .then(data => {
      const parsedData = JSON.parse(data);
      if(parsedData.err_no === 0){
        this.emit('success', parsedData.result);
      }else
      {
        this.emit('fail', parsedData.err_msg);
      }

      // Free buffer
      this._.buffer.point = [];
      this._.buffer.size = 0;

      // Set status to SLEEP
      this._.status = STATUS_SLEEP;
      this.mic.resume();
    })
    .catch(console.log)

    this._.status = STATUS_UPLOAD;
    this.emit('upload');
  }

}


module.exports = BaiduSTT;
