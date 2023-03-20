const express = require('express');
const { cors } = require('./cors');


exports.routes = (params = [ { path, method, func, middleware: [express.json()], cors: cors()} ]) => {
    return params;
}

