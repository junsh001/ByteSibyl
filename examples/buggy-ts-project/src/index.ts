export interface User {
  id: string;
  name: string;
  score: number;
}

export function formatUser(user: User): string {
  return `${user.name}: ${user.score}`;
}

const user: User = {
  id: 'u_001',
  name: 'Ada',
  score: 42,
};

console.log(formatUser(user));
