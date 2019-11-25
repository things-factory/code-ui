export default function route(page) {
  switch (page) {
    case 'codes':
      import('./pages/code-management')
      return page
  }
}
