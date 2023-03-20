const AWS = require('aws-sdk');
const PostgreService = require('../../core/postgreService')
AWS.config.update({ region: 'us-east-1' });

exports.handler = async (req) => {
    // TODO implement

    const resp = await PostgreService.query(`SELECT * FROM products LIMIT 5`);

    return {
        statusCode: 200,
        body: JSON.stringify({
            success: true,
            message: 'OK',
            data: resp
        }),
    }
    
};



