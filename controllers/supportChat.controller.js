import { AppError } from '../utils/AppError.js';
import { generateSupportReply, isSupportAiConfigured } from '../services/supportAiService.js';

function resolvePublicProvider() {
  if (!isSupportAiConfigured()) return null;
  const explicit = (process.env.SUPPORT_AI_PROVIDER || '').trim().toLowerCase();
  if (explicit === 'openai' || explicit === 'gemini') return explicit;
  if (process.env.OPENAI_API_KEY?.trim()) return 'openai';
  if (process.env.GEMINI_API_KEY?.trim()) return 'gemini';
  return null;
}

export const getSupportChatStatus = async (req, res) => {
  const provider = resolvePublicProvider();

  res.status(200).json({
    success: true,
    data: {
      enabled: Boolean(provider),
      provider: provider || null,
    },
  });
};

export const postSupportChat = async (req, res, next) => {
  try {
    if (!isSupportAiConfigured()) {
      return next(
        new AppError(
          'AI customer support is not configured. Please contact support@kgftradex.lk.',
          503
        )
      );
    }

    const { messages } = req.body;
    const userName = req.user?.name;

    const result = await generateSupportReply(messages, { userName });

    res.status(200).json({
      success: true,
      data: {
        message: {
          role: 'assistant',
          content: result.reply,
          createdAt: new Date().toISOString(),
        },
        provider: result.provider,
        model: result.model,
      },
    });
  } catch (error) {
    next(error);
  }
};
