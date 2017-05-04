const {concatSeries} = require('async')
const SDSwim = require('../lib/sd-swim')

exports.startNode = (opts, cb) => {
  const target = new SDSwim(opts)
  target.start(err => {
    cb(err, target)
  })
}

exports.stopNode = (node, cb) => {
  node.stop(err => {
    cb(err)
  })
}

// Start nodes on the same host, using the ports array
exports.startNodes = (opts, cb) => concatSeries(opts, exports.startNode, cb)

// Start nodes on the same host, using the ports array
exports.stopNodes = (nodes, cb) => concatSeries(nodes, exports.stopNode, cb)
