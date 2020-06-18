
function list2Csv(items: any[]): string {
  const keys = Object.keys(items[0]);

  const content = items
    .map(item => {
      return keys
        .map(key => item[key])
        .map(val => (val || '').toString().trim())
        .join(',')
    })
    .join('\n')

  const headerContent = keys.join(',');

  return headerContent + '\n' + content;
}

export const dataUtils = {
  list2Csv,
}
