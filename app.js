const express = require('express');
const dotenv = require('dotenv');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const cors = require('cors');
const joi = require('joi');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB
// mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
//   .then(() => console.log('Connected to MongoDB'))
//   .catch(err => console.error('Could not connect to MongoDB', err));
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));


// Middleware
app.use(cors());
app.use(express.json());
app.use(mongoSanitize());
app.use(xss());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Multer configuration with file validation
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Please upload an image file'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter
});

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Mongoose Schemas
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String
});

const questionSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  question: String,
  answer: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Question = mongoose.model('Question', questionSchema);

// Joi Validation Schemas
const registerValidationSchema = joi.object({
  username: joi.string().min(3).required(),
  email: joi.string().email().required(),
  password: joi.string().min(6).required()
});

const loginValidationSchema = joi.object({
  email: joi.string().email().required(),
  password: joi.string().required()
});

const questionValidationSchema = joi.object({
  question: joi.string().required()
});

// Middleware for authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes
app.post('/api/register', async (req, res) => {
  try {
    const { error } = registerValidationSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).send('User already registered');

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    res.status(201).send('User registered successfully');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('An error occurred during registration');
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { error } = loginValidationSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).send('Invalid email or password');

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).send('Invalid email or password');

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    res.header('auth-token', token).send({ token });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('An error occurred during login');
  }
});

app.post('/api/question', authenticateToken, async (req, res) => {
  try {
    const { error } = questionValidationSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const { question } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const result = await model.generateContent(question);
    const response = await result.response;
    const answer = response.text();
    
    const newQuestion = new Question({
      userId: req.user._id,
      question,
      answer
    });
    await newQuestion.save();

    res.json({ answer });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});

app.post('/api/image-question', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { error } = questionValidationSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const { question } = req.body;
    if (!req.file) return res.status(400).send('No image uploaded');
    
    const imagePath = req.file.path;
    
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
    
    const imageData = await fs.readFile(imagePath);
    const imageBase64 = imageData.toString('base64');

    const result = await model.generateContent([
      question,
      {
        inlineData: {
          data: imageBase64,
          mimeType: "image/jpeg"
        }
      }
    ]);

    const response = await result.response;
    const answer = response.text();
    
    const newQuestion = new Question({
      userId: req.user._id,
      question,
      answer
    });
    await newQuestion.save();

    res.json({ answer });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
