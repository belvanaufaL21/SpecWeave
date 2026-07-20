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
  // PENGECEKAN PROVIDER & LIMIT MODEL: Validasi autentikasi user
  // Jika user tidak login, tolak request (tidak boleh skip)
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
    // PENGECEKAN PROVIDER & LIMIT MODEL: Ambil nama model dari request (atau gunakan default)
    const modelName = req.body.model || 'meta-llama/llama-3.3-70b-instruct';

    let limitCheck;
    try {
      // PENGECEKAN PROVIDER & LIMIT MODEL: Cek apakah user masih punya kuota untuk model ini
      limitCheck = await usageLimitService.checkLimit(req.user.id, modelName);
    } catch (error) {
      // Auto-migration jika model tidak ditemukan, fallback ke default
      if (error.message.includes('Model not found')) {
        console.warn(`⚠️ [USAGE-LIMIT] Model not found: ${modelName}, falling back to default model`);
        
        const defaultModel = 'meta-llama/llama-3.3-70b-instruct';
        limitCheck = await usageLimitService.checkLimit(req.user.id, defaultModel);
        
        req.body.model = defaultModel;
        
        console.log(`✅ [USAGE-LIMIT] Auto-migrated to default model: ${defaultModel}`);
      } else {
        throw error;
      }
    }

    // PENGECEKAN PROVIDER & LIMIT MODEL: Jika limit terlampaui, tolak request dengan 429
    if (!limitCheck.allowed) {
      const cooldownMsg = formatCooldownMessage(limitCheck.resetsAt);

      return res.status(429).json({
        success: false,
        error: {
          code: 'USAGE_LIMIT_EXCEEDED',
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

    // PENGECEKAN PROVIDER & LIMIT MODEL: Jika allowed, simpan info limit ke req.usageLimit
    req.usageLimit = limitCheck;
    next();
  } catch (error) {
    next(error);
  }
};
