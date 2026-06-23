const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ============================================
// PESAPAL CREDENTIALS
// ============================================
const PESAPAL_CONFIG = {
    consumerKey: 'ngW+UEcnDhltUc5fXpfrCD987xMh3Lx8',
    consumerSecret: 'q27RChYs5UkypdcNYKzuUw460Dg=',
    environment: 'sandbox', // sandbox au live
    baseUrl: 'https://cybqa.pesapal.com/pesapalv3'
};

// ============================================
// 1. GET PESAPAL ACCESS TOKEN
// ============================================
app.get('/api/token', async (req, res) => {
    try {
        console.log('🔄 Requesting PesaPal token...');
        
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
                },
                timeout: 30000
            }
        );
        
        console.log('✅ Token received successfully');
        res.json(response.data);
        
    } catch (error) {
        console.error('❌ Token error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to get PesaPal token',
            details: error.response?.data || error.message
        });
    }
});

// ============================================
// 2. REGISTER IPN (Instant Payment Notification)
// ============================================
app.post('/api/register-ipn', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }
        
        console.log('🔄 Registering IPN...');
        
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
                },
                timeout: 30000
            }
        );
        
        console.log('✅ IPN registered successfully');
        res.json(response.data);
        
    } catch (error) {
        console.error('❌ IPN error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to register IPN',
            details: error.response?.data || error.message
        });
    }
});

// ============================================
// 3. SUBMIT ORDER TO PESAPAL
// ============================================
app.post('/api/order', async (req, res) => {
    try {
        const { token, amount, email, phone, ipnId, name } = req.body;
        
        if (!token || !amount || !email || !phone) {
            return res.status(400).json({ 
                error: 'Missing required fields: token, amount, email, phone' 
            });
        }
        
        console.log(`🔄 Submitting order: TSh ${amount} to ${email}`);
        
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
                first_name: name ? name.split(' ')[0] : 'Customer',
                last_name: name ? name.split(' ').slice(1).join(' ') : 'User',
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
                },
                timeout: 30000
            }
        );
        
        console.log('✅ Order submitted successfully');
        res.json(response.data);
        
    } catch (error) {
        console.error('❌ Order error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to submit order',
            details: error.response?.data || error.message
        });
    }
});

// ============================================
// 4. IPN HANDLER (Pesapal sends notification here)
// ============================================
app.post('/api/ipn', async (req, res) => {
    console.log('📨 IPN Received:', req.body);
    
    try {
        const ipnData = req.body;
        
        // Process payment confirmation
        // Update order status in your database
        // Add followers if payment is successful
        
        console.log('✅ IPN processed successfully');
        res.status(200).send('OK');
        
    } catch (error) {
        console.error('❌ IPN processing error:', error);
        res.status(500).send('Error processing IPN');
    }
});

// ============================================
// 5. PAYMENT CALLBACK (User returns after payment)
// ============================================
app.get('/payment/callback', async (req, res) => {
    console.log('📨 Payment Callback:', req.query);
    
    const { order_tracking_id, status } = req.query;
    
    if (status === 'completed') {
        // Payment was successful
        // Update order status and add followers
        res.send(`
            <html>
                <head><title>Payment Successful</title></head>
                <body style="font-family: Arial; text-align: center; padding: 50px; background: #0a0e1a; color: #fff;">
                    <h1 style="color: #00ff88;">✅ Payment Successful!</h1>
                    <p>Your deposit has been confirmed.</p>
                    <p>Order ID: ${order_tracking_id || 'N/A'}</p>
                    <br>
                    <a href="/" style="color: #ff6b35; text-decoration: none; font-weight: bold;">⬅ Back to App</a>
                </body>
            </html>
        `);
    } else {
        res.send(`
            <html>
                <head><title>Payment Failed</title></head>
                <body style="font-family: Arial; text-align: center; padding: 50px; background: #0a0e1a; color: #fff;">
                    <h1 style="color: #ff4444;">❌ Payment Failed</h1>
                    <p>Please try again or contact support.</p>
                    <br>
                    <a href="/" style="color: #ff6b35; text-decoration: none; font-weight: bold;">⬅ Back to App</a>
                </body>
            </html>
        `);
    }
});

// ============================================
// 6. HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'DVARY BOOST Backend is running!',
        timestamp: new Date().toISOString(),
        environment: PESAPAL_CONFIG.environment
    });
});

// ============================================
// 7. SERVE INDEX.HTML
// ============================================
const path = require('path');
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('🚀 DVARY BOOST Backend is running!');
    console.log(`📡 Server: http://localhost:${PORT}`);
    console.log(`🔑 PesaPal Environment: ${PESAPAL_CONFIG.environment}`);
    console.log(`📧 Consumer Key: ${PESAPAL_CONFIG.consumerKey.substring(0, 10)}...`);
    console.log('✅ Ready to accept requests!');
});
