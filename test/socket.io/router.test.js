/* (c) 2015 Ari Porad (@ariporad) <ari@ariporad.com>. MIT Licensed */
require('should');
var App = require('../..');
var Client = require('../supports/client');
var pedding = require('pedding');
var co = require('co');
var util = require('util');

describe('lib/socket.io/router.js', function dRouter() {
  var app;
  var server;
  var client;

  function wrapSocketRoute(func) {
    return function * wrappedRoute(next) {
      var thisObj = this;
      var args = [].slice.call(arguments, 1);
      co.wrap(func).apply(thisObj, args).catch(function catchWrappedErrors(err) {
        console.error(err.stack);
      });
      yield next;
    };
  }
  function run() {
    if (!server) return;
    client = Client(server);
  }

  beforeEach(function createAppServerAndClient() {
    console.log('server starting');
    app = App();
    server = app.createServer();
    server.listen();
  });

  afterEach(function closeServer() {
    server.close();
  });

  describe('router.route', function dRouterRoute() {
    describe('without passing an event', function dWithoutPassingAnEvent() {
      it('should be called for all events', function itShouldBeCalledForAllEvents(_done) {
        var done = pedding(_done, 3);
        app.io.route(function* shouldBeCalledForAnyEvent(next) {
          done();
          yield next;
        });
        run();
        client.emit('event 1');
        client.emit('event 2');
        client.emit('event 3');
      });
    });
  });

  describe('with an event', function dWithAnEvent() {
    it('should be called for all events', function itShouldBeCalledForOnlyThatEvent(done) {
      app.io.route('event 1', function* shouldBeCalledForOnlyOneEvent(next) {
        done();
        yield next;
      });
      run();
      client.emit('event 1');
      client.emit('event 2');
      client.emit('event 3');
    });
  });

  describe('with a regex', function dWithARegex() {
    it('should be called for all events that match', function itShouldBeCalledForAllEventsThatMatch(_done) {
      var done = pedding(_done, 3);
      app.io.route(/event [0-9]/, function* shouldBeCalledForMatchingEvents(next) {
        done();
        yield next;
      });
      run();
      client.emit('event 1');
      client.emit('event');
      client.emit('event 27');
      client.emit('EVENT 2');
      client.emit('pizza');
      client.emit('event 9');
      client.emit('pizza 1');
      client.emit('event 5');
    });
  });

  describe('with a callback', function dWithACallback() {
    it('should receive a callback for returning to the client', function shouldReceiveCallback(done) {
      app.io.route('event', wrapSocketRoute(function eventRoute(callback) {
        console.log(util.inspect(arguments));
        callback();
      }));
      run();
      client.emit('event', function shouldBeCalledWithNoArguments() {
        done();
      });
    });
    it('should receive a callback for returning data to a client', function shouldReceiveCallback(done) {
      app.io.route('event', wrapSocketRoute(function eventRoute(a, callback) {
        console.log(util.inspect(arguments));
        callback(a !== 0);
      }));
      run();
      client.emit('event', 1, function shouldBeCalledWithOneArgument(arg) {
        if (arg) {
          done();
        }
      });
    });
  });
});
