const pino = require('pino')
const minimist = require('minimist')
const SDSwim = require('./lib/sd-swim')

/* eslint no-console:0 */
function start () {
  const logger = pino()
  const info = logger.info.bind(logger)

  console.log(process.argv)
  const argv = minimist(process.argv.slice(2), {
    integer: ['port'],
    alias: {
      port: 'p',
      help: 'H'
    },
    default: {
      port: process.env.SWIM_PORT || 11000
    }
  })

  if (argv.help) {
    console.error('Usage:', process.argv[1], '[--port PORT] host1[:port1] host2[:port2]...')
    process.exit(1)
  }

  const nodes = argv._ //  contains all the arguments that didn't have an option associated with them
  const hosts = nodes.map(el => {
    const [host, portStr] = el.split(':')
    const port = Number(portStr)
    if (!port || port <= 1 || port > 65535) {
      console.error(`Port ${portStr} not correct, must be a number`)
      console.error(`Usage: ${process.argv[1]} [--port PORT] host1[:port1] host2[:port2]...`)
      process.exit(1)
    }
    return {host, port}
  })
  const opts = Object.assign({hosts, logger}, argv)

  info(opts.hosts, 'HOSTS')
  const sdswim = new SDSwim(opts)

  const charm = require('charm')(process.stdout)
  charm.reset()
  charm.position(0, 1).background('black').write(`HOST: ${sdswim.host || 'unknown'}` )
  charm.position(0, 2).background('black').write(`PORT: ${sdswim.port || 'unknown'}` )
  charm.position(0, 3).background('black').write('MEMBER LIST:')
  charm.on('^C', process.exit)

  sdswim.on('join-sent', () => {
    info('join sent to hosts')
  })

  function noop () {}
  // nothing on generic error
  sdswim.on('error', noop);

  // swim.on('peerUp', (peer) => {
  //   info(peer, 'peer online')
  // })
  // swim.on('peerSuspect', (peer) => {
  //   info(peer, 'peer suspect')
  // })
  // swim.on('peerDown', (peer) => {
  //   info(peer, 'peer offline')
  // })
  // swim.on('up', (peer) => {
  //   info({ id: baseswim.whoami() }, 'I am up')
  // })
}

if (require.main === module) {
  start()
}
