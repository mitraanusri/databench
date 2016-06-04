"""Simple test."""

from __future__ import absolute_import

import json
import tornado.testing
import unittest

from .test_websocket import WebSocketBaseTestCase


class MultipleConnections(object):
    ANALYSIS = None

    @tornado.testing.gen_test
    def test_run(self):
        wss = []
        for _ in range(4):
            ws = yield self.ws_connect('/{}/ws'.format(self.ANALYSIS))
            wss.append(ws)
        for ws in wss:
            yield ws.write_message('{"__connect": null}')
            response = yield ws.read_message()
            r = json.loads(response)
            self.assertEqual(r['signal'], '__connect')
            self.assertIn('analysis_id', r['load'])
        for ws in wss:
            yield self.close(ws)


class MultipleConnectionsDummypi(MultipleConnections, WebSocketBaseTestCase):
    ANALYSIS = 'dummypi'


class MultipleConnectionsDummypiPy(MultipleConnections, WebSocketBaseTestCase):
    ANALYSIS = 'dummypi_py'


class Parameters(object):
    ANALYSIS = None

    @tornado.testing.gen_test
    def test_parameter(self):
        ws = yield self.ws_connect('/{}/ws'.format(self.ANALYSIS))
        yield ws.write_message('{"__connect": null}')
        response = yield ws.read_message()
        r = json.loads(response)
        self.assertEqual(r['signal'], '__connect')
        self.assertIn('analysis_id', r['load'])
        response = yield ws.read_message()
        r = json.loads(response)
        self.assertEqual(r['signal'], 'data')

        yield ws.write_message(
            '{"signal":"test_fn", "load":1}'
        )
        response = yield ws.read_message()
        r = json.loads(response)
        self.assertEqual(r['signal'], 'test_fn')
        self.assertEqual(r['load']['first_param'], 1)

        yield self.close(ws)

    @tornado.testing.gen_test
    def test_list(self):
        ws = yield self.ws_connect('/{}/ws'.format(self.ANALYSIS))
        yield ws.write_message('{"__connect": null}')
        response = yield ws.read_message()
        r = json.loads(response)
        self.assertEqual(r['signal'], '__connect')
        self.assertIn('analysis_id', r['load'])
        response = yield ws.read_message()
        r = json.loads(response)
        self.assertEqual(r['signal'], 'data')

        yield ws.write_message(
            '{"signal":"test_fn", "load":[1, 2]}'
        )
        response = yield ws.read_message()
        r = json.loads(response)
        self.assertEqual(r['signal'], 'test_fn')
        self.assertEqual(r['load']['first_param'], 1)
        self.assertEqual(r['load']['second_param'], 2)

        yield self.close(ws)

    @tornado.testing.gen_test
    def test_dict(self):
        ws = yield self.ws_connect('/{}/ws'.format(self.ANALYSIS))
        yield ws.write_message('{"__connect": null}')
        response = yield ws.read_message()
        r = json.loads(response)
        self.assertEqual(r['signal'], '__connect')
        self.assertIn('analysis_id', r['load'])
        response = yield ws.read_message()
        r = json.loads(response)
        self.assertEqual(r['signal'], 'data')

        yield ws.write_message(
            '{"signal":"test_fn", "load":{"first_param":1, "second_param":2}}'
        )
        response = yield ws.read_message()
        r = json.loads(response)
        self.assertEqual(r['signal'], 'test_fn')
        self.assertEqual(r['load']['first_param'], 1)
        self.assertEqual(r['load']['second_param'], 2)

        yield self.close(ws)


class ParametersDummypi(Parameters, WebSocketBaseTestCase):
    ANALYSIS = 'dummypi'


class ParametersDummypiPy(Parameters, WebSocketBaseTestCase):
    ANALYSIS = 'dummypi_py'


if __name__ == '__main__':
    unittest.main()
