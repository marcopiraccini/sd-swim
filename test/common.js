const SDSwim = require('../lib/sd-swim')
const { deepEqual } = require('power-assert')
const { sortBy } = require('lodash')

const compareMember = member => `${member.node.host}:${member.node.port}`
const compareNode = node => `${node.host}:${node.port}`

exports.startNode = opts => {
  const target = new SDSwim(opts)
  return target.start().then(() => target)
}
exports.stopNode = node => (node ? node.stop() : null)
exports.startNodes = opts =>
  Promise.all(opts.map(opt => exports.startNode(opt)))
exports.stopNodes = nodes =>
  Promise.all(nodes.map(node => exports.stopNode(node)))
exports.delay = t => () => new Promise(resolve => setTimeout(resolve, t))
// exports.compareNodeLists = (expected, actual) => deepEqual(sortBy(expected, compareHost), sortBy(actual, compareHost))
exports.compareMemberLists = (expected, actual) =>
  deepEqual(sortBy(expected, [compareMember]), sortBy(actual, [compareMember]))
exports.compareNodesLists = (expected, actual) =>
  deepEqual(sortBy(expected, [compareNode]), sortBy(actual, [compareNode]))
