'use strict'

var mdns = require('mdns-js')
var _ = require('lodash')
var debug = require('debug')('flunky-services:mdns')

var isFlunky = function (data, protocol) {
  return _.some(data.type, function (typeEntry) {
    return typeEntry.name === 'flunky' && typeEntry.protocol === protocol
  })
}

var mDNSService = function (options) {
  var service = this
  this.hosts = {}
  this.messaging = options.platform.messaging
  // mdns.excludeInterface('0.0.0.0')
  this.browser = mdns.createBrowser()
  this.browser.on('ready', function () {
    service.browser.discover()
  })
  this.browser.on('update', function (data) {
    if (isFlunky(data, 'tcp') || isFlunky(data, 'udp')) {
      var port = data.port
      var addresses = data.addresses
      var signId = data.host.split('.')[0]
      var boxId = data.host.split('.')[1]
      var connectionInfo = {
        signId: signId,
        boxId: boxId
      }
      if (isFlunky(data, 'tcp')) {
        connectionInfo.tcp = {
          address: addresses[0],
          port: port
        }
      }
      if (isFlunky(data, 'udp')) {
        connectionInfo.udp = {
          address: addresses[0],
          port: port
        }
      }
      service.hosts[signId] = connectionInfo
      debug(connectionInfo)
      service.messaging.send('transports.connectionInfo', 'local', connectionInfo)
      service.messaging.send('transports.connectionInfoBootstrap', 'local', connectionInfo)
    }
  })
  this.messaging.on('self.transports.myConnectionInfo', this._update.bind(this))
  this.messaging.on('self.transports.requestConnectionInfo', this._request.bind(this))
  this.messaging.on('self.transports.requestBootstrapConnectionInfo', this._requestAll.bind(this))
}

mDNSService.prototype._requestAll = function (topic, local, data) {
  debug('_requestAll')
  var self = this
  debug(this.hosts)
  _.forEach(this.hosts, function (connectionInfo) {
    self.messaging.send('transports.connectionInfoBootstrap', 'local', connectionInfo)
  }, this)
}

mDNSService.prototype._update = function (topic, publicKey, data) {
  debug('_update')
  this.connectionInfo = data
  if (_.has(this.connectionInfo, 'tcp')) {
    if (this.serviceTcp) {
      this.serviceTcp.stop()
    }
    this.serviceTcp = mdns.createAdvertisement(mdns.tcp('flunky'), this.connectionInfo.tcp.port, {
      name: data.signId + '.' + data.boxId
    })
    this.serviceTcp.start()
  }
  if (_.has(this.connectionInfo, 'udp')) {
    if (this.serviceUdp) {
      this.serviceUdp.stop()
    }
    this.serviceUdp = mdns.createAdvertisement(mdns.udp('flunky'), this.connectionInfo.udp.port, {
      name: data.signId + '.' + data.boxId
    })
    this.serviceUdp.start()
  }
}

mDNSService.prototype._request = function (topic, publicKey, data) {
  debug('_request')
  if (_.has(this.hosts, data)) {
    this.messaging.send('transports.connectionInfo', 'local', this.hosts[data])
  }
}

module.exports = mDNSService
