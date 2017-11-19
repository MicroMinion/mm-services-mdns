'use strict'

var MulticastDNS = require('multicast-dns')
var winston = require('winston')
var winstonWrapper = require('winston-meta-wrapper')

var BROADCAST_QUERY_TIMEOUT = 400

var QUERY_INTERVAL = 1000 * 20

var MAX_QUERY_ATTEMPTS = 10

var MdnsService = function (options) {
  if (!(this instanceof MdnsService)) {
    return new MdnsService(options)
  }
  // logging
  if (!options.logger) {
    this.setLogger(winston)
  } else {
    this.setLogger(options.logger)
  }
  // init
  this.hosts = {}
  this.messaging = options.platform.messaging
  this.mdns = new MulticastDNS({
    multicast: true,
    loopback: true,
    reuseAddr: true
  })
  this._queryAttempts = 0
  // register mdns handlers
  this.mdns.on('response', this._onResponse.bind(this))
  this.mdns.on('query', this._onQuery.bind(this))
  // register messaging handlers
  this.messaging.on('self.transports.myNodeInfo', this._update.bind(this))
  this.messaging.on('self.transports.requestBootstrapNodeInfo', this._requestAll.bind(this))
}

MdnsService.prototype._onResponse = function (response) {
  var self = this
  response.answers.forEach(function (answer) {
    if (answer.name === '_mm.local' && answer.type === 'TXT') {
      var nodeInfo = JSON.parse(answer.data.toString())
      // TODO: Validate incoming data
      var delay = Math.floor(Math.random() * (2 * 1000 + 1))
      if (nodeInfo.boxId === self.nodeInfo.boxId) {
        return
      }
      self._log.debug('receiving _mm.local mdns response including nodeInfo ' + JSON.stringify(nodeInfo))
      clearTimeout(self._timeout)
      setTimeout(function () {
        self.messaging.send('transports.nodeInfo', 'local', nodeInfo)
        self.messaging.send('transports.nodeInfoBootstrap', 'local', nodeInfo)
      }, delay)
    }
  })
}

MdnsService.prototype._sendNodeInfo = function () {
  var response = [{
    name: '_mm.local',
    type: 'TXT',
    data: JSON.stringify(this.nodeInfo)
  }]
  this._log.debug('sending _mm.local mdns response ' + JSON.stringify(response))
  this.mdns.respond(response)
}

MdnsService.prototype._onQuery = function (query) {
  this._log.debug('query received', {
    query: query
  })
  var self = this
  query.questions.forEach(function (question) {
    if (question.name === '_mm.local' && question.type === 'TXT' && self.nodeInfo) {
      self._sendNodeInfo()
    }
  })
}

MdnsService.prototype._requestAll = function (topic, local, data) {
  var self = this
  this._log.debug('requesting local MicroMinion nodes')
  this.mdns.query('_mm.local', 'TXT')
  this._timeout = setTimeout(function () {
    self._queryAttempts += 1
    if (self._queryAttempts >= MAX_QUERY_ATTEMPTS) {
      self._timeout = setTimeout(function () {
        self._queryAttempts = 0
        self._requestAll()
      }, QUERY_INTERVAL)
    } else {
      self._requestAll()
    }
  }, BROADCAST_QUERY_TIMEOUT)
}

MdnsService.prototype._update = function (topic, publicKey, data) {
  this._log.debug('updating nodeInfo')
  this.nodeInfo = data
  this._sendNodeInfo()
}

MdnsService.prototype.setLogger = function (logger) {
  this._log = winstonWrapper(logger)
  this._log.addMeta({
    module: 'mm:services:mdns'
  })
}

module.exports = MdnsService
