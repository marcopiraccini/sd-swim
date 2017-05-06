const SDSwim = require('../lib/sd-swim')
const {deepEqual} = require('power-assert')
const {sortBy} = require('lodash')

exports.startNode = opts => {
  const target = new SDSwim(opts)
  return target.start().then(() => target)
}
exports.stopNode = node => node ? node.stop() : null
exports.startNodes = opts => Promise.all(opts.map(opt => exports.startNode(opt)))
exports.stopNodes = nodes => Promise.all(nodes.map(node => exports.stopNode(node)))
exports.delay = t => () => new Promise(resolve => setTimeout(resolve, t))
exports.compareMembers = (actual, expected) => deepEqual(sortBy(actual, ['port']), sortBy(expected, ['port']))
