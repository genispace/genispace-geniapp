export type SystemParameterType = 
  | 'userId'        
  | 'userName'      
  | 'email'          
  | 'phone';         

export const SYSTEM_PARAMETERS: Array<{
  value: SystemParameterType;
  label: string;
}> = [
  { value: 'userId', label: 'User ID' },
  { value: 'userName', label: 'Username' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
];

function getUserFromStorage(): Record<string, unknown> | null {
  try {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      return JSON.parse(storedUser) as Record<string, unknown>;
    }
  } catch (error) {
    console.warn('[SystemParameters] Failed to read user from localStorage:', error);
  }
  return null;
}

export function getSystemParameterValue(
  paramType: SystemParameterType,
  userContext?: { user: unknown } | null,
): string {
  void userContext;

  const user = getUserFromStorage();

  if (!user) {
    return '';
  }

  const userData = user;

  switch (paramType) {
    case 'userId':

      return String(userData.id ?? userData.userId ?? userData.user_id ?? '');

    case 'userName': {
      const email = userData.email;
      const emailStr = typeof email === 'string' ? email : '';
      const fromEmail = emailStr.includes('@') ? emailStr.split('@')[0] : '';
      return String(userData.name ?? fromEmail ?? '');
    }

    case 'email':
      return String(userData.email ?? '');

    case 'phone':

      return String(userData.phone ?? userData.phoneNumber ?? '');

    default:
      console.warn(`[SystemParameters] 未知的系统参数类型: ${paramType}`);
      return '';
  }
}
