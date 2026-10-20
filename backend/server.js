'use strict';
const express=require('express');
const {Pool}=require('pg');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const helmet=require('helmet');
const rateLimit=require('express-rate-limit');
const app=express();
app.disable('x-powered-by');
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json({limit:'20kb'}));
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: 5432,
  user: process.env.DB_USER || process.env.POSTGRES_USER,
  password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  max: 5
});
function token(req,res,next){const h=req.headers.authorization||'';try{req.user=jwt.verify(h.replace(/^Bearer /,''),process.env.JWT_SECRET);next();}catch(e){res.status(401).json({error:'Vui lòng đăng nhập lại'});}}
const error=(res,e)=>{console.error('request failed:',e.message);res.status(500).json({error:'Lỗi hệ thống'});};
app.get('/health',(req,res)=>res.json({status:'ok'}));
app.get('/metrics',(req,res)=>res.type('text/plain').send('# HELP expense_app_up Application availability\n# TYPE expense_app_up gauge\nexpense_app_up 1\n'));
const authLimit=rateLimit({windowMs:15*60*1000,limit:25,standardHeaders:'draft-7',legacyHeaders:false});
app.post('/api/register',authLimit,async(req,res)=>{const {email,password,name}=req.body||{};if(typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email)||email.length>180||typeof password!=='string'||password.length<8||password.length>128||typeof name!=='string'||!name.trim()||name.length>100)return res.status(400).json({error:'Nhập họ tên, email hợp lệ và mật khẩu tối thiểu 8 ký tự'});try{const hash=await bcrypt.hash(password,11);const r=await pool.query('INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id,name,email',[name.trim(),email.toLowerCase().trim(),hash]);res.status(201).json({message:'Đăng ký thành công'});}catch(e){if(e.code==='23505')return res.status(409).json({error:'Email đã tồn tại'});error(res,e);}});
app.post('/api/login',authLimit,async(req,res)=>{const {email,password}=req.body||{};if(typeof email!=='string'||typeof password!=='string')return res.status(400).json({error:'Thiếu thông tin đăng nhập'});try{const r=await pool.query('SELECT * FROM users WHERE email=$1',[email.toLowerCase().trim()]);const u=r.rows[0];if(!u||!(await bcrypt.compare(password,u.password_hash)))return res.status(401).json({error:'Email hoặc mật khẩu không đúng'});res.json({token:jwt.sign({id:u.id,name:u.name},process.env.JWT_SECRET,{expiresIn:'12h'}),name:u.name});}catch(e){error(res,e);}});
app.get('/api/categories',token,async(req,res)=>{try{const r=await pool.query('SELECT id,name,type FROM categories WHERE user_id=$1 ORDER BY type,name',[req.user.id]);res.json(r.rows);}catch(e){error(res,e);}});
app.post('/api/categories',token,async(req,res)=>{const {name,type}=req.body||{};if(typeof name!=='string'||!name.trim()||name.length>80||!['income','expense'].includes(type))return res.status(400).json({error:'Danh mục không hợp lệ'});try{const r=await pool.query('INSERT INTO categories(user_id,name,type) VALUES($1,$2,$3) RETURNING *',[req.user.id,name.trim(),type]);res.status(201).json(r.rows[0]);}catch(e){error(res,e);}});
app.delete('/api/categories/:id',token,async(req,res)=>{try{const r=await pool.query('DELETE FROM categories WHERE id=$1 AND user_id=$2 RETURNING id',[req.params.id,req.user.id]);if(!r.rowCount)return res.status(404).json({error:'Không tìm thấy'});res.json({ok:true});}catch(e){if(e.code==='23503')return res.status(409).json({error:'Danh mục đã có giao dịch'});error(res,e);}});
app.get('/api/transactions',token,async(req,res)=>{try{const r=await pool.query('SELECT t.id,t.amount::text,t.type,t.note,t.tx_date,c.name AS category,t.category_id FROM transactions t LEFT JOIN categories c ON c.id=t.category_id WHERE t.user_id=$1 ORDER BY t.tx_date DESC,t.id DESC LIMIT 300',[req.user.id]);res.json(r.rows);}catch(e){error(res,e);}});
app.post('/api/transactions',token,async(req,res)=>{const {type,amount,note,tx_date,category_id}=req.body||{};if(!['income','expense'].includes(type)||!Number.isSafeInteger(Number(amount))||Number(amount)<=0||Number(amount)>1000000000000||typeof tx_date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(tx_date)||Number.isNaN(Date.parse(tx_date))||typeof note!=='string'||note.length>300)return res.status(400).json({error:'Dữ liệu giao dịch không hợp lệ'});try{if(category_id){const c=await pool.query('SELECT id FROM categories WHERE id=$1 AND user_id=$2 AND type=$3',[category_id,req.user.id,type]);if(!c.rowCount)return res.status(400).json({error:'Danh mục không phù hợp'});}const r=await pool.query('INSERT INTO transactions(user_id,type,amount,note,tx_date,category_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',[req.user.id,type,amount,note.trim(),tx_date,category_id||null]);res.status(201).json(r.rows[0]);}catch(e){error(res,e);}});
app.delete('/api/transactions/:id',token,async(req,res)=>{try{const r=await pool.query('DELETE FROM transactions WHERE id=$1 AND user_id=$2 RETURNING id',[req.params.id,req.user.id]);if(!r.rowCount)return res.status(404).json({error:'Không tìm thấy'});res.json({ok:true});}catch(e){error(res,e);}});
app.get('/api/summary',token,async(req,res)=>{try{const r=await pool.query("SELECT COALESCE(SUM(amount) FILTER (WHERE type='income'),0)::text AS income,COALESCE(SUM(amount) FILTER (WHERE type='expense'),0)::text AS expense,COUNT(*)::int AS count FROM transactions WHERE user_id=$1",[req.user.id]);res.json(r.rows[0]);}catch(e){error(res,e);}});
app.use(express.static('/app/public'));
app.get('*',(req,res)=>res.sendFile('/app/public/index.html'));
async function boot(){for(let i=0;i<30;i++){try{await pool.query('SELECT 1');break;}catch(e){if(i===29)throw e;await new Promise(r=>setTimeout(r,2000));}}

app.listen(3000,'0.0.0.0',()=>console.log('Expense Tracker listening on 3000'));}
boot().catch(e=>{console.error('Startup failed',e);process.exit(1)});
