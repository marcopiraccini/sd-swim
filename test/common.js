const {concatSeries} = require('async')
const SDSwim = require('../lib/sd-swim')

exports.startNode = (port, cb) => {
  const target = new SDSwim({port: port})
  target.start(() => {
    cb(null, target)
  })
}

exports.stopNode = (node, cb) => {
  node.stop(() => {
    cb()
  })
}

// Start nodes on the same host, using the ports array
exports.startNodes = (ports, cb) => concatSeries(ports, exports.startNode, cb)

// Start nodes on the same host, using the ports array
exports.stopNodes = (nodes, cb) => concatSeries(nodes, exports.stopNode, cb)
