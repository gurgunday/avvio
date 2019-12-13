'use strict'

/* eslint no-prototype-builtins: off */

const test = require('tap').test
const boot = require('..')

test('custom inheritance', (t) => {
  t.plan(3)

  const server = { my: 'server' }
  const app = boot(server)

  app.override = function (s) {
    t.equal(s, server)

    const res = Object.create(s)
    res.b = 42

    return res
  }

  app.use(function first (s, opts, cb) {
    t.notEqual(s, server)
    t.ok(server.isPrototypeOf(s))
    cb()
  })
})

test('custom inheritance multiple levels', (t) => {
  t.plan(6)

  const server = { count: 0 }
  const app = boot(server)

  app.override = function (s) {
    const res = Object.create(s)
    res.count = res.count + 1

    return res
  }

  app.use(function first (s1, opts, cb) {
    t.notEqual(s1, server)
    t.ok(server.isPrototypeOf(s1))
    t.equal(s1.count, 1)
    s1.use(second)

    cb()

    function second (s2, opts, cb) {
      t.notEqual(s2, s1)
      t.ok(s1.isPrototypeOf(s2))
      t.equal(s2.count, 2)
      cb()
    }
  })
})

test('custom inheritance multiple levels twice', (t) => {
  t.plan(10)

  const server = { count: 0 }
  const app = boot(server)

  app.override = function (s) {
    const res = Object.create(s)
    res.count = res.count + 1

    return res
  }

  app.use(function first (s1, opts, cb) {
    t.notEqual(s1, server)
    t.ok(server.isPrototypeOf(s1))
    t.equal(s1.count, 1)
    s1.use(second)
    s1.use(third)
    var prev

    cb()

    function second (s2, opts, cb) {
      prev = s2
      t.notEqual(s2, s1)
      t.ok(s1.isPrototypeOf(s2))
      t.equal(s2.count, 2)
      cb()
    }

    function third (s3, opts, cb) {
      t.notEqual(s3, s1)
      t.ok(s1.isPrototypeOf(s3))
      t.notOk(prev.isPrototypeOf(s3))
      t.equal(s3.count, 2)
      cb()
    }
  })
})

test('custom inheritance multiple levels with multiple heads', (t) => {
  t.plan(13)

  const server = { count: 0 }
  const app = boot(server)

  app.override = function (s) {
    const res = Object.create(s)
    res.count = res.count + 1

    return res
  }

  app.use(function first (s1, opts, cb) {
    t.notEqual(s1, server)
    t.ok(server.isPrototypeOf(s1))
    t.equal(s1.count, 1)
    s1.use(second)

    cb()

    function second (s2, opts, cb) {
      t.notEqual(s2, s1)
      t.ok(s1.isPrototypeOf(s2))
      t.equal(s2.count, 2)
      cb()
    }
  })

  app.use(function third (s1, opts, cb) {
    t.notEqual(s1, server)
    t.ok(server.isPrototypeOf(s1))
    t.equal(s1.count, 1)
    s1.use(fourth)

    cb()

    function fourth (s2, opts, cb) {
      t.notEqual(s2, s1)
      t.ok(s1.isPrototypeOf(s2))
      t.equal(s2.count, 2)
      cb()
    }
  })

  app.ready(function () {
    t.equal(server.count, 0)
  })
})

test('fastify test case', (t) => {
  t.plan(7)

  const noop = () => {}

  function build () {
    const app = boot(server, {})
    app.override = function (s) {
      return Object.create(s)
    }

    server.add = function (name, fn, cb) {
      if (this[name]) return cb(new Error('already existent'))
      this[name] = fn
      cb()
    }

    return server

    function server (req, res) {}
  }

  const instance = build()
  t.ok(instance.add)
  t.ok(instance.use)

  instance.use((i, opts, cb) => {
    t.notEqual(i, instance)
    t.ok(instance.isPrototypeOf(i))

    i.add('test', noop, (err) => {
      t.error(err)
      t.ok(i.test)
      cb()
    })
  })

  instance.ready(() => {
    t.notOk(instance.test)
  })
})

test('override should pass also the plugin function', (t) => {
  t.plan(3)

  const server = { my: 'server' }
  const app = boot(server)

  app.override = function (s, fn) {
    t.type(fn, 'function')
    t.equal(fn, first)
    return s
  }

  app.use(first)

  function first (s, opts, cb) {
    t.equal(s, server)
    cb()
  }
})

test('skip override - fastify test case', (t) => {
  t.plan(2)

  const server = { my: 'server' }
  const app = boot(server)

  app.override = function (s, func) {
    if (func[Symbol.for('skip-override')]) {
      return s
    }
    return Object.create(s)
  }

  first[Symbol.for('skip-override')] = true
  app.use(first)

  function first (s, opts, cb) {
    t.equal(s, server)
    t.notOk(server.isPrototypeOf(s))
    cb()
  }
})

test('override can receive options object', (t) => {
  t.plan(4)

  const server = { my: 'server' }
  const options = { hello: 'world' }
  const app = boot(server)

  app.override = function (s, fn, opts) {
    t.equal(s, server)
    t.deepEqual(opts, options)

    const res = Object.create(s)
    res.b = 42

    return res
  }

  app.use(function first (s, opts, cb) {
    t.notEqual(s, server)
    t.ok(server.isPrototypeOf(s))
    cb()
  }, options)
})

test('override can receive options function', (t) => {
  t.plan(8)

  const server = { my: 'server' }
  const options = { hello: 'world' }
  const app = boot(server)

  app.override = function (s, fn, opts) {
    t.equal(s, server)
    if (typeof opts !== 'function') {
      t.deepEqual(opts, options)
    }

    const res = Object.create(s)
    res.b = 42
    res.bar = 'world'

    return res
  }

  app.use(function first (s, opts, cb) {
    t.notEqual(s, server)
    t.ok(server.isPrototypeOf(s))
    s.foo = 'bar'
    cb()
  }, options)

  app.use(function second (s, opts, cb) {
    t.notOk(s.foo)
    t.deepEqual(opts, { hello: 'world' })
    t.ok(server.isPrototypeOf(s))
    cb()
  }, p => ({ hello: p.bar }))
})
