const SDSwim = require('../lib/sd-swim')

exports.startNode = opts => {
  const target = new SDSwim(opts)
  return target.start().then(() => target)
}
exports.stopNode = node => node.stop()
exports.startNodes = opts => Promise.all(opts.map(opt => exports.startNode(opt)))
exports.stopNodes = nodes => Promise.all(nodes.map(node => exports.stopNode(node)))
exports.delay = t => () => new Promise(resolve => setTimeout(resolve, t))
