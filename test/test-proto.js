/* eslint no-console:0 */

const protobuf = require('protocol-buffers')
const fs = require('fs')
const Lab = require('lab')
const lab = exports.lab = Lab.script()
const {describe, it} = lab

describe('TEST NET COMM - TODO', () => {

  it('should test protocol messages', done => {
    var messages = protobuf(fs.readFileSync('./lib/sd-swim.proto'))
    console.log('messages', messages)
    var buf = messages.Msg.encode({
      type: messages.MessageType.JOIN,
      payload: "TEST"
    })
    console.log(buf.toString()) // should print a buffer
    done()
  })

})
