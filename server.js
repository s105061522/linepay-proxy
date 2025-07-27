// server.js
require('dotenv').config();

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const app = express();
app.use(express.json());

const CHANNEL_ID = process.env.CHANNEL_ID;
const CHANNEL_SECRET = process.env.CHANNEL_SECRET;
const BASE_URL = process.env.BASE_URL || 'https://sandbox-api-pay.line.me'; // fallback 預設是 sandbox

function makeSignature(uri, body, nonce) {
  const text = CHANNEL_SECRET + uri + body + nonce;
  return crypto.createHmac('sha256', CHANNEL_SECRET).update(text).digest('base64');
}

app.post('/pay', async (req, res) => {
  const body = req.body;
  console.log("收到前端送來的資料：", body);
  const uri = '/v3/payments/request';
  const nonce = Date.now().toString();
  const jsonBody = JSON.stringify(body);
  const signature = makeSignature(uri, jsonBody, nonce);

  try {
    const response = await axios.post(BASE_URL + uri, jsonBody, {
      headers: {
        'Content-Type': 'application/json',
        'X-LINE-ChannelId': CHANNEL_ID,
        'X-LINE-Authorization-Nonce': nonce,
        'X-LINE-Authorization': signature
      }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ 
      error: err.toString(), 
      details: err.response ? err.response.data : null 
});
  }
});

app.post('/confirm', async (req, res) => {
  const { transactionId, amount } = req.body;
  const uri = `/v3/payments/${transactionId}/confirm`;
  const nonce = Date.now().toString();
  const jsonBody = JSON.stringify({ amount, currency: 'TWD' });
  const signature = makeSignature(uri, jsonBody, nonce);

  try {
    const response = await axios.post(BASE_URL + uri, jsonBody, {
      headers: {
        'Content-Type': 'application/json',
        'X-LINE-ChannelId': CHANNEL_ID,
        'X-LINE-Authorization-Nonce': nonce,
        'X-LINE-Authorization': signature
      }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ 
      error: err.toString(), 
      details: err.response ? err.response.data : null 
});

  }
});

app.get('/', (req, res) => {
  res.send('LINE Pay Proxy Server is running ✅');
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on ${port}`));
