/*
* videojs-ga - v0.6.1 - 2017-04-25
* Copyright (c) 2017 Michael Bensoussan
* Licensed MIT
*/
(function() {
  var __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  videojs.plugin('ga', function(options) {
    var adend, adpause, adserror, adskip, adstart, adtimeout, autoLabel, dataSetupOptions, defaultsEventsToTrack, end, ended, error, eventCategory, eventLabel, eventsToTrack, firstplay, fullscreen, getCurrentTime, getCurrentValue, init, interval, isFinite, loaded, parsedOptions, pause, percentsPlayedInterval, percentsPlayedMoments, percentsTracked, play, playing, resize, secondsPlayed, secondsPlayedInterval, secondsPlayedMoments, seekEnd, seekStart, seeking, sendbeacon, startTimeTracking, stopTimeTracking, timeupdate, trackPercent, trackReplaySeconds, trackSeconds, trackSeek, trackingTime, volumeChange,
      _this = this;
    if (options == null) {
      options = {};
    }
    dataSetupOptions = {};
    if (this.options_['data-setup']) {
      parsedOptions = JSON.parse(this.options_['data-setup']);
      if (parsedOptions.ga) {
        dataSetupOptions = parsedOptions.ga;
      }
    }
    defaultsEventsToTrack = ['loaded', 'percentsPlayed', 'secondsPlayed', 'start', 'end', 'seek', 'play', 'pause', 'resize', 'volumeChange', 'error', 'fullscreen', 'adstart', 'adpause', 'adend', 'adskip', 'adtimeout', 'adserror'];
    eventsToTrack = options.eventsToTrack || dataSetupOptions.eventsToTrack || defaultsEventsToTrack;
    eventCategory = options.eventCategory || dataSetupOptions.eventCategory || 'Video';
    autoLabel = options.autoLabel != null ? options.autoLabel : true;
    eventLabel = options.eventLabel || dataSetupOptions.eventLabel;
    percentsPlayedInterval = options.percentsPlayedInterval || dataSetupOptions.percentsPlayedInterval || 10;
    percentsPlayedMoments = options.percentsPlayedMoments || dataSetupOptions.percentsPlayedMoments || [];
    secondsPlayedInterval = options.secondsPlayedInterval || dataSetupOptions.secondsPlayedInterval || 60;
    secondsPlayedMoments = options.secondsPlayedMoments || dataSetupOptions.secondsPlayedMoments || [];
    trackReplaySeconds = options.trackReplaySeconds;
    percentsTracked = [];
    seekStart = seekEnd = 0;
    seeking = false;
    ended = false;
    trackingTime = false;
    secondsPlayed = 0;
    isFinite = void 0;
    trackSeconds = void 0;
    interval = void 0;
    options.debug = options.debug || false;
    init = function() {
      isFinite = Number.isFinite(_this.duration());
      trackSeconds = __indexOf.call(eventsToTrack, 'secondsPlayed') >= 0 && (!isFinite || options.trackFiniteSeconds);
      if (!eventLabel && autoLabel) {
        eventLabel = _this.currentSrc().split('/').slice(-1)[0].replace(/\.(\w{3,4})(\?.*)?$/i, '');
      }
      if (!isFinite && !(options.eventCategory || dataSetupOptions.eventCategory)) {
        eventCategory = 'Stream';
      }
      return startTimeTracking();
    };
    loaded = function() {
      init();
      if (__indexOf.call(eventsToTrack, 'loadedmetadata') >= 0) {
        sendbeacon('loadedmetadata', true);
      }
    };
    timeupdate = function() {
      if (!isFinite) {
        return;
      }
      if (__indexOf.call(eventsToTrack, 'percentsPlayed') >= 0) {
        trackPercent();
      }
      if (__indexOf.call(eventsToTrack, 'seek') >= 0) {
        trackSeek();
      }
    };
    trackPercent = function() {
      var currentTime, duration, percent, percentToTrack, percentsPlayed, _i, _len;
      currentTime = _this.currentTime();
      duration = _this.duration();
      percentsPlayed = Math.round(currentTime / duration * 100);
      percentToTrack = void 0;
      if (!percentsPlayed || __indexOf.call(percentsTracked, percentsPlayed) >= 0) {
        return;
      }
      for (_i = 0, _len = percentsPlayedMoments.length; _i < _len; _i++) {
        percent = percentsPlayedMoments[_i];
        if (percent === percentsPlayed) {
          percentToTrack = percentsPlayed;
        }
      }
      if (percentsPlayedInterval && !(percentsPlayed % percentsPlayedInterval)) {
        percentToTrack = percent = percentsPlayed;
      }
      if (percentToTrack) {
        sendbeacon('percent played', true, percentsPlayed);
        return percentsTracked.push(percentsPlayed);
      }
    };
    trackSeek = function() {
      seekStart = seekEnd;
      seekEnd = getCurrentValue();
      if (Math.abs(seekStart - seekEnd) > 1) {
        seeking = true;
        sendbeacon('seek start', false, seekStart);
        return sendbeacon('seek end', false, seekEnd);
      }
    };
    startTimeTracking = function() {
      var currentTime;
      if (!trackSeconds || trackingTime) {
        return;
      }
      trackingTime = true;
      currentTime = getCurrentTime();
      return interval = setInterval(function() {
        if (!(getCurrentTime() > currentTime)) {
          return;
        }
        secondsPlayed++;
        if (__indexOf.call(secondsPlayedMoments, secondsPlayed) >= 0 || !(secondsPlayed % secondsPlayedInterval)) {
          sendbeacon('loop seconds played', true, 30);
	    sendbeacon(secondsPlayed + ' seconds played', true, 0);
        }
      }, 1000);
    };
    stopTimeTracking = function() {
      clearInterval(interval);
      return trackingTime = false;
    };
    firstplay = function() {
      startTimeTracking();
      if (__indexOf.call(eventsToTrack, 'start') >= 0) {
        return sendbeacon('start', true);
      }
    };
    end = function() {
      ended = true;
      stopTimeTracking();
      if (trackReplaySeconds) {
        secondsPlayed = 0;
      } else {
        trackSeconds = false;
      }
      sendbeacon('end', true);
    };
    play = function() {
      var currentTime;
      startTimeTracking();
      currentTime = getCurrentValue();
      if (currentTime > 0 || __indexOf.call(eventsToTrack, 'start') < 0) {
        sendbeacon('play', true, currentTime);
      }
      if (ended && currentTime === 0 && trackReplaySeconds) {
        sendbeacon('start', true);
      }
      seeking = false;
    };
    playing = function() {
      startTimeTracking();
      seeking = false;
    };
    pause = function() {
      var currentTime, duration;
      stopTimeTracking();
      currentTime = getCurrentValue();
      duration = Math.round(this.duration());
      if (currentTime !== duration && !seeking) {
        sendbeacon('pause', false, currentTime);
      }
    };
    volumeChange = function() {
      var volume;
      volume = this.muted() === true ? 0 : this.volume();
      sendbeacon('volume change', false, volume);
    };
    resize = function() {
      sendbeacon('resize - ' + this.width() + '*' + this.height(), true);
    };
    error = function() {
      var currentTime;
      currentTime = getCurrentValue();
      sendbeacon('error', true, currentTime);
    };
    fullscreen = function() {
      var currentTime;
      currentTime = getCurrentValue();
      if ((typeof this.isFullscreen === "function" ? this.isFullscreen() : void 0) || (typeof this.isFullScreen === "function" ? this.isFullScreen() : void 0)) {
        sendbeacon('enter fullscreen', false, currentTime);
      } else {
        sendbeacon('exit fullscreen', false, currentTime);
      }
    };
    adstart = function() {
      stopTimeTracking();
      if (__indexOf.call(eventsToTrack, 'adstart') >= 0) {
        return sendbeacon('adstart', false, getCurrentValue());
      }
    };
    adpause = function() {
      return sendbeacon('adpause', false);
    };
    adend = function() {
      startTimeTracking();
      return sendbeacon('adend', true);
    };
    adskip = function() {
      return sendbeacon('adskip', false);
    };
    adtimeout = function() {
      return sendbeacon('adtimeout', true);
    };
    adserror = function(data) {
      return sendbeacon('adserror', true, data != null ? data.AdError : void 0);
    };
    getCurrentValue = function() {
      if (isFinite) {
        return getCurrentTime();
      } else {
        return secondsPlayed;
      }
    };
    getCurrentTime = function() {
      return Math.round(_this.currentTime());
    };
    sendbeacon = function(action, nonInteraction, value) {
      var eventFields;
      eventFields = {
        eventCategory: eventCategory,
        eventAction: action,
        nonInteraction: nonInteraction
      };
      if (eventLabel != null) {
        eventFields.eventLabel = eventLabel;
      }
      if (value != null) {
        eventFields.eventValue = value;
      }
      _this.trigger('gaEvent', eventFields);
      if (options.sendGaEventDirectly && window.ga) {
        ga('send', 'event', {
          'eventCategory': eventCategory,
          'eventAction': action,
          'eventLabel': eventLabel,
          'eventValue': value,
          'nonInteraction': nonInteraction
        });
      }
      if (options.debug) {
        console.log(eventFields);
      }
    };
    this.ready(function() {
      this.on('loadedmetadata', loaded);
      this.on('timeupdate', timeupdate);
      this.one('firstplay', firstplay);
      if (__indexOf.call(eventsToTrack, 'end') >= 0) {
        this.on('ended', end);
      }
      if (__indexOf.call(eventsToTrack, 'play') >= 0) {
        this.on('play', play);
      }
      this.on('playing', playing);
      if (__indexOf.call(eventsToTrack, 'pause') >= 0) {
        this.on('pause', pause);
      }
      if (__indexOf.call(eventsToTrack, 'volumeChange') >= 0) {
        this.on('volumechange', volumeChange);
      }
      if (__indexOf.call(eventsToTrack, 'resize') >= 0) {
        this.on('resize', resize);
      }
      if (__indexOf.call(eventsToTrack, 'error') >= 0) {
        this.on('error', error);
      }
      if (__indexOf.call(eventsToTrack, 'fullscreen') >= 0) {
        this.on('fullscreenchange', fullscreen);
      }
      if (__indexOf.call(eventsToTrack, 'adstart') >= 0) {
        this.on('adstart', adstart);
      }
      if (__indexOf.call(eventsToTrack, 'adpause') >= 0) {
        this.on('adpause', adpause);
      }
      if (__indexOf.call(eventsToTrack, 'adend') >= 0) {
        this.on('adend', adend);
      }
      if (__indexOf.call(eventsToTrack, 'adskip') >= 0) {
        this.on('adskip', adskip);
      }
      if (__indexOf.call(eventsToTrack, 'adtimeout') >= 0) {
        this.on('adtimeout', adtimeout);
      }
      if (__indexOf.call(eventsToTrack, 'adserror') >= 0) {
        return this.on('adserror', adserror);
      }
    });
    return {
      'sendbeacon': sendbeacon
    };
  });

}).call(this);
