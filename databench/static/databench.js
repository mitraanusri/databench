(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

if (typeof WebSocket === 'undefined') {
    var WebSocket = require('websocket').w3cwebsocket;
}

var Connection = exports.Connection = function () {
    function Connection() {
        var analysis_id = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];
        var ws_url = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];

        _classCallCheck(this, Connection);

        this.analysis_id = analysis_id;
        this.ws_url = ws_url ? ws_url : Connection.guess_ws_url();

        this.error_cb = function (msg) {
            return console.log(msg);
        };
        this.on_callbacks = {};
        this.onAction_callbacks = {};

        this.ws_reconnect_attempt = 0;
        this.ws_reconnect_delay = 100.0;

        this.socket = null;
        this.socket_check_open = null;

        // bind methods
        this.connect = this.connect.bind(this);
        this.ws_check_open = this.ws_check_open.bind(this);
        this.ws_onopen = this.ws_onopen.bind(this);
        this.ws_onclose = this.ws_onclose.bind(this);
        this.ws_onmessage = this.ws_onmessage.bind(this);
        this.on = this.on.bind(this);
        this.emit = this.emit.bind(this);
        this.onAction = this.onAction.bind(this);
    }

    _createClass(Connection, [{
        key: 'connect',
        value: function connect() {
            this.socket = new WebSocket(this.ws_url);

            this.socket_check_open = setInterval(this.ws_check_open, 2000);
            this.socket.onopen = this.ws_onopen;
            this.socket.onclose = this.ws_onclose;
            this.socket.onmessage = this.ws_onmessage;
            return this;
        }
    }, {
        key: 'ws_check_open',
        value: function ws_check_open() {
            if (this.socket.readyState == this.socket.CONNECTING) {
                return;
            }
            if (this.socket.readyState != this.socket.OPEN) {
                this.error_cb('Connection could not be opened. ' + 'Please <a href="javascript:location.reload(true);" ' + 'class="alert-link">reload</a> this page to try again.');
            }
            clearInterval(this.socket_check_open);
        }
    }, {
        key: 'ws_onopen',
        value: function ws_onopen() {
            this.ws_reconnect_attempt = 0;
            this.ws_reconnect_delay = 100.0;
            this.error_cb(); // clear errors
            this.socket.send(JSON.stringify({ '__connect': this.analysis_id }));
        }
    }, {
        key: 'ws_onclose',
        value: function ws_onclose() {
            clearInterval(this.socket_check_open);

            this.ws_reconnect_attempt += 1;
            this.ws_reconnect_delay *= 2;

            if (this.ws_reconnect_attempt > 3) {
                this.error_cb('Connection closed. ' + 'Please <a href="javascript:location.reload(true);" ' + 'class="alert-link">reload</a> this page to reconnect.');
                return;
            }

            var actual_delay = 0.7 * this.ws_reconnect_delay + 0.3 * Math.random() * this.ws_reconnect_delay;
            console.log('WebSocket reconnect attempt ' + this.ws_reconnect_attempt + ' in ' + actual_delay.toFixed(0) + 'ms.');
            setTimeout(this.connect, actual_delay);
        }
    }, {
        key: 'ws_onmessage',
        value: function ws_onmessage(event) {
            var _this = this;

            var message = JSON.parse(event.data);

            // connect response
            if (message.signal == '__connect') {
                this.analysis_id = message.load.analysis_id;
                console.log('Set analysis_id to ' + this.analysis_id);
            }

            // actions
            if (message.signal == '__action') {
                (function () {
                    var id = message.load.id;
                    var status = message.load.status;
                    // console.log(`received action ${id} with status ${status}`);
                    _this.onAction_callbacks[id].map(function (cb) {
                        return cb(status);
                    });
                })();
            }

            // normal message
            if (message.signal in this.on_callbacks) {
                this.on_callbacks[message.signal].map(function (cb) {
                    return cb(message.load);
                });
            }
        }
    }, {
        key: 'on',
        value: function on(signalName, callback) {
            if (!(signalName in this.on_callbacks)) this.on_callbacks[signalName] = [];
            this.on_callbacks[signalName].push(callback);
            return this;
        }
    }, {
        key: 'emit',
        value: function emit(signalName, message) {
            var _this2 = this;

            if (this.socket == null || this.socket.readyState != this.socket.OPEN) {
                setTimeout(function () {
                    return _this2.emit(signalName, message);
                }, 5);
                return;
            }
            this.socket.send(JSON.stringify({ 'signal': signalName, 'load': message }));
            return this;
        }
    }, {
        key: 'onAction',
        value: function onAction(actionID, callback) {
            if (!(actionID in this.onAction_callbacks)) this.onAction_callbacks[actionID] = [];
            this.onAction_callbacks[actionID].push(callback);
            return this;
        }
    }], [{
        key: 'guess_ws_url',
        value: function guess_ws_url() {
            var ws_protocol = 'ws';
            if (location.origin.startsWith('https://')) ws_protocol = 'wss';

            var path = location.pathname.substring(0, location.pathname.lastIndexOf('/'));
            return ws_protocol + '://' + document.domain + ':' + location.port + path + '/ws';
        }
    }]);

    return Connection;
}();

},{"websocket":4}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.Connection = exports.ui = undefined;

var _ui = require('./ui');

var ui = _interopRequireWildcard(_ui);

var _connection = require('./connection');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

// create a public interface
if (typeof window !== 'undefined') {
	window.Databench = { ui: ui, Connection: _connection.Connection };
}
exports.ui = ui;
exports.Connection = _connection.Connection;

},{"./connection":1,"./ui":3}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.wire = wire;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function wire(conn) {
    StatusLog.wire(d);
    Log.wire(d);
    Button.wire(d);
    Slider.wire(d);
    return conn;
}

var Log = exports.Log = function () {
    function Log(node) {
        var _this = this;

        var limit = arguments.length <= 1 || arguments[1] === undefined ? 20 : arguments[1];
        var consoleFnName = arguments.length <= 2 || arguments[2] === undefined ? 'log' : arguments[2];

        _classCallCheck(this, Log);

        this.node = node;
        this.limit = limit;
        this.consoleFnName = consoleFnName;
        this._messages = [];

        // bind methods
        this.render = this.render.bind(this);
        this.add = this.add.bind(this);

        // capture events from frontend
        var _consoleFnOriginal = console[consoleFnName];
        console[consoleFnName] = function (message) {
            _this.add(message, 'frontend');
            _consoleFnOriginal.apply(console, [message]);
        };
    }

    _createClass(Log, [{
        key: 'render',
        value: function render() {
            while (this._messages.length > this.limit) {
                this._messages.shift();
            }this.node.innerText = this._messages.map(function (m) {
                return m.join('');
            }).join('\n');
            return this;
        }
    }, {
        key: 'add',
        value: function add(message) {
            var source = arguments.length <= 1 || arguments[1] === undefined ? 'unknown' : arguments[1];

            if (typeof message != "string") {
                message = JSON.stringify(message);
            }

            var padded_source = ' '.repeat(Math.max(0, 8 - source.length)) + source;
            this._messages.push([padded_source + ': ' + message]);
            this.render();
            return this;
        }
    }], [{
        key: 'wire',
        value: function wire(conn) {
            var id = arguments.length <= 1 || arguments[1] === undefined ? 'log' : arguments[1];
            var source = arguments.length <= 2 || arguments[2] === undefined ? 'backend' : arguments[2];
            var limit = arguments.length <= 3 || arguments[3] === undefined ? 20 : arguments[3];
            var consoleFnName = arguments.length <= 4 || arguments[4] === undefined ? 'log' : arguments[4];

            var node = document.getElementById(id);
            if (node == null) return;

            console.log('Wiring element id=' + id + ' to ' + source + '.');
            var l = new Log(node, limit, consoleFnName);
            conn.on('log', function (message) {
                return l.add(message, source);
            });
            return this;
        }
    }]);

    return Log;
}();

;

var StatusLog = exports.StatusLog = function () {
    function StatusLog(node) {
        var formatter = arguments.length <= 1 || arguments[1] === undefined ? StatusLog.default_alert : arguments[1];

        _classCallCheck(this, StatusLog);

        this.node = node;
        this.formatter = formatter;
        this._messages = new Map();

        // bind methods
        this.render = this.render.bind(this);
        this.add = this.add.bind(this);
    }

    _createClass(StatusLog, [{
        key: 'render',
        value: function render() {
            var _this2 = this;

            var formatted = [].concat(_toConsumableArray(this._messages)).map(function (_ref) {
                var _ref2 = _slicedToArray(_ref, 2);

                var m = _ref2[0];
                var c = _ref2[1];
                return _this2.formatter(m, c);
            });
            this.node.innerHTML = formatted.join('\n');
            return this;
        }
    }, {
        key: 'add',
        value: function add(msg) {
            if (msg == null) {
                this._messages.clear();
                return;
            }
            if (typeof msg != "string") {
                msg = JSON.stringify(msg);
            }

            if (this._messages.has(msg)) {
                this._messages.set(msg, this._messages.get(msg) + 1);
            } else {
                this._messages.set(msg, 1);
            }
            this.render();
            return this;
        }
    }], [{
        key: 'default_alert',
        value: function default_alert(msg, c) {
            var c_format = c <= 1 ? '' : '<b>(' + c + ')</b> ';
            return '<div class="alert alert-danger">' + c_format + msg + '</div>';
        }
    }, {
        key: 'wire',
        value: function wire(conn) {
            var id = arguments.length <= 1 || arguments[1] === undefined ? 'ws-alerts' : arguments[1];
            var formatter = arguments.length <= 2 || arguments[2] === undefined ? StatusLog.default_alert : arguments[2];

            var node = document.getElementById(id);
            if (node == null) return;

            console.log('Wiring element id=' + id + '.');
            var l = new StatusLog(node, formatter);
            conn.error_cb = l.add;
        }
    }]);

    return StatusLog;
}();

;

var Button = exports.Button = function () {
    function Button(node) {
        var _this3 = this;

        _classCallCheck(this, Button);

        this.IDLE = 0;
        this.ACTIVE = 2;

        this.node = node;
        this.click_cb = function (actionID) {
            return console.log('click on ' + _this3.node + ' with ' + actionID);
        };
        this._state = this.IDLE;

        this.node.addEventListener('click', this.click, false);

        // bind methods
        this.render = this.render.bind(this);
        this.click = this.click.bind(this);
        this.state = this.state.bind(this);
    }

    _createClass(Button, [{
        key: 'render',
        value: function render() {
            switch (this._state) {
                case this.ACTIVE:
                    this.node.classList.add('active');
                    break;
                default:
                    this.node.classList.remove('active');
            }
            return this;
        }
    }, {
        key: 'click',
        value: function click() {
            if (this._state != this.IDLE) return;

            var actionID = Math.floor(Math.random() * 0x100000);
            this.click_cb(actionID);
            return this;
        }
    }, {
        key: 'state',
        value: function state(s) {
            if (s != this.IDLE && s != this.ACTIVE) return;

            this._state = s;
            this.render();
            return this;
        }
    }], [{
        key: 'wire',
        value: function wire(conn) {
            var nodes = Array.from(document.getElementsByTagName('BUTTON'));
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                var _loop = function _loop() {
                    var n = _step.value;

                    var signalName = n.dataset.signal;
                    if (!signalName) return 'continue';

                    console.log('Wiring button ' + n + '.');
                    var b = new Button(n);

                    // set up click callback
                    b.click_cb = function (actionID) {
                        // set up action callback
                        conn.onAction(actionID, function (status) {
                            switch (status) {
                                case 'start':
                                    b.state(b.ACTIVE);
                                    break;
                                case 'end':
                                    b.state(b.IDLE);
                                    break;
                                default:
                                    console.log('error');
                            }
                        });

                        var message = {};
                        if (n.dataset.message) message = JSON.parse(n.dataset.message);
                        message['__action_id'] = actionID;
                        conn.emit(signalName, message);
                    };
                };

                for (var _iterator = nodes[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var _ret = _loop();

                    if (_ret === 'continue') continue;
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }
        }
    }]);

    return Button;
}();

var Slider = exports.Slider = function () {
    function Slider(node, label_node) {
        _classCallCheck(this, Slider);

        this.node = node;
        this.label_node = label_node;
        this.label_html = label_node ? label_node.innerHTML : null;
        this.change_cb = function (value) {
            return console.log('slider value ' + value);
        };
        this._v_to_slider = function (value) {
            return value;
        };
        this._slider_to_v = function (s) {
            return s;
        };
        this._v_repr = function (v) {
            return v;
        };

        // bind methods
        this.v_to_slider = this.v_to_slider.bind(this);
        this.slider_to_v = this.slider_to_v.bind(this);
        this.v_repr = this.v_repr.bind(this);
        this.render = this.render.bind(this);
        this.value = this.value.bind(this);
        this.change = this.change.bind(this);

        this.node.addEventListener('input', this.render, false);
        this.node.addEventListener('change', this.change, false);
        this.render();
    }

    _createClass(Slider, [{
        key: 'v_to_slider',
        value: function v_to_slider(fn) {
            this._v_to_slider = fn;
            return this;
        }
    }, {
        key: 'slider_to_v',
        value: function slider_to_v(fn) {
            this._slider_to_v = fn;
            return this;
        }
    }, {
        key: 'v_repr',
        value: function v_repr(fn) {
            this._v_repr = fn;
            this.render();
            return this;
        }
    }, {
        key: 'render',
        value: function render() {
            var v = this.value();
            if (this.label_node) {
                this.label_node.innerHTML = this.label_html + ' ' + this._v_repr(v);
            }
            return this;
        }
    }, {
        key: 'value',
        value: function value(v) {
            if (!v) {
                // reading value
                v = this._slider_to_v(parseFloat(this.node.value));
                return v;
            }

            // setting value
            this.node.value = this._v_to_slider(v);
            this.render();
            return this;
        }
    }, {
        key: 'change',
        value: function change() {
            this.change_cb(this.value());
        }
    }], [{
        key: 'wire',
        value: function wire(conn) {
            // preprocess all labels on the page
            var labels = Array.from(document.getElementsByTagName('LABEL'));
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = labels[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var l = _step2.value;

                    if (l.htmlFor) {
                        var _n = document.getElementsByName(l.htmlFor)[0];
                        if (_n) _n.label = l;
                    }
                }
            } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion2 && _iterator2.return) {
                        _iterator2.return();
                    }
                } finally {
                    if (_didIteratorError2) {
                        throw _iteratorError2;
                    }
                }
            }

            var nodes = Array.from(document.getElementsByTagName('INPUT'));
            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
                var _loop2 = function _loop2() {
                    var n = _step3.value;

                    if (n.getAttribute('type') != 'range') return 'continue';

                    // construct signal
                    var signal = null;
                    if (n.dataset.signal) {
                        signal = n.dataset.signal;
                    } else if (n.dataset.instance) {
                        signal = 'data';
                    } else if (n.dataset.global) {
                        signal = 'global_data';
                    } else if (n.getAttribute('name')) {
                        signal = n.getAttribute('name');
                    }
                    if (!signal) {
                        console.log('Could not determine signal name for ' + n + '.');
                        return {
                            v: undefined
                        };
                    }

                    console.log('Wiring slider ' + n + ' to signal ' + signal + '.');
                    var s = new Slider(n, n.label);
                    n.databench_ui = s;

                    // handle events from frontend
                    s.change_cb = function (value) {
                        // construct message
                        var message = s.value();
                        if (n.dataset.message) {
                            message = JSON.parse(n.dataset.message);
                            message.value = s.value();
                        }

                        // process message in case signal bound to data or global_data
                        if (signal == 'data') {
                            message = _defineProperty({}, n.dataset.instance, message);
                        } else if (signal == 'global_data') {
                            message = _defineProperty({}, n.dataset.global, message);
                        }

                        conn.emit(signal, message);
                    };

                    // handle events from backend
                    if (signal == 'data') {
                        conn.on('data', function (message) {
                            if (n.dataset.instance in message) {
                                s.value(message[n.dataset.instance]);
                            }
                        });
                    } else if (signal == 'global_data') {
                        conn.on('global_data', function (message) {
                            if (n.dataset.global in message) {
                                s.value(message[n.dataset.global]);
                            }
                        });
                    } else {
                        conn.on(signal, function (message) {
                            return s.value(message);
                        });
                    }
                };

                for (var _iterator3 = nodes[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                    var _ret2 = _loop2();

                    switch (_ret2) {
                        case 'continue':
                            continue;

                        default:
                            if ((typeof _ret2 === 'undefined' ? 'undefined' : _typeof(_ret2)) === "object") return _ret2.v;
                    }
                }
            } catch (err) {
                _didIteratorError3 = true;
                _iteratorError3 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion3 && _iterator3.return) {
                        _iterator3.return();
                    }
                } finally {
                    if (_didIteratorError3) {
                        throw _iteratorError3;
                    }
                }
            }
        }
    }]);

    return Slider;
}();

},{}],4:[function(require,module,exports){
var _global = (function() { return this; })();
var nativeWebSocket = _global.WebSocket || _global.MozWebSocket;
var websocket_version = require('./version');


/**
 * Expose a W3C WebSocket class with just one or two arguments.
 */
function W3CWebSocket(uri, protocols) {
	var native_instance;

	if (protocols) {
		native_instance = new nativeWebSocket(uri, protocols);
	}
	else {
		native_instance = new nativeWebSocket(uri);
	}

	/**
	 * 'native_instance' is an instance of nativeWebSocket (the browser's WebSocket
	 * class). Since it is an Object it will be returned as it is when creating an
	 * instance of W3CWebSocket via 'new W3CWebSocket()'.
	 *
	 * ECMAScript 5: http://bclary.com/2004/11/07/#a-13.2.2
	 */
	return native_instance;
}


/**
 * Module exports.
 */
module.exports = {
    'w3cwebsocket' : nativeWebSocket ? W3CWebSocket : null,
    'version'      : websocket_version
};

},{"./version":5}],5:[function(require,module,exports){
module.exports = require('../package.json').version;

},{"../package.json":6}],6:[function(require,module,exports){
module.exports={
  "_args": [
    [
      "websocket@^1.0.22",
      "/Users/zween/tech/databench"
    ]
  ],
  "_from": "websocket@>=1.0.22 <2.0.0",
  "_id": "websocket@1.0.22",
  "_inCache": true,
  "_installable": true,
  "_location": "/websocket",
  "_nodeVersion": "3.3.1",
  "_npmUser": {
    "email": "brian@worlize.com",
    "name": "theturtle32"
  },
  "_npmVersion": "2.14.3",
  "_phantomChildren": {},
  "_requested": {
    "name": "websocket",
    "raw": "websocket@^1.0.22",
    "rawSpec": "^1.0.22",
    "scope": null,
    "spec": ">=1.0.22 <2.0.0",
    "type": "range"
  },
  "_requiredBy": [
    "/"
  ],
  "_resolved": "https://registry.npmjs.org/websocket/-/websocket-1.0.22.tgz",
  "_shasum": "8c33e3449f879aaf518297c9744cebf812b9e3d8",
  "_shrinkwrap": null,
  "_spec": "websocket@^1.0.22",
  "_where": "/Users/zween/tech/databench",
  "author": {
    "email": "brian@worlize.com",
    "name": "Brian McKelvey",
    "url": "https://www.worlize.com/"
  },
  "browser": "lib/browser.js",
  "bugs": {
    "url": "https://github.com/theturtle32/WebSocket-Node/issues"
  },
  "config": {
    "verbose": false
  },
  "contributors": [
    {
      "name": "Iñaki Baz Castillo",
      "email": "ibc@aliax.net",
      "url": "http://dev.sipdoc.net"
    }
  ],
  "dependencies": {
    "debug": "~2.2.0",
    "nan": "~2.0.5",
    "typedarray-to-buffer": "~3.0.3",
    "yaeti": "~0.0.4"
  },
  "description": "Websocket Client & Server Library implementing the WebSocket protocol as specified in RFC 6455.",
  "devDependencies": {
    "buffer-equal": "^0.0.1",
    "faucet": "^0.0.1",
    "gulp": "git+https://github.com/gulpjs/gulp.git#4.0",
    "gulp-jshint": "^1.11.2",
    "jshint-stylish": "^1.0.2",
    "tape": "^4.0.1"
  },
  "directories": {
    "lib": "./lib"
  },
  "dist": {
    "shasum": "8c33e3449f879aaf518297c9744cebf812b9e3d8",
    "tarball": "http://registry.npmjs.org/websocket/-/websocket-1.0.22.tgz"
  },
  "engines": {
    "node": ">=0.8.0"
  },
  "gitHead": "19108bbfd7d94a5cd02dbff3495eafee9e901ca4",
  "homepage": "https://github.com/theturtle32/WebSocket-Node",
  "keywords": [
    "RFC-6455",
    "client",
    "comet",
    "networking",
    "push",
    "realtime",
    "server",
    "socket",
    "websocket",
    "websockets"
  ],
  "license": "Apache-2.0",
  "main": "index",
  "maintainers": [
    {
      "name": "theturtle32",
      "email": "brian@worlize.com"
    }
  ],
  "name": "websocket",
  "optionalDependencies": {},
  "readme": "ERROR: No README data found!",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/theturtle32/WebSocket-Node.git"
  },
  "scripts": {
    "gulp": "gulp",
    "install": "(node-gyp rebuild 2> builderror.log) || (exit 0)",
    "test": "faucet test/unit"
  },
  "version": "1.0.22"
}

},{}]},{},[2])


//# sourceMappingURL=databench.js.map
