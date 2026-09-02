import i18n from '@/locales/i18n';

export interface UserInfo {
  id?: string;
  name?: string;
  email?: string;
}

export function evaluateComputedExpression(expression: string, userInfo?: UserInfo): string {
  if (!expression || typeof expression !== 'string') {
    return expression;
  }

  try {
    if (expression.includes('{{') && expression.includes('}}')) {
              const result = expression.replace(/\{\{(.+?)\}\}/g, (_: string, expr: string) => {
        const trimmedExpr = expr.trim();

        if (trimmedExpr === 'user.name' || trimmedExpr === 'currentUser.name') {
          const resultValue = userInfo?.name || '';
          return resultValue;
        } else if (trimmedExpr === 'user.email' || trimmedExpr === 'currentUser.email') {
          return userInfo?.email || '';
        } else if (trimmedExpr === 'user.id' || trimmedExpr === 'currentUser.id') {
          return userInfo?.id || '';
        }

        else if (trimmedExpr === 'new Date().toISOString()') {
          return new Date().toISOString();
        } else if (trimmedExpr === 'Date.now()') {
          return Date.now().toString();
        } else if (trimmedExpr === 'Math.floor(Date.now() / 1000)') {
          return Math.floor(Date.now() / 1000).toString();
        } else if (trimmedExpr === 'new Date().toLocaleString("zh-CN")') {
          return new Date().toLocaleString('zh-CN');
        } else if (trimmedExpr === 'new Date().toISOString().split("T")[0]') {
          return new Date().toISOString().split('T')[0];
        } else if (trimmedExpr === 'new Date().toTimeString().split(" ")[0]') {
          return new Date().toTimeString().split(' ')[0];
        } else if (trimmedExpr.startsWith('new Date()')) {

          return new Date().toISOString();
        }

        return expr;
      });
      return result;
    } else {
      return expression;
    }
  } catch (error) {
    console.warn('Computed expression error:', error);
    return expression;
  }
}

export function getComputedExpressionTemplates() {
  return [

    { 
      label: i18n.t('expression_utils.current_user_name', 'Current User Name'), 
      value: '{{user.name}}', 
      description: i18n.t('expression_utils.get_current_user_name', 'Get the name of the currently logged in user'),
      example: i18n.t('expression_utils.example_user_name', 'John Doe'),
      category: 'builtin'
    },
    { 
      label: i18n.t('expression_utils.current_user_email', 'Current User Email'), 
      value: '{{user.email}}', 
      description: i18n.t('expression_utils.get_current_user_email', 'Get the email address of the currently logged in user'),
      example: 'user@example.com',
      category: 'builtin'
    },
    { 
      label: i18n.t('expression_utils.current_user_id', 'Current User ID'), 
      value: '{{user.id}}', 
      description: i18n.t('expression_utils.get_current_user_id', 'Get the unique identifier of the currently logged in user'),
      example: 'usr_1234567890',
      category: 'builtin'
    },
    { 
      label: i18n.t('expression_utils.iso_timestamp', 'ISO Timestamp'), 
      value: '{{new Date().toISOString()}}', 
      description: i18n.t('expression_utils.generate_iso_timestamp', 'Generate ISO format current timestamp'),
      example: '2024-01-15T10:30:45.123Z',
      category: 'builtin'
    },
    { 
      label: i18n.t('expression_utils.unix_timestamp_ms', 'Unix Timestamp (ms)'), 
      value: '{{Date.now()}}', 
      description: i18n.t('expression_utils.generate_unix_timestamp_ms', 'Generate Unix timestamp (milliseconds)'),
      example: '1705314645123',
      category: 'builtin'
    },
    { 
      label: i18n.t('expression_utils.unix_timestamp_s', 'Unix Timestamp (s)'), 
      value: '{{Math.floor(Date.now() / 1000)}}', 
      description: i18n.t('expression_utils.generate_unix_timestamp_s', 'Generate Unix timestamp (seconds)'),
      example: '1705314645',
      category: 'builtin'
    },
    { 
      label: i18n.t('expression_utils.chinese_datetime', 'Chinese Date Time'), 
      value: '{{new Date().toLocaleString("zh-CN")}}', 
      description: i18n.t('expression_utils.generate_chinese_datetime', 'Generate Chinese format date time'),
      example: '2024/1/15 18:30:45',
      category: 'builtin'
    },
    { 
      label: i18n.t('expression_utils.date_yyyy_mm_dd', 'Date (YYYY-MM-DD)'), 
      value: '{{new Date().toISOString().split("T")[0]}}', 
      description: i18n.t('expression_utils.generate_date_yyyy_mm_dd', 'Generate YYYY-MM-DD format date'),
      example: '2024-01-15',
      category: 'builtin'
    },
    { 
      label: i18n.t('expression_utils.time_hh_mm_ss', 'Time (HH:mm:ss)'), 
      value: '{{new Date().toTimeString().split(" ")[0]}}', 
      description: i18n.t('expression_utils.generate_time_hh_mm_ss', 'Generate HH:mm:ss format time'),
      example: '18:30:45',
      category: 'builtin'
    }
  ];
}
