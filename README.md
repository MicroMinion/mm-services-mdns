# mm-services-mdns

directory service to store connection information for remote peers

works with [MicroMinion platform](https://github.com/MicroMinion/mm-platform)

## Initialization

```js
var MicroMinionPlatform = require('mm-platform')
var MulticastDNS = require('mm-services-mdns')

var platform = new MicroMinionPlatform()

var mdns = new MulticastDNS({platform: platform})
```
## Messaging API

### Published messages

#### self.transports.nodeInfo

Publishes connection information for remote node

```js
var MicroMinionPlatform = require('mm-platform')
var MulticastDNS = require('mm-services-mdns')

var platform = new MicroMinionPlatform()

var mdns = new MulticastDNS({platform: platform})

platform.messaging.on('self.transports.nodeInfo', function(topic, sender, nodeInfo) {
  console.log(topic) // 'self.transports.nodeInfo'
  console.log(sender) // 'local'
  console.log(nodeInfo) // {boxId: <boxId>, signId: <signId>, connectionInfo: <1tp connectionInfo>}
})

```

#### self.transports.nodeInfoBootstrap

Publishes bootstrap information for remote nodes (used by DHT)

```js
var MicroMinionPlatform = require('mm-platform')
var MulticastDNS = require('mm-services-mdns')

var platform = new MicroMinionPlatform()

var mdns = new MulticastDNS({platform: platform})

platform.messaging.on('self.transports.nodeInfo', function(topic, sender, nodeInfo) {
  console.log(topic) // 'self.transports.nodeInfo'
  console.log(sender) // 'local'
  console.log(nodeInfo) // {boxId: <boxId>, signId: <signId>, connectionInfo: <1tp connectionInfo>}
})

```

### Subscribed messages

#### self.transports.myNodeInfo

Uses our own node information to broadcast on local network through mdns

You'll never need to send this message since this is triggered from the platform object

```js
var MicroMinionPlatform = require('mm-platform')
var MulticastDNS = require('mm-services-mdns')

var platform = new MicroMinionPlatform()

var mdns = new MulticastDNS({platform: platform})

var nodeInfo = {
  boxId: platform.directory.identity.getBoxId()
  signId: platform.directory.identity.getSignId()
  connectionInfo: platform.directory._connectionInfo
}

platform.messaging.send('transports.myNodeInfo', 'local', nodeInfo)
```

#### self.transports.requestBootstrapNodeInfo

Request message that triggers 'nodeInfoBootstrap' responses

Needed if you want to implement your own directory service or want to discover local nodes

```js
var MicroMinionPlatform = require('mm-platform')
var MulticastDNS = require('mm-services-mdns')

var platform = new MicroMinionPlatform()

var mdns = new MulticastDNS({platform: platform})

platform.messaging.send('transports.requestBootstrapNodeInfo', 'local', {})
```
