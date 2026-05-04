/**
 * Review Routes
 * Handles code review endpoints
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/auth');
const {
  createReview,
  uploadAndReview,
  getReviews,
  getReview,
  deleteReview,
} = require('../controllers/reviewController');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter - only allow code files
const fileFilter = (req, file, cb) => {
  const allowedExtensions = [
    '.js', '.ts', '.py', '.java', '.c', '.cpp', '.cs', '.go',
    '.rb', '.php', '.rs', '.swift', '.kt', '.html', '.css',
    '.sql', '.json', '.txt', '.md',
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed. Only code files are accepted.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// All routes are protected
router.use(authMiddleware);

// POST /api/reviews - Create a code review
router.post('/', createReview);

// POST /api/reviews/upload - Upload file and review
router.post('/upload', upload.single('file'), uploadAndReview);

// GET /api/reviews - Get all reviews for user
router.get('/', getReviews);

// GET /api/reviews/:id - Get single review
router.get('/:id', getReview);

// DELETE /api/reviews/:id - Delete a review
router.delete('/:id', deleteReview);

module.exports = router;
