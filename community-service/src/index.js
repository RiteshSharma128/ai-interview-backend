require('../../shared/load-env'); require('express-async-errors');
const express = require('express'); const cors = require('cors'); const helmet = require('helmet'); const cookieParser = require('cookie-parser'); const morgan = require('morgan');
const { connectDB } = require('./config/database');
const routes = require('./routes/community.routes');
const app = express(); const PORT = process.env.PORT || 4010;
app.use(helmet()); app.use(cors({ origin: process.env.CORS_ORIGIN?.split(','), credentials:true }));
app.use(cookieParser(process.env.COOKIE_SECRET)); app.use(express.json({ limit:'5mb' })); app.use(morgan('dev'));
app.get('/health', (req,res) => res.json({ status:'ok', service:'community-service' }));
app.use('/api/community', routes);
app.use((err,req,res,next) => res.status(err.statusCode||500).json({ success:false, message:err.message||'Error' }));
async function start() { await connectDB(); app.listen(PORT, () => console.log(`🤝 Community Service on port ${PORT}`)); }
start();
