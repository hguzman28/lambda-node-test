const express = require('express');
const testOracle = require('./modules/test/test-oracle');
const testPostgres = require('./modules/test/test-postgres')
const { routes } = require('./core/router');

exports.routes = routes([
    {
        path: '/recaudoexterno/prueba/test/oracle',
        method: 'GET', //GET, POST, PUT, ALL, DELETE
        func: testOracle.handler,
        middleware: [], //Opcional (express.json(), express.urlencoded({ extended: true })) - default express.json()
    },
    {
        path: '/recaudoexterno/prueba/test/postgre',
        method: 'GET', //GET, POST, PUT, ALL, DELETE
        func: testPostgres.handler,
        middleware: [], //Opcional (express.json(), express.urlencoded({ extended: true })) - default express.json()
    }
])