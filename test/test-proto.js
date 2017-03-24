/* eslint no-console:0 */

const protobuf = require('protocol-buffers')
const fs = require('fs')
const Lab = require('lab')
const lab = exports.lab = Lab.script()
const {describe, it} = lab

describe('TEST NET COMM - TODO', () => {

  it('should test protocol messages', done => {
    var messages = protobuf(fs.readFileSync('./lib/sd-swim.proto'))
    var buf = messages.Msg.encode({
      type: messages.MessageType.JOIN,
      target: {
        host: '1.1.1.1',
        port: 12345
      },
      payload: "TEST"
    })
    messages.Msg.decode(buf)
    done()
  })

})
