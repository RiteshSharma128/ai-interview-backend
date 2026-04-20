require('../../shared/load-env'); require('express-async-errors');
const express = require('express'); const cors = require('cors'); const helmet = require('helmet'); const cookieParser = require('cookie-parser'); const morgan = require('morgan');
const nodemailer = require('nodemailer');
const app = express(); const PORT = process.env.PORT || 4012;
const transporter = nodemailer.createTransport({ host:process.env.SMTP_HOST, port:parseInt(process.env.SMTP_PORT)||587, auth:{ user:process.env.SMTP_USER, pass:process.env.SMTP_PASS } });
app.use(helmet()); app.use(cors({ origin: process.env.CORS_ORIGIN?.split(','), credentials:true }));
app.use(cookieParser(process.env.COOKIE_SECRET)); app.use(express.json()); app.use(morgan('dev'));
app.get('/health', (req,res) => res.json({ status:'ok', service:'notification-service' }));
app.post('/api/notifications/send-email', async (req,res) => {
  if (req.headers['x-internal-secret'] !== process.env.INTERNAL_SERVICE_SECRET) return res.status(403).json({ success:false });
  const { to, subject, html } = req.body;
  try { await transporter.sendMail({ from:process.env.EMAIL_FROM, to, subject, html }); res.json({ success:true }); }
  catch (err) { res.status(500).json({ success:false, error:err.message }); }
});
app.use((err,req,res,next) => res.status(500).json({ success:false, message:err.message }));
app.listen(PORT, () => console.log(`🔔 Notification Service on port ${PORT}`));
