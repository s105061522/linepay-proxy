const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const app = express();
app.use(express.json());

// ✅ 解決 CORS 問題（加這段）
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // 或指定 GAS 網域
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

const CHANNEL_ID = process.env.CHANNEL_ID;
const CHANNEL_SECRET = process.env.CHANNEL_SECRET;
const BASE_URL = 'https://sandbox-api-pay.line.me';

function makeSignature(uri, body, nonce) {
  const text = CHANNEL_SECRET + uri + body + nonce;
  return crypto.createHmac('sha256', CHANNEL_SECRET).update(text).digest('base64');
}

app.post('/pay', async (req, res) => {
  const body = req.body;
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
    console.error('🛑 LINE Pay Error:', err.response?.data || err.message);
    res.status(500).json({
      error: err.toString(),
      details: err.response?.data || null
    });
  }
});

// ⬇️ 預留 confirm 功能
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
    console.error('🛑 Confirm Error:', err.response?.data || err.message);
    res.status(500).json({
      error: err.toString(),
      details: err.response?.data || null
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Proxy running on port ${port}`));
