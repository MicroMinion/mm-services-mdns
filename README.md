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

#### self.transports.requestBootstrapNodeInfo

Request message that triggers 'nodeInfoBootstrap' responses
