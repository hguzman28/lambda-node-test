const OracleDB = require('oracledb');
class OracleService {
    static async getCredenciales(company = 'JA') {
        const credenciales = {};
        if(company === 'JP') {
            credenciales['host'] = process.env.HOST;
            credenciales['password'] = process.env.DB_PASSWORD_ORACLE_JP;
            credenciales['user'] = process.env.DB_USER_ORACLE_JP;
            credenciales['db'] = process.env.DB_NAME;
            credenciales['pool-alias'] = "pool-alias" + '_JP';
        } else {
            credenciales['host'] = process.env.HOST;
            credenciales['password'] = process.env.PASS;
            credenciales['user'] = process.env.USER;
            credenciales['db'] = process.env.DB_NAME;
            credenciales['pool-alias'] = "pool-alias" + '_JA';
        }

        credenciales['max-pool-conn'] = 10;
        return credenciales;
    }
    static async getConnectionConfigJA(procedure = false) {
        const credenciales = await this.getCredenciales('JA');
        const config = {
            connectString: `${credenciales.host}:1521/${credenciales.db}`,
            user: credenciales.user,
            password: credenciales.password,
            poolAlias: credenciales['pool-alias'],
            poolMax: Number(credenciales['max-pool-conn']),
            poolTimeout: procedure ? 900 : 60
        };
        return config;
    }

    static async getConnectionConfigJP(procedure = false) {
        const credenciales = await this.getCredenciales('JP');
        const config = {
            connectString: `${credenciales.host}:1521/${credenciales.db}`,
            user: credenciales.user,
            password: credenciales.password,
            poolAlias: credenciales['pool-alias'],
            poolMax: Number(credenciales['max-pool-conn']),
            poolTimeout: procedure ? 900 : 60
        };
        return config;
    }

    static async getConnectionConfig(company, procedure = false) {
        switch (company) {
            case "JA": return await this.getConnectionConfigJA(procedure)
            case "JP": return await this.getConnectionConfigJP(procedure)
            default: throw new Error("Esta compañia no está permitida para conectarse a Oracle");
        }
    }

    /**
     * Gestiona la creacion o reutilizacion del pool de conexion
     * @param company 
     * @returns 
     */
    static async getPool(company = "JA", procedure = false) {
        const credenciales = await this.getConnectionConfig(company, procedure)
        const pool_alias = credenciales.poolAlias;
        try {
            const pool = OracleDB.getPool(pool_alias)
            return pool
        } catch (error) {
            const err = this.getOracleError(error)
            if (err.message.includes("No se encontró el POOL")) {
                const pool = OracleDB.createPool(credenciales)
                return pool
            } else {
                console.error(err, error, error.stack)
                throw err;
            }
        }
    }


    static getOracleError(error, company = "JA") {
        let message = "ORACLE: Error al consultar la base de datos"
        if (error.stack.includes("TNS:Se ha producido un timeout de conexión")) message = error.stack
        if (error.stack.includes("not found in the connection pool cache")) message = `ORACLE: No se encontró el POOL de conexión en el caché de conexiones.`
        const newError = {
            message,
            err: error,
            stack: error.stack,
        }
        return newError
    }

    static JSONToLowerCase(json) {
        if (json) {
            const newObject = {}
            for (const key in json) {
                if (Object.prototype.hasOwnProperty.call(json, key)) {
                    const value = json[key];
                    newObject[key.toLowerCase()] = value
                }
            }
            return newObject
        }
        throw new Error("Este objeto está vacío");
    }

    static JSONArrayToLowerCase(array) {
        if (array && array.length > 0) {
            const result = array.map(item => { return this.JSONToLowerCase(item) })
            return result
        }
        throw new Error("Este arreglo está vacío");
    }

    static async query(company = "JA", query = "SELECT * FROM nits WHERE rownum <= 5") {
        let conn = undefined
        let pool;
        query = query.trim()
        if (!query.length > 0) {
            throw new Error("No has especificado el query a ejecutar.");
        }
        try {
            pool = await this.getPool(company);
            conn = await pool.getConnection()
            const result = await conn.execute(query, {}, { outFormat: OracleDB.OUT_FORMAT_OBJECT, autoCommit: true });

            return { success: true, message: "Consulta exitosa", data: result.rows && result.rows.length > 0 ? this.JSONArrayToLowerCase(result.rows) : result.rows };


        } catch (error) {
            error = this.getOracleError(error)
            return { success: false, message: error.message, data: undefined, error }

        } finally {
            if (conn) {
                try {
                    await conn.close();
                } catch (error) {
                    console.error(error)
                    return { success: false, message: "Error al finalizar la sesión de oracle", data: undefined, error }

                }
            }
        }
    }

    static async procedure(company = "JA", procedureDeclaration, bindParameters) {
        let conn;
        let pool;
        if (!procedureDeclaration) {
            throw new Error("No has especificado el procedimiento a ejecutar.");
        }
        try {
            const query = `BEGIN
                ${procedureDeclaration};
             Exception
                When Others Then
                  :error := Sqlerrm;
             END;`
            pool = await this.getPool(company);
            conn = await pool.getConnection()

            bindParameters['error'] = { dir: OracleService.BIND_OUT };
            const result = await conn.execute(query, bindParameters, { outFormat: OracleDB.OUT_FORMAT_OBJECT, autoCommit: true });

            const promises = [];
            if (result.outBinds != null) {
                const data = result.outBinds;
                const res = {};
                const keysClob = [];

                Object.entries(bindParameters).forEach(([key, value]) => {
                    if (value.dir == OracleDB.BIND_OUT) {
                        if (value.type == OracleDB.CLOB) {
                            const promise = new Promise(async (resolve, reject) => {
                                let lob = data[key];
                                if (lob === null) {
                                    console.error(result);
                                    throw new Error('No se encontro la información');
                                }
                                lob.setEncoding('utf8');  // set the encoding so we get a 'string' not a 'buffer'
                                let str = "";
                                lob.on('error', (err) => {
                                    console.log("error: ", err);
                                    reject(err)
                                });
                                lob.on('end', async () => { });   // all done.  The Lob is automatically closed.

                                lob.on('data', (chunk) => {
                                    str += chunk; // or use Buffer.concat() for BLOBS
                                });
                                lob.on('end', () => {
                                    resolve(str);
                                });
                            });

                            keysClob.push(key);
                            promises.push(promise);
                        } else {
                            res[key] = data[key];
                        }
                    }
                });

                let resPromise = []
                if (promises.length > 0) {
                    resPromise = await Promise.all(promises).then(async values => {
                        return values;
                    });
                }

                for (let i = 0; i < resPromise.length; i++) {
                    res[keysClob[i]] = resPromise[i];
                }

                try {
                    await conn.close();

                } catch (error) {
                    console.error(error, error.stack)
                    return { success: false, message: "Error al finalizar la sesión de oracle", data: undefined, error }
                }

                return { success: true, message: "Consulta exitosa", data: res };
            }
        } catch (error) {
            try {
                await conn.close();
            } catch (error) {
                return { success: false, message: "Error al finalizar la sesión de oracle", data: undefined, error }
            }
            console.error(error, error.stack)
            error = this.getOracleError(error)
            return { success: false, message: error.message, data: undefined, error }
        }
    }

    static BIND_OUT = OracleDB.BIND_OUT
    static BIND_IN = OracleDB.BIND_IN
    static BIND_INOUT = OracleDB.BIND_INOUT
    static CLOB = OracleDB.CLOB
}
module.exports = OracleService;