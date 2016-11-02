/*
* videojs-ga - v0.4.2 - 2016-11-02
* Copyright (c) 2016 Michael Bensoussan
* Licensed MIT
*/
(function() {
  var __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  videojs.plugin('ga', function(options) {
    var autoLabel, dataSetupOptions, defaultsEventsToTrack, end, error, eventCategory, eventLabel, eventsToTrack, firstplay, fullscreen, getCurrentTime, getCurrentValue, init, interval, isFinite, loaded, parsedOptions, pause, percentsAlreadyTracked, percentsPlayedInterval, play, playing, resize, secondsPlayed, secondsPlayedInterval, secondsPlayedSingleIntervals, seekEnd, seekStart, seeking, sendbeacon, startTimeTracking, stopTimeTracking, timeupdate, trackSeconds, trackingTime, volumeChange,
      _this = this;
    if (options == null) {
      options = {};
    }
    dataSetupOptions = {};
    if (this.options()["data-setup"]) {
      parsedOptions = JSON.parse(this.options()["data-setup"]);
      if (parsedOptions.ga) {
        dataSetupOptions = parsedOptions.ga;
      }
    }
    defaultsEventsToTrack = ['loaded', 'percentsPlayed', 'start', 'end', 'seek', 'play', 'pause', 'resize', 'volumeChange', 'error', 'fullscreen'];
    eventsToTrack = options.eventsToTrack || dataSetupOptions.eventsToTrack || defaultsEventsToTrack;
    eventCategory = options.eventCategory || dataSetupOptions.eventCategory || 'Video';
    autoLabel = options.autoLabel != null ? options.autoLabel : true;
    eventLabel = options.eventLabel || dataSetupOptions.eventLabel;
    percentsPlayedInterval = options.percentsPlayedInterval || dataSetupOptions.percentsPlayedInterval;
    secondsPlayedInterval = options.secondsPlayedInterval || dataSetupOptions.secondsPlayedInterval;
    secondsPlayedSingleIntervals = options.secondsPlayedSingleIntervals || dataSetupOptions.secondsPlayedSingleIntervals;
    percentsAlreadyTracked = [];
    seekStart = seekEnd = 0;
    seeking = false;
    trackingTime = false;
    secondsPlayed = 0;
    isFinite = void 0;
    trackSeconds = void 0;
    interval = void 0;
    options.debug = options.debug || false;
    init = function() {
      isFinite = Number.isFinite(_this.duration());
      trackSeconds = (secondsPlayedInterval || Array.isArray(secondsPlayedSingleIntervals)) && (!isFinite || options.trackFiniteSeconds);
      if (!eventLabel && autoLabel) {
        eventLabel = _this.currentSrc().split("/").slice(-1)[0].replace(/\.(\w{3,4})(\?.*)?$/i, '');
      }
      if (!isFinite && !(options.eventCategory || dataSetupOptions.eventCategory)) {
        eventCategory = 'Stream';
      }
      return startTimeTracking();
    };
    loaded = function() {
      init();
      if (__indexOf.call(eventsToTrack, "loadedmetadata") >= 0) {
        sendbeacon('loadedmetadata', true);
      }
    };
    timeupdate = function() {
      var currentTime, duration, percent, percentPlayed, _i;
      if (!isFinite) {
        return;
      }
      currentTime = getCurrentValue();
      duration = Math.round(this.duration());
      percentPlayed = Math.round(currentTime / duration * 100);
      if (percentsPlayedInterval) {
        for (percent = _i = 0; _i <= 99; percent = _i += percentsPlayedInterval) {
          if (percentPlayed >= percent && __indexOf.call(percentsAlreadyTracked, percent) < 0) {
            if (__indexOf.call(eventsToTrack, "start") >= 0 && percent === 0 && percentPlayed > 0) {
              sendbeacon('start', true);
            } else if (__indexOf.call(eventsToTrack, "percentsPlayed") >= 0 && percentPlayed !== 0) {
              sendbeacon('percent played', true, percent);
            }
            if (percentPlayed > 0) {
              percentsAlreadyTracked.push(percent);
            }
          }
        }
      }
      if (__indexOf.call(eventsToTrack, "seek") >= 0) {
        seekStart = seekEnd;
        seekEnd = currentTime;
        if (Math.abs(seekStart - seekEnd) > 1) {
          seeking = true;
          sendbeacon('seek start', false, seekStart);
          sendbeacon('seek end', false, seekEnd);
        }
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
        if (__indexOf.call(secondsPlayedSingleIntervals, secondsPlayed) >= 0 || !(secondsPlayed % secondsPlayedInterval)) {
          sendbeacon('seconds played', true, secondsPlayed);
        }
      }, 1000);
    };
    stopTimeTracking = function() {
      clearInterval(interval);
      return trackingTime = false;
    };
    firstplay = function() {
      startTimeTracking();
      if (__indexOf.call(eventsToTrack, 'firstplay') >= 0) {
        return sendbeacon('firstplay', true);
      }
    };
    end = function() {
      stopTimeTracking();
      sendbeacon('end', true);
    };
    play = function() {
      var currentTime;
      startTimeTracking();
      currentTime = getCurrentValue();
      sendbeacon('play', true, currentTime);
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
      sendbeacon('resize - ' + this.width() + "*" + this.height(), true);
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
      this.on("loadedmetadata", loaded);
      this.on("timeupdate", timeupdate);
      this.one("firstplay", firstplay);
      if (__indexOf.call(eventsToTrack, "end") >= 0) {
        this.on("ended", end);
      }
      if (__indexOf.call(eventsToTrack, "play") >= 0) {
        this.on("play", play);
      }
      this.on("playing", playing);
      if (__indexOf.call(eventsToTrack, "pause") >= 0) {
        this.on("pause", pause);
      }
      if (__indexOf.call(eventsToTrack, "volumeChange") >= 0) {
        this.on("volumechange", volumeChange);
      }
      if (__indexOf.call(eventsToTrack, "resize") >= 0) {
        this.on("resize", resize);
      }
      if (__indexOf.call(eventsToTrack, "error") >= 0) {
        this.on("error", error);
      }
      if (__indexOf.call(eventsToTrack, "fullscreen") >= 0) {
        return this.on("fullscreenchange", fullscreen);
      }
    });
    return {
      'sendbeacon': sendbeacon
    };
  });

}).call(this);
