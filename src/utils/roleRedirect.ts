export function getRoleBasedDashboard(role: 'admin' | 'instructor' | 'user'): string {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'instructor':
      return '/instructor'
    case 'user':
      return '/user'
    default:
      return '/user'
  }
}
