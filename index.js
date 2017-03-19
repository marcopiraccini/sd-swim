
// TODO: Probably we want to enable this only when testing
const charm = require('charm')(process.stdout)

charm.reset()
charm.position(0, 1).background('black').write('IP:')
charm.position(0, 2).background('black').write('PORT:')
charm.position(0, 3).background('black').write('MEMBER LIST:')

charm.on('^C', process.exit)
