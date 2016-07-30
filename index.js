'use strict'

var MulticastDNS = require('multicast-dns')
var _ = require('lodash')
var debug = require('debug')('mm-services:mdns')

var mDNSService = function (options) {
  debug('initialize')
  var self = this
  this.hosts = {}
  this.messaging = options.platform.messaging
  this.mdns = new MulticastDNS({
    loopback: true
  })
  this.mdns.on('response', function (response) {
    debug('response')
    _.forEach(response.answers, function (answer) {
      if (answer.name === '_mm.local' && answer.type === 'TXT') {
        debug('valid response')
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
  })
  this.mdns.on('query', function (query) {
    _.forEach(query.questions, function (question) {
      if (question.name === '_mm.local' && question.type === 'TXT' && self.nodeInfo) {
        self.mdns.respond([{
          name: '_mm.local',
          type: 'TXT',
          data: JSON.stringify(self.nodeInfo)
        }])
      }
    })
  })
  this.messaging.on('self.transports.myNodeInfo', this._update.bind(this))
  this.messaging.on('self.transports.requestBootstrapNodeInfo', this._requestAll.bind(this))
}

mDNSService.prototype._requestAll = function (topic, local, data) {
  debug('_requestAll')
  this.mdns.query('_mm.local', 'TXT')
}

mDNSService.prototype._update = function (topic, publicKey, data) {
  debug('_update')
  this.nodeInfo = data
  this.mdns.query('_mm.local', 'TXT')
}

module.exports = mDNSService
