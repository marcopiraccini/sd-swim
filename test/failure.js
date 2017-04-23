/* eslint no-console:0 */

const Lab = require('lab')
const lab = exports.lab = Lab.script()

const {describe, it, beforeEach, afterEach} = lab
const {series} = require('async')
const SDSwim = require('../lib/sd-swim')

const startNode = port => cb => {
  const target = new SDSwim({port: port})
  target.start(() => {
    cb(null, target)
  })
}

const stopNode = node => cb => {
  node.stop(() => {
    cb()
  })
}

describe('Failure Detector', () => {

  describe('given a set of nodes node with a starting member list', () => {

    let target1, target2, target3
    const targetPort1 = 12341
    const targetPort2 = 12342
    const targetPort3 = 12343

    beforeEach(done => {
      series([startNode(targetPort1),
        startNode(targetPort2),
        startNode(targetPort3)
      ],
      function(err, results) {
        [target1, target2, target3] = results
        done()
      })
    })

    afterEach(done => {
      series([
        stopNode(target1),
        stopNode(target2),
        stopNode(target3)
      ],done)
    })

    it('should send a ping message', done => {
      // TODO
      done()
    })

  })
})
