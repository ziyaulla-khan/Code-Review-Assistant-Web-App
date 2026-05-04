/**
 * Review Model
 * Stores code review history with AI-generated issues
 */
const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema(
  {
    line: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['bug', 'warning', 'suggestion', 'security', 'performance'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    suggestion: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      default: '',
    },
    fixedCode: {
      type: String,
      default: '',
    },
  },
  { _id: true }
);

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'Untitled Review',
      trim: true,
    },
    code: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      required: true,
      default: 'javascript',
    },
    issues: [issueSchema],
    summary: {
      type: String,
      default: '',
    },
    stats: {
      bugCount: { type: Number, default: 0 },
      warningCount: { type: Number, default: 0 },
      suggestionCount: { type: Number, default: 0 },
      securityCount: { type: Number, default: 0 },
      performanceCount: { type: Number, default: 0 },
    },
    fixedCode: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Update stats before saving
reviewSchema.pre('save', function (next) {
  if (this.issues && this.issues.length > 0) {
    this.stats.bugCount = this.issues.filter((i) => i.type === 'bug').length;
    this.stats.warningCount = this.issues.filter((i) => i.type === 'warning').length;
    this.stats.suggestionCount = this.issues.filter((i) => i.type === 'suggestion').length;
    this.stats.securityCount = this.issues.filter((i) => i.type === 'security').length;
    this.stats.performanceCount = this.issues.filter((i) => i.type === 'performance').length;
  }
  next();
});

module.exports = mongoose.model('Review', reviewSchema);
