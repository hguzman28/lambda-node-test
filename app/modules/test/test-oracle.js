const AWS = require('aws-sdk');
const OracleService = require('../../core/oracleService')
AWS.config.update({ region: 'us-east-1' });

exports.handler = async (req) => {
    // TODO implement

    const resp = await OracleService.query('JA', `SELECT *FROM NITS WHERE ROWNUM = 1`);

    return {
        statusCode: 200,
        body: JSON.stringify({
            success: true,
            message: 'OK',
            data: resp
        }),
    }
    
};



