/* eslint no-console:0 */

const Lab = require('lab')
const lab = (exports.lab = Lab.script())
const { describe, it, beforeEach, afterEach } = lab
const SDSwim = require('../lib/sd-swim')
const pino = require('pino')
const assert = require('power-assert')
const { startNodes, stopNodes, delay } = require('./common')

describe('Metadata Protocol', () => {
  describe('given a started node with some data', () => {
    let target, node
    const nodeOpts = [{ port: 12340 }]
    const testEntries1 = [{ key: 'test', value: Buffer.from('test') }]
    const testEntries2 = [{ key: 'test2', value: Buffer.from('test2') }]
    const testEntries3 = [{ key: 'test3', value: Buffer.from('test3') }]

    beforeEach(() =>
      startNodes(nodeOpts).then(results => {
        ;[target] = results
      })
    )

    afterEach(() =>
      stopNodes([target, node]).then(() => {
        target.removeAllListeners('new-metadata') // To avoid listeners on not yet gc objects
        node.removeAllListeners('new-metadata')
      })
    )

    it('should start a node and receive the metadata, then then node adds his entries and check that is propagated', done => {
      const hosts = [{ host: '127.0.0.1', port: target.port }]

      // start a single node that join the target.
      node = new SDSwim({ logger: pino(), port: 12341, hosts })
      node.on('new-metadata', data => {
        assert.deepEqual(data[0].entries, testEntries1)
        assert.deepEqual(data[0].owner, {
          host: '127.0.0.1',
          port: nodeOpts[0].port
        })
        assert.deepEqual(data[0].version, 1)
        node.addAll(testEntries2)
      })

      target.on('new-metadata', data => {
        const expected = [
          {
            owner: { host: '127.0.0.1', port: 12341 },
            entries: [{ key: 'test2', value: Buffer.from('test2') }],
            version: 1
          },
          {
            owner: { host: '127.0.0.1', port: 12340 },
            version: 1,
            entries: [{ key: 'test', value: Buffer.from('test') }]
          }
        ]
        assert.deepEqual(target.data, expected)
        assert.deepEqual(data, expected)
        node.stop(() => {
          done()
        })
      })
      target.addAll(testEntries1)
      node.start()
    })

    it(
      'should start a node and receive the metadata, then new node add his and check that is propagated, ' +
        'then the original node will update his entries',
      done => {
        const hosts = [{ host: '127.0.0.1', port: target.port }]

        // start a single node that join the target.
        node = new SDSwim({ logger: pino(), port: 12341, hosts })

        node.on('new-metadata', data => {
          node.addAll(testEntries2)
        })

        target.on('new-metadata', data => {
          target.addAll(testEntries3) // add new node metadata
          node.on('new-metadata', data => {
            const expected = [
              {
                owner: { host: '127.0.0.1', port: 12340 },
                entries: [{ key: 'test3', value: Buffer.from('test3') }],
                version: 2
              },
              {
                owner: { host: '127.0.0.1', port: 12341 },
                version: 1,
                entries: [{ key: 'test2', value: Buffer.from('test2') }]
              }
            ]
            assert.deepEqual(data, expected)
            node.stop(() => {
              done()
            })
          })
        })
        target.addAll(testEntries1)
        node.start()
      }
    )

    it('should start a node and receive the metadata, then the node is stopped and metadata must be removed', done => {
      const hosts = [{ host: '127.0.0.1', port: target.port }]
      // start a single node that join the target.
      node = new SDSwim({ logger: pino(), port: 12341, hosts })
      node.on('new-metadata', data => {
        node.addAll(testEntries2)
      })

      let firstReceived = false
      target.on('new-metadata', data => {
        if (firstReceived) {
          return
        }
        firstReceived = true

        node.stop().then(delay(2000)).then(() => {
          const expected = [
            {
              owner: { host: '127.0.0.1', port: 12340 },
              entries: [{ key: 'test', value: Buffer.from('test') }],
              version: 1
            }
          ]
          assert.deepEqual(target.data, expected)
          done()
        })
      })
      target.addAll(testEntries1)
      node.start()
    })

    it('should start a node and receive the metadata, then new node add and remove new entry', done => {
      const hosts = [{ host: '127.0.0.1', port: target.port }]

      // start a single node that join the target.
      node = new SDSwim({ logger: pino(), port: 12341, hosts })

      node.on('up', data => {
        node.add('test2', Buffer.from('test2'))
      })

      let firstUpdate = true
      target.on('new-metadata', data => {
        if (firstUpdate) {
          const expected = [
            {
              owner: { host: '127.0.0.1', port: 12341 },
              entries: [
                {
                  key: 'test2',
                  value: Buffer.from('test2')
                }
              ],
              version: 1
            },
            {
              owner: { host: '127.0.0.1', port: 12340 },
              version: 0,
              entries: []
            }
          ]
          assert.deepEqual(data, expected)
          node.remove('test2')
          firstUpdate = false
        } else {
          const expected = [
            {
              owner: { host: '127.0.0.1', port: 12341 },
              entries: [],
              version: 2
            },
            {
              owner: { host: '127.0.0.1', port: 12340 },
              version: 0,
              entries: []
            }
          ]
          assert.deepEqual(data, expected)
          done()
        }
      })
      node.start()
    })
  })
})
