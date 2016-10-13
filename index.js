'use strict'

var MulticastDNS = require('multicast-dns')
var winston = require('winston')
var winstonWrapper = require('winston-meta-wrapper')

var mDNSService = function (options) {
  if (!(this instanceof mDNSService)) {
    return new mDNSService(options)
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

mDNSService.prototype._onResponse = function () {
  var self = this
  return function (response) {
    response.answers.forEach(function (answer) {
      if (answer.name === '_mm.local' && answer.type === 'TXT') {
        var nodeInfo = JSON.parse(answer.data.toString())
        // TODO: Validate incoming data
        self.hosts[nodeInfo.boxId] = nodeInfo
        var delay = Math.floor(Math.random() * (2 * 1000 + 1))
        setTimeout(function () {
          self.messaging.send('transports.nodeInfo', 'local', nodeInfo)
          self.messaging.send('transports.nodeInfoBootstrap', 'local', nodeInfo)
        }, delay)
      }
    })
  }
}

mDNSService.prototype._onQuery = function () {
  var self = this
  function (query) {
    query.questions.forEach(function (question) {
      if (question.name === '_mm.local' && question.type === 'TXT' && self.nodeInfo) {
        se
        self.mdns.respond([{
          name: '_mm.local',
          type: 'TXT',
          data: JSON.stringify(self.nodeInfo)
        }])
      }
    })
  }
}

mDNSService.prototype._requestAll = function (topic, local, data) {
  this.mdns.query('_mm.local', 'TXT')
}

mDNSService.prototype._update = function (topic, publicKey, data) {
  this.nodeInfo = data
  this.mdns.query('_mm.local', 'TXT')
}

mDNSService.prototype.setLogger = function (logger) {
  this._log = winstonWrapper(logger)
  this._log.addMeta({
    module: 'mm:services:mdns'
  })
}

module.exports = mDNSService
