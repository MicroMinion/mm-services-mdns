'use strict'

var MulticastDNS = require('multicast-dns')
var winston = require('winston')
var winstonWrapper = require('winston-meta-wrapper')

var MdnsService = function (options) {
  if (!(this instanceof MdnsService)) {
    return new MdnsService(options)
  }
  // logging
  this.setLogger(winston)
  // init
  this.hosts = {}
  this.messaging = options.platform.messaging
  this.mdns = new MulticastDNS({
    multicast: true,
    loopback: true,
    reuseAddr: true
  })
  // register mdns handlers
  this.mdns.on('response', this._onResponse())
  this.mdns.on('query', this._onQuery())
  // register messaging handlers
  this.messaging.on('self.transports.myNodeInfo', this._update.bind(this))
  this.messaging.on('self.transports.requestBootstrapNodeInfo', this._requestAll.bind(this))
}

MdnsService.prototype._onResponse = function () {
  var self = this
  return function (response) {
    response.answers.forEach(function (answer) {
      if (answer.name === '_mm.local' && answer.type === 'TXT') {
        var nodeInfo = JSON.parse(answer.data.toString())
        self._log.debug('receiving _mm.local mdns response including nodeInfo ' + JSON.stringify(nodeInfo))
        // TODO: Validate incoming data
        self.hosts[nodeInfo.boxId] = nodeInfo // @thomasdelaet -> what's the purpose of this?
        var delay = Math.floor(Math.random() * (2 * 1000 + 1))
        setTimeout(function () {
          self.messaging.send('transports.nodeInfo', 'local', nodeInfo)
          self.messaging.send('transports.nodeInfoBootstrap', 'local', nodeInfo)
        }, delay)
      }
    })
  }
}

MdnsService.prototype._onQuery = function () {
  var self = this
  return function (query) {
    query.questions.forEach(function (question) {
      if (question.name === '_mm.local' && question.type === 'TXT' && self.nodeInfo) {
        var response = [{
          name: '_mm.local',
          type: 'TXT',
          data: JSON.stringify(self.nodeInfo)
        }]
        self._log.debug('sending _mm.local mdns response ' + JSON.stringify(response))
        self.mdns.respond(response)
      }
    })
  }
}

MdnsService.prototype._requestAll = function (topic, local, data) {
  this.mdns.query('_mm.local', 'TXT')
}

MdnsService.prototype._update = function (topic, publicKey, data) {
  this.nodeInfo = data
  this.mdns.query('_mm.local', 'TXT')
}

MdnsService.prototype.setLogger = function (logger) {
  this._log = winstonWrapper(logger)
  this._log.addMeta({
    module: 'mm:services:mdns'
  })
}

module.exports = MdnsService
