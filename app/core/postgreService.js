const { isNotEmpty } = require('class-validator');
const { Pool } = require('pg');

class PostgreService {

  static async getConnectionConfig() {
    const result = {
      database: process.env.DB_NAME_PG,
      port: 5432,
      host: process.env.HOST_PG,
      user: process.env.USER_PG,
      password: process.env.PASS_PG,
      //Tiempo maximo de sesión (60 segundos),
      idleTimeoutMillis: 60000,
      query_timeout: 10000, //Los queries están limitados a 10 segundos
      idle_in_transaction_session_timeout: 60000
    }

    return result
  }

  static async query(query = "SELECT * FROM products LIMIT 5") {
    let conn
    try {
      query = query.trim()
      if (!isNotEmpty(query)) {
        throw new Error("No se puede ejecutar una consulta vacía.");
      }
      conn = new Pool(await this.getConnectionConfig())
      const { fields, rows } = await conn.query(query);
      return {success: true, message: "Consulta exitosa", data: rows};
    } catch (error) {
      console.error(error, error.stack)
      return { success: false, message: "Error en la consulta a postgre", data: undefined, error: { stack: error.stack, err: error }}
    } finally {
      if (conn) {
        try {
          await conn.end()
        } catch (error) {
          console.error(error, error.stack)
          return { success: false, message: "Error cerrando la sesión de Postgre", data: undefined, error}
        }
      }
    }
  }
}

module.exports = PostgreService;