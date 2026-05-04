/**
 * Review Controller
 * Handles code review requests, file uploads, and review history
 */
const Review = require('../models/Review');
const { getCodeReview } = require('../services/aiService');
const { getCachedReview, setCachedReview } = require('../services/cacheService');
const fs = require('fs');
const path = require('path');

/**
 * Create a new code review
 * POST /api/reviews
 */
const createReview = async (req, res, next) => {
  try {
    const { code, language, title } = req.body;

    if (!code || !language) {
      return res.status(400).json({
        success: false,
        message: 'Code and language are required',
      });
    }

    // Check cache first
    const cached = getCachedReview(code, language);
    if (cached) {
      // Still save to DB for history, but return cached AI result
      const review = await Review.create({
        user: req.user.id,
        title: title || 'Untitled Review',
        code,
        language,
        issues: cached.issues,
        summary: cached.summary,
        fixedCode: cached.fixedCode,
      });

      return res.status(201).json({
        success: true,
        message: 'Review generated from cache',
        data: review,
      });
    }

    // Call AI service
    const aiResult = await getCodeReview(code, language);

    // Cache the result
    setCachedReview(code, language, aiResult);

    // Save to database
    const review = await Review.create({
      user: req.user.id,
      title: title || 'Untitled Review',
      code,
      language,
      issues: aiResult.issues,
      summary: aiResult.summary,
      fixedCode: aiResult.fixedCode,
    });

    res.status(201).json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload a file and review it
 * POST /api/reviews/upload
 */
const uploadAndReview = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const { language, title } = req.body;
    const filePath = req.file.path;

    // Read file content
    let code;
    try {
      code = fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Could not read uploaded file',
      });
    } finally {
      // Clean up uploaded file
      fs.unlink(filePath, () => {});
    }

    if (!code || code.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Uploaded file is empty',
      });
    }

    // Detect language from file extension if not provided
    let detectedLanguage = language;
    if (!detectedLanguage) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const extMap = {
        '.js': 'javascript',
        '.ts': 'typescript',
        '.py': 'python',
        '.java': 'java',
        '.c': 'c',
        '.cpp': 'cpp',
        '.cs': 'csharp',
        '.go': 'go',
        '.rb': 'ruby',
        '.php': 'php',
        '.rs': 'rust',
        '.swift': 'swift',
        '.kt': 'kotlin',
        '.html': 'html',
        '.css': 'css',
        '.sql': 'sql',
        '.json': 'json',
      };
      detectedLanguage = extMap[ext] || 'plaintext';
    }

    // Check cache
    const cached = getCachedReview(code, detectedLanguage);
    if (cached) {
      const review = await Review.create({
        user: req.user.id,
        title: title || req.file.originalname || 'Uploaded File Review',
        code,
        language: detectedLanguage,
        issues: cached.issues,
        summary: cached.summary,
        fixedCode: cached.fixedCode,
      });

      return res.status(201).json({
        success: true,
        message: 'Review generated from cache',
        data: review,
      });
    }

    // Call AI service
    const aiResult = await getCodeReview(code, detectedLanguage);

    // Cache result
    setCachedReview(code, detectedLanguage, aiResult);

    // Save to DB
    const review = await Review.create({
      user: req.user.id,
      title: title || req.file.originalname || 'Uploaded File Review',
      code,
      language: detectedLanguage,
      issues: aiResult.issues,
      summary: aiResult.summary,
      fixedCode: aiResult.fixedCode,
    });

    res.status(201).json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all reviews for current user
 * GET /api/reviews
 */
const getReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .select('title language stats summary createdAt');

    res.json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single review by ID
 * GET /api/reviews/:id
 */
const getReview = async (req, res, next) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    res.json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a review
 * DELETE /api/reviews/:id
 */
const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    res.json({
      success: true,
      message: 'Review deleted',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  uploadAndReview,
  getReviews,
  getReview,
  deleteReview,
};
