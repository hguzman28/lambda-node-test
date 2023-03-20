const origin = '*';
const optionSuccessStatus = 204;

exports.cors = (params = { origin, optionSuccessStatus: 204 }) => {
    return params;
}

exports.default = {
    origin, optionSuccessStatus
}
