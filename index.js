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
      var nodeInfo = {
        signId: signId,
        boxId: boxId,
        connectionInfo: []
      }
      if (isFlunky(data, 'tcp')) {
        _.forEach(addresses, function (address) {
          nodeInfo.connectionInfo.push({
            transportType: 'tcp',
            transportInfo: {
              port: port,
              address: address
            }
          })
        })
      }
      if (isFlunky(data, 'udp')) {
        _.forEach(addresses, function (address) {
          nodeInfo.connectionInfo.push({
            transportType: 'udp',
            transportInfo: {
              port: port,
              address: address
            }
          })
        })
      }
      service.hosts[signId] = nodeInfo
      debug(nodeInfo)
      service.messaging.send('transports.nodeInfo', 'local', nodeInfo)
      service.messaging.send('transports.nodeInfoBootstrap', 'local', nodeInfo)
    }
  })
  this.messaging.on('self.transports.myNodeInfo', this._update.bind(this))
  this.messaging.on('self.transports.requestNodeInfo', this._request.bind(this))
  this.messaging.on('self.transports.requestBootstrapNodeInfo', this._requestAll.bind(this))
}

mDNSService.prototype._requestAll = function (topic, local, data) {
  debug('_requestAll')
  var self = this
  debug(this.hosts)
  _.forEach(this.hosts, function (nodeInfo) {
    self.messaging.send('transports.nodeInfoBootstrap', 'local', nodeInfo)
  }, this)
}

mDNSService.prototype._update = function (topic, publicKey, data) {
  debug('_update')
  this.nodeInfo = data
  var mdns = this
  if (_.some(this.nodeInfo.connectionInfo, function (transport) {
      return transport.transportType === 'tcp'
    })) {
    if (this.serviceTcp) {
      this.serviceTcp.stop()
    }
    var port = _.find(this.nodeInfo.connectionInfo, function (transport) {
      return transport.transportType === 'tcp'
    }).transportInfo.port
    this.serviceTcp = mdns.createAdvertisement(mdns.tcp('flunky'), port, {
      name: data.signId + '.' + data.boxId
    })
    this.serviceTcp.start()
  }
  if (_.some(this.nodeInfo.connectionInfo, function (transport) {
      return transport.transportType === 'udp'
    })) {
    if (this.serviceUdp) {
      this.serviceUdp.stop()
    }
    port = _.find(this.nodeInfo.connectionInfo, function (transport) {
      return transport.transportType === 'udp'
    }).transportInfo.port
    this.serviceUdp = mdns.createAdvertisement(mdns.udp('flunky'), port, {
      name: data.signId + '.' + data.boxId
    })
    this.serviceUdp.start()
  }
}

mDNSService.prototype._request = function (topic, publicKey, data) {
  debug('_request')
  if (_.has(this.hosts, data)) {
    this.messaging.send('transports.nodeInfo', 'local', this.hosts[data])
  }
}

module.exports = mDNSService
