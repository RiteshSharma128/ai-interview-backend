require('../../shared/load-env'); require('express-async-errors');
const express = require('express'); const cors = require('cors'); const helmet = require('helmet'); const cookieParser = require('cookie-parser'); const morgan = require('morgan');
const { connectDB } = require('./config/database');
const { authenticate } = require('./middleware/auth');
const resumeRoutes = require('./routes/resume.routes');
const app = express(); const PORT = process.env.PORT || 4008;
app.use(helmet()); app.use(cors({ origin: process.env.CORS_ORIGIN?.split(','), credentials:true }));
app.use(cookieParser(process.env.COOKIE_SECRET)); app.use(express.json({ limit:'10mb' })); app.use(morgan('dev'));
app.get('/health', (req,res) => res.json({ status:'ok', service:'resume-service' }));
app.use('/api/resume', authenticate, resumeRoutes);
app.use((err,req,res,next) => res.status(err.statusCode||500).json({ success:false, message:err.message }));
async function start() { await connectDB(); app.listen(PORT, () => console.log(`📄 Resume Service on port ${PORT}`)); }
start();
