require('dotenv').config()
const pool = require("./db");

async function autenticarAPIKey(req, res, next) {
    const day = '2025-12-14'
    const api_key_front = req.header('minha-chave')
    console.log(api_key_front)
    if(!api_key_front){
        return res.status(500).json({ mensagem: 'Chave não fornecida!' })
    }
    const result_key = await pool.query("SELECT * FROM api_keys WHERE api_key = $1", [api_key_front]);
    console.table(result_key.rows)
    //const consumo = await pool.query("SELECT consumo FROM api_keys WHERE api_key = $1 LIMIT 1",[api_key_front])

    //const limite = await pool.query("SELECT limite FROM api_keys WHERE api_key = $1 LIMIT 1",[api_key_front])


    if(day != result_key.rows[0].dia){await pool.query("UPDATE public.api_keys SET consumo = 0 WHERE api_key =$1",[api_key_front])}

    if (result_key.rows.length > 0 && result_key.rows[0].consumo < result_key.rows[0].limite) { 
        //&& max_req <= 3)
        //console.log('chave válida', api_key_front, api_key)
        //max_req = max_req + 1
        //console.log(`Valor do contador ${max_req}`)
        await pool.query("UPDATE public.api_keys SET consumo = consumo +1")
        next()
    }


    else {
        if (result_key.rows[0].consumo >= 3) {
            console.log('limite excedido', api_key_front, api_key)
            return res.status(500).json({ mensagem: 'limite excedido!' })
        }
        console.log('chave inválida', api_key_front, api_key)
        return res.status(500).json({ mensagem: 'Chave inválida!' })
    }
}

module.exports = autenticarAPIKey;