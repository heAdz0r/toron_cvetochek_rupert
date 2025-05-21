import { z } from "zod";

// Базовая схема для ответов с ошибками от GitHub API
const GitHubErrorResponseSchema = z.object({
  message: z.string().default("GitHub API error"),
});

// Расширенная схема для ответов с ошибками превышения лимита запросов
const RateLimitErrorResponseSchema = GitHubErrorResponseSchema.extend({
  reset_at: z.string().optional(),
  rate: z
    .object({
      limit: z.number().optional(),
      remaining: z.number().optional(),
      reset: z.number().optional(),
    })
    .optional(),
});

// Расширенная схема для ошибок валидации
const ValidationErrorResponseSchema = GitHubErrorResponseSchema.extend({
  errors: z
    .array(
      z.object({
        resource: z.string().optional(),
        field: z.string().optional(),
        code: z.string().optional(),
        message: z.string().optional(),
      })
    )
    .optional(),
});

// Типы ответов, производные от схем
export type GitHubErrorResponse = z.infer<typeof GitHubErrorResponseSchema>;
export type RateLimitErrorResponse = z.infer<
  typeof RateLimitErrorResponseSchema
>;
export type ValidationErrorResponse = z.infer<
  typeof ValidationErrorResponseSchema
>;

/**
 * Базовый класс для ошибок GitHub API
 *
 * Используется для обработки всех типов ошибок, возвращаемых API GitHub
 */
export class GitHubError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly response: unknown
  ) {
    super(message);
    this.name = "GitHubError";
  }

  /**
   * Форматирует ошибку с деталями для отображения пользователю
   * @returns Отформатированная строка ошибки
   */
  formatError(): string {
    return `GitHub API Error (${this.status}): ${this.message}`;
  }
}

/**
 * Ошибка валидации данных в запросе к GitHub API
 *
 * Содержит детальную информацию о том, какие поля не прошли валидацию
 */
export class GitHubValidationError extends GitHubError {
  public readonly validationErrors?: ValidationErrorResponse["errors"];

  constructor(message: string, status: number, response: unknown) {
    super(message, status, response);
    this.name = "GitHubValidationError";

    // Пытаемся извлечь детали ошибок валидации
    if (response && typeof response === "object" && "errors" in response) {
      this.validationErrors = (response as ValidationErrorResponse).errors;
    }
  }

  /**
   * Возвращает сообщение об ошибке для конкретного поля
   * @param fieldName - Имя поля
   * @returns Сообщение об ошибке или undefined, если ошибки для поля нет
   */
  getFieldError(fieldName: string): string | undefined {
    if (!this.validationErrors) return undefined;

    const fieldError = this.validationErrors.find(
      (err) => err.field === fieldName
    );
    return fieldError?.message;
  }

  /**
   * Проверяет, есть ли ошибка валидации для указанного поля
   * @param fieldName - Имя поля
   * @returns true, если поле содержит ошибку валидации
   */
  hasFieldError(fieldName: string): boolean {
    if (!this.validationErrors) return false;
    return this.validationErrors.some((err) => err.field === fieldName);
  }

  /**
   * Возвращает все поля с ошибками валидации
   * @returns Массив имен полей с ошибками
   */
  getAllErrorFields(): string[] {
    if (!this.validationErrors) return [];
    return this.validationErrors
      .filter((err) => err.field)
      .map((err) => err.field as string);
  }

  /**
   * Форматирует все ошибки валидации для отображения пользователю
   * @returns Отформатированная строка ошибок валидации
   */
  override formatError(): string {
    const baseMsg = super.formatError();

    if (!this.validationErrors || this.validationErrors.length === 0) {
      return baseMsg;
    }

    const fieldErrors = this.validationErrors
      .filter((err) => err.field && err.message)
      .map((err) => `  ${err.field}: ${err.message}`)
      .join("\n");

    return `${baseMsg}\nОшибки валидации:\n${fieldErrors}`;
  }
}

/**
 * Ошибка "Ресурс не найден"
 *
 * Возникает, когда запрашиваемый ресурс не существует в GitHub
 */
export class GitHubResourceNotFoundError extends GitHubError {
  constructor(resource: string) {
    super(`Resource not found: ${resource}`, 404, {
      message: `${resource} not found`,
    });
    this.name = "GitHubResourceNotFoundError";
  }
}

/**
 * Ошибка аутентификации
 *
 * Возникает при проблемах с токеном доступа или учетными данными
 */
export class GitHubAuthenticationError extends GitHubError {
  constructor(message = "Authentication failed") {
    super(message, 401, { message });
    this.name = "GitHubAuthenticationError";
  }

  /**
   * Проверяет, просрочен ли токен аутентификации
   * @returns true, если ошибка связана с просроченным токеном
   */
  isTokenExpired(): boolean {
    return (
      this.message.toLowerCase().includes("expired") ||
      this.message.toLowerCase().includes("invalid token")
    );
  }
}

/**
 * Ошибка доступа
 *
 * Возникает, когда у пользователя недостаточно прав для выполнения операции
 */
export class GitHubPermissionError extends GitHubError {
  constructor(message = "Insufficient permissions") {
    super(message, 403, { message });
    this.name = "GitHubPermissionError";
  }
}

/**
 * Ошибка превышения лимита запросов
 *
 * Содержит информацию о том, когда лимит будет сброшен
 */
export class GitHubRateLimitError extends GitHubError {
  constructor(
    message = "Rate limit exceeded",
    public readonly resetAt: Date,
    public readonly limit?: number,
    public readonly remaining?: number
  ) {
    super(message, 429, {
      message,
      reset_at: resetAt.toISOString(),
      limit,
      remaining,
    });
    this.name = "GitHubRateLimitError";
  }

  /**
   * Возвращает количество миллисекунд до сброса ограничения
   * @returns Миллисекунды до сброса или 0, если время сброса уже прошло
   */
  getMillisecondsToReset(): number {
    const now = new Date();
    const diff = this.resetAt.getTime() - now.getTime();
    return Math.max(0, diff);
  }

  /**
   * Возвращает информацию о времени до сброса лимита в человекочитаемом формате
   * @returns Строка с информацией о времени до сброса
   */
  getReadableResetTime(): string {
    const ms = this.getMillisecondsToReset();

    if (ms === 0) {
      return "Лимит должен быть сброшен";
    }

    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
      return `Лимит будет сброшен через ${seconds} сек.`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `Лимит будет сброшен через ${minutes} мин. ${remainingSeconds} сек.`;
  }

  /**
   * Форматирует информацию о превышении лимита для отображения пользователю
   */
  override formatError(): string {
    const baseMsg = super.formatError();
    const resetInfo = this.getReadableResetTime();

    let limitInfo = "";
    if (this.limit !== undefined && this.remaining !== undefined) {
      limitInfo = `\nИспользовано ${this.limit - this.remaining}/${
        this.limit
      } запросов`;
    }

    return `${baseMsg}\n${resetInfo}${limitInfo}`;
  }
}

/**
 * Ошибка конфликта
 *
 * Возникает при попытке создать ресурс, который уже существует,
 * или при конфликтах слияния
 */
export class GitHubConflictError extends GitHubError {
  constructor(message: string) {
    super(message, 409, { message });
    this.name = "GitHubConflictError";
  }
}

/**
 * Проверяет, является ли ошибка экземпляром GitHubError
 * @param error - Объект ошибки для проверки
 * @returns true, если ошибка является экземпляром GitHubError
 */
export function isGitHubError(error: unknown): error is GitHubError {
  return error instanceof GitHubError;
}

/**
 * Проверяет, является ли ошибка определенным типом ошибки GitHub
 * @param error - Объект ошибки для проверки
 * @param errorType - Конструктор типа ошибки для проверки
 * @returns true, если ошибка относится к указанному типу
 */
export function isGitHubErrorOfType<T extends GitHubError>(
  error: unknown,
  errorType: new (...args: any[]) => T
): error is T {
  return error instanceof errorType;
}

/**
 * Фабричный метод для создания специфических экземпляров ошибок GitHub
 * на основе статус-кода и данных ответа
 *
 * @param status - HTTP статус-код ответа
 * @param responseData - Данные из тела ответа
 * @returns Соответствующий экземпляр ошибки GitHub
 */
export function createGitHubError(
  status: number,
  responseData: unknown
): GitHubError {
  try {
    // Выбираем подходящую схему валидации в зависимости от типа ошибки
    let response:
      | GitHubErrorResponse
      | RateLimitErrorResponse
      | ValidationErrorResponse;

    if (status === 429) {
      // Для ошибок превышения лимита запросов
      response = RateLimitErrorResponseSchema.parse(responseData);
    } else if (status === 422) {
      // Для ошибок валидации
      response = ValidationErrorResponseSchema.parse(responseData);
    } else {
      // Для остальных ошибок
      response = GitHubErrorResponseSchema.parse(responseData);
    }

    switch (status) {
      case 401:
        return new GitHubAuthenticationError(response.message);

      case 403:
        return new GitHubPermissionError(response.message);

      case 404:
        return new GitHubResourceNotFoundError(response.message || "Resource");

      case 409:
        return new GitHubConflictError(response.message || "Conflict occurred");

      case 422: {
        const validationResponse = response as ValidationErrorResponse;
        return new GitHubValidationError(
          validationResponse.message || "Validation failed",
          status,
          responseData
        );
      }

      case 429: {
        const rateLimitResponse = response as RateLimitErrorResponse;
        const resetDate = rateLimitResponse.reset_at
          ? new Date(rateLimitResponse.reset_at)
          : new Date(Date.now() + 60000); // Дефолтный сброс через 1 минуту

        return new GitHubRateLimitError(
          rateLimitResponse.message,
          resetDate,
          rateLimitResponse.rate?.limit,
          rateLimitResponse.rate?.remaining
        );
      }

      default:
        return new GitHubError(response.message, status, responseData);
    }
  } catch (error) {
    // Если валидация не удалась, создаем общую ошибку с безопасным сообщением
    // Извлекаем сообщение из ответа, если это возможно
    let message = "Invalid error response from GitHub API";

    try {
      if (typeof responseData === "object" && responseData !== null) {
        if ("message" in responseData && responseData.message) {
          message = String(responseData.message);
        } else if (responseData instanceof Error) {
          message = responseData.message;
        }
      } else if (typeof responseData === "string") {
        message = responseData;
      }
    } catch {
      // В случае ошибки при извлечении сообщения используем значение по умолчанию
    }

    return new GitHubError(message, status, responseData);
  }
}
