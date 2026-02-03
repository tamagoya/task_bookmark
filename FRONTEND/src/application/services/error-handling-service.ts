import { ErrorCode } from '../../domain/value-objects/error-code';
import { ErrorSeverity } from '../../domain/value-objects/error-severity';
import { ErrorMessage } from '../../domain/value-objects/error-message';
import { RetryPolicy } from '../../domain/value-objects/retry-policy';

/**
 * ErrorHandlingService
 * エラーハンドリングを担当するDomain Service
 */
export class ErrorHandlingService {
  /**
   * エラーを分類し、カテゴリと重要度を返す
   * @param errorCode エラーコード
   * @returns カテゴリと重要度
   */
  classifyError(errorCode: ErrorCode): { category: string; severity: string } {
    const category = errorCode.category;
    
    // エラーコードに基づいて重要度を判定
    let severity: string;
    switch (errorCode.code) {
      case 'AUTH_FAILED':
      case 'TOKEN_EXPIRED':
      case 'TOKEN_REFRESH_FAILED':
        severity = ErrorSeverity.ERROR;
        break;
      case 'NETWORK_ERROR':
      case 'TIMEOUT':
      case 'OFFLINE':
        severity = ErrorSeverity.ERROR;
        break;
      case 'RATE_LIMIT_EXCEEDED':
        severity = ErrorSeverity.WARNING;
        break;
      case 'API_ERROR':
      case 'INVALID_RESPONSE':
        severity = ErrorSeverity.ERROR;
        break;
      case 'VALIDATION_ERROR':
      case 'INVALID_INPUT':
      case 'MISSING_REQUIRED_FIELD':
        severity = ErrorSeverity.WARNING;
        break;
      case 'DATA_CORRUPTED':
      case 'SCHEMA_VERSION_MISMATCH':
        severity = ErrorSeverity.CRITICAL;
        break;
      default:
        severity = ErrorSeverity.ERROR;
    }
    
    return { category, severity };
  }

  /**
   * エラーコードからユーザーフレンドリーなメッセージを生成
   * @param errorCode エラーコード
   * @param context エラーコンテキスト（オプション）
   * @returns エラーメッセージ
   */
  generateUserMessage(
    errorCode: ErrorCode,
    context?: Record<string, unknown>
  ): ErrorMessage {
    let message: string;
    let technicalDetails: string | undefined;
    
    // エラーコードに基づいてメッセージを生成
    switch (errorCode.code) {
      case 'AUTH_FAILED':
        message = '認証に失敗しました。もう一度お試しください。';
        technicalDetails = 'Authentication failed';
        break;
      case 'TOKEN_EXPIRED':
        message = '認証トークンの有効期限が切れました。再認証してください。';
        technicalDetails = 'Token expired';
        break;
      case 'TOKEN_REFRESH_FAILED':
        message = 'トークンの更新に失敗しました。再認証してください。';
        technicalDetails = 'Token refresh failed';
        break;
      case 'NETWORK_ERROR':
        message = context?.operation
          ? `${context.operation}中にネットワークエラーが発生しました。再試行してください。`
          : 'ネットワークエラーが発生しました。再試行してください。';
        technicalDetails = 'Network error';
        break;
      case 'TIMEOUT':
        message = 'リクエストがタイムアウトしました。再試行してください。';
        technicalDetails = 'Request timeout';
        break;
      case 'OFFLINE':
        message = 'オフライン状態です。インターネット接続を確認してください。';
        technicalDetails = 'Offline';
        break;
      case 'RATE_LIMIT_EXCEEDED':
        message = 'APIの利用制限に達しました。しばらくしてから再度お試しください。';
        technicalDetails = 'Rate limit exceeded';
        break;
      case 'API_ERROR':
        message = context?.operation
          ? `${context.operation}に失敗しました。しばらくしてから再度お試しください。`
          : 'APIエラーが発生しました。しばらくしてから再度お試しください。';
        technicalDetails = 'API error';
        break;
      case 'INVALID_RESPONSE':
        message = '無効なレスポンスが返されました。再試行してください。';
        technicalDetails = 'Invalid response';
        break;
      case 'VALIDATION_ERROR':
        message = '入力データに問題があります。内容を確認してください。';
        technicalDetails = 'Validation error';
        break;
      case 'INVALID_INPUT':
        message = '無効な入力です。内容を確認してください。';
        technicalDetails = 'Invalid input';
        break;
      case 'MISSING_REQUIRED_FIELD':
        message = '必須項目が入力されていません。';
        technicalDetails = 'Missing required field';
        break;
      case 'DATA_CORRUPTED':
        message = 'データが破損しています。一部の情報が表示されない可能性があります。';
        technicalDetails = 'Data corrupted';
        break;
      case 'SCHEMA_VERSION_MISMATCH':
        message = 'データの形式が異なります。一部の情報が表示されない可能性があります。';
        technicalDetails = 'Schema version mismatch';
        break;
      default:
        message = 'エラーが発生しました。再試行してください。';
        technicalDetails = `Unknown error: ${errorCode.code}`;
    }
    
    return ErrorMessage.create(message, technicalDetails);
  }

  /**
   * エラーがリトライ可能かどうかを判定
   * @param errorCode エラーコード
   * @param retryPolicy リトライポリシー
   * @returns リトライ可能な場合true
   */
  isRetryable(errorCode: ErrorCode, retryPolicy: RetryPolicy): boolean {
    return retryPolicy.isRetryable(errorCode);
  }
}
