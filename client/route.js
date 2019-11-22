export default function route(page) {
  switch (page) {
    case 'code-ui-main':
      import('./pages/main')
      return page
  }
}
