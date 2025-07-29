// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const CHANNEL_ID = process.env.CHANNEL_ID;
const CHANNEL_SECRET = process.env.CHANNEL_SECRET;
const BASE_URL = process.env.BASE_URL || 'https://sandbox-api-pay.line.me';

function makeSignature(uri, body, nonce) {
  const text = CHANNEL_SECRET + uri + body + nonce;
  return crypto.createHmac('sha256', CHANNEL_SECRET).update(text).digest('base64');
}

// 建立付款
app.post('/pay', async (req, res) => {
  const body = req.body;
  console.log("📨 收到前端資料：", body);
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
    console.error("❌ pay 錯誤：", err.response?.data || err.toString());
    res.status(500).json({ error: err.toString(), details: err.response?.data || null });
  }
});

// 付款完成後由 LINE Pay 導回，進行 confirm
app.get('/confirm', async (req, res) => {
  const transactionId = req.query.transactionId;
  const amount = 100; // 若你有動態金額，可改為從 DB/session 取得

  if (!transactionId) {
    return res.status(400).send("❌ 缺少 transactionId");
  }

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

    res.send(`
      <h1>✅ 付款成功</h1>
      <p>交易編號：${transactionId}</p>
      <pre>${JSON.stringify(response.data, null, 2)}</pre>
    `);
  } catch (err) {
    res.status(500).send(`
      <h1>❌ 付款確認失敗</h1>
      <pre>${JSON.stringify(err.response?.data || err.toString(), null, 2)}</pre>
    `);
  }
});

app.get('/', (req, res) => {
  res.send('✅ LINE Pay Proxy Server is running');
});

app.listen(3000, '0.0.0.0', () => {
  console.log("🚀 Server running on port 3000");
});
