export function generateAutoId(): number {
  return Date.now();
}

export function processInsertDataWithAutoId(
  formData: Record<string, any>,
  rowKey: string,
  useAutoId: boolean = false
): Record<string, any> {
  const result = { ...formData };

  if (useAutoId && !formData[rowKey]) {
    result[rowKey] = generateAutoId();
  }

  return result;
}
