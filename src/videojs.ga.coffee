##
# ga
# https://github.com/mickey/videojs-ga
#
# Copyright (c) 2013 Michael Bensoussan
# Licensed under the MIT license.
##

videojs.plugin 'ga', (options = {}) ->
  # this loads options from the data-setup attribute of the video tag
  dataSetupOptions = {}
  if @options_['data-setup']
    parsedOptions = JSON.parse(@options_['data-setup'])
    dataSetupOptions = parsedOptions.ga if parsedOptions.ga

  defaultsEventsToTrack = [
    'loaded', 'percentsPlayed', 'secondsPlayed', 'start',
    'end', 'seek', 'play', 'pause', 'resize',
    'volumeChange', 'error', 'fullscreen',
    'adstart', 'adpause', 'adend', 'adskip', 'adtimeout', 'adserror'
  ]
  eventsToTrack = options.eventsToTrack || dataSetupOptions.eventsToTrack || defaultsEventsToTrack
  eventCategory = options.eventCategory || dataSetupOptions.eventCategory || 'Video'
  # if you didn't specify a name, it will be 'guessed' from the video src after metadatas are loaded
  autoLabel = if options.autoLabel? then options.autoLabel else true
  eventLabel = options.eventLabel || dataSetupOptions.eventLabel
  percentsPlayedInterval = options.percentsPlayedInterval || dataSetupOptions.percentsPlayedInterval || 10
  secondsPlayedInterval = options.secondsPlayedInterval || dataSetupOptions.secondsPlayedInterval || 60
  secondsPlayedMoments = options.secondsPlayedMoments || dataSetupOptions.secondsPlayedMoments
  trackReplaySeconds = options.trackReplaySeconds

  # init a few variables
  percentsAlreadyTracked = []
  seekStart = seekEnd = 0
  seeking = false
  ended = false
  trackingTime = false
  secondsPlayed = 0
  isFinite = undefined
  trackSeconds = undefined
  interval = undefined

  # if debug isn't specified
  options.debug = options.debug || false

  init = =>
    isFinite = Number.isFinite(@duration())

    trackSeconds = 'secondsPlayed' in eventsToTrack && (!isFinite || options.trackFiniteSeconds)

    if !eventLabel && autoLabel
      eventLabel = @currentSrc().split('/').slice(-1)[0].replace(/\.(\w{3,4})(\?.*)?$/i,'')

    if !isFinite && !(options.eventCategory || dataSetupOptions.eventCategory)
      eventCategory = 'Stream'

    startTimeTracking()

  loaded = ->
    init()

    if 'loadedmetadata' in eventsToTrack
      sendbeacon( 'loadedmetadata', true )

    return

  timeupdate = ->
    return unless isFinite

    currentTime = getCurrentValue()
    duration = Math.round(@duration())
    percentPlayed = Math.round(currentTime/duration*100)

    if percentsPlayedInterval
      for percent in [0..99] by percentsPlayedInterval
        if percentPlayed >= percent && percent not in percentsAlreadyTracked

          if 'start' in eventsToTrack && percent == 0 && percentPlayed > 0
            sendbeacon( 'start', true )
          else if 'percentsPlayed' in eventsToTrack && percentPlayed != 0
            sendbeacon( 'percent played', true, percent )

          if percentPlayed > 0
            percentsAlreadyTracked.push(percent)

    if 'seek' in eventsToTrack
      seekStart = seekEnd
      seekEnd = currentTime
      # if the difference between the start and the end are greater than 1 it's a seek.
      if Math.abs(seekStart - seekEnd) > 1
        seeking = true
        sendbeacon( 'seek start', false, seekStart )
        sendbeacon( 'seek end', false, seekEnd )

    return

  startTimeTracking = =>
    return if !trackSeconds || trackingTime

    trackingTime = true
    currentTime = getCurrentTime()
    interval = setInterval(() =>
      return unless getCurrentTime() > currentTime
      secondsPlayed++

      if secondsPlayed in secondsPlayedMoments ||
      !(secondsPlayed % secondsPlayedInterval)
        sendbeacon( 'seconds played', true, secondsPlayed )

      return
    , 1000)

  stopTimeTracking = ->
    clearInterval(interval)
    trackingTime = false

  firstplay = ->
    startTimeTracking()
    sendbeacon( 'start', true ) if 'start' in eventsToTrack and !isFinite

  end = ->
    ended = true
    stopTimeTracking()
    if trackReplaySeconds then secondsPlayed = 0 else trackSeconds = false
    sendbeacon( 'end', true )
    return

  play = ->
    startTimeTracking()
    currentTime = getCurrentValue()
    if (currentTime > 0 || 'start' not in eventsToTrack)
      sendbeacon( 'play', true, currentTime )
    if ended && currentTime == 0 && trackReplaySeconds
      sendbeacon( 'start', true )
    seeking = false
    return

  playing = ->
    startTimeTracking()
    seeking = false
    return

  pause = ->
    stopTimeTracking()
    currentTime = getCurrentValue()
    duration = Math.round(@duration())
    if currentTime != duration && !seeking
      sendbeacon( 'pause', false, currentTime )
    return

  # value between 0 (muted) and 1
  volumeChange = ->
    volume = if @muted() == true then 0 else @volume()
    sendbeacon( 'volume change', false, volume )
    return

  resize = ->
    sendbeacon( 'resize - ' + @width() + '*' + @height(), true )
    return

  error = ->
    currentTime = getCurrentValue()
    # XXX: Is there some informations about the error somewhere ?
    sendbeacon( 'error', true, currentTime )
    return

  fullscreen = ->
    currentTime = getCurrentValue()
    if @isFullscreen?() || @isFullScreen?()
      sendbeacon( 'enter fullscreen', false, currentTime )
    else
      sendbeacon( 'exit fullscreen', false, currentTime )
    return

  adstart = ->
    stopTimeTracking()
    sendbeacon( 'adstart', false, getCurrentValue() ) if 'adstart' in eventsToTrack

  adpause = ->
    sendbeacon( 'adpause', false )

  adend = ->
    startTimeTracking()
    sendbeacon( 'adend', true )

  adskip = ->
    sendbeacon( 'adskip', false )

  adtimeout = ->
    sendbeacon( 'adtimeout', true )

  adserror = (data) ->
    sendbeacon( 'adserror', true, data?.AdError )

  getCurrentValue = ->
    return if isFinite then getCurrentTime() else secondsPlayed

  getCurrentTime = =>
    Math.round(@currentTime())

  sendbeacon = ( action, nonInteraction, value ) =>
    eventFields =
      eventCategory: eventCategory,
      eventAction: action,
      nonInteraction: nonInteraction

    eventFields.eventLabel = eventLabel if eventLabel?
    eventFields.eventValue = value if value?

    @trigger('gaEvent', eventFields)

    if options.sendGaEventDirectly && window.ga
      ga 'send', 'event',
        'eventCategory'   : eventCategory
        'eventAction'     : action
        'eventLabel'      : eventLabel
        'eventValue'      : value
        'nonInteraction'  : nonInteraction

    if options.debug
      console.log(eventFields)
    return

  @ready ->
    @on('loadedmetadata', loaded)
    @on('timeupdate', timeupdate)
    @one('firstplay', firstplay)
    @on('ended', end) if 'end' in eventsToTrack
    @on('play', play) if 'play' in eventsToTrack
    @on('playing', playing)
    @on('pause', pause) if 'pause' in eventsToTrack
    @on('volumechange', volumeChange) if 'volumeChange' in eventsToTrack
    @on('resize', resize) if 'resize' in eventsToTrack
    @on('error', error) if 'error' in eventsToTrack
    @on('fullscreenchange', fullscreen) if 'fullscreen' in eventsToTrack
    @on('adstart', adstart) if 'adstart' in eventsToTrack
    @on('adpause', adpause) if 'adpause' in eventsToTrack
    @on('adend', adend) if 'adend' in eventsToTrack
    @on('adskip', adskip) if 'adskip' in eventsToTrack
    @on('adtimeout', adtimeout) if 'adtimeout' in eventsToTrack
    @on('adserror', adserror) if 'adserror' in eventsToTrack

  return 'sendbeacon': sendbeacon
