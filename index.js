//Aqui se registran las rutas y las lambdas que llama cada ruta

const express = require('express');
const cors = require('cors')
const app = express();
const port = 8000;
const { routes } = require('./app/routes');
const { default: defaultCors } = require('./app/core/cors');

function createRoute( func ) {
    return async function (req, res) {
        const r = await func(req);
        res.status(r.statusCode ? r.statusCode : 200).send(r.body ? JSON.parse(r.body) : '');
    }
}

function configCors( cors ) {
    return {
        ...defaultCors,
        ...cors
    }
}

(function () {
    routes.forEach(r => {
        if ( r.cors ) {
            const c = configCors(r.cors);
            c['methods'] = [r.method];
            app.use(cors(c));
        }
        if( !(r.middleware && r.middleware.length > 0) ) {
            app.use(express.json());
        } else {
            for( const m of r.middleware ) {
                app.use(m);
            }
        }
        switch (r.method) {
            case 'ALL':
                app.all(r.path, createRoute(r.func));
                break;
            case 'GET':
                app.get(r.path, createRoute(r.func));
                break;
            case 'POST':
                app.post(r.path, createRoute(r.func));
                break;
            case 'PUT':
                app.put(r.path, createRoute(r.func));
                break;
            case 'DELETE':
                app.delete(r.path, createRoute(r.func));
                break;
            default:
                app.all(r.path, createRoute(r.func));
                break;
        }
    })
})();

app.use(function (req, res) {
    res.status(403).send({
        statusCode: 403,
        success: false,
        message: 'No se encontro la ruta.'
    });
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
