const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors());
app.use(express.json());

// PesaPal Credentials
const PESAPAL_CONFIG = {
    consumerKey: 'ngW+UEcnDhltUc5fXpfrCD987xMh3Lx8',
    consumerSecret: 'q27RChYs5UkypdcNYKzuUw460Dg=',
    baseUrl: 'https://cybqa.pesapal.com/pesapalv3'
};

// Get Token
app.get('/api/token', async (req, res) => {
    try {
        const response = await axios.post(
            `${PESAPAL_CONFIG.baseUrl}/api/Auth/RequestToken`,
            {
                consumer_key: PESAPAL_CONFIG.consumerKey,
                consumer_secret: PESAPAL_CONFIG.consumerSecret
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Register IPN
app.post('/api/register-ipn', async (req, res) => {
    try {
        const { token } = req.body;
        const response = await axios.post(
            `${PESAPAL_CONFIG.baseUrl}/api/URLSetup/RegisterIPN`,
            {
                url: `https://${req.get('host')}/api/ipn`,
                ipn_notification_type: 'POST'
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Submit Order
app.post('/api/order', async (req, res) => {
    try {
        const { token, amount, email, phone, ipnId } = req.body;
        
        const orderPayload = {
            id: 'ORDER_' + Date.now(),
            currency: 'TZS',
            amount: amount,
            description: 'DVARY BOOST - Deposit',
            callback_url: `https://${req.get('host')}/payment/callback`,
            notification_id: ipnId || '12345',
            billing_address: {
                email_address: email,
                phone_number: phone,
                first_name: 'Customer',
                last_name: 'User',
                country_code: 'TZ'
            }
        };
        
        const response = await axios.post(
            `${PESAPAL_CONFIG.baseUrl}/api/Transactions/SubmitOrderRequest`,
            orderPayload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// IPN Handler
app.post('/api/ipn', (req, res) => {
    console.log('IPN Received:', req.body);
    res.send('OK');
});

// Payment Callback
app.get('/payment/callback', (req, res) => {
    res.send(`
        <html>
            <head><title>Payment Status</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px; background: #0a0e1a; color: #fff;">
                <h1 style="color: #00ff88;">✅ Payment Processed!</h1>
                <p>Your transaction has been processed.</p>
                <br>
                <a href="/" style="color: #ff6b35; text-decoration: none; font-weight: bold;">⬅ Back to App</a>
            </body>
        </html>
    `);
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Backend is running!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 DVARY BOOST Backend running on port ${PORT}`);
});
