import usageLimitService from '../services/usageLimitService.js';

/**
 * Usage Limit Middleware
 * 
 * Validasi limit per-user, per-model sebelum memproses request LLM.
 * Mengembalikan 429 dengan alternatif model jika limit terlampaui.
 */

/**
 * Helper: format waktu cooldown untuk pesan user
 */
const formatCooldownMessage = (resetsAt) => {
  if (!resetsAt) return 'Coba lagi dalam 24 jam.';

  const now = new Date();
  const reset = new Date(resetsAt);
  const diffMs = reset - now;

  if (diffMs <= 0) return 'Cooldown sudah berakhir, silakan coba lagi.';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `Reset dalam ${hours} jam ${minutes} menit.`;
  }
  return `Reset dalam ${minutes} menit.`;
};

export const checkUsageLimit = async (req, res, next) => {
  // ✅ FIX: jika user tidak terautentikasi, TOLAK request (bukan skip).
  // Skip check tanpa auth = celah keamanan: user bisa bypass limit
  // dengan tidak login. Ini terutama penting untuk testingRoutes yang
  // memakai optionalAuth.
  if (!req.user?.id) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Autentikasi diperlukan untuk menggunakan model LLM.',
      },
    });
  }

  try {
    // ✅ FIX: Update default model ke model baru yang valid
    // Model lama 'llama-3.1-8b-instant' sudah tidak ada di sistem
    const modelName = req.body.model || 'meta-llama/llama-3.3-70b-instruct';

    let limitCheck;
    try {
      limitCheck = await usageLimitService.checkLimit(req.user.id, modelName);
    } catch (error) {
      // ✅ AUTO-MIGRATION: Jika model tidak ditemukan, coba fallback ke default model
      if (error.message.includes('Model not found')) {
        console.warn(`⚠️ [USAGE-LIMIT] Model not found: ${modelName}, falling back to default model`);
        
        // Fallback ke model default yang valid
        const defaultModel = 'meta-llama/llama-3.3-70b-instruct';
        limitCheck = await usageLimitService.checkLimit(req.user.id, defaultModel);
        
        // Update request body dengan model yang valid
        req.body.model = defaultModel;
        
        console.log(`✅ [USAGE-LIMIT] Auto-migrated to default model: ${defaultModel}`);
      } else {
        // Error lain, throw ulang
        throw error;
      }
    }

    if (!limitCheck.allowed) {
      const cooldownMsg = formatCooldownMessage(limitCheck.resetsAt);

      return res.status(429).json({
        success: false,
        error: {
          code: 'USAGE_LIMIT_EXCEEDED',
          // ✅ Pakai dailyLimit, bukan tier/limit yang undefined
          message: 
            `Batas request tercapai untuk model ${limitCheck.displayName} ` +
            `(${limitCheck.used}/${limitCheck.dailyLimit} request). ${cooldownMsg}`,
          model: limitCheck.modelName,
          displayName: limitCheck.displayName,
          provider: limitCheck.provider,
          limit: limitCheck.dailyLimit,
          dailyLimit: limitCheck.dailyLimit,
          used: limitCheck.used,
          remaining: limitCheck.remaining,
          resetsAt: limitCheck.resetsAt,
          alternatives: limitCheck.alternatives || [],
        },
      });
    }

    req.usageLimit = limitCheck;
    next();
  } catch (error) {
    next(error);
  }
};
